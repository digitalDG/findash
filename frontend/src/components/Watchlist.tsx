import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useWatchlists,
  useCreateWatchlist,
  useDeleteWatchlist,
  useAddWatchlistTicker,
  useRemoveWatchlistTicker,
  useBatchQuotes,
} from "../hooks/useFinance";
import { RefreshCw, Download, X } from "lucide-react";
import TickerSearch from "./TickerSearch";
import Paginator from "./Paginator";
import AlertButton from "./AlertButton";
import { usePagination } from "../hooks/usePagination";
import { useAlerts } from "../hooks/useAlerts";
import { downloadCsv } from "../utils/exportCsv";
import type { StockQuote } from "../types/api";

const DEFAULT_TICKERS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"];

function formatPrice(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatChange(quote: StockQuote) {
  const sign = quote.change >= 0 ? "+" : "";
  return `${sign}${formatPrice(quote.change)} (${sign}${quote.change_pct.toFixed(2)}%)`;
}

interface Props {
  onSelectTicker: (ticker: string) => void;
}

export default function Watchlist({ onSelectTicker }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [openAlertTicker, setOpenAlertTicker] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);
  const queryClient = useQueryClient();

  const { data: watchlists = [], isLoading: loadingWatchlists } = useWatchlists();
  const createWatchlist = useCreateWatchlist();
  const deleteWatchlist = useDeleteWatchlist();

  // Auto-create a default watchlist on first load
  useEffect(() => {
    if (!loadingWatchlists && watchlists.length === 0 && !seeded && !createWatchlist.isPending) {
      setSeeded(true);
      createWatchlist.mutate("My Watchlist");
    }
  }, [loadingWatchlists, watchlists.length, seeded, createWatchlist]);

  // Keep selectedId pointing at a valid watchlist
  useEffect(() => {
    if (watchlists.length > 0) {
      setSelectedId((prev) => {
        if (prev && watchlists.find((w) => w.id === prev)) return prev;
        return watchlists[0].id;
      });
    }
  }, [watchlists]);

  const watchlist = watchlists.find((w) => w.id === selectedId) ?? watchlists[0] ?? null;
  const watchlistId = watchlist?.id ?? 0;
  const tickers = watchlist?.tickers.map((t) => t.symbol) ?? [];

  const { pageItems: pageTickers, page: tickerPage, totalPages: tickerTotalPages, goPrev: tickerPrev, goNext: tickerNext } =
    usePagination(tickers, 10, watchlistId);

  const addTicker = useAddWatchlistTicker(watchlistId);
  const removeTicker = useRemoveWatchlistTicker(watchlistId);

  // Seed default tickers into a freshly created watchlist
  useEffect(() => {
    if (watchlist && watchlist.tickers.length === 0 && seeded) {
      DEFAULT_TICKERS.forEach((sym) => addTicker.mutate(sym));
    }
  }, [watchlist?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: quotes = [], isLoading: loadingQuotes, error } = useBatchQuotes(tickers);
  const { alerts, addAlert, removeAlert, checkAndFire } = useAlerts();

  useEffect(() => {
    if (quotes.length > 0) checkAndFire(quotes.map((q) => ({ ticker: q.ticker, price: q.price })));
  }, [quotes]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleAdd(symbol: string) {
    if (!symbol || tickers.includes(symbol)) return;
    addTicker.mutate(symbol);
  }

  function handleRemoveTicker(symbol: string, e: React.MouseEvent) {
    e.stopPropagation();
    removeTicker.mutate(symbol);
  }

  function handleCreateWatchlist() {
    const name = newName.trim() || "New Watchlist";
    createWatchlist.mutate(name, {
      onSuccess: (wl) => {
        setSelectedId(wl.id);
        setCreatingNew(false);
        setNewName("");
      },
    });
  }

  function handleDeleteWatchlist(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (watchlists.length <= 1) return; // keep at least one
    deleteWatchlist.mutate(id);
  }

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["quotes", tickers] });
  }

  function exportCsv() {
    const rows = [
      ["Ticker", "Name", "Price", "Change ($)", "Change (%)"],
      ...tickers.map((ticker) => {
        const q = quoteMap.get(ticker);
        return [ticker, q?.name ?? "", q ? String(q.price) : "", q ? String(q.change) : "", q ? String(q.change_pct) : ""];
      }),
    ];
    downloadCsv(`${watchlist?.name ?? "watchlist"}.csv`, rows);
  }

  const quoteMap = new Map(quotes.map((q) => [q.ticker, q]));
  const isLoading = loadingWatchlists || loadingQuotes;

  return (
    <div>
      {/* Watchlist tabs */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {watchlists.map((wl) => (
          <div key={wl.id} className="relative group">
            <button
              onClick={() => setSelectedId(wl.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors pr-6 ${
                wl.id === watchlist?.id
                  ? "bg-indigo-500 text-white"
                  : "bg-surface-raised text-muted hover:text-foreground"
              }`}
            >
              {wl.name}
            </button>
            {watchlists.length > 1 && (
              <button
                onClick={(e) => handleDeleteWatchlist(wl.id, e)}
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded opacity-0 group-hover:opacity-100 transition-opacity px-0.5 ${
                  wl.id === watchlist?.id ? "text-white/70 hover:text-white" : "text-muted hover:text-negative"
                }`}
              >
                <X size={10} />
              </button>
            )}
          </div>
        ))}

        {creatingNew ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              className="w-32 bg-surface-raised border border-indigo-500 rounded-md text-sm px-2 py-1.5 text-foreground outline-none"
              placeholder="Watchlist name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateWatchlist();
                if (e.key === "Escape") { setCreatingNew(false); setNewName(""); }
              }}
            />
            <button
              onClick={handleCreateWatchlist}
              className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => { setCreatingNew(false); setNewName(""); }}
              className="text-muted hover:text-foreground text-xs px-1.5 py-1.5"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreatingNew(true)}
            className="px-3 py-1.5 rounded-md text-sm text-muted hover:text-foreground hover:bg-surface-raised transition-colors"
          >
            + New
          </button>
        )}
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2 mb-5">
        <h2 className="text-lg font-bold flex-1">{watchlist?.name ?? "Watchlist"}</h2>
        <TickerSearch
          onSelect={handleAdd}
          placeholder="Add ticker…"
          disabled={!watchlist}
          className="w-48"
        />
        <button
          onClick={exportCsv}
          disabled={tickers.length === 0}
          className="bg-surface-raised hover:bg-border text-foreground text-sm font-medium px-3 py-2 rounded-md transition-colors disabled:opacity-40 flex items-center gap-1.5"
        >
          <Download size={14} />
          CSV
        </button>
        <button
          onClick={refresh}
          className="bg-surface-raised hover:bg-border text-foreground text-sm font-medium px-3 py-2 rounded-md transition-colors flex items-center gap-1.5"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-negative/10 border border-negative/30 rounded-md text-red-300 px-3.5 py-2.5 text-[13px] mb-4">
          {(error as Error).message}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center gap-2.5 py-10 text-muted">
          <div className="w-5 h-5 rounded-full border-2 border-border border-t-indigo-500 animate-spin" />
          <span>Fetching quotes…</span>
        </div>
      )}

      {!isLoading && tickers.length === 0 && (
        <div className="text-center py-12 px-6 text-muted">
          <h3 className="text-base font-semibold text-foreground mb-2">Your watchlist is empty</h3>
          <p>Search for a ticker above to get started.</p>
        </div>
      )}

      {!isLoading && tickers.length > 0 && (
        <div className="bg-surface border border-border rounded-[10px] p-5">
          {pageTickers.map((ticker) => {
            const q = quoteMap.get(ticker);
            const isUp = q ? q.change >= 0 : true;
            return (
              <div
                key={ticker}
                onClick={() => onSelectTicker(ticker)}
                className="grid grid-cols-[1fr_110px_90px_90px_auto_auto] items-center gap-3 py-3.5 border-b border-border last:border-0 cursor-pointer rounded-md transition-all hover:bg-surface-raised hover:px-2"
              >
                <div>
                  <div className="font-bold text-[15px]">{ticker}</div>
                  {q && <div className="text-xs text-muted mt-0.5">{q.name}</div>}
                </div>
                <div className="font-semibold text-right">
                  {q ? formatPrice(q.price) : <span className="text-muted">—</span>}
                </div>
                <div className={`text-right text-[13px] ${q ? (isUp ? "text-positive" : "text-negative") : ""}`}>
                  {q ? `${isUp ? "+" : ""}${q.change_pct.toFixed(2)}%` : "—"}
                </div>
                <div className={`text-right text-xs ${q ? (isUp ? "text-positive" : "text-negative") : ""}`}>
                  {q ? formatChange(q) : ""}
                </div>
                <AlertButton
                  ticker={ticker}
                  currentPrice={q?.price}
                  alert={alerts.find((a) => a.ticker === ticker)}
                  isOpen={openAlertTicker === ticker}
                  onOpen={() => setOpenAlertTicker(ticker)}
                  onClose={() => setOpenAlertTicker(null)}
                  onAdd={(targetPrice, direction) => addAlert(ticker, targetPrice, direction)}
                  onRemove={removeAlert}
                />
                <button
                  aria-label="Remove"
                  onClick={(e) => handleRemoveTicker(ticker, e)}
                  className="text-muted hover:text-negative px-1.5 py-1 rounded transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
          <Paginator page={tickerPage} totalPages={tickerTotalPages} onPrev={tickerPrev} onNext={tickerNext} />
        </div>
      )}
    </div>
  );
}
