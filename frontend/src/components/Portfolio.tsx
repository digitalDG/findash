import { useState, useEffect, useRef } from "react";
import posthog from "posthog-js";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  useSavedPortfolios,
  useCreateSavedPortfolio,
  useAddPortfolioHolding,
  useRemovePortfolioHolding,
  usePortfolio,
} from "../hooks/useFinance";
import { Download, X } from "lucide-react";
import TickerSearch from "./TickerSearch";
import Paginator from "./Paginator";
import AlertButton from "./AlertButton";
import { usePagination } from "../hooks/usePagination";
import { useAlerts } from "../hooks/useAlerts";
import { downloadCsv } from "../utils/exportCsv";
import type { PortfolioHolding } from "../types/api";

const DEFAULT_HOLDINGS: Array<{ ticker: string; shares: number }> = [
  { ticker: "AAPL", shares: 10 },
  { ticker: "MSFT", shares: 5 },
  { ticker: "NVDA", shares: 3 },
];

const SLICE_COLORS = [
  "#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6",
  "#a855f7", "#14b8a6", "#f97316", "#ec4899", "#84cc16",
];

function formatCurrency(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

interface Props {
  onSelectTicker: (ticker: string) => void;
}

export default function Portfolio({ onSelectTicker }: Props) {
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [searchKey, setSearchKey] = useState(0);
  const [sharesInput, setSharesInput] = useState("");
  const [costInput, setCostInput] = useState("");
  const [inputError, setInputError] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [openAlertTicker, setOpenAlertTicker] = useState<string | null>(null);
  const sharesRef = useRef<HTMLInputElement>(null);

  const { data: portfolios = [], isLoading: loadingPortfolios } = useSavedPortfolios();
  const createPortfolio = useCreateSavedPortfolio();

  useEffect(() => {
    if (!loadingPortfolios && portfolios.length === 0 && !seeded && !createPortfolio.isPending) {
      setSeeded(true);
      createPortfolio.mutate("My Portfolio");
    }
  }, [loadingPortfolios, portfolios.length, seeded, createPortfolio]);

  const portfolio = portfolios[0] ?? null;
  const portfolioId = portfolio?.id ?? 0;
  const dbHoldings = portfolio?.holdings ?? [];

  const addHolding = useAddPortfolioHolding(portfolioId);
  const removeHolding = useRemovePortfolioHolding(portfolioId);

  useEffect(() => {
    if (portfolio && portfolio.holdings.length === 0 && seeded) {
      DEFAULT_HOLDINGS.forEach((h) => addHolding.mutate({ symbol: h.ticker, shares: h.shares }));
    }
  }, [portfolio?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const holdings: PortfolioHolding[] = dbHoldings.map((h) => ({
    ticker: h.symbol,
    shares: h.shares,
    cost_basis: h.cost_basis ?? undefined,
  }));

  const { data: summary, isPending: calculating, error, mutate: calculate } = usePortfolio();

  const { pageItems: pageHoldings, page: holdPage, totalPages: holdTotalPages, goPrev: holdPrev, goNext: holdNext } =
    usePagination(dbHoldings, 10, portfolioId);

  const holdingsKey = dbHoldings.map((h) => `${h.id}:${h.shares}:${h.cost_basis}`).join(",");
  useEffect(() => {
    if (holdings.length) calculate(holdings);
  }, [holdingsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh prices every 60s so checkAndFire runs on a timer (same cadence as backend alert checker)
  const holdingsRef = useRef(holdings);
  useEffect(() => { holdingsRef.current = holdings; }, [holdings]);
  useEffect(() => {
    const id = setInterval(() => {
      if (holdingsRef.current.length) calculate(holdingsRef.current);
    }, 60_000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { alerts, addAlert, removeAlert, checkAndFire } = useAlerts();

  useEffect(() => {
    if (summary && summary.holdings.length > 0) {
      checkAndFire(summary.holdings.map((h) => ({ ticker: h.ticker, price: h.current_price })));
    }
  }, [summary]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleAdd() {
    setInputError("");
    if (!selectedSymbol) { setInputError("Enter a ticker symbol"); return; }
    const shares = parseFloat(sharesInput);
    if (isNaN(shares) || shares <= 0) { setInputError("Enter a valid number of shares"); return; }
    if (dbHoldings.find((h) => h.symbol === selectedSymbol)) { setInputError(`${selectedSymbol} already in portfolio`); return; }
    const cost = parseFloat(costInput);
    addHolding.mutate({
      symbol: selectedSymbol,
      shares,
      cost_basis: !isNaN(cost) && cost > 0 ? cost : undefined,
    });
    posthog.capture("holding_added");
    setSelectedSymbol("");
    setSearchKey((k) => k + 1);
    setSharesInput("");
    setCostInput("");
  }

  function exportCsv() {
    const rows = [
      ["Ticker", "Shares", "Cost Basis/Share", "Price", "Value", "Day Change ($)", "Day Change (%)", "Unrealized P&L ($)", "Unrealized P&L (%)"],
      ...dbHoldings.map((h) => {
        const r = summary?.holdings.find((s) => s.ticker === h.symbol);
        return [
          h.symbol,
          String(h.shares),
          h.cost_basis != null ? String(h.cost_basis) : "",
          r ? String(r.current_price) : "",
          r ? String(r.market_value) : "",
          r ? String(r.day_change) : "",
          r ? String(r.day_change_pct) : "",
          r?.unrealized_gain != null ? String(r.unrealized_gain) : "",
          r?.unrealized_gain_pct != null ? String(r.unrealized_gain_pct) : "",
        ];
      }),
    ];
    downloadCsv("portfolio.csv", rows);
    posthog.capture("csv_exported", { type: "portfolio" });
  }

  const isPositive = summary ? summary.total_day_change >= 0 : true;
  const isPnlPositive = summary?.total_unrealized_gain != null ? summary.total_unrealized_gain >= 0 : true;
  const isLoading = loadingPortfolios || calculating;

  const allocationData = summary?.holdings.map((h) => ({
    name: h.ticker,
    value: summary.total_value > 0 ? (h.market_value / summary.total_value) * 100 : 0,
  })) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold">Portfolio</h2>
        <button
          onClick={exportCsv}
          disabled={dbHoldings.length === 0}
          className="bg-surface-raised hover:bg-border text-foreground text-sm font-medium px-3 py-2 rounded-md transition-colors disabled:opacity-40 flex items-center gap-1.5"
        >
          <Download size={14} />
          CSV
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-4 mb-5 sm:grid-cols-4">
          <div className="bg-surface border border-border rounded-[10px] p-5">
            <div className="text-xs text-muted uppercase tracking-wide">Total Value</div>
            <div className="text-[26px] font-extrabold mt-1.5">{formatCurrency(summary.total_value)}</div>
          </div>
          <div className="bg-surface border border-border rounded-[10px] p-5">
            <div className="text-xs text-muted uppercase tracking-wide">Today's Change</div>
            <div className={`text-[26px] font-extrabold mt-1.5 ${isPositive ? "text-positive" : "text-negative"}`}>
              {isPositive ? "+" : ""}{formatCurrency(summary.total_day_change)}
            </div>
            <div className={`text-[13px] mt-1 ${isPositive ? "text-positive" : "text-negative"}`}>
              {isPositive ? "+" : ""}{summary.total_day_change_pct.toFixed(2)}%
            </div>
          </div>
          {summary.total_unrealized_gain != null && (
            <div className="bg-surface border border-border rounded-[10px] p-5">
              <div className="text-xs text-muted uppercase tracking-wide">Unrealized P&amp;L</div>
              <div className={`text-[26px] font-extrabold mt-1.5 ${isPnlPositive ? "text-positive" : "text-negative"}`}>
                {isPnlPositive ? "+" : ""}{formatCurrency(summary.total_unrealized_gain)}
              </div>
              {summary.total_unrealized_gain_pct != null && (
                <div className={`text-[13px] mt-1 ${isPnlPositive ? "text-positive" : "text-negative"}`}>
                  {isPnlPositive ? "+" : ""}{summary.total_unrealized_gain_pct.toFixed(2)}%
                </div>
              )}
            </div>
          )}
          <div className="bg-surface border border-border rounded-[10px] p-5">
            <div className="text-xs text-muted uppercase tracking-wide">Holdings</div>
            <div className="text-[26px] font-extrabold mt-1.5">{summary.holdings.length}</div>
          </div>
        </div>
      )}

      {/* Allocation chart */}
      {allocationData.length > 0 && (
        <div className="bg-surface border border-border rounded-[10px] p-5 mb-5 flex items-center gap-6 flex-wrap">
          <div className="shrink-0">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={allocationData} cx={65} cy={65} innerRadius={38} outerRadius={62} dataKey="value" strokeWidth={0}>
                  {allocationData.map((_, i) => (
                    <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, color: "#1a202c", fontSize: 13, fontWeight: 500, boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}
                  formatter={(v: number) => [`${v.toFixed(1)}%`, "Weight"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {allocationData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-sm">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} />
                <span className="font-semibold">{d.name}</span>
                <span className="text-muted">{d.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center gap-2.5 py-10 text-muted">
          <div className="w-5 h-5 rounded-full border-2 border-border border-t-indigo-500 animate-spin" />
          <span>Calculating…</span>
        </div>
      )}
      {error && (
        <div className="bg-negative/10 border border-negative/30 rounded-md text-red-300 px-3.5 py-2.5 text-[13px] mb-4">
          {error.message}
        </div>
      )}

      {/* Add holding form */}
      <div className="flex gap-2 mb-5 items-center flex-wrap">
        <TickerSearch
          key={searchKey}
          onSelect={(symbol) => {
            setSelectedSymbol(symbol);
            setInputError("");
            setTimeout(() => sharesRef.current?.focus(), 0);
          }}
          onDeselect={() => setSelectedSymbol("")}
          placeholder="Search ticker…"
          disabled={!portfolio}
          className="w-52"
        />
        <input
          ref={sharesRef}
          className="w-24 bg-surface-raised border border-border rounded-md text-sm px-3 py-2 text-foreground placeholder:text-muted outline-none focus:border-indigo-500 transition-colors"
          placeholder="Shares"
          type="number"
          min="0"
          step="any"
          value={sharesInput}
          onChange={(e) => setSharesInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
        />
        <input
          className="w-36 bg-surface-raised border border-border rounded-md text-sm px-3 py-2 text-foreground placeholder:text-muted outline-none focus:border-indigo-500 transition-colors"
          placeholder="Cost/share"
          type="number"
          min="0"
          step="any"
          value={costInput}
          onChange={(e) => setCostInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
        />
        <button
          onClick={handleAdd}
          disabled={!portfolio}
          className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          Add
        </button>
        {inputError && <span className="text-red-300 text-[13px] w-full">{inputError}</span>}
      </div>

      {/* Holdings table */}
      {dbHoldings.length === 0 && !isLoading ? (
        <div className="text-center py-12 px-6 text-muted">
          <h3 className="text-base font-semibold text-foreground mb-2">No holdings yet</h3>
          <p>Search for a ticker above to get started.</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-[10px] overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["Ticker", "Shares", "Price", "Value", "Day Change", "Unrealized P&L", ""].map((h) => (
                  <th
                    key={h}
                    className={`text-[11px] font-semibold text-muted uppercase tracking-wide px-3 py-2 border-b border-border whitespace-nowrap ${h === "Ticker" ? "text-left" : "text-right"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageHoldings.map((dbHolding) => {
                const result = summary?.holdings.find((h) => h.ticker === dbHolding.symbol);
                const isUp = result ? result.day_change >= 0 : true;
                const isPnlUp = result?.unrealized_gain != null ? result.unrealized_gain >= 0 : true;
                return (
                  <tr
                    key={dbHolding.id}
                    onClick={() => { onSelectTicker(dbHolding.symbol); posthog.capture("stock_viewed", { source: "portfolio" }); }}
                    className="cursor-pointer transition-colors hover:bg-surface-raised border-b border-border last:border-0"
                  >
                    <td className="px-3 py-3.5 text-left">
                      <div className="font-bold">{dbHolding.symbol}</div>
                      {result && <div className="text-xs text-muted">{result.name}</div>}
                    </td>
                    <td className="px-3 py-3.5 text-right">{dbHolding.shares}</td>
                    <td className="px-3 py-3.5 text-right">{result ? formatCurrency(result.current_price) : "—"}</td>
                    <td className="px-3 py-3.5 text-right">{result ? formatCurrency(result.market_value) : "—"}</td>
                    <td className={`px-3 py-3.5 text-right whitespace-nowrap ${result ? (isUp ? "text-positive" : "text-negative") : ""}`}>
                      {result
                        ? `${isUp ? "+" : ""}${formatCurrency(result.day_change)} (${isUp ? "+" : ""}${result.day_change_pct.toFixed(2)}%)`
                        : "—"}
                    </td>
                    <td className={`px-3 py-3.5 text-right whitespace-nowrap ${result?.unrealized_gain != null ? (isPnlUp ? "text-positive" : "text-negative") : "text-muted"}`}>
                      {result?.unrealized_gain != null
                        ? `${isPnlUp ? "+" : ""}${formatCurrency(result.unrealized_gain)} (${isPnlUp ? "+" : ""}${result.unrealized_gain_pct?.toFixed(2)}%)`
                        : "—"}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <AlertButton
                          ticker={dbHolding.symbol}
                          currentPrice={result?.current_price}
                          alert={alerts.find((a) => a.ticker === dbHolding.symbol)}
                          isOpen={openAlertTicker === dbHolding.symbol}
                          onOpen={() => setOpenAlertTicker(dbHolding.symbol)}
                          onClose={() => setOpenAlertTicker(null)}
                          onAdd={(targetPrice, direction) => addAlert(dbHolding.symbol, targetPrice, direction)}
                          onRemove={removeAlert}
                        />
                        <button
                          aria-label="Remove"
                          onClick={(e) => { e.stopPropagation(); posthog.capture("holding_removed"); removeHolding.mutate(dbHolding.id); }}
                          className="text-muted hover:text-negative px-1.5 py-1 rounded transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Paginator page={holdPage} totalPages={holdTotalPages} onPrev={holdPrev} onNext={holdNext} />
    </div>
  );
}
