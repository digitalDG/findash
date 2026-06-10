import { useState } from "react";
import type { PriceAlert } from "../hooks/useAlerts";

interface Props {
  ticker: string;
  currentPrice?: number;
  alert: PriceAlert | undefined;
  onAdd: (targetPrice: number, direction: "above" | "below") => void;
  onRemove: (id: string) => void;
}

export default function AlertButton({ ticker, currentPrice, alert, onAdd, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");

  function handleOpen() {
    setPrice(currentPrice?.toFixed(2) ?? "");
    setOpen(true);
  }

  async function handleSet() {
    const p = parseFloat(price);
    if (isNaN(p) || p <= 0) return;
    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      if (result !== "granted") return;
    }
    if (Notification.permission === "denied") return;
    onAdd(p, direction);
    setOpen(false);
  }

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => (open ? setOpen(false) : handleOpen())}
        className={`px-1.5 py-1 rounded transition-colors text-sm ${
          alert ? "text-yellow-400 hover:text-yellow-300" : "text-muted hover:text-foreground"
        }`}
        title={alert ? `Alert: ${alert.direction} $${alert.targetPrice.toFixed(2)}` : "Set price alert"}
      >
        🔔
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-52 bg-surface border border-border rounded-lg shadow-xl p-3">
          {alert ? (
            <div>
              <p className="text-xs text-muted mb-2">
                Active: {alert.direction} ${alert.targetPrice.toFixed(2)}
              </p>
              <button
                onClick={() => { onRemove(alert.id); setOpen(false); }}
                className="w-full text-xs text-negative hover:bg-surface-raised px-2 py-1.5 rounded transition-colors"
              >
                Remove alert
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold">{ticker} price alert</p>
              <div className="flex gap-1">
                {(["above", "below"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDirection(d)}
                    className={`flex-1 text-xs px-2 py-1 rounded capitalize transition-colors ${
                      direction === d ? "bg-indigo-500 text-white" : "bg-surface-raised text-muted"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <input
                autoFocus
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSet(); if (e.key === "Escape") setOpen(false); }}
                className="w-full bg-surface-raised border border-border rounded px-2 py-1 text-sm outline-none focus:border-indigo-500"
                placeholder="Target price"
              />
              <div className="flex gap-1">
                <button
                  onClick={handleSet}
                  className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium px-2 py-1.5 rounded transition-colors"
                >
                  Set Alert
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="text-muted hover:text-foreground text-xs px-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
