import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Watchlist from "../components/Watchlist";

const mockAddTicker = vi.fn();
const mockRemoveTicker = vi.fn();
const mockCreateWatchlist = vi.fn();
const mockDeleteWatchlist = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock("../components/TickerSearch", () => ({
  default: ({ onSelect, placeholder }: { onSelect: (s: string) => void; placeholder?: string }) => (
    <input
      data-testid="ticker-search"
      placeholder={placeholder ?? "Search ticker or company…"}
      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") onSelect(e.currentTarget.value.toUpperCase());
      }}
    />
  ),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

vi.mock("../hooks/useFinance", () => ({
  useWatchlists: () => ({
    data: [
      {
        id: 1,
        name: "My Watchlist",
        tickers: [
          { id: 1, symbol: "AAPL" },
          { id: 2, symbol: "MSFT" },
        ],
        created_at: "2024-01-01T00:00:00Z",
      },
    ],
    isLoading: false,
  }),
  useCreateWatchlist: () => ({ mutate: mockCreateWatchlist, isPending: false }),
  useRenameWatchlist: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteWatchlist: () => ({ mutate: mockDeleteWatchlist, isPending: false }),
  useAddWatchlistTicker: () => ({ mutate: mockAddTicker }),
  useRemoveWatchlistTicker: () => ({ mutate: mockRemoveTicker }),
  useBatchQuotes: () => ({
    data: [
      {
        ticker: "AAPL",
        name: "Apple Inc.",
        price: 195.5,
        change: 1.25,
        change_pct: 0.64,
        volume: 50000000,
        fetched_at: "2024-01-01T00:00:00Z",
      },
      {
        ticker: "MSFT",
        name: "Microsoft Corp.",
        price: 415.2,
        change: -2.1,
        change_pct: -0.5,
        volume: 20000000,
        fetched_at: "2024-01-01T00:00:00Z",
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

describe("Watchlist", () => {
  const onSelectTicker = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders tickers from the watchlist", () => {
    render(<Watchlist onSelectTicker={onSelectTicker} />);
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("MSFT")).toBeInTheDocument();
  });

  it("shows company names and prices", () => {
    render(<Watchlist onSelectTicker={onSelectTicker} />);
    expect(screen.getByText("Apple Inc.")).toBeInTheDocument();
    expect(screen.getByText("+0.64%")).toBeInTheDocument();
    expect(screen.getByText("-0.50%")).toBeInTheDocument();
  });

  it("calls onSelectTicker when a row is clicked", async () => {
    const user = userEvent.setup();
    render(<Watchlist onSelectTicker={onSelectTicker} />);
    await user.click(screen.getByText("AAPL"));
    expect(onSelectTicker).toHaveBeenCalledWith("AAPL");
  });

  it("adds a ticker via search", async () => {
    const user = userEvent.setup();
    render(<Watchlist onSelectTicker={onSelectTicker} />);
    await user.type(screen.getByTestId("ticker-search"), "TSLA");
    await user.keyboard("{Enter}");
    expect(mockAddTicker).toHaveBeenCalledWith("TSLA");
  });

  it("does not add a ticker already in the watchlist", async () => {
    const user = userEvent.setup();
    render(<Watchlist onSelectTicker={onSelectTicker} />);
    await user.type(screen.getByTestId("ticker-search"), "AAPL");
    await user.keyboard("{Enter}");
    expect(mockAddTicker).not.toHaveBeenCalled();
  });

  it("removes a ticker when ✕ is clicked", async () => {
    const user = userEvent.setup();
    render(<Watchlist onSelectTicker={onSelectTicker} />);
    const removeButtons = screen.getAllByRole("button", { name: "Remove" });
    await user.click(removeButtons[0]);
    expect(mockRemoveTicker).toHaveBeenCalledWith("AAPL");
  });
});
