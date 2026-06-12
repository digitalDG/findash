import { http, HttpResponse } from "msw";
import * as data from "./data";

export const handlers = [
  // Quotes
  http.get("/api/quotes/:ticker", ({ params }) => {
    const ticker = (params.ticker as string).toUpperCase();
    const quote = data.quotes[ticker];
    if (!quote) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    return HttpResponse.json(quote);
  }),

  http.get("/api/quotes/batch/:tickers", ({ params }) => {
    const tickers = (params.tickers as string).toUpperCase().split(",");
    return HttpResponse.json(data.batchQuotes(tickers));
  }),

  // History
  http.get("/api/history/:ticker", ({ params, request }) => {
    const ticker = (params.ticker as string).toUpperCase();
    const period = new URL(request.url).searchParams.get("period") ?? "30d";
    return HttpResponse.json(data.history(ticker, period));
  }),

  // Fundamentals
  http.get("/api/fundamentals/:ticker", ({ params }) => {
    const ticker = (params.ticker as string).toUpperCase();
    const fund = data.fundamentals[ticker];
    if (!fund) return HttpResponse.json({ ticker, sector: "N/A" });
    return HttpResponse.json(fund);
  }),

  // News
  http.get("/api/news/:ticker", ({ params }) => {
    const ticker = (params.ticker as string).toUpperCase();
    return HttpResponse.json(data.news[ticker] ?? []);
  }),

  // Search
  http.get("/api/search/", ({ request }) => {
    const q = new URL(request.url).searchParams.get("q") ?? "";
    const results = data.searchResults.filter(
      (r) => r.symbol.includes(q.toUpperCase()) || r.name.toLowerCase().includes(q.toLowerCase())
    );
    return HttpResponse.json(results);
  }),

  // Watchlists
  http.get("/api/watchlists/", () => HttpResponse.json(data.watchlists)),
  http.post("/api/watchlists/", async ({ request }) => {
    const body = await request.json() as { name: string };
    return HttpResponse.json({ id: 99, name: body.name, tickers: [], created_at: new Date().toISOString() }, { status: 201 });
  }),
  http.delete("/api/watchlists/:id", () => new HttpResponse(null, { status: 204 })),
  http.post("/api/watchlists/:id/tickers", async ({ request }) => {
    const body = await request.json() as { symbol: string };
    return HttpResponse.json({ id: 99, symbol: body.symbol }, { status: 201 });
  }),
  http.delete("/api/watchlists/:id/tickers/:symbol", () => new HttpResponse(null, { status: 204 })),

  // Saved portfolios
  http.get("/api/saved-portfolios/", () => HttpResponse.json(data.portfolios)),
  http.post("/api/saved-portfolios/", async ({ request }) => {
    const body = await request.json() as { name: string };
    return HttpResponse.json({ id: 99, name: body.name, holdings: [], created_at: new Date().toISOString() }, { status: 201 });
  }),
  http.delete("/api/saved-portfolios/:id", () => new HttpResponse(null, { status: 204 })),
  http.post("/api/saved-portfolios/:id/holdings", async ({ request }) => {
    const body = await request.json() as { symbol: string; shares: number; cost_basis?: number };
    return HttpResponse.json({ id: 99, symbol: body.symbol, shares: body.shares, cost_basis: body.cost_basis }, { status: 201 });
  }),
  http.delete("/api/saved-portfolios/:id/holdings/:holdingId", () => new HttpResponse(null, { status: 204 })),

  // Portfolio value calculation
  http.post("/api/portfolio/", () => HttpResponse.json(data.portfolioSummary)),
];
