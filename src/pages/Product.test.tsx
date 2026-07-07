// Product.test.tsx
import {
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { vi } from "vitest";

// Ensure BASE_URL/DOMAIN never point to real endpoints in tests
vi.mock("../config", () => ({
  BASE_URL: "http://test.local",
  DOMAIN: "http://test.local",
  COLOR_PICKER_VERSION: "v1",
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

vi.mock("../components/ColorPickerWrapper", () => ({
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

const mockColorDispatch = vi.fn();

vi.mock("../context/ColorContext", () => ({
  useColorContext: () => ({
    state: {
      color: "#ff0000",
      colorOptions: [],
      isLoading: false,
      hasInitialized: true,
    },
    dispatch: mockColorDispatch,
  }),
}));

describe("ProductPage", () => {
  let ProductPage: (typeof import("./Product"))["default"];

  beforeAll(async () => {
    ({ default: ProductPage } = await import("./Product"));
  });

  const renderProductPage = async () => {
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
          element: <ProductPage />,
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

    return userEvent.setup();
  };

  afterEach(() => {
    vi.restoreAllMocks();
    mockColorDispatch.mockReset();
  });

  it("renders product details and supporting controls", async () => {
    await renderProductPage();

    expect(screen.getByText("$35")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This is a 12mm RC buggy wheel that will fit any modern buggy for 1/10 scale racing.",
      ),
    ).toBeInTheDocument();
    expect(await screen.findByTestId("preview-component")).toBeInTheDocument();

    const filamentDropdown = screen.getByTestId("filament-dropdown");
    expect(filamentDropdown).toHaveValue("PLA");

    expect(await screen.findByRole("button", { name: "Add to cart" })).toBeInTheDocument();
    expect(await screen.findByTestId("color-picker")).toHaveTextContent(
      "Color Picker for PLA",
    );
  });

  it("updates filament selection when dropdown value changes", async () => {
    const user = await renderProductPage();
    const select = screen.getByTestId("filament-dropdown");

    expect(select).toHaveValue("PLA");

    await user.selectOptions(select, screen.getByRole("option", { name: "PETG" }));

    await waitFor(() => expect(select).toHaveValue("PETG"));

    expect(await screen.findByTestId("color-picker")).toHaveTextContent(
      "Color Picker for PETG",
    );
  });
});
