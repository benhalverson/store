import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { vi } from "vitest";
import SigninPage from "./Signin";

vi.mock("../config", () => ({
  BASE_URL: "http://test.local",
  DOMAIN: "test.local",
}));

const mockFetchUser = vi.fn();
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ fetchUser: mockFetchUser }),
}));

vi.mock("react-hot-toast", () => {
  const toast = Object.assign(vi.fn(), {
    loading: vi.fn(() => "toast-id"),
    success: vi.fn(),
    error: vi.fn(),
  });
  return { default: toast };
});

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderSignin() {
  const router = createMemoryRouter([{ path: "/", element: <SigninPage /> }], {
    initialEntries: ["/"],
  });
  render(<RouterProvider router={router} />);
}

describe("Signin – password tab", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockFetchUser.mockReset();
    mockNavigate.mockReset();
  });

  it("renders email and password inputs", () => {
    renderSignin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("calls /auth/signin, fetches user, and navigates on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response);
    mockFetchUser.mockResolvedValueOnce({ email: "user@example.com" });

    renderSignin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(
      screen.getByRole("button", { name: /sign in with password/i }),
    );

    await waitFor(() => expect(mockFetchUser).toHaveBeenCalledTimes(1));
    expect(mockNavigate).toHaveBeenCalledWith("/profile");
  });

  it("shows backend error message on failed sign-in", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Invalid credentials" }),
    } as Response);

    const toast = await import("react-hot-toast");

    renderSignin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), "bad@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrongpassword");
    await user.click(
      screen.getByRole("button", { name: /sign in with password/i }),
    );

    await waitFor(() =>
      expect(toast.default.error).toHaveBeenCalledWith(
        expect.stringContaining("Invalid credentials"),
        expect.anything(),
      ),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe("Signin – passkey tab", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis.navigator, "credentials", {
      value: { get: vi.fn() },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockFetchUser.mockReset();
    mockNavigate.mockReset();
  });

  async function switchToPasskeyTab() {
    renderSignin();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /passkey/i }));
    return user;
  }

  it("renders the passkey button after switching tabs", async () => {
    await switchToPasskeyTab();
    expect(
      screen.getByRole("button", { name: /passkey login/i }),
    ).toBeInTheDocument();
  });

  it("shows error when generate-authenticate-options request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "No passkey registered" }),
    } as Response);

    const toast = await import("react-hot-toast");
    const user = await switchToPasskeyTab();

    await user.click(screen.getByRole("button", { name: /passkey login/i }));

    await waitFor(() =>
      expect(toast.default.error).toHaveBeenCalledWith(
        expect.stringContaining("No passkey registered"),
        expect.anything(),
      ),
    );
  });

  it("sends correct payload to verify-authentication and navigates on success", async () => {
    const fakeOptions = {
      challenge: "dGVzdC1jaGFsbGVuZ2U",
      allowCredentials: [{ id: "Y3JlZC1pZA", type: "public-key" }],
      timeout: 60000,
    };

    const fakeCredential = {
      id: "cred-id-base64url",
      rawId: new Uint8Array([1, 2, 3]).buffer,
      type: "public-key",
      response: {
        authenticatorData: new Uint8Array([4, 5, 6]).buffer,
        clientDataJSON: new Uint8Array([7, 8, 9]).buffer,
        signature: new Uint8Array([10, 11, 12]).buffer,
        userHandle: null,
      },
      getClientExtensionResults: () => ({}),
    } as unknown as PublicKeyCredential;

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => fakeOptions,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ verified: true }),
      } as Response);

    (
      navigator.credentials.get as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(fakeCredential);
    mockFetchUser.mockResolvedValueOnce({ email: "user@example.com" });

    const user = await switchToPasskeyTab();
    await user.click(screen.getByRole("button", { name: /passkey login/i }));

    await waitFor(() => expect(mockFetchUser).toHaveBeenCalledTimes(1));

    // Verify the verify-authentication request body structure
    const verifyCall = fetchSpy.mock.calls[1];
    expect(verifyCall[0]).toContain("/api/auth/passkey/verify-authentication");
    const body = JSON.parse(verifyCall[1]?.body as string);

    expect(body).toMatchObject({
      response: {
        id: "cred-id-base64url",
        rawId: "AQID",
        type: "public-key",
        response: {
          authenticatorData: expect.any(String),
          clientDataJSON: expect.any(String),
          signature: expect.any(String),
          userHandle: null,
        },
        clientExtensionResults: {},
      },
      credentialId: "cred-id-base64url",
    });

    expect(mockNavigate).toHaveBeenCalledWith("/profile");
  });
});
