import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { BASE_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import { base64urlToUint8Array } from "../utils/webauthn";

const schema = z.object({
  email: z.email({ error: "Invalid email" }),
  password: z.string().min(6, { error: "Password is required" }),
});

type SignupFormData = z.infer<typeof schema>;

const Signup = () => {
  const resolver = zodResolver(schema);
  const navigate = useNavigate();
  const { fetchUser } = useAuth();
  const [accountCreated, setAccountCreated] = useState(false);
  const [passkeyRegistering, setPasskeyRegistering] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver,
  });

  const handlePasswordSignup = async (data: SignupFormData) => {
    const toastId = toast.loading("Creating account...");
    try {
      const res = await fetch(`${BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Signup failed");

      await fetchUser();
      toast.success("Account created!", { id: toastId });
      setAccountCreated(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(`Error: ${err.message}`, { id: toastId });
      } else {
        toast.error("An unknown error occurred", { id: toastId });
      }
    }
  };

  const handlePasskeyRegistration = async () => {
    setPasskeyRegistering(true);
    const toastId = toast.loading("Registering passkey...");
    try {
      const optionsRes = await fetch(
        `${BASE_URL}/api/auth/passkey/generate-register-options`,
        { credentials: "include" },
      );
      if (!optionsRes.ok) throw new Error("Failed to get registration options");

      const rawOptions = (await optionsRes.json()) as {
        challenge: string;
        user: { id: string; name: string; displayName: string };
        [key: string]: unknown;
      };

      const options = {
        ...rawOptions,
        challenge: base64urlToUint8Array(rawOptions.challenge).slice(0)
          .buffer as ArrayBuffer,
        user: {
          ...rawOptions.user,
          id: base64urlToUint8Array(rawOptions.user.id).slice(0)
            .buffer as ArrayBuffer,
        },
      } as unknown as PublicKeyCredentialCreationOptions;

      const credential = (await navigator.credentials.create({
        publicKey: options,
      })) as PublicKeyCredential | null;
      if (!credential) throw new Error("Passkey creation was cancelled");

      const attestationResponse =
        credential.response as AuthenticatorAttestationResponse;

      const bufToBase64url = (buf: ArrayBuffer): string =>
        btoa(String.fromCharCode(...new Uint8Array(buf)))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

      const serialized = {
        id: credential.id,
        rawId: bufToBase64url(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: bufToBase64url(attestationResponse.clientDataJSON),
          attestationObject: bufToBase64url(
            attestationResponse.attestationObject,
          ),
          transports: attestationResponse.getTransports
            ? attestationResponse.getTransports()
            : [],
        },
        clientExtensionResults: credential.getClientExtensionResults(),
      };

      const verifyPayload = {
        ...serialized,
        credentialId: serialized.id,
        credential: serialized,
      };

      const verifyRes = await fetch(
        `${BASE_URL}/api/auth/passkey/verify-registration`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(verifyPayload),
        },
      );
      if (!verifyRes.ok) throw new Error("Passkey registration failed");

      await fetchUser();
      toast.success("Passkey registered successfully!", { id: toastId });
      navigate("/profile");
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(`Error: ${err.message}`, { id: toastId });
      } else {
        toast.error("An unknown error occurred", { id: toastId });
      }
    } finally {
      setPasskeyRegistering(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg shadow bg-white dark:bg-gray-900 dark:border-gray-700">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
        Sign Up
      </h2>

      {!accountCreated ? (
        <form
          onSubmit={handleSubmit(handlePasswordSignup)}
          className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:text-white"
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              {...register("password")}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:text-white"
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded-md">
            Sign Up
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Your account has been created and you are signed in. Would you like
            to add a passkey for faster, passwordless sign-in in the future?
          </p>
          <button
            type="button"
            onClick={handlePasskeyRegistration}
            disabled={passkeyRegistering}
            className="w-full py-2 bg-gray-800 text-white rounded-md disabled:opacity-50">
            Add Passkey to My Account
          </button>
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="w-full py-2 border border-gray-400 text-gray-700 dark:text-gray-300 rounded-md">
            Skip for Now
          </button>
        </div>
      )}
    </div>
  );
};

export default Signup;
