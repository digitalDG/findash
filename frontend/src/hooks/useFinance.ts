import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  StockQuote,
  HistoricalData,
  PortfolioHolding,
  PortfolioSummary,
  Period,
  DbWatchlist,
  DbWatchlistTicker,
  DbPortfolio,
  DbPortfolioHolding,
  StockFundamentals,
  NewsItem,
  SearchResult,
} from "../types/api";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "findash_token";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options?.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return res.json();
}

// ── Quotes ────────────────────────────────────────────────────────────────

export function useQuote(ticker: string | null) {
  return useQuery<StockQuote>({
    queryKey: ["quote", ticker],
    queryFn: () => apiFetch<StockQuote>(`/api/quotes/${ticker!.toUpperCase()}`),
    enabled: !!ticker,
  });
}

export function useBatchQuotes(tickers: string[]) {
  return useQuery<StockQuote[]>({
    queryKey: ["quotes", tickers],
    queryFn: () =>
      apiFetch<StockQuote[]>(`/api/quotes/batch/${tickers.join(",")}`),
    enabled: tickers.length > 0,
    refetchInterval: 60_000,
  });
}

// ── History ───────────────────────────────────────────────────────────────

export function useHistory(ticker: string | null, period: Period = "30d") {
  return useQuery<HistoricalData>({
    queryKey: ["history", ticker, period],
    queryFn: () =>
      apiFetch<HistoricalData>(`/api/history/${ticker!.toUpperCase()}?period=${period}`),
    enabled: !!ticker,
    staleTime: 300_000,
  });
}

// ── Fundamentals ──────────────────────────────────────────────────────────

export function useFundamentals(ticker: string | null) {
  return useQuery<StockFundamentals>({
    queryKey: ["fundamentals", ticker],
    queryFn: () => apiFetch<StockFundamentals>(`/api/fundamentals/${ticker!.toUpperCase()}`),
    enabled: !!ticker,
    staleTime: 3_600_000,
  });
}

// ── News ──────────────────────────────────────────────────────────────────

export function useNews(ticker: string | null) {
  return useQuery<NewsItem[]>({
    queryKey: ["news", ticker],
    queryFn: () => apiFetch<NewsItem[]>(`/api/news/${ticker!.toUpperCase()}`),
    enabled: !!ticker,
    staleTime: 900_000,
  });
}

// ── Search ────────────────────────────────────────────────────────────────

export function useSearchTickers(query: string) {
  return useQuery<SearchResult[]>({
    queryKey: ["search", query],
    queryFn: () =>
      apiFetch<SearchResult[]>(`/api/search/?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length >= 2,
    staleTime: 60_000,
  });
}

// ── Portfolio (price calculation) ─────────────────────────────────────────

export function usePortfolio() {
  return useMutation<PortfolioSummary, Error, PortfolioHolding[]>({
    mutationFn: (holdings) =>
      apiFetch<PortfolioSummary>("/api/portfolio/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdings }),
      }),
  });
}

// ── DB-backed Watchlists ───────────────────────────────────────────────────

export function useWatchlists() {
  return useQuery<DbWatchlist[]>({
    queryKey: ["watchlists"],
    queryFn: () => apiFetch<DbWatchlist[]>("/api/watchlists/"),
  });
}

export function useCreateWatchlist() {
  const qc = useQueryClient();
  return useMutation<DbWatchlist, Error, string>({
    mutationFn: (name) =>
      apiFetch<DbWatchlist>("/api/watchlists/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlists"] }),
  });
}

export function useDeleteWatchlist() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) =>
      apiFetch<void>(`/api/watchlists/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlists"] }),
  });
}

export function useAddWatchlistTicker(watchlistId: number) {
  const qc = useQueryClient();
  return useMutation<DbWatchlistTicker, Error, string>({
    mutationFn: (symbol) =>
      apiFetch<DbWatchlistTicker>(`/api/watchlists/${watchlistId}/tickers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlists"] }),
  });
}

export function useRemoveWatchlistTicker(watchlistId: number) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (symbol) =>
      apiFetch<void>(`/api/watchlists/${watchlistId}/tickers/${symbol}`, {
        method: "DELETE",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlists"] }),
  });
}

// ── DB-backed Portfolios ──────────────────────────────────────────────────

export function useSavedPortfolios() {
  return useQuery<DbPortfolio[]>({
    queryKey: ["saved-portfolios"],
    queryFn: () => apiFetch<DbPortfolio[]>("/api/saved-portfolios/"),
  });
}

export function useCreateSavedPortfolio() {
  const qc = useQueryClient();
  return useMutation<DbPortfolio, Error, string>({
    mutationFn: (name) =>
      apiFetch<DbPortfolio>("/api/saved-portfolios/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-portfolios"] }),
  });
}

export function useAddPortfolioHolding(portfolioId: number) {
  const qc = useQueryClient();
  return useMutation<DbPortfolioHolding, Error, { symbol: string; shares: number; cost_basis?: number }>({
    mutationFn: (payload) =>
      apiFetch<DbPortfolioHolding>(`/api/saved-portfolios/${portfolioId}/holdings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-portfolios"] }),
  });
}

export function useRemovePortfolioHolding(portfolioId: number) {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (holdingId) =>
      apiFetch<void>(`/api/saved-portfolios/${portfolioId}/holdings/${holdingId}`, {
        method: "DELETE",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-portfolios"] }),
  });
}
