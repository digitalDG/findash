import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import StockDetail from "../components/StockDetail";

vi.mock("recharts", () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../hooks/useFinance", () => ({
  useFundamentals: () => ({ data: null, isLoading: false }),
  useNews: () => ({ data: [], isLoading: false }),
  useQuote: () => ({
    data: {
      ticker: "AAPL",
      name: "Apple Inc.",
      price: 195.5,
      change: 1.25,
      change_pct: 0.64,
      volume: 50000000,
      market_cap: 3000000000000,
      fetched_at: "2024-01-01T00:00:00Z",
    },
    isLoading: false,
  }),
  useHistory: () => ({
    data: {
      ticker: "AAPL",
      period: "30d",
      prices: [
        { date: "2024-01-01", open: 190, high: 196, low: 189, close: 190, volume: 50000000 },
        { date: "2024-01-02", open: 190, high: 198, low: 188, close: 195, volume: 45000000 },
      ],
    },
    isLoading: false,
  }),
}));

describe("StockDetail", () => {
  const onBack = vi.fn();

  it("renders ticker symbol and company name", () => {
    render(<StockDetail ticker="AAPL" onBack={onBack} />);
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("Apple Inc.")).toBeInTheDocument();
  });

  it("renders the current price", () => {
    render(<StockDetail ticker="AAPL" onBack={onBack} />);
    expect(screen.getByText("$195.50")).toBeInTheDocument();
  });

  it("calls onBack when the Back button is clicked", async () => {
    const user = userEvent.setup();
    render(<StockDetail ticker="AAPL" onBack={onBack} />);
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it("renders all four period selector buttons", () => {
    render(<StockDetail ticker="AAPL" onBack={onBack} />);
    expect(screen.getByRole("button", { name: "7d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "90d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1y" })).toBeInTheDocument();
  });

  it("shows period high and low stat cards", () => {
    render(<StockDetail ticker="AAPL" onBack={onBack} />);
    expect(screen.getByText(/period high/i)).toBeInTheDocument();
    expect(screen.getByText(/period low/i)).toBeInTheDocument();
  });

  it("shows volume stat card", () => {
    render(<StockDetail ticker="AAPL" onBack={onBack} />);
    expect(screen.getByText(/volume/i)).toBeInTheDocument();
  });
});
