import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryRouter,
  RouterProvider,
  useLocation,
} from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProductList from "./ProductList";

const toastError = vi.hoisted(() => vi.fn());

vi.mock("react-hot-toast", () => ({
  default: {
    error: toastError,
  },
}));

vi.mock("../config", () => ({
  BASE_URL: "http://test.local",
}));

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.search}</div>;
}

const products = [
  {
    id: 1,
    name: "Gear Diff Holder",
    description: "Pit gear storage",
    image: "gear.png",
    imageGallery: [],
    stl: "gear.stl",
    price: 8.58,
    filamentType: "PETG",
    skuNumber: "GEAR-1",
    color: "#000000",
    categoryId: 2,
  },
  {
    id: 2,
    name: "Shock Stand",
    description: "Pit bench stand",
    image: "shock.png",
    imageGallery: [],
    stl: "shock.stl",
    price: 11.05,
    filamentType: "PLA",
    skuNumber: "SHOCK-1",
    color: "#2779F5",
    categoryId: 2,
  },
  {
    id: 3,
    name: "Body Clips",
    description: "Small replacement clips",
    image: "clips.png",
    imageGallery: [],
    stl: "clips.stl",
    price: 3.5,
    filamentType: "PLA",
    skuNumber: "CLIP-1",
    color: "#056DFF",
    categoryId: 1,
  },
  {
    id: 4,
    name: "Setup Board",
    description: "Temporary uncategorized product",
    image: "board.png",
    imageGallery: [],
    stl: "board.stl",
    price: 14.25,
    filamentType: "PETG",
    skuNumber: "BOARD-1",
    color: "#FFFFFF",
    categoryId: null,
  },
];

const categories = [
  { categoryId: 1, categoryName: "Accessories" },
  { categoryId: 2, categoryName: "Pit Area" },
];

function mockSuccessfulFetches() {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);

    if (url === "http://test.local/products?page=1&limit=100") {
      return jsonResponse({
        products,
        pagination: {
          page: 1,
          limit: 100,
          totalItems: products.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    }

    if (url === "http://test.local/categories") {
      return jsonResponse(categories);
    }

    throw new Error(`Unexpected fetch: ${url}`);
  });
}

function renderProductList(initialEntry = "/") {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <>
            <ProductList />
            <LocationDisplay />
          </>
        ),
      },
    ],
    {
      initialEntries: [initialEntry],
      future: { v7_relativeSplatPath: true },
    },
  );

  render(<RouterProvider router={router} />);
}

describe("ProductList", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    toastError.mockReset();
  });

  it("renders category chips from the API and initializes filtering from the URL", async () => {
    mockSuccessfulFetches();

    renderProductList("/?categoryId=2");

    const pitArea = await screen.findByRole("button", { name: "Pit Area" });
    expect(pitArea).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    expect(screen.getByText("Gear Diff Holder")).toBeInTheDocument();
    expect(screen.getByText("Shock Stand")).toBeInTheDocument();
    expect(screen.queryByText("Body Clips")).not.toBeInTheDocument();
    expect(screen.queryByText("Setup Board")).not.toBeInTheDocument();
    expect(screen.getByText(/showing 1-2 of 2/i)).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("?categoryId=2");
  });

  it("clears the category URL and restores null-category products when All is selected", async () => {
    mockSuccessfulFetches();
    const user = userEvent.setup();

    renderProductList("/?categoryId=2");

    await screen.findByText("Gear Diff Holder");
    await user.click(screen.getByRole("button", { name: "All" }));

    expect(screen.getByTestId("location")).toHaveTextContent("");
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Setup Board")).toBeInTheDocument();
    expect(screen.getByText(/showing 1-4 of 4/i)).toBeInTheDocument();
  });

  it("selects one category at a time and writes the selected category to the URL", async () => {
    mockSuccessfulFetches();
    const user = userEvent.setup();

    renderProductList();

    await user.click(
      await screen.findByRole("button", { name: "Accessories" }),
    );

    expect(screen.getByTestId("location")).toHaveTextContent("?categoryId=1");
    expect(screen.getByRole("button", { name: "Accessories" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Body Clips")).toBeInTheDocument();
    expect(screen.queryByText("Gear Diff Holder")).not.toBeInTheDocument();
  });

  it("keeps products usable and shows a toast when categories fail to load", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url === "http://test.local/products?page=1&limit=100") {
        return jsonResponse({
          products,
          pagination: {
            page: 1,
            limit: 100,
            totalItems: products.length,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        });
      }

      if (url === "http://test.local/categories") {
        return jsonResponse({ error: "failed" }, { status: 500 });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    renderProductList();

    expect(await screen.findByText("Gear Diff Holder")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Pit Area" }),
    ).not.toBeInTheDocument();
    expect(toastError).toHaveBeenCalledWith(
      "Category filters are unavailable right now.",
    );
  });
});
