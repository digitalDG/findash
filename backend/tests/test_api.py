import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app
from app.models.schemas import StockQuote
from datetime import datetime

client = TestClient(app)


def make_mock_quote(ticker="AAPL"):
    return StockQuote(
        ticker=ticker,
        name="Apple Inc.",
        price=190.50,
        change=1.25,
        change_pct=0.66,
        volume=55_000_000,
        market_cap=3_000_000_000_000,
        fetched_at=datetime.utcnow(),
    )


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@patch("app.routers.quotes.get_quote")
def test_get_quote_success(mock_get_quote):
    mock_get_quote.return_value = make_mock_quote("AAPL")
    response = client.get("/api/quotes/AAPL")
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "AAPL"
    assert data["price"] == 190.50


@patch("app.routers.quotes.get_quote")
def test_get_quote_not_found(mock_get_quote):
    mock_get_quote.return_value = None
    response = client.get("/api/quotes/FAKEXYZ")
    assert response.status_code == 404


@patch("app.routers.portfolio.get_quotes_batch")
def test_portfolio_calculation(mock_get_quotes_batch):
    mock_get_quotes_batch.return_value = {"AAPL": make_mock_quote("AAPL")}

    payload = {"holdings": [{"ticker": "AAPL", "shares": 10}]}
    response = client.post("/api/portfolio/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total_value"] == 1905.0
    assert data["total_day_change"] == 12.5
    assert len(data["holdings"]) == 1


def test_portfolio_empty_holdings():
    payload = {"holdings": []}
    response = client.post("/api/portfolio/", json=payload)
    assert response.status_code == 400
