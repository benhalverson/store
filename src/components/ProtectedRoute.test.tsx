import { render, screen } from "@testing-library/react";
import {
  createMemoryRouter,
  RouterProvider,
  useLocation,
} from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "./ProtectedRoute";

const authState = vi.hoisted(() => ({
  user: null as { email: string } | null,
  loading: false,
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => authState,
}));

function SigninTarget() {
  const location = useLocation();
  const state = location.state as { returnTo?: string } | null;

  return (
    <>
      <div>Signin Page</div>
      <div data-testid="return-to">{state?.returnTo ?? ""}</div>
    </>
  );
}

function renderProtectedRoute(initialEntry = "/profile") {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <ProtectedRoute />,
        children: [
          {
            path: "profile",
            element: <div>Profile Page</div>,
          },
        ],
      },
      {
        path: "/signin",
        element: <SigninTarget />,
      },
    ],
    {
      initialEntries: [initialEntry],
      future: { v7_relativeSplatPath: true },
    },
  );

  render(<RouterProvider router={router} />);
}

describe("ProtectedRoute", () => {
  afterEach(() => {
    authState.user = null;
    authState.loading = false;
  });

  it("shows a loading state while auth is resolving", () => {
    authState.loading = true;

    renderProtectedRoute();

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("Profile Page")).not.toBeInTheDocument();
  });

  it("renders protected content for signed-in customers", () => {
    authState.user = { email: "customer@example.com" };

    renderProtectedRoute();

    expect(screen.getByText("Profile Page")).toBeInTheDocument();
  });

  it("redirects signed-out customers to signin with the intended destination", async () => {
    renderProtectedRoute("/profile?tab=orders#tracking");

    expect(await screen.findByText("Signin Page")).toBeInTheDocument();
    expect(screen.getByTestId("return-to")).toHaveTextContent(
      "/profile?tab=orders#tracking",
    );
  });
});
