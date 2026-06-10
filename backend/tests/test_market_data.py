"""Tests for market data endpoints: quotes, history, fundamentals, news, search, portfolio calc."""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from datetime import datetime, timezone
from app.main import app
from app.models.schemas import StockQuote, HistoricalData, PricePoint, StockFundamentals, NewsItem, SearchResult

_NOW = datetime.now(timezone.utc)

client = TestClient(app)


def make_quote(ticker="AAPL", price=190.50, change=1.25, change_pct=0.66):
    return StockQuote(
        ticker=ticker,
        name="Apple Inc.",
        price=price,
        change=change,
        change_pct=change_pct,
        volume=55_000_000,
        market_cap=3_000_000_000_000,
        fetched_at=datetime.now(timezone.utc),
    )


def make_history(ticker="AAPL", period="30d"):
    return HistoricalData(
        ticker=ticker,
        period=period,
        prices=[
            PricePoint(date="2024-01-01", open=185.0, high=192.0, low=184.0, close=190.0, volume=50_000_000),
            PricePoint(date="2024-01-02", open=190.0, high=196.0, low=188.0, close=195.0, volume=45_000_000),
        ],
    )


# ── Quotes ──────────────────────────────────────────────────────────────────

class TestQuotes:
    @patch("app.routers.quotes.get_quote")
    def test_get_quote_success(self, mock):
        mock.return_value = make_quote("AAPL")
        r = client.get("/api/quotes/AAPL")
        assert r.status_code == 200
        data = r.json()
        assert data["ticker"] == "AAPL"
        assert data["price"] == 190.50
        assert data["change_pct"] == 0.66

    @patch("app.routers.quotes.get_quote")
    def test_get_quote_ticker_uppercased(self, mock):
        mock.return_value = make_quote("AAPL")
        client.get("/api/quotes/aapl")
        mock.assert_called_once_with("AAPL")

    @patch("app.routers.quotes.get_quote")
    def test_get_quote_not_found(self, mock):
        mock.return_value = None
        r = client.get("/api/quotes/FAKEXYZ")
        assert r.status_code == 404

    @patch("app.routers.quotes.get_quotes_batch")
    def test_batch_quotes(self, mock):
        mock.return_value = {"AAPL": make_quote("AAPL"), "MSFT": make_quote("MSFT")}
        r = client.get("/api/quotes/batch/AAPL,MSFT")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 2
        tickers = {q["ticker"] for q in data}
        assert tickers == {"AAPL", "MSFT"}


# ── History ──────────────────────────────────────────────────────────────────

class TestHistory:
    @patch("app.routers.history.get_history")
    def test_get_history_success(self, mock):
        mock.return_value = make_history("AAPL", "30d")
        r = client.get("/api/history/AAPL")
        assert r.status_code == 200
        data = r.json()
        assert data["ticker"] == "AAPL"
        assert data["period"] == "30d"
        assert len(data["prices"]) == 2

    @patch("app.routers.history.get_history")
    def test_get_history_custom_period(self, mock):
        mock.return_value = make_history("TSLA", "1y")
        r = client.get("/api/history/TSLA?period=1y")
        assert r.status_code == 200
        mock.assert_called_once_with("TSLA", "1y")

    @patch("app.routers.history.get_history")
    def test_get_history_not_found(self, mock):
        mock.return_value = None
        r = client.get("/api/history/FAKEXYZ")
        assert r.status_code == 404

    def test_get_history_invalid_period(self):
        r = client.get("/api/history/AAPL?period=99y")
        assert r.status_code == 422


# ── Fundamentals ─────────────────────────────────────────────────────────────

class TestFundamentals:
    def _make_fundamentals(self, ticker="AAPL"):
        return StockFundamentals(
            ticker=ticker,
            sector="Technology",
            industry="Consumer Electronics",
            pe_ratio=28.5,
            forward_pe=25.0,
            eps=6.43,
            dividend_yield=0.0055,
            beta=1.2,
            fifty_two_week_high=199.62,
            fifty_two_week_low=124.17,
        )

    @patch("app.routers.fundamentals.get_fundamentals")
    def test_get_fundamentals_success(self, mock):
        mock.return_value = self._make_fundamentals("AAPL")
        r = client.get("/api/fundamentals/AAPL")
        assert r.status_code == 200
        data = r.json()
        assert data["ticker"] == "AAPL"
        assert data["sector"] == "Technology"
        assert data["pe_ratio"] == 28.5

    @patch("app.routers.fundamentals.get_fundamentals")
    def test_get_fundamentals_ticker_uppercased(self, mock):
        mock.return_value = self._make_fundamentals("AAPL")
        client.get("/api/fundamentals/aapl")
        mock.assert_called_once_with("AAPL")

    @patch("app.routers.fundamentals.get_fundamentals")
    def test_get_fundamentals_not_found(self, mock):
        mock.return_value = None
        r = client.get("/api/fundamentals/FAKEXYZ")
        assert r.status_code == 404


# ── News ─────────────────────────────────────────────────────────────────────

class TestNews:
    def _make_news(self):
        return [
            NewsItem(title="Apple Hits All-Time High", publisher="Reuters",
                     url="https://reuters.com/apple", published_at=_NOW),
            NewsItem(title="iPhone Sales Beat Estimates", publisher="Bloomberg",
                     url="https://bloomberg.com/apple", published_at=_NOW),
        ]

    @patch("app.routers.news.get_news")
    def test_get_news_returns_list(self, mock):
        mock.return_value = self._make_news()
        r = client.get("/api/news/AAPL")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 2
        assert data[0]["title"] == "Apple Hits All-Time High"
        assert data[0]["publisher"] == "Reuters"

    @patch("app.routers.news.get_news")
    def test_get_news_empty(self, mock):
        mock.return_value = []
        r = client.get("/api/news/FAKEXYZ")
        assert r.status_code == 200
        assert r.json() == []

    @patch("app.routers.news.get_news")
    def test_get_news_ticker_uppercased(self, mock):
        mock.return_value = []
        client.get("/api/news/aapl")
        mock.assert_called_once_with("AAPL")


# ── Search ────────────────────────────────────────────────────────────────────

class TestSearch:
    def _make_results(self):
        return [
            SearchResult(symbol="AAPL", name="Apple Inc.", exchange="NASDAQ"),
            SearchResult(symbol="AAPLX", name="Apple Fund", exchange="NYSE"),
        ]

    @patch("app.routers.search.search_tickers")
    def test_search_returns_results(self, mock):
        mock.return_value = self._make_results()
        r = client.get("/api/search?q=apple")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 2
        assert data[0]["symbol"] == "AAPL"

    @patch("app.routers.search.search_tickers")
    def test_search_query_stripped(self, mock):
        mock.return_value = []
        client.get("/api/search?q= apple ")
        mock.assert_called_once_with("apple")

    def test_search_missing_query_param(self):
        r = client.get("/api/search")
        assert r.status_code == 422


# ── Portfolio P&L calculation ─────────────────────────────────────────────────

class TestPortfolioCalculation:
    @patch("app.routers.portfolio.get_quotes_batch")
    def test_basic_calculation(self, mock):
        mock.return_value = {"AAPL": make_quote("AAPL", price=190.50, change=1.25, change_pct=0.66)}
        r = client.post("/api/portfolio/", json={"holdings": [{"ticker": "AAPL", "shares": 10}]})
        assert r.status_code == 200
        data = r.json()
        assert data["total_value"] == pytest.approx(1905.0)
        assert data["total_day_change"] == pytest.approx(12.5)

    @patch("app.routers.portfolio.get_quotes_batch")
    def test_pnl_with_cost_basis(self, mock):
        mock.return_value = {"AAPL": make_quote("AAPL", price=200.0, change=1.0, change_pct=0.5)}
        r = client.post("/api/portfolio/", json={
            "holdings": [{"ticker": "AAPL", "shares": 10, "cost_basis": 150.0}]
        })
        assert r.status_code == 200
        data = r.json()
        holding = data["holdings"][0]
        assert holding["cost_basis"] == pytest.approx(150.0)
        assert holding["total_cost"] == pytest.approx(1500.0)
        assert holding["unrealized_gain"] == pytest.approx(500.0)   # (200-150)*10
        assert holding["unrealized_gain_pct"] == pytest.approx(33.33, abs=0.01)
        assert data["total_unrealized_gain"] == pytest.approx(500.0)

    @patch("app.routers.portfolio.get_quotes_batch")
    def test_pnl_negative_gain(self, mock):
        mock.return_value = {"AAPL": make_quote("AAPL", price=100.0, change=-5.0, change_pct=-4.76)}
        r = client.post("/api/portfolio/", json={
            "holdings": [{"ticker": "AAPL", "shares": 5, "cost_basis": 120.0}]
        })
        assert r.status_code == 200
        data = r.json()
        holding = data["holdings"][0]
        assert holding["unrealized_gain"] == pytest.approx(-100.0)  # (100-120)*5

    @patch("app.routers.portfolio.get_quotes_batch")
    def test_multiple_holdings_aggregation(self, mock):
        mock.return_value = {
            "AAPL": make_quote("AAPL", price=100.0, change=1.0, change_pct=1.0),
            "MSFT": make_quote("MSFT", price=100.0, change=1.0, change_pct=1.0),
        }
        r = client.post("/api/portfolio/", json={
            "holdings": [
                {"ticker": "AAPL", "shares": 10},
                {"ticker": "MSFT", "shares": 5},
            ]
        })
        assert r.status_code == 200
        data = r.json()
        assert data["total_value"] == pytest.approx(1500.0)
        assert len(data["holdings"]) == 2

    @patch("app.routers.portfolio.get_quotes_batch")
    def test_no_cost_basis_no_pnl_fields(self, mock):
        mock.return_value = {"AAPL": make_quote("AAPL")}
        r = client.post("/api/portfolio/", json={"holdings": [{"ticker": "AAPL", "shares": 10}]})
        data = r.json()
        holding = data["holdings"][0]
        assert holding.get("unrealized_gain") is None
        assert data.get("total_unrealized_gain") is None

    def test_empty_holdings_rejected(self):
        r = client.post("/api/portfolio/", json={"holdings": []})
        assert r.status_code == 400
