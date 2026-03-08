import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import InputField from "../components/InputField";
import { BASE_URL } from "../config";
import {
  base64urlToUint8Array,
  bufferToBase64url,
  validateWebAuthnOptionsRpId,
} from "../utils/webauthn";

interface PasskeyAuthenticator {
  credentialID?: string;
  credentialId?: string;
  id?: string;
}

interface ProfileFormData extends Profile {
  shippingAddress?: string;
}

interface ProfileUpdateErrorDetail {
  message?: string;
  path?: string[];
  code?: string;
}

interface ProfileUpdateErrorResponse {
  error?: string;
  details?: ProfileUpdateErrorDetail[];
}

// Small internal display component for read-only profile fields
const Info = ({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined;
}) => (
  <div className="flex flex-col">
    <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {label}
    </span>
    <span className="mt-1 text-sm text-gray-900 dark:text-gray-100 wrap-break-word">
      {value === undefined || value === null || value === "" ? (
        <span className="text-gray-400">—</span>
      ) : (
        value
      )}
    </span>
  </div>
);

const Profile = () => {
  const [profile, setProfile] = useState<Profile | undefined>(undefined);
  const [authenticators, setAuthenticators] = useState<PasskeyAuthenticator[]>(
    [],
  );
  const [message, setMessage] = useState<string>(""); // kept for passkey flows
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<Partial<ProfileFormData>>({});
  const [error, setError] = useState<string>("");

  const getProfile = async () => {
    try {
      const res = await fetch(`${BASE_URL}/profile`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch profile");
      const data = (await res.json()) as Profile;
      setProfile(data);
      setForm(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    }
  };

  const getAuthenticators = async () => {
    const res = await fetch(`${BASE_URL}/api/auth/passkey/list-user-passkeys`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch authenticators");
    const data = (await res.json()) as PasskeyAuthenticator[];
    setAuthenticators(data);
  };

  const handleAddPasskey = async () => {
    try {
      setMessage("Starting passkey registration...");
      const beginRes = await fetch(
        `${BASE_URL}/api/auth/passkey/generate-register-options`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      if (!beginRes.ok) {
        const body = (await beginRes.json().catch(() => ({}))) as {
          message?: string;
          code?: string;
        };
        setMessage(
          body.message || body.code || "Failed to get registration options",
        );
        return;
      }

      const options =
        (await beginRes.json()) as PublicKeyCredentialCreationOptions & {
          challenge: string;
          user: { id: string; [key: string]: unknown };
        };

      const rpIdValidation = validateWebAuthnOptionsRpId(options);
      if (!rpIdValidation.isValid) {
        console.error("Invalid WebAuthn register RP ID", rpIdValidation);
        setMessage(rpIdValidation.message || "Invalid passkey configuration");
        return;
      }

      const publicKey: PublicKeyCredentialCreationOptions = {
        ...options,
        challenge: base64urlToUint8Array(options.challenge).slice(0)
          .buffer as ArrayBuffer,
        user: {
          ...options.user,
          id: base64urlToUint8Array(options.user.id).slice(0)
            .buffer as ArrayBuffer,
        },
      };

      const credential = (await navigator.credentials.create({
        publicKey,
      })) as PublicKeyCredential | null;

      if (!credential) {
        setMessage("User cancelled passkey creation");
        return;
      }

      const attestationResponse =
        credential.response as AuthenticatorAttestationResponse;

      const credentialResponse = {
        id: credential.id,
        rawId: bufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: bufferToBase64url(attestationResponse.clientDataJSON),
          attestationObject: bufferToBase64url(
            attestationResponse.attestationObject,
          ),
          transports: attestationResponse.getTransports
            ? attestationResponse.getTransports()
            : [],
        },
        clientExtensionResults: credential.getClientExtensionResults(),
      };

      const verifyPayload = {
        response: credentialResponse,
        credentialId: credentialResponse.id,
      };

      const finishRes = await fetch(
        `${BASE_URL}/api/auth/passkey/verify-registration`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(verifyPayload),
        },
      );

      if (!finishRes.ok) {
        const body = (await finishRes.json().catch(() => ({}))) as {
          message?: string;
          code?: string;
        };
        setMessage(body.message || body.code || "Passkey registration failed");
        return;
      }

      setMessage("Passkey added!");
      await getAuthenticators();
    } catch (err: unknown) {
      setMessage(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  };

  const handleRemove = async (passkeyId: string) => {
    const res = await fetch(`${BASE_URL}/api/auth/passkey/delete-passkey`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: passkeyId }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        message?: string;
        code?: string;
      };
      throw new Error(body.message || body.code || "Failed to remove passkey");
    }

    await getAuthenticators();
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: TODO: useEventEffect in 19
  useEffect(() => {
    getProfile();
    getAuthenticators();
  }, []);

  const handleEditToggle = () => {
    if (!profile) return;
    setIsEditing((prev) => !prev);
    setError("");
    setMessage("");
    setForm(profile); // reset to current profile when toggling
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    setError("");
    setMessage("");
    // Ensure required shippingAddress is included; fall back to address
    const payload: Record<string, unknown> = {
      ...profile,
      ...form,
      shippingAddress:
        form.shippingAddress ||
        form.address ||
        (profile as ProfileFormData).shippingAddress ||
        profile.address,
    };
    const toastId = toast.loading("Saving profile...");

    try {
      const res = await fetch(`${BASE_URL}/profile/${profile.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let detailsMsg = "Failed to update profile";
        try {
          const data = (await res.json()) as ProfileUpdateErrorResponse;
          if (data?.error) detailsMsg = data.error;
          if (data?.details && Array.isArray(data.details)) {
            const list = data.details
              .map((d) => d.message || `${d.path?.join(".")}: ${d.code}`)
              .join("; ");
            if (list) detailsMsg += `: ${list}`;
          }
        } catch (error) {
          console.log("Error parsing JSON response:", error);
          const text = await res.text().catch(() => "");
          if (text) detailsMsg = text;
        }
        throw new Error(detailsMsg);
      }
      const updated = (await res.json()) as Profile;
      setProfile(updated);
      setForm(updated);
      setIsEditing(false);
      toast.success("Profile updated", { id: toastId });
    } catch (err: unknown) {
      console.error("Error updating profile:", err);
      const msg = err instanceof Error ? err.message : "Update failed";
      setError(msg);
      toast.error(msg, { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Profile
        </h2>
        {profile && (
          <button
            type="button"
            onClick={handleEditToggle}
            className="text-sm px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50">
            {isEditing ? "Cancel" : "Edit"}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}
      {message && !isEditing && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700 border border-green-200">
          {message}
        </div>
      )}

      {!profile && (
        <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
      )}

      {profile && !isEditing && (
        <div className="grid gap-4 bg-white dark:bg-gray-900 rounded-lg p-6 shadow border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Info label="Email" value={profile.email} />
            <Info label="Phone" value={profile.phone} />
            <Info label="First Name" value={profile.firstName} />
            <Info label="Last Name" value={profile.lastName} />
            {(profile as ProfileFormData).shippingAddress && (
              <Info
                label="Shipping Address"
                value={(profile as ProfileFormData).shippingAddress}
              />
            )}
            <Info label="City" value={profile.city} />
            <Info label="State" value={profile.state} />
            <Info label="Zip Code" value={profile.zipCode} />
            <Info label="Country" value={profile.country} />
          </div>
        </div>
      )}

      {profile && isEditing && (
        <form
          onSubmit={handleSubmit}
          className="space-y-6 bg-white dark:bg-gray-900 rounded-lg p-6 shadow border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="opacity-70">
              <InputField
                id="email"
                label="Email"
                value={form.email || ""}
                onChange={handleChange}
              />
            </div>
            <InputField
              id="firstName"
              label="First Name"
              value={form.firstName || ""}
              onChange={handleChange}
            />
            <InputField
              id="lastName"
              label="Last Name"
              value={form.lastName || ""}
              onChange={handleChange}
            />
            <InputField
              id="phone"
              label="Phone"
              value={form.phone || ""}
              onChange={handleChange}
            />
            <InputField
              id="shippingAddress"
              label="Shipping Address"
              value={form.shippingAddress || form.address || ""}
              onChange={handleChange}
            />
            <InputField
              id="city"
              label="City"
              value={form.city || ""}
              onChange={handleChange}
            />
            <InputField
              id="state"
              label="State"
              value={form.state || ""}
              onChange={handleChange}
            />
            <InputField
              id="zipCode"
              label="Zip Code"
              value={form.zipCode || ""}
              onChange={handleChange}
            />
            <InputField
              id="country"
              label="Country"
              value={form.country || ""}
              onChange={handleChange}
            />
          </div>
          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={handleEditToggle}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Passkeys
          </h3>
          <button
            type="button"
            onClick={handleAddPasskey}
            className="text-sm px-3 py-1.5 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50">
            Add Passkey
          </button>
        </div>
        {authenticators.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No passkeys registered.
          </p>
        )}
        <ul className="space-y-2">
          {authenticators.map((auth, index) => {
            const passkeyId = auth.id;
            const credentialId = auth.credentialID || auth.credentialId || auth.id;

            return (
            <li
              key={passkeyId || credentialId || `passkey-${index}`}
              className="flex items-center justify-between rounded border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800">
              <span className="font-mono text-xs text-white dark:text-gray-300">
                {credentialId || "Unknown passkey"}
              </span>
              <button
                type="button"
                onClick={() => passkeyId && handleRemove(passkeyId)}
                disabled={!passkeyId}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                Remove
              </button>
            </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default Profile;

export interface Profile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}
