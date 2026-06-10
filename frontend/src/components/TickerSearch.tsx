import { useState, useRef } from "react";
import { useSearchTickers } from "../hooks/useFinance";

interface Props {
  onSelect: (symbol: string) => void;
  onDeselect?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function TickerSearch({ onSelect, onDeselect, placeholder = "Search ticker or company…", disabled, className = "" }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: results = [] } = useSearchTickers(query);

  function handleSelect(symbol: string) {
    onSelect(symbol);
    setQuery(symbol);
    setOpen(false);
  }

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        className="w-full bg-surface-raised border border-border rounded-md text-sm px-3 py-2 text-foreground placeholder:text-muted outline-none focus:border-indigo-500 transition-colors"
        placeholder={placeholder}
        value={query}
        disabled={disabled}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); onDeselect?.(); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setOpen(false); setQuery(""); onDeselect?.(); }
          if (e.key === "Enter" && results.length > 0) handleSelect(results[0].symbol);
        }}
      />
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 z-30 mt-1 min-w-[260px] w-full bg-surface border border-border rounded-lg shadow-xl overflow-hidden">
          {results.map((r) => (
            <button
              key={r.symbol}
              onMouseDown={() => handleSelect(r.symbol)}
              className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-surface-raised text-left transition-colors"
            >
              <span className="font-bold text-sm w-14 shrink-0">{r.symbol}</span>
              <span className="text-xs text-muted truncate flex-1">{r.name}</span>
              {r.exchange && <span className="text-[10px] text-muted shrink-0">{r.exchange}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
