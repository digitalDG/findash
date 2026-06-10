import time
import threading
import pandas as pd
import yfinance as yf
from typing import Optional

from app.models.schemas import StockQuote, HistoricalData, PricePoint, StockFundamentals, NewsItem, SearchResult
from app.services.cache import cache
from app.core.config import settings

QUOTE_TTL = settings.quote_ttl
HISTORY_TTL = settings.history_ttl
NAME_TTL = settings.name_ttl


# ── Cache helpers ──────────────────────────────────────────────────────────

def _get_quote(key: str) -> Optional[StockQuote]:
    raw = cache.get(key)
    return StockQuote.model_validate_json(raw) if raw else None


def _set_quote(key: str, quote: StockQuote, ttl: Optional[int] = QUOTE_TTL) -> None:
    cache.set(key, quote.model_dump_json(), ttl=ttl)


def _get_history(key: str) -> Optional[HistoricalData]:
    raw = cache.get(key)
    return HistoricalData.model_validate_json(raw) if raw else None


def _set_history(key: str, data: HistoricalData, ttl: Optional[int] = HISTORY_TTL) -> None:
    cache.set(key, data.model_dump_json(), ttl=ttl)


# ── Name / market-cap cache (24 h, background fetch) ──────────────────────

def _fetch_name_background(ticker: str) -> None:
    """Fetch company name in a daemon thread; writes to cache when done."""
    try:
        info = yf.Ticker(ticker).info
        name = info.get("longName") or info.get("shortName", ticker)
        mc = info.get("marketCap")
        import json
        cache.set(f"name:{ticker}", json.dumps({"name": name, "mc": mc}), ttl=NAME_TTL)
        # Invalidate fresh quote so the next poll picks up the real name
        cache.delete(f"quote:{ticker}")
    except Exception:
        pass


def _name_and_cap(ticker: str) -> tuple[str, Optional[int]]:
    import json
    raw = cache.get(f"name:{ticker}")
    if raw:
        d = json.loads(raw)
        return d["name"], d.get("mc")
    threading.Thread(target=_fetch_name_background, args=(ticker,), daemon=True).start()
    return ticker, None   # placeholder until background completes


# ── yfinance helpers ───────────────────────────────────────────────────────

def _extract(df: pd.DataFrame, field: str, ticker: str) -> pd.Series:
    if isinstance(df.columns, pd.MultiIndex):
        return df[field][ticker].dropna()
    return df[field].dropna()


def _quote_from_fast_info(ticker: str) -> Optional[StockQuote]:
    """Lightweight fallback when download fails."""
    try:
        fi = yf.Ticker(ticker).fast_info
        price = float(fi.last_price)
        prev = float(fi.previous_close) if fi.previous_close else price
        change = round(price - prev, 4)
        pct = round((change / prev) * 100, 2) if prev else 0.0
        name, mc = _name_and_cap(ticker)
        return StockQuote(
            ticker=ticker, name=name,
            price=round(price, 2), change=change, change_pct=pct,
            volume=0, market_cap=mc,
        )
    except Exception:
        return None


# ── Public API ─────────────────────────────────────────────────────────────

def get_quotes_batch(tickers: list[str]) -> dict[str, Optional[StockQuote]]:
    """
    Fetch all quotes in one yf.download() call.
    Stale-on-failure: if a live fetch fails, returns the last cached value
    (stored indefinitely under stale:quote:{ticker}) rather than None.
    """
    results: dict[str, Optional[StockQuote]] = {}
    missing: list[str] = []

    for ticker in tickers:
        q = _get_quote(f"quote:{ticker}")
        if q:
            results[ticker] = q
        else:
            missing.append(ticker)

    if not missing:
        return results

    # ── Attempt 1: batch download ──────────────────────────────────────────
    fresh: dict[str, Optional[StockQuote]] = {}
    for attempt in range(2):
        try:
            df = yf.download(
                " ".join(missing),
                period="2d",
                progress=False,
                auto_adjust=True,
            )
            if not df.empty:
                for ticker in missing:
                    try:
                        closes  = _extract(df, "Close",  ticker)
                        volumes = _extract(df, "Volume", ticker)
                        if closes.empty:
                            continue
                        price = round(float(closes.iloc[-1]), 2)
                        prev  = round(float(closes.iloc[-2]), 2) if len(closes) >= 2 else price
                        change = round(price - prev, 4)
                        pct    = round((change / prev) * 100, 2) if prev else 0.0
                        vol    = int(volumes.iloc[-1]) if not volumes.empty else 0
                        name, mc = _name_and_cap(ticker)
                        fresh[ticker] = StockQuote(
                            ticker=ticker, name=name, price=price,
                            change=change, change_pct=pct,
                            volume=vol, market_cap=mc,
                        )
                    except Exception as e:
                        print(f"  parse error {ticker}: {e}")
                break
        except Exception as e:
            print(f"Batch download attempt {attempt + 1} failed: {e}")
            if attempt == 0:
                time.sleep(1)

    # ── Attempt 2: fast_info for any still-missing ─────────────────────────
    for ticker in missing:
        if ticker not in fresh:
            q = _quote_from_fast_info(ticker)
            if q:
                fresh[ticker] = q

    # ── Commit; fall back to stale cache on failure ────────────────────────
    for ticker in missing:
        quote = fresh.get(ticker)
        if quote:
            _set_quote(f"quote:{ticker}", quote, ttl=QUOTE_TTL)
            _set_quote(f"stale:quote:{ticker}", quote, ttl=None)  # permanent
            results[ticker] = quote
        else:
            stale = _get_quote(f"stale:quote:{ticker}")
            results[ticker] = stale  # may still be None on very first failure

    return results


def get_quote(ticker: str) -> Optional[StockQuote]:
    ticker = ticker.upper()
    q = _get_quote(f"quote:{ticker}")
    if q:
        return q
    return get_quotes_batch([ticker]).get(ticker)


# ── History ────────────────────────────────────────────────────────────────

PERIOD_MAP = {
    "7d":  ("7d",  "1d"),
    "30d": ("1mo", "1d"),
    "90d": ("3mo", "1d"),
    "1y":  ("1y",  "1wk"),
}


def get_history(ticker: str, period: str = "30d") -> Optional[HistoricalData]:
    fresh_key = f"history:{ticker.upper()}:{period}"
    stale_key = f"stale:history:{ticker.upper()}:{period}"

    cached = _get_history(fresh_key)
    if cached:
        return cached

    yf_period, interval = PERIOD_MAP.get(period, ("1mo", "1d"))

    for attempt in range(2):
        try:
            df = yf.download(
                ticker,
                period=yf_period,
                interval=interval,
                progress=False,
                auto_adjust=True,
            )
            if df.empty:
                if attempt == 0:
                    time.sleep(1)
                    continue
                break

            opens   = _extract(df, "Open",   ticker)
            highs   = _extract(df, "High",   ticker)
            lows    = _extract(df, "Low",    ticker)
            closes  = _extract(df, "Close",  ticker)
            volumes = _extract(df, "Volume", ticker)

            prices = []
            for idx in closes.index:
                try:
                    prices.append(PricePoint(
                        date=str(idx.date()),
                        open=round(float(opens[idx]),   2),
                        high=round(float(highs[idx]),   2),
                        low=round(float(lows[idx]),     2),
                        close=round(float(closes[idx]), 2),
                        volume=int(volumes[idx]),
                    ))
                except Exception:
                    continue

            if not prices:
                break

            result = HistoricalData(ticker=ticker.upper(), period=period, prices=prices)
            _set_history(fresh_key, result, ttl=HISTORY_TTL)
            _set_history(stale_key, result, ttl=None)   # permanent stale copy
            return result

        except Exception as e:
            print(f"History attempt {attempt + 1} for {ticker}: {e}")
            if attempt == 0:
                time.sleep(1)

    return _get_history(stale_key)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _safe_float(val: object, ndigits: int = 2) -> Optional[float]:
    try:
        f = float(val)  # type: ignore[arg-type]
        if f != f or abs(f) == float("inf"):
            return None
        return round(f, ndigits)
    except (TypeError, ValueError):
        return None


# ── Fundamentals ──────────────────────────────────────────────────────────────

def get_fundamentals(ticker: str) -> Optional[StockFundamentals]:
    key = f"fundamentals:{ticker.upper()}"
    raw = cache.get(key)
    if raw:
        return StockFundamentals.model_validate_json(raw)
    try:
        info = yf.Ticker(ticker.upper()).info
        div_raw = info.get("dividendYield")
        result = StockFundamentals(
            ticker=ticker.upper(),
            pe_ratio=_safe_float(info.get("trailingPE")),
            forward_pe=_safe_float(info.get("forwardPE")),
            eps=_safe_float(info.get("trailingEps")),
            dividend_yield=_safe_float(div_raw) if div_raw else None,
            fifty_two_week_high=_safe_float(info.get("fiftyTwoWeekHigh")),
            fifty_two_week_low=_safe_float(info.get("fiftyTwoWeekLow")),
            beta=_safe_float(info.get("beta")),
            sector=info.get("sector") or None,
            industry=info.get("industry") or None,
        )
        cache.set(key, result.model_dump_json(), ttl=3600)
        return result
    except Exception:
        return None


# ── News ──────────────────────────────────────────────────────────────────────

def get_news(ticker: str) -> list[NewsItem]:
    import json as _json
    from datetime import datetime, timezone

    key = f"news:{ticker.upper()}"
    raw = cache.get(key)
    if raw:
        return [NewsItem.model_validate(item) for item in _json.loads(raw)]

    try:
        raw_news = yf.Ticker(ticker.upper()).get_news() or []
        items: list[NewsItem] = []
        for item in raw_news[:10]:
            try:
                if not isinstance(item, dict):
                    continue

                # yfinance 1.x — everything is nested under "content"
                c = item.get("content") if isinstance(item.get("content"), dict) else item

                title = c.get("title", "")
                url = (
                    (c.get("clickThroughUrl") or {}).get("url")
                    or (c.get("canonicalUrl") or {}).get("url")
                    or c.get("link", "")
                )
                if not title or not url:
                    continue

                pub_date = c.get("pubDate") or c.get("displayTime")
                if pub_date:
                    published_at = datetime.fromisoformat(pub_date.replace("Z", "+00:00"))
                else:
                    pub_ts = c.get("providerPublishTime")
                    published_at = (
                        datetime.fromtimestamp(pub_ts, tz=timezone.utc)
                        if pub_ts else datetime.now(timezone.utc)
                    )

                provider = c.get("provider") or {}
                publisher = (
                    provider.get("displayName") or provider.get("name")
                    or c.get("publisher", "")
                )

                thumbnail = None
                thumb = c.get("thumbnail")
                if isinstance(thumb, dict):
                    thumbnail = thumb.get("originalUrl") or thumb.get("url")
                    if not thumbnail:
                        for res in (thumb.get("resolutions") or []):
                            if isinstance(res, dict) and res.get("url"):
                                thumbnail = res["url"]
                                break

                items.append(NewsItem(
                    title=title,
                    url=url,
                    publisher=publisher,
                    published_at=published_at,
                    thumbnail_url=thumbnail,
                ))
            except Exception:
                continue
        cache.set(key, _json.dumps([i.model_dump(mode="json") for i in items]), ttl=900)
        return items
    except Exception:
        return []


# ── Search ────────────────────────────────────────────────────────────────────

def search_tickers(query: str) -> list[SearchResult]:
    import json as _json

    key = f"search:{query.lower().strip()}"
    raw = cache.get(key)
    if raw:
        return [SearchResult.model_validate(r) for r in _json.loads(raw)]

    try:
        from yfinance import Search
        results = Search(query, max_results=8, news_count=0)
        items: list[SearchResult] = []
        for r in results.quotes or []:
            if not isinstance(r, dict):
                continue
            symbol = r.get("symbol", "")
            if not symbol:
                continue
            items.append(SearchResult(
                symbol=symbol,
                name=r.get("shortName") or r.get("longName", symbol),
                exchange=r.get("exchDisp", ""),
                type=r.get("typeDisp", "Equity"),
            ))
        cache.set(key, _json.dumps([i.model_dump() for i in items]), ttl=300)
        return items
    except Exception:
        return []
