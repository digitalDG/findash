export interface StockQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  market_cap?: number;
  fetched_at: string;
}

export interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoricalData {
  ticker: string;
  period: string;
  prices: PricePoint[];
}

export interface PortfolioHolding {
  ticker: string;
  shares: number;
  cost_basis?: number;
}

export interface HoldingResult {
  ticker: string;
  name: string;
  shares: number;
  current_price: number;
  market_value: number;
  day_change: number;
  day_change_pct: number;
  cost_basis?: number;
  total_cost?: number;
  unrealized_gain?: number;
  unrealized_gain_pct?: number;
}

export interface PortfolioSummary {
  total_value: number;
  total_day_change: number;
  total_day_change_pct: number;
  total_unrealized_gain?: number;
  total_unrealized_gain_pct?: number;
  holdings: HoldingResult[];
}

export type Period = "7d" | "30d" | "90d" | "1y";

// ── DB-backed watchlist types ─────────────────────────────────────────────

export interface DbWatchlistTicker {
  id: number;
  symbol: string;
}

export interface DbWatchlist {
  id: number;
  name: string;
  tickers: DbWatchlistTicker[];
  created_at: string;
}

// ── DB-backed portfolio types ─────────────────────────────────────────────

export interface DbPortfolioHolding {
  id: number;
  symbol: string;
  shares: number;
  cost_basis?: number;
}

export interface DbPortfolio {
  id: number;
  name: string;
  holdings: DbPortfolioHolding[];
  created_at: string;
}

// ── Fundamentals ──────────────────────────────────────────────────────────

export interface StockFundamentals {
  ticker: string;
  pe_ratio?: number;
  forward_pe?: number;
  eps?: number;
  dividend_yield?: number;
  fifty_two_week_high?: number;
  fifty_two_week_low?: number;
  beta?: number;
  sector?: string;
  industry?: string;
}

// ── News ──────────────────────────────────────────────────────────────────

export interface NewsItem {
  title: string;
  url: string;
  publisher: string;
  published_at: string;
  thumbnail_url?: string;
}

// ── Search ────────────────────────────────────────────────────────────────

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}
