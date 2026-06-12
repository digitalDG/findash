import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { useQuote, useHistory, useFundamentals, useNews } from "../../hooks/useFinance";
import type { Period } from "../../types/api";

const PERIODS: Period[] = ["7d", "30d", "90d", "1y"];

function formatPrice(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatVolume(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function timeAgo(isoString: string) {
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface Props {
  ticker: string;
  onBack: () => void;
}

export default function StockDetail({ ticker, onBack }: Props) {
  const [period, setPeriod] = useState<Period>("30d");
  const { data: quote, isLoading: quoteLoading } = useQuote(ticker);
  const { data: history, isLoading: histLoading } = useHistory(ticker, period);
  const { data: fundamentals } = useFundamentals(ticker);
  const { data: news = [] } = useNews(ticker);

  const isPositive = quote ? quote.change >= 0 : true;
  const chartColor = isPositive ? "#22c55e" : "#ef4444";
  const prices     = history?.prices.map((p) => p.close) ?? [];
  const minPrice   = prices.length ? Math.min(...prices) * 0.995 : 0;
  const maxPrice   = prices.length ? Math.max(...prices) * 1.005 : 0;

  const fundamentalStats = fundamentals ? [
    fundamentals.pe_ratio     != null && { label: "P/E Ratio",      value: fundamentals.pe_ratio.toFixed(2) },
    fundamentals.forward_pe   != null && { label: "Fwd P/E",        value: fundamentals.forward_pe.toFixed(2) },
    fundamentals.eps          != null && { label: "EPS",            value: `$${fundamentals.eps.toFixed(2)}` },
    fundamentals.dividend_yield != null && { label: "Div Yield",    value: `${fundamentals.dividend_yield.toFixed(2)}%` },
    fundamentals.beta         != null && { label: "Beta",           value: fundamentals.beta.toFixed(2) },
    fundamentals.sector                && { label: "Sector",        value: fundamentals.sector },
  ].filter(Boolean) as { label: string; value: string }[] : [];

  return (
    <div>
      {/* Back row */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="bg-surface-raised hover:bg-border text-foreground text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-xl font-bold">{ticker}</h2>
        {quote && <span className="text-muted text-sm">{quote.name}</span>}
        {fundamentals?.industry && (
          <span className="text-xs text-muted bg-surface-raised px-2 py-1 rounded-md hidden sm:block">
            {fundamentals.industry}
          </span>
        )}
      </div>

      {quoteLoading && (
        <div className="flex items-center justify-center gap-2.5 py-10 text-muted">
          <div className="w-5 h-5 rounded-full border-2 border-border border-t-indigo-500 animate-spin" />
        </div>
      )}

      {quote && (
        <>
          {/* Price hero */}
          <div className="flex items-end gap-4 mb-6">
            <div className="text-[36px] font-extrabold leading-none">{formatPrice(quote.price)}</div>
            <div className={`text-base font-semibold pb-0.5 ${isPositive ? "text-positive" : "text-negative"}`}>
              {isPositive ? "+" : ""}{formatPrice(quote.change)} ({isPositive ? "+" : ""}{quote.change_pct.toFixed(2)}%)
            </div>
          </div>

          {/* Period selector */}
          <div className="flex gap-1 mb-4">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-md text-[13px] transition-colors border ${
                  period === p
                    ? "bg-indigo-500 border-indigo-500 text-white"
                    : "bg-surface-raised border-border text-muted hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-surface border border-border rounded-[10px] px-2 py-5 mb-4">
            {histLoading ? (
              <div className="flex items-center justify-center h-60">
                <div className="w-5 h-5 rounded-full border-2 border-border border-t-indigo-500 animate-spin" />
              </div>
            ) : history ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={history.prices} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={chartColor} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2e42" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#7b7f94", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) => {
                      const d = new Date(v);
                      return period === "1y"
                        ? d.toLocaleDateString("en-US", { month: "short" })
                        : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[minPrice, maxPrice]}
                    tick={{ fill: "#7b7f94", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                    width={56}
                  />
                  <Tooltip
                    contentStyle={{ background: "#1a1d27", border: "1px solid #2a2e42", borderRadius: 8, color: "#e8eaf0" }}
                    formatter={(value: number) => [formatPrice(value), "Close"]}
                    labelFormatter={(label: string) =>
                      new Date(label).toLocaleDateString("en-US", {
                        weekday: "short", month: "short", day: "numeric", year: "numeric",
                      })
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke={chartColor}
                    strokeWidth={2}
                    fill="url(#colorGradient)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </div>

          {/* Stats grid — market data + fundamentals */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 mb-6">
            <div className="bg-surface-raised rounded-lg p-3.5">
              <div className="text-[11px] text-muted uppercase tracking-wide">Volume</div>
              <div className="text-base font-bold mt-1">{formatVolume(quote.volume)}</div>
            </div>
            {quote.market_cap && (
              <div className="bg-surface-raised rounded-lg p-3.5">
                <div className="text-[11px] text-muted uppercase tracking-wide">Market Cap</div>
                <div className="text-base font-bold mt-1">{formatVolume(quote.market_cap)}</div>
              </div>
            )}
            {history && history.prices.length >= 2 && (
              <>
                <div className="bg-surface-raised rounded-lg p-3.5">
                  <div className="text-[11px] text-muted uppercase tracking-wide">Period High</div>
                  <div className="text-base font-bold mt-1 text-positive">
                    {formatPrice(Math.max(...history.prices.map((p) => p.high)))}
                  </div>
                </div>
                <div className="bg-surface-raised rounded-lg p-3.5">
                  <div className="text-[11px] text-muted uppercase tracking-wide">Period Low</div>
                  <div className="text-base font-bold mt-1 text-negative">
                    {formatPrice(Math.min(...history.prices.map((p) => p.low)))}
                  </div>
                </div>
              </>
            )}
            {fundamentals?.fifty_two_week_high != null && (
              <div className="bg-surface-raised rounded-lg p-3.5">
                <div className="text-[11px] text-muted uppercase tracking-wide">52W High</div>
                <div className="text-base font-bold mt-1 text-positive">{formatPrice(fundamentals.fifty_two_week_high)}</div>
              </div>
            )}
            {fundamentals?.fifty_two_week_low != null && (
              <div className="bg-surface-raised rounded-lg p-3.5">
                <div className="text-[11px] text-muted uppercase tracking-wide">52W Low</div>
                <div className="text-base font-bold mt-1 text-negative">{formatPrice(fundamentals.fifty_two_week_low)}</div>
              </div>
            )}
            {fundamentalStats.map((s) => (
              <div key={s.label} className="bg-surface-raised rounded-lg p-3.5">
                <div className="text-[11px] text-muted uppercase tracking-wide">{s.label}</div>
                <div className="text-base font-bold mt-1">{s.value}</div>
              </div>
            ))}
          </div>

          {/* News feed */}
          {news.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Latest News</h3>
              <div className="flex flex-col gap-2">
                {news.map((item, i) => (
                  <a
                    key={i}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-surface border border-border rounded-lg px-4 py-3 hover:bg-surface-raised transition-colors group"
                  >
                    <div className="text-sm font-medium group-hover:text-indigo-400 transition-colors leading-snug">
                      {item.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted">
                      <span>{item.publisher}</span>
                      <span>·</span>
                      <span>{timeAgo(item.published_at)}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
