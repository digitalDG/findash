import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Portfolio from "../components/Portfolio";

const mockCalculate = vi.fn();
const mockAddHolding = vi.fn();
const mockRemoveHolding = vi.fn();
const mockCreatePortfolio = vi.fn();

const mockSummary = {
  total_value: 5500,
  total_day_change: 37.5,
  total_day_change_pct: 0.69,
  total_unrealized_gain: 250,
  total_unrealized_gain_pct: 4.76,
  holdings: [
    {
      ticker: "AAPL",
      name: "Apple Inc.",
      shares: 10,
      current_price: 195.5,
      market_value: 1955,
      day_change: 12.5,
      day_change_pct: 0.64,
      cost_basis: 150,
      total_cost: 1500,
      unrealized_gain: 455,
      unrealized_gain_pct: 30.33,
    },
    {
      ticker: "MSFT",
      name: "Microsoft Corp.",
      shares: 5,
      current_price: 415.2,
      market_value: 2076,
      day_change: -10.5,
      day_change_pct: -0.5,
    },
    {
      ticker: "NVDA",
      name: "NVIDIA Corp.",
      shares: 3,
      current_price: 489.66,
      market_value: 1469,
      day_change: 35.5,
      day_change_pct: 2.48,
    },
  ],
};

vi.mock("../components/TickerSearch", () => ({
  default: ({ onSelect, onDeselect, placeholder }: { onSelect: (s: string) => void; onDeselect?: () => void; placeholder?: string }) => (
    <input
      data-testid="ticker-search"
      placeholder={placeholder ?? "Search ticker or company…"}
      onChange={() => onDeselect?.()}
      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") onSelect(e.currentTarget.value.toUpperCase());
      }}
    />
  ),
}));

vi.mock("../hooks/useFinance", () => ({
  useSavedPortfolios: () => ({
    data: [
      {
        id: 1,
        name: "My Portfolio",
        holdings: [
          { id: 1, symbol: "AAPL", shares: 10, cost_basis: 150 },
          { id: 2, symbol: "MSFT", shares: 5 },
          { id: 3, symbol: "NVDA", shares: 3 },
        ],
        created_at: "2024-01-01T00:00:00Z",
      },
    ],
    isLoading: false,
  }),
  useCreateSavedPortfolio: () => ({ mutate: mockCreatePortfolio, isPending: false }),
  useAddPortfolioHolding: () => ({ mutate: mockAddHolding }),
  useRemovePortfolioHolding: () => ({ mutate: mockRemoveHolding }),
  usePortfolio: () => ({
    data: mockSummary,
    isPending: false,
    error: null,
    mutate: mockCalculate,
  }),
}));

describe("Portfolio", () => {
  const onSelectTicker = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all holdings in the table", () => {
    render(<Portfolio onSelectTicker={onSelectTicker} />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("AAPL")).toBeInTheDocument();
    expect(within(table).getByText("MSFT")).toBeInTheDocument();
    expect(within(table).getByText("NVDA")).toBeInTheDocument();
  });

  it("shows the summary cards", () => {
    render(<Portfolio onSelectTicker={onSelectTicker} />);
    expect(screen.getByText("Total Value")).toBeInTheDocument();
    expect(screen.getByText("Today's Change")).toBeInTheDocument();
    expect(screen.getByText("Holdings")).toBeInTheDocument();
  });

  it("shows unrealized P&L card when cost basis is present", () => {
    render(<Portfolio onSelectTicker={onSelectTicker} />);
    expect(screen.getAllByText("Unrealized P&L").length).toBeGreaterThan(0);
  });

  it("calls onSelectTicker when a holding row is clicked", async () => {
    const user = userEvent.setup();
    render(<Portfolio onSelectTicker={onSelectTicker} />);
    await user.click(within(screen.getByRole("table")).getByText("AAPL"));
    expect(onSelectTicker).toHaveBeenCalledWith("AAPL");
  });

  it("shows validation error when ticker is empty", async () => {
    const user = userEvent.setup();
    render(<Portfolio onSelectTicker={onSelectTicker} />);
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByText("Enter a ticker symbol")).toBeInTheDocument();
  });

  it("shows validation error when shares field is empty", async () => {
    const user = userEvent.setup();
    render(<Portfolio onSelectTicker={onSelectTicker} />);
    await user.type(screen.getByTestId("ticker-search"), "TSLA");
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByText("Enter a valid number of shares")).toBeInTheDocument();
  });

  it("shows duplicate ticker validation error", async () => {
    const user = userEvent.setup();
    render(<Portfolio onSelectTicker={onSelectTicker} />);
    await user.type(screen.getByPlaceholderText("Shares"), "5");
    await user.type(screen.getByTestId("ticker-search"), "AAPL");
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByText("AAPL already in portfolio")).toBeInTheDocument();
  });

  it("removes a holding when ✕ is clicked", async () => {
    const user = userEvent.setup();
    render(<Portfolio onSelectTicker={onSelectTicker} />);
    const removeButtons = screen.getAllByRole("button", { name: "Remove" });
    await user.click(removeButtons[0]);
    expect(mockRemoveHolding).toHaveBeenCalledWith(1);
  });
});
