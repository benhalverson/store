import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CartProvider, useCart } from "./CartContext";

vi.mock("../config", () => ({
  BASE_URL: "http://test.local",
}));

class MockBroadcastChannel {
  addEventListener() {}
  removeEventListener() {}
  postMessage() {}
  close() {}
}

function TestHarness() {
  const { addToCart, cart } = useCart();

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          addToCart({
            id: 1,
            name: "RC Wheels",
            price: 35,
            quantity: 1,
            color: "#ffffff",
            filamentType: "PLA",
            filamentId: "",
            skuNumber: "SKU-123",
          })
        }>
        Add
      </button>
      <span data-testid="count">{cart.length}</span>
    </div>
  );
}

describe("CartContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn());
  });

  it("does not call remote cart APIs when filamentId is missing", async () => {
    const user = userEvent.setup();
    render(
      <CartProvider>
        <TestHarness />
      </CartProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(console.error).toHaveBeenCalledWith(
      "filamentId missing – cannot add to cart remotely",
    );
  });
});
