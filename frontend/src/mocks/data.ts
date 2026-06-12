import type {
  StockQuote, HistoricalData, StockFundamentals, NewsItem,
  SearchResult, DbWatchlist, DbPortfolio, PortfolioSummary,
} from "../types/api";

// ── Quotes ────────────────────────────────────────────────────────────────

export const quotes: Record<string, StockQuote> = {
  AAPL: { ticker: "AAPL", name: "Apple Inc.", price: 213.49, change: 2.14, change_pct: 1.01, volume: 58_234_100, market_cap: 3_280_000_000_000, fetched_at: "2025-06-10T15:30:00Z" },
  MSFT: { ticker: "MSFT", name: "Microsoft Corp.", price: 441.73, change: -1.27, change_pct: -0.29, volume: 18_432_000, market_cap: 3_280_000_000_000, fetched_at: "2025-06-10T15:30:00Z" },
  GOOGL: { ticker: "GOOGL", name: "Alphabet Inc.", price: 178.92, change: 0.84, change_pct: 0.47, volume: 22_100_000, market_cap: 2_190_000_000_000, fetched_at: "2025-06-10T15:30:00Z" },
  AMZN: { ticker: "AMZN", name: "Amazon.com Inc.", price: 197.12, change: -0.56, change_pct: -0.28, volume: 31_500_000, market_cap: 2_080_000_000_000, fetched_at: "2025-06-10T15:30:00Z" },
  NVDA: { ticker: "NVDA", name: "NVIDIA Corp.", price: 131.38, change: 4.21, change_pct: 3.31, volume: 289_000_000, market_cap: 3_220_000_000_000, fetched_at: "2025-06-10T15:30:00Z" },
  TSLA: { ticker: "TSLA", name: "Tesla Inc.", price: 247.98, change: -3.12, change_pct: -1.24, volume: 95_400_000, market_cap: 792_000_000_000, fetched_at: "2025-06-10T15:30:00Z" },
};

export function batchQuotes(tickers: string[]): StockQuote[] {
  return tickers.map((t) => quotes[t]).filter(Boolean);
}

// ── History ───────────────────────────────────────────────────────────────

function generatePrices(startPrice: number, days: number) {
  const prices = [];
  let price = startPrice;
  const now = new Date("2025-06-10");
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    price = Math.max(price * (1 + (Math.random() - 0.48) * 0.02), 1);
    prices.push({
      date: date.toISOString().slice(0, 10),
      open: +(price * 0.998).toFixed(2),
      high: +(price * 1.012).toFixed(2),
      low: +(price * 0.989).toFixed(2),
      close: +price.toFixed(2),
      volume: Math.floor(50_000_000 + Math.random() * 30_000_000),
    });
  }
  return prices;
}

export function history(ticker: string, period: string): HistoricalData {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365;
  const startPrice = quotes[ticker]?.price ?? 100;
  return { ticker, period, prices: generatePrices(startPrice * 0.85, days) };
}

// ── Fundamentals ──────────────────────────────────────────────────────────

export const fundamentals: Record<string, StockFundamentals> = {
  AAPL: { ticker: "AAPL", pe_ratio: 32.1, forward_pe: 28.4, eps: 6.65, dividend_yield: 0.0044, fifty_two_week_high: 237.49, fifty_two_week_low: 164.08, beta: 1.24, sector: "Technology", industry: "Consumer Electronics" },
  MSFT: { ticker: "MSFT", pe_ratio: 35.8, forward_pe: 30.2, eps: 12.33, dividend_yield: 0.0072, fifty_two_week_high: 468.35, fifty_two_week_low: 385.58, beta: 0.90, sector: "Technology", industry: "Software—Infrastructure" },
  NVDA: { ticker: "NVDA", pe_ratio: 49.3, forward_pe: 38.1, eps: 2.66, dividend_yield: 0.0003, fifty_two_week_high: 153.13, fifty_two_week_low: 86.22, beta: 1.68, sector: "Technology", industry: "Semiconductors" },
  TSLA: { ticker: "TSLA", pe_ratio: 78.4, forward_pe: 64.2, eps: 3.16, fifty_two_week_high: 488.54, fifty_two_week_low: 138.80, beta: 2.34, sector: "Consumer Cyclical", industry: "Auto Manufacturers" },
};

// ── News ──────────────────────────────────────────────────────────────────

export const news: Record<string, NewsItem[]> = {
  AAPL: [
    { title: "Apple Reports Record Q2 Revenue Driven by Services Growth", url: "#", publisher: "Reuters", published_at: "2025-06-10T12:00:00Z" },
    { title: "Apple Vision Pro 2 Rumored for Late 2025 Launch", url: "#", publisher: "Bloomberg", published_at: "2025-06-09T09:30:00Z" },
    { title: "iPhone 17 Pro Leaks Show Significant Camera Upgrades", url: "#", publisher: "9to5Mac", published_at: "2025-06-08T16:45:00Z" },
  ],
  NVDA: [
    { title: "NVIDIA Blackwell GPUs Powering Next-Gen AI Infrastructure", url: "#", publisher: "CNBC", published_at: "2025-06-10T11:00:00Z" },
    { title: "NVIDIA Exceeds Earnings Expectations, Raises Guidance", url: "#", publisher: "The Wall Street Journal", published_at: "2025-06-09T20:00:00Z" },
  ],
};

// ── Search ────────────────────────────────────────────────────────────────

export const searchResults: SearchResult[] = [
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", type: "Equity" },
  { symbol: "AAPLX", name: "Apple Growth Fund", exchange: "NASDAQ", type: "ETF" },
];

// ── Watchlists ────────────────────────────────────────────────────────────

export const watchlists: DbWatchlist[] = [
  {
    id: 1,
    name: "Tech Giants",
    tickers: [
      { id: 1, symbol: "AAPL" },
      { id: 2, symbol: "MSFT" },
      { id: 3, symbol: "GOOGL" },
      { id: 4, symbol: "AMZN" },
      { id: 5, symbol: "NVDA" },
    ],
    created_at: "2025-01-15T00:00:00Z",
  },
  {
    id: 2,
    name: "High Conviction",
    tickers: [
      { id: 6, symbol: "NVDA" },
      { id: 7, symbol: "TSLA" },
    ],
    created_at: "2025-03-01T00:00:00Z",
  },
];

// ── Portfolios ────────────────────────────────────────────────────────────

export const portfolios: DbPortfolio[] = [
  {
    id: 1,
    name: "My Portfolio",
    holdings: [
      { id: 1, symbol: "AAPL", shares: 10, cost_basis: 180.0 },
      { id: 2, symbol: "MSFT", shares: 5, cost_basis: 390.0 },
      { id: 3, symbol: "NVDA", shares: 3, cost_basis: 95.0 },
    ],
    created_at: "2025-01-15T00:00:00Z",
  },
];

export const portfolioSummary: PortfolioSummary = {
  total_value: 5_624_54,
  total_day_change: 109.48,
  total_day_change_pct: 1.98,
  total_unrealized_gain: 2_574.37,
  total_unrealized_gain_pct: 12.57,
  holdings: [
    { ticker: "AAPL", name: "Apple Inc.", shares: 10, current_price: 213.49, market_value: 2_134.90, day_change: 21.40, day_change_pct: 1.01, cost_basis: 180.0, total_cost: 1_800.0, unrealized_gain: 334.90, unrealized_gain_pct: 18.6 },
    { ticker: "MSFT", name: "Microsoft Corp.", shares: 5, current_price: 441.73, market_value: 2_208.65, day_change: -6.35, day_change_pct: -0.29, cost_basis: 390.0, total_cost: 1_950.0, unrealized_gain: 258.65, unrealized_gain_pct: 13.3 },
    { ticker: "NVDA", name: "NVIDIA Corp.", shares: 3, current_price: 131.38, market_value: 394.14, day_change: 12.63, day_change_pct: 3.31, cost_basis: 95.0, total_cost: 285.0, unrealized_gain: 109.14, unrealized_gain_pct: 38.3 },
  ],
};
