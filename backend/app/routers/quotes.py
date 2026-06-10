from fastapi import APIRouter, HTTPException
from app.models.schemas import StockQuote
from app.services.market_data import get_quote, get_quotes_batch

router = APIRouter()


@router.get("/{ticker}", response_model=StockQuote)
def fetch_quote(ticker: str):
    """Get current quote for a single ticker."""
    quote = get_quote(ticker.upper())
    if not quote:
        raise HTTPException(status_code=404, detail=f"Ticker '{ticker}' not found or unavailable")
    return quote


@router.get("/batch/{tickers}", response_model=list[StockQuote])
def fetch_batch_quotes(tickers: str):
    """Get quotes for multiple tickers (comma-separated, e.g. AAPL,MSFT,GOOG)."""
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if len(ticker_list) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 tickers per batch request")

    quotes = get_quotes_batch(ticker_list)
    return [q for q in quotes.values() if q is not None]
