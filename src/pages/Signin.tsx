import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { BASE_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import { base64urlToUint8Array, bufferToBase64url } from "../utils/webauthn";

const Signin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"password" | "passkey">("password");
  const { fetchUser } = useAuth();

  const schema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
  });

  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmitPasswordLogin = async (data: FormData) => {
    setLoading(true);
    const toastId = toast.loading("Signing in...");
    try {
      const res = await fetch(`${BASE_URL}/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
          code?: string;
        };
        throw new Error(body.message || body.code || "Invalid credentials");
      }
      await fetchUser();
      toast.success("Signed in!", { id: toastId });
      navigate("/profile");
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(`Login failed: ${err.message}`, { id: toastId });
      } else {
        toast.error("Login failed", { id: toastId });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setLoading(true);
    const toastId = toast.loading("Authenticating with passkey...");

    try {
      const optionsRes = await fetch(
        `${BASE_URL}/api/auth/passkey/generate-authenticate-options`,
        { credentials: "include" },
      );

      if (!optionsRes.ok) {
        const body = (await optionsRes.json().catch(() => ({}))) as {
          message?: string;
          code?: string;
        };
        throw new Error(
          body.message || body.code || "Failed to get passkey options",
        );
      }

      const options =
        (await optionsRes.json()) as PublicKeyCredentialRequestOptions & {
          challenge: string;
          allowCredentials?: Array<{ id: string; type: string }>;
        };

      // @ts-expect-error
      options.challenge = base64urlToUint8Array(
        options.challenge as unknown as string,
      ).buffer;
      // @ts-expect-error
      options.allowCredentials = options.allowCredentials?.map((cred) => ({
        ...cred,
        id:
          typeof cred.id === "string"
            ? base64urlToUint8Array(cred.id)
            : cred.id,
      }));

      const credential = (await navigator.credentials.get({
        publicKey: options,
      })) as PublicKeyCredential | null;

      if (!credential) throw new Error("User cancelled passkey login");

      const authResp = credential.response as AuthenticatorAssertionResponse;

      const payload = {
        id: credential.id,
        rawId: bufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
          authenticatorData: bufferToBase64url(authResp.authenticatorData),
          clientDataJSON: bufferToBase64url(authResp.clientDataJSON),
          signature: bufferToBase64url(authResp.signature),
          userHandle: authResp.userHandle
            ? bufferToBase64url(authResp.userHandle)
            : null,
        },
        clientExtensionResults: credential.getClientExtensionResults(),
      };

      const verifyRes = await fetch(
        `${BASE_URL}/api/auth/passkey/verify-authentication`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );

      if (!verifyRes.ok) {
        const body = (await verifyRes.json().catch(() => ({}))) as {
          message?: string;
          code?: string;
        };
        throw new Error(
          body.message || body.code || "Passkey verification failed",
        );
      }

      await fetchUser();
      toast.success("Passkey login successful!", { id: toastId });
      navigate("/profile");
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(`Login failed: ${err.message}`, { id: toastId });
      } else {
        toast.error("Login failed", { id: toastId });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border border-gray-300 rounded-lg shadow-sm bg-white dark:bg-gray-900 dark:border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
        Sign In
      </h2>

      {/* Tab Switcher */}
      <div className="flex mb-6">
        <button
          className={`flex-1 py-2 rounded-tl-md rounded-bl-md border border-b-0 ${
            tab === "password"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
          } transition`}
          onClick={() => setTab("password")}
          type="button"
          disabled={loading}>
          Password
        </button>
        <button
          className={`flex-1 py-2 rounded-tr-md rounded-br-md border border-b-0 ${
            tab === "passkey"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
          } transition`}
          onClick={() => setTab("passkey")}
          type="button"
          disabled={loading}>
          Passkey
        </button>
      </div>

      {/* Password Login Tab */}
      {tab === "password" && (
        <form
          onSubmit={handleSubmit(onSubmitPasswordLogin)}
          className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-300 dark:bg-gray-800 dark:text-white"
            />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              {...register("password")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-300 dark:bg-gray-800 dark:text-white"
            />
            {errors.password && (
              <p className="text-sm text-red-600 mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition disabled:opacity-50">
            Sign In with Password
          </button>
        </form>
      )}

      {/* Passkey Login Tab */}
      {tab === "passkey" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sign in using a passkey registered on this device or a security key.
          </p>
          <button
            type="button"
            onClick={handlePasskeyLogin}
            disabled={loading}
            className="w-full py-2 px-4 bg-gray-800 hover:bg-gray-900 text-white rounded-md transition disabled:opacity-50">
            Passkey Login
          </button>
        </div>
      )}
    </div>
  );
};

export default Signin;
