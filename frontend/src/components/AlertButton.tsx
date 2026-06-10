import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Bell } from "lucide-react";
import type { PriceAlert } from "../hooks/useAlerts";

interface Props {
  ticker: string;
  currentPrice?: number;
  alert: PriceAlert | undefined;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onAdd: (targetPrice: number, direction: "above" | "below") => void;
  onRemove: (id: string) => void;
}

export default function AlertButton({ ticker, currentPrice, alert, isOpen, onOpen, onClose, onAdd, onRemove }: Props) {
  const [price, setPrice] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropPos, setDropPos] = useState({ top: 0, right: 0 });

  function handleOpen() {
    setPrice(currentPrice?.toFixed(2) ?? "");
    setDirection("above");
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    onOpen();
  }

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      const t = e.target as Node;
      if (!buttonRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  async function handleSet() {
    const p = parseFloat(price);
    if (isNaN(p) || p <= 0) return;
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    onAdd(p, direction);
    onClose();
  }

  const dropdown = isOpen
    ? createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-50 w-56 bg-surface border border-border rounded-lg shadow-xl p-3"
          style={{ top: dropPos.top, right: dropPos.right }}
        >
          {alert ? (
            <div>
              <p className="text-xs text-muted mb-2">
                Active: {alert.direction} ${alert.targetPrice.toFixed(2)}
              </p>
              <button
                onClick={() => { onRemove(alert.id); onClose(); }}
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
                onKeyDown={(e) => { if (e.key === "Enter") handleSet(); if (e.key === "Escape") onClose(); }}
                className="w-full bg-surface-raised border border-border rounded px-2 py-1 text-sm outline-none focus:border-indigo-500"
                placeholder="Target price"
              />
              <p className="text-xs text-muted">Email alert sent to your account</p>
              <div className="flex gap-1">
                <button
                  onClick={handleSet}
                  className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium px-2 py-1.5 rounded transition-colors"
                >
                  Set Alert
                </button>
                <button
                  onClick={onClose}
                  className="text-muted hover:text-foreground text-xs px-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>,
        document.body,
      )
    : null;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        onClick={() => (isOpen ? onClose() : handleOpen())}
        className={`px-1.5 py-1 rounded transition-colors ${
          alert ? "text-yellow-400 hover:text-yellow-300" : "text-muted hover:text-foreground"
        }`}
        title={alert ? `Alert: ${alert.direction} $${alert.targetPrice.toFixed(2)}` : "Set price alert"}
      >
        <Bell size={15} fill={alert ? "currentColor" : "none"} />
      </button>
      {dropdown}
    </div>
  );
}
