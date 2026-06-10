from fastapi import APIRouter, Query
from app.models.schemas import SearchResult
from app.services.market_data import search_tickers

router = APIRouter()


@router.get("/", response_model=list[SearchResult])
def search(q: str = Query(..., min_length=1, description="Ticker symbol or company name")):
    return search_tickers(q.strip())
