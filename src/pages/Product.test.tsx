// Product.test.tsx
import {
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { vi } from "vitest";
import ProductPage from "./Product";

// Ensure BASE_URL/DOMAIN never point to real endpoints in tests
vi.mock("../config", () => ({
  BASE_URL: "http://test.local",
  DOMAIN: "http://test.local",
}));

vi.mock("../components/PreviewComponent", () => ({
  default: () => <div data-testid="preview-component">Preview Component</div>,
}));

vi.mock("../components/Gallery", () => ({
  default: ({
    images,
    onImageClick,
  }: {
    images: string[];
    onImageClick: (i: number) => void;
  }) => (
    <div data-testid="gallery">
      {images.map((src, i) => (
        <button
          type="button"
          key={src}
          onClick={() => onImageClick(i)}
          aria-label={`thumb-${i}`}>
          img-{i}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("../components/ColorPicker", () => ({
  default: ({ filamentType }: { filamentType: string }) => (
    <div data-testid="color-picker">Color Picker for {filamentType}</div>
  ),
}));

vi.mock("../components/FilamentDropdown", () => ({
  default: ({
    selectedFilament,
    setSelectedFilament,
  }: {
    selectedFilament: string;
    setSelectedFilament: (value: string) => void;
  }) => (
    <select
      data-testid="filament-dropdown"
      value={selectedFilament}
      onChange={(e) => setSelectedFilament(e.target.value)}>
      <option value="PLA">PLA</option>
      <option value="PETG">PETG</option>
    </select>
  ),
}));

vi.mock("../context/CartContext", () => ({
  useCart: () => ({
    cart: [],
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
    updateQuantity: vi.fn(),
  }),
}));

vi.mock("../context/ColorContext", () => ({
  useColorContext: () => ({
    state: {
      color: "#ff0000",
      colorOptions: [],
      isLoading: false,
      hasInitialized: true,
    },
    dispatch: vi.fn(),
  }),
}));

describe("ProductPage", () => {
  beforeEach(async () => {
    // ✅ Mock fetch with a complete Product response
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1,
        name: "RC Wheels",
        description:
          "This is a 12mm RC buggy wheel that will fit any modern buggy for 1/10 scale racing.",
        image: "image.jpg",
        imageGallery: ["image1.jpg", "image2.jpg"],
        stl: "model.stl",
        price: 35,
        filamentType: "PLA",
        skuNumber: "SKU-123",
        color: "#ff0000",
      }),
    } as unknown as Response);

    const router = createMemoryRouter(
      [
        {
          path: "/product/:id",
          element: (
            <Suspense fallback={<div>Loading...</div>}>
              <ProductPage />
            </Suspense>
          ),
        },
      ],
      {
        initialEntries: ["/product/1"],
        future: { v7_relativeSplatPath: true },
      },
    );

    render(<RouterProvider router={router} />);

    await waitForElementToBeRemoved(() =>
      screen.queryByText(/Loading product/i),
    );
    await screen.findByText("RC Wheels");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders ProductPage with product details", async () => {
    expect(await screen.findByText("RC Wheels")).toBeInTheDocument();
    expect(screen.getByText("$35")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This is a 12mm RC buggy wheel that will fit any modern buggy for 1/10 scale racing.",
      ),
    ).toBeInTheDocument();
  });

  it("renders PreviewComponent in a Suspense wrapper", async () => {
    expect(await screen.findByTestId("preview-component")).toBeInTheDocument();
  });

  it("displays the initial filament type as PLA", async () => {
    const filamentDropdown = await screen.findByTestId("filament-dropdown");
    expect(filamentDropdown).toHaveValue("PLA");
  });

  it("updates filament selection when dropdown value changes", async () => {
    const user = userEvent.setup();

    // Make sure the product is fully loaded in THIS test's async turn
    await screen.findByText("RC Wheels");

    const select = await screen.findByTestId("filament-dropdown");

    // Sanity check initial value
    expect(select).toHaveValue("PLA");

    // Change selection using the actual option node
    await user.selectOptions(
      select,
      screen.getByRole("option", { name: "PETG" }),
    );

    // Re-assert on the SAME select after state settles
    await screen.findByTestId("filament-dropdown"); // forces re-query in case of remounts
    await waitFor(() => expect(select).toHaveValue("PETG"));
  });

  it.skip("passes selected filament to ColorPicker", async () => {
    const colorPicker = await screen.findByTestId("color-picker");
    expect(colorPicker).toHaveTextContent("Color Picker for PLA");
  });

  it.skip("updates ColorPicker filamentType when filament selection changes", async () => {
    const user = userEvent.setup();
    const filamentDropdown = await screen.findByTestId("filament-dropdown");
    await user.selectOptions(
      filamentDropdown,
      screen.getByRole("option", { name: "PETG" }),
    );

    expect(await screen.findByTestId("color-picker")).toHaveTextContent(
      "Color Picker for PETG",
    );
  });

  it("renders Add to cart button", async () => {
    const addToCartButton = await screen.findByRole("button", {
      name: "Add to cart",
    });
    expect(addToCartButton).toBeInTheDocument();
  });
});
