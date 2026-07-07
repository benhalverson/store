import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import ColorPicker from "../components/ColorPicker";
import { ColorProvider } from "../context/ColorContext";

vi.mock("../config", () => ({ BASE_URL: "https://example.test" }));

const mockColors = [
  {
    publicId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    name: "PLA Red",
    provider: "PolyMaker",
    profile: "PLA",
    color: "Red",
    hexValue: "#FF5733",
    public: true,
    available: true,
  },
  {
    publicId: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
    name: "PLA Green",
    provider: "PolyMaker",
    profile: "PLA",
    color: "Green",
    hexValue: "#33FF57",
    public: true,
    available: true,
  },
  {
    publicId: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
    name: "PLA Blue",
    provider: "PolyMaker",
    profile: "PLA",
    color: "Blue",
    hexValue: "#3357FF",
    public: true,
    available: true,
  },
];

const mockColorsEnvelope = {
  success: true,
  message: "Filaments retrieved successfully",
  data: mockColors,
  count: mockColors.length,
  lastUpdated: "2026-01-25T10:30:00Z",
};

describe("ColorPicker Component", () => {
  beforeEach(() => {
    vi.useRealTimers(); // user-event needs real timers in CI

    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 5)); // tiny async tick
      return {
        ok: true,
        json: async () => mockColorsEnvelope,
      } as unknown as Response;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("displays loading state initially", async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    render(
      <ColorProvider>
        <ColorPicker filamentType="PLA" />
      </ColorProvider>,
    );

    // Hold the request open so the loading state is observable.
    expect(await screen.findByText(/Loading/i)).toBeInTheDocument();

    await act(async () => {
      resolveFetch?.({
        ok: true,
        json: async () => mockColorsEnvelope,
      } as unknown as Response);
    });
  });

  it("fetches v2 colors for the selected filament profile", async () => {
    render(
      <ColorProvider>
        <ColorPicker filamentType="PLA" />
      </ColorProvider>,
    );

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());

    const url = new URL(vi.mocked(globalThis.fetch).mock.calls[0][0] as string);
    expect(url.pathname).toBe("/v2/colors");
    expect(url.searchParams.get("profile")).toBe("PLA");
    expect(url.searchParams.get("available")).toBe("true");
  });

  it("selects the first color initially after loading", async () => {
    render(
      <ColorProvider>
        <ColorPicker filamentType="PLA" />
      </ColorProvider>,
    );

    // Wait until controls are present (the group label appears)
    await waitFor(() =>
      expect(screen.getByLabelText(/Choose a color/i)).toBeInTheDocument(),
    );

    // Be resilient: if options have no accessible names, use position
    const radios = screen.getAllByRole("radio");
    expect(radios.length).toBeGreaterThanOrEqual(3);

    // First option should be selected by default
    expect(radios[0]).toBeChecked();
    expect(radios[1]).not.toBeChecked();
    expect(radios[2]).not.toBeChecked();
  });

  it("updates color when a new color is selected", async () => {
    const user = userEvent.setup();

    render(
      <ColorProvider>
        <ColorPicker filamentType="PLA" />
      </ColorProvider>,
    );

    await waitFor(() =>
      expect(screen.getByLabelText(/Choose a color/i)).toBeInTheDocument(),
    );

    const radios = screen.getAllByRole("radio");
    // click the second color (Green)
    await user.click(radios[1]);

    // Assert selection changed (don’t rely on CSS colors in CI)
    expect(radios[1]).toBeChecked();
    expect(radios[0]).not.toBeChecked();
  });
});
