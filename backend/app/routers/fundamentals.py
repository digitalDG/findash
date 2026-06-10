from fastapi import APIRouter, HTTPException
from app.models.schemas import StockFundamentals
from app.services.market_data import get_fundamentals

router = APIRouter()


@router.get("/{ticker}", response_model=StockFundamentals)
def fetch_fundamentals(ticker: str):
    data = get_fundamentals(ticker.upper())
    if not data:
        raise HTTPException(status_code=404, detail=f"Fundamentals not available for '{ticker}'")
    return data
