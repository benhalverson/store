import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { vi } from "vitest";
import SignupPage from "./Signup";

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

function renderSignup() {
  const router = createMemoryRouter([{ path: "/", element: <SignupPage /> }], {
    initialEntries: ["/"],
  });
  render(<RouterProvider router={router} />);
}

describe("Signup", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis.navigator, "credentials", {
      value: { create: vi.fn() },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockFetchUser.mockReset();
    mockNavigate.mockReset();
  });

  it("shows backend error message on failed signup", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Email already in use" }),
    } as Response);

    const toast = await import("react-hot-toast");

    renderSignup();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /^sign up$/i }));

    await waitFor(() =>
      expect(toast.default.error).toHaveBeenCalledWith(
        expect.stringContaining("Email already in use"),
        expect.anything(),
      ),
    );
  });

  it("does not show signup success when session confirmation fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);
    mockFetchUser.mockResolvedValueOnce(null);

    const toast = await import("react-hot-toast");

    renderSignup();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /^sign up$/i }));

    await waitFor(() =>
      expect(toast.default.error).toHaveBeenCalledWith(
        expect.stringContaining("session could not be confirmed"),
        expect.anything(),
      ),
    );
    expect(
      screen.queryByText(/add a passkey to my account/i),
    ).not.toBeInTheDocument();
  });

  it("shows backend error when register options request fails", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "Passkey options unavailable" }),
      } as Response);
    mockFetchUser.mockResolvedValueOnce({ email: "user@example.com" });

    const toast = await import("react-hot-toast");

    renderSignup();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /^sign up$/i }));
    await screen.findByRole("button", { name: /add passkey to my account/i });

    await user.click(
      screen.getByRole("button", { name: /add passkey to my account/i }),
    );

    await waitFor(() =>
      expect(toast.default.error).toHaveBeenCalledWith(
        expect.stringContaining("Passkey options unavailable"),
        expect.anything(),
      ),
    );
  });

  it("fails fast when register options include a URL-shaped RP ID", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          challenge: "dGVzdC1jaGFsbGVuZ2U",
          user: {
            id: "dXNlci0xMjM",
            name: "user@example.com",
            displayName: "User Example",
          },
          rp: { id: "https://rc-store.benhalverson.dev" },
        }),
      } as Response);
    mockFetchUser.mockResolvedValueOnce({ email: "user@example.com" });

    const toast = await import("react-hot-toast");

    renderSignup();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /^sign up$/i }));
    await screen.findByRole("button", { name: /add passkey to my account/i });

    await user.click(
      screen.getByRole("button", { name: /add passkey to my account/i }),
    );

    await waitFor(() =>
      expect(toast.default.error).toHaveBeenCalledWith(
        expect.stringContaining("Passkeys are unavailable on this deployment"),
        expect.anything(),
      ),
    );

    expect(navigator.credentials.create).not.toHaveBeenCalled();
  });
});
