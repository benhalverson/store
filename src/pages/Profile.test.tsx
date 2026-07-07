import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Profile from "./Profile";

vi.mock("../config", () => ({
  BASE_URL: "http://test.local",
}));

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

const profileResponse = {
  id: 1,
  email: "customer@example.com",
  firstName: "Casey",
  lastName: "Customer",
  address: "123 Test St",
  city: "Phoenix",
  state: "AZ",
  zipCode: "85001",
  country: "US",
  phone: "555-555-5555",
};

function mockProfileFetch(ordersHandler: () => Promise<Response>) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);

    if (url === "http://test.local/profile") {
      return jsonResponse(profileResponse);
    }

    if (url === "http://test.local/api/auth/passkey/list-user-passkeys") {
      return jsonResponse([]);
    }

    if (url === "http://test.local/orders?limit=10") {
      return ordersHandler();
    }

    throw new Error(`Unexpected fetch: ${url}`);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Profile orders", () => {
  it("shows loading state while orders are being fetched", async () => {
    mockProfileFetch(() => new Promise<Response>(() => {}));

    render(<Profile />);

    expect(await screen.findByText("Loading orders...")).toBeInTheDocument();
  });

  it("shows empty state when no orders are returned", async () => {
    mockProfileFetch(async () => jsonResponse({ orders: [] }));

    render(<Profile />);

    expect(await screen.findByText("No orders yet.")).toBeInTheDocument();
  });

  it("shows an error state when orders fetch fails", async () => {
    mockProfileFetch(async () => jsonResponse({}, { status: 500 }));

    render(<Profile />);

    expect(await screen.findByText("Failed to fetch orders")).toBeInTheDocument();
  });

  it("renders an order with status, total, and tracking link", async () => {
    mockProfileFetch(async () =>
      jsonResponse({
        orders: [
          {
            id: 101,
            orderNumber: "ORD-101",
            createdAt: "2026-01-03T00:00:00.000Z",
            status: null,
            slantStatus: "Shipped",
            totalAmountCents: 2599,
            currency: "usd",
            items: [
              {
                skuNumber: "WHEEL-1",
                name: "RC Wheel",
                quantity: 1,
                color: "Red",
                filamentType: "PLA",
                image: null,
                price: 25.99,
              },
            ],
            fulfillment: {
              trackingNumber: "TRACK123",
              trackingUrl: "https://carrier.example/track/123",
              carrier: "USPS",
              shippedAt: "2026-01-04T00:00:00.000Z",
              deliveredAt: null,
            },
            cancellation: null,
          },
        ],
      }),
    );

    render(<Profile />);

    const expectedTotal = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
    }).format(25.99);

    expect(await screen.findByText("ORD-101")).toBeInTheDocument();
    expect(screen.getByText("Shipped")).toBeInTheDocument();
    expect(screen.getByText(expectedTotal)).toBeInTheDocument();

    const trackingLink = screen.getByRole("link", { name: "Track shipment" });
    expect(trackingLink).toHaveAttribute(
      "href",
      "https://carrier.example/track/123",
    );
  });
});
