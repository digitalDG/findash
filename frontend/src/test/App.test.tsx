import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import App from "../App";

vi.mock("../components/Watchlist", () => ({
  default: ({ onSelectTicker }: { onSelectTicker: (t: string) => void }) => (
    <div data-testid="watchlist" onClick={() => onSelectTicker("AAPL")}>
      Watchlist
    </div>
  ),
}));

vi.mock("../components/Portfolio", () => ({
  default: () => <div data-testid="portfolio">Portfolio</div>,
}));

vi.mock("../components/StockDetail", () => ({
  default: ({ ticker, onBack }: { ticker: string; onBack: () => void }) => (
    <div data-testid="stock-detail">
      <span>{ticker}</span>
      <button onClick={onBack}>Back</button>
    </div>
  ),
}));

describe("App", () => {
  it("renders watchlist tab by default", () => {
    render(<App />);
    expect(screen.getByTestId("watchlist")).toBeInTheDocument();
  });

  it("switches to portfolio tab", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /portfolio/i }));
    expect(screen.getByTestId("portfolio")).toBeInTheDocument();
  });

  it("shows stock detail when a ticker is selected", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId("watchlist"));
    expect(screen.getByTestId("stock-detail")).toBeInTheDocument();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
  });

  it("returns to watchlist from stock detail via Back button", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId("watchlist"));
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByTestId("watchlist")).toBeInTheDocument();
  });

  it("clears selected ticker when switching tabs", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId("watchlist")); // navigate to AAPL detail
    await user.click(screen.getByRole("button", { name: /portfolio/i }));
    expect(screen.getByTestId("portfolio")).toBeInTheDocument();
  });
});
