from fastapi import APIRouter
from app.models.schemas import NewsItem
from app.services.market_data import get_news

router = APIRouter()


@router.get("/{ticker}", response_model=list[NewsItem])
def fetch_news(ticker: str):
    return get_news(ticker.upper())
