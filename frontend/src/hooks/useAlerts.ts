import { useState, useCallback } from "react";

export interface PriceAlert {
  id: string;
  ticker: string;
  targetPrice: number;
  direction: "above" | "below";
}

const KEY = "findash_price_alerts";

function load(): PriceAlert[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); }
  catch { return []; }
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>(load);

  function save(next: PriceAlert[]) {
    setAlerts(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  function addAlert(ticker: string, targetPrice: number, direction: "above" | "below") {
    save([...alerts, { id: `${ticker}-${Date.now()}`, ticker, targetPrice, direction }]);
  }

  function removeAlert(id: string) {
    save(alerts.filter((a) => a.id !== id));
  }

  const checkAndFire = useCallback(
    (prices: { ticker: string; price: number }[]) => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted" || alerts.length === 0) return;
      const fired: PriceAlert[] = [];
      const remaining = alerts.filter((alert) => {
        const q = prices.find((p) => p.ticker === alert.ticker);
        if (!q) return true;
        const hit =
          alert.direction === "above"
            ? q.price >= alert.targetPrice
            : q.price <= alert.targetPrice;
        if (hit) fired.push(alert);
        return !hit;
      });
      if (fired.length === 0) return;
      fired.forEach((a) => {
        new Notification(`${a.ticker} Price Alert`, {
          body: `${a.ticker} is now ${a.direction === "above" ? "≥" : "≤"} $${a.targetPrice.toFixed(2)}`,
        });
      });
      save(remaining);
    },
    [alerts],
  );

  return { alerts, addAlert, removeAlert, checkAndFire };
}
