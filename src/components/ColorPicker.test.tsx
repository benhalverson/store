import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ColorProvider } from "../context/ColorContext";
import ColorPicker from "../components/ColorPicker";
import { ColorsResponse } from "../interfaces";
import { vi } from "vitest";

vi.mock("../config", () => ({ BASE_URL: "https://example.test" }));

// Mock data for color options
const mockColors: ColorsResponse[] = [
  { filament: "PLA", hexColor: "FF5733", colorTag: "Red" },
  { filament: "PLA", hexColor: "33FF57", colorTag: "Green" },
  { filament: "PLA", hexColor: "3357FF", colorTag: "Blue" },
];

describe("ColorPicker Component", () => {
  beforeEach(() => {
    vi.useRealTimers(); // user-event needs real timers in CI

    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 5)); // tiny async tick
      return {
        ok: true,
        json: async () => mockColors,
      } as unknown as Response;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("displays loading state initially", async () => {
    render(
      <ColorProvider>
        <ColorPicker filamentType="PLA" />
      </ColorProvider>
    );

    // Loading text may render immediately or on next tick; wait for it
    expect(await screen.findByText(/Loading/i)).toBeInTheDocument();
  });

  it("selects the first color initially after loading", async () => {
    render(
      <ColorProvider>
        <ColorPicker filamentType="PLA" />
      </ColorProvider>
    );

    // Wait until controls are present (the group label appears)
    await waitFor(() =>
      expect(screen.getByLabelText(/Choose a color/i)).toBeInTheDocument()
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
      </ColorProvider>
    );

    await waitFor(() =>
      expect(screen.getByLabelText(/Choose a color/i)).toBeInTheDocument()
    );

    const radios = screen.getAllByRole("radio");
    // click the second color (Green)
    await user.click(radios[1]);

    // Assert selection changed (don’t rely on CSS colors in CI)
    expect(radios[1]).toBeChecked();
    expect(radios[0]).not.toBeChecked();
  });
});
