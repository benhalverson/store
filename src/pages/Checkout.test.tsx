import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Checkout from "./Checkout";

vi.mock("../config", () => ({
  BASE_URL: "http://test.local",
}));

const updateQuantity = vi.fn();

vi.mock("../context/CartContext", () => ({
  useCart: () => ({
    updateQuantity,
  }),
}));

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function renderCheckout() {
  const router = createMemoryRouter(
    [
      {
        path: "/checkout",
        element: <Checkout />,
      },
    ],
    {
      initialEntries: ["/checkout"],
      future: { v7_relativeSplatPath: true },
    },
  );

  render(<RouterProvider router={router} />);
}

describe("Checkout", () => {
  beforeEach(() => {
    localStorage.setItem("cartId", "cart-1");
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url === "http://test.local/profile") {
        return jsonResponse({
          email: "customer@example.com",
          firstName: "Casey",
          lastName: "Customer",
          address: "123 Test St",
          city: "Phoenix",
          state: "AZ",
          zipCode: "85001",
          country: "US",
          phone: "555-555-5555",
        });
      }

      if (url === "http://test.local/cart/cart-1") {
        return jsonResponse({
          items: [
            {
              id: 7,
              name: "RC Wheel",
              skuNumber: "WHEEL-1",
              productId: "WHEEL-1",
              quantity: 1,
              color: "ff0000",
              filamentType: "PLA",
              filamentId: "00000000-0000-4000-8000-000000000000",
              stripePriceId: "price_123",
              price: 12,
            },
          ],
          total: 12,
        });
      }

      if (url === "http://test.local/cart/cart-1/stripe-items") {
        return jsonResponse({
          line_items: [{ price: "price_123", quantity: 1 }],
        });
      }

      if (url === "http://test.local/cart/cart-1/payment-intent") {
        return jsonResponse(
          {
            error: "Cart is not ready for checkout",
            items: [
              {
                cartItemId: 7,
                skuNumber: "WHEEL-1",
                reasons: [
                  "missing_public_file_service_id",
                  "unavailable_filament_id",
                ],
              },
            ],
          },
          { status: 409 },
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    updateQuantity.mockReset();
  });

  it("shows cart readiness failures next to checkout actions", async () => {
    const user = userEvent.setup();

    renderCheckout();

    await screen.findByText("RC Wheel");
    await user.click(screen.getByRole("button", { name: /confirm order/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Cart is not ready for checkout");
    expect(alert).toHaveTextContent("RC Wheel");
    expect(alert).toHaveTextContent("missing printable file");
    expect(alert).toHaveTextContent("selected filament is unavailable");
  });
});
