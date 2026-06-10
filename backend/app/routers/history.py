from fastapi import APIRouter, HTTPException, Query
from typing import Literal
from app.models.schemas import HistoricalData
from app.services.market_data import get_history

router = APIRouter()

PeriodType = Literal["7d", "30d", "90d", "1y"]


@router.get("/{ticker}", response_model=HistoricalData)
def fetch_history(
    ticker: str,
    period: PeriodType = Query(default="30d", description="Time period: 7d, 30d, 90d, 1y"),
):
    """Get historical price data for a ticker."""
    data = get_history(ticker.upper(), period)
    if not data:
        raise HTTPException(status_code=404, detail=f"No history found for '{ticker}'")
    return data
