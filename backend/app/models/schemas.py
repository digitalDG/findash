from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone


class StockQuote(BaseModel):
    ticker: str
    name: str
    price: float
    change: float
    change_pct: float
    volume: int
    market_cap: Optional[float] = None
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PricePoint(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class HistoricalData(BaseModel):
    ticker: str
    period: str
    prices: list[PricePoint]


class PortfolioHolding(BaseModel):
    ticker: str
    shares: float
    cost_basis: Optional[float] = None


class PortfolioRequest(BaseModel):
    holdings: list[PortfolioHolding]


class HoldingResult(BaseModel):
    ticker: str
    name: str
    shares: float
    current_price: float
    market_value: float
    day_change: float
    day_change_pct: float
    cost_basis: Optional[float] = None
    total_cost: Optional[float] = None
    unrealized_gain: Optional[float] = None
    unrealized_gain_pct: Optional[float] = None


class PortfolioSummary(BaseModel):
    total_value: float
    total_day_change: float
    total_day_change_pct: float
    total_unrealized_gain: Optional[float] = None
    total_unrealized_gain_pct: Optional[float] = None
    holdings: list[HoldingResult]


# ── Watchlist DB schemas ───────────────────────────────────────────────────

class WatchlistTickerSchema(BaseModel):
    id: int
    symbol: str
    model_config = {"from_attributes": True}


class WatchlistCreate(BaseModel):
    name: str = "My Watchlist"


class WatchlistSchema(BaseModel):
    id: int
    name: str
    tickers: list[WatchlistTickerSchema] = []
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Portfolio DB schemas ───────────────────────────────────────────────────

class PortfolioHoldingSchema(BaseModel):
    id: int
    symbol: str
    shares: float
    cost_basis: Optional[float] = None
    model_config = {"from_attributes": True}


class PortfolioCreate(BaseModel):
    name: str = "My Portfolio"


class PortfolioSchema(BaseModel):
    id: int
    name: str
    holdings: list[PortfolioHoldingSchema] = []
    created_at: datetime
    model_config = {"from_attributes": True}


class AddTickerRequest(BaseModel):
    symbol: str


class AddHoldingRequest(BaseModel):
    symbol: str
    shares: float
    cost_basis: Optional[float] = None


# ── Fundamentals ───────────────────────────────────────────────────────────

class StockFundamentals(BaseModel):
    ticker: str
    pe_ratio: Optional[float] = None
    forward_pe: Optional[float] = None
    eps: Optional[float] = None
    dividend_yield: Optional[float] = None
    fifty_two_week_high: Optional[float] = None
    fifty_two_week_low: Optional[float] = None
    beta: Optional[float] = None
    sector: Optional[str] = None
    industry: Optional[str] = None


# ── News ───────────────────────────────────────────────────────────────────

class NewsItem(BaseModel):
    title: str
    url: str
    publisher: str
    published_at: datetime
    thumbnail_url: Optional[str] = None


# ── Search ─────────────────────────────────────────────────────────────────

class SearchResult(BaseModel):
    symbol: str
    name: str
    exchange: str = ""
    type: str = "Equity"
