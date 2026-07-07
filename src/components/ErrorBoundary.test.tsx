import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

let shouldThrow = true;

function ThrowingChild() {
  if (shouldThrow) {
    throw new Error("boom");
  }

  return <div>Recovered content</div>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    shouldThrow = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a graceful fallback when a child crashes", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Something went wrong",
    );
    expect(
      screen.getByRole("heading", { name: "We couldn't load this page." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("can retry rendering its children", async () => {
    const user = userEvent.setup();

    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    shouldThrow = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByText("Recovered content")).toBeInTheDocument();
  });
});
