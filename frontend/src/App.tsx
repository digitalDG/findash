import { useState } from "react";
import Watchlist from "./components/Watchlist";
import StockDetail from "./components/StockDetail";
import Portfolio from "./components/Portfolio";
import "./index.css";

type Tab = "watchlist" | "portfolio";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("watchlist");
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setSelectedTicker(null);
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-surface border-b border-border sticky top-0 z-10">
        <div className="max-w-[1100px] mx-auto px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2 font-bold text-lg">
            <span>📈</span>
            <span>FinDash</span>
          </div>
          <nav className="flex gap-1">
            {(["watchlist", "portfolio"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => switchTab(tab)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? "bg-surface-raised text-foreground"
                    : "text-muted hover:text-foreground hover:bg-surface-raised"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-6 py-8 w-full">
        {selectedTicker ? (
          <StockDetail ticker={selectedTicker} onBack={() => setSelectedTicker(null)} />
        ) : activeTab === "watchlist" ? (
          <Watchlist onSelectTicker={setSelectedTicker} />
        ) : (
          <Portfolio onSelectTicker={setSelectedTicker} />
        )}
      </main>
    </div>
  );
}
