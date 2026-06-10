"""Tests for watchlist CRUD endpoints using an in-memory SQLite database."""


class TestWatchlistCRUD:
    def test_list_empty(self, db_client):
        r = db_client.get("/api/watchlists/")
        assert r.status_code == 200
        assert r.json() == []

    def test_create_watchlist(self, db_client):
        r = db_client.post("/api/watchlists/", json={"name": "Tech Picks"})
        assert r.status_code == 201
        data = r.json()
        assert data["name"] == "Tech Picks"
        assert data["id"] is not None
        assert data["tickers"] == []

    def test_list_after_create(self, db_client):
        db_client.post("/api/watchlists/", json={"name": "My List"})
        r = db_client.get("/api/watchlists/")
        assert len(r.json()) == 1

    def test_get_watchlist_by_id(self, db_client):
        created = db_client.post("/api/watchlists/", json={"name": "Growth"}).json()
        r = db_client.get(f"/api/watchlists/{created['id']}")
        assert r.status_code == 200
        assert r.json()["name"] == "Growth"

    def test_get_watchlist_not_found(self, db_client):
        r = db_client.get("/api/watchlists/9999")
        assert r.status_code == 404

    def test_delete_watchlist(self, db_client):
        created = db_client.post("/api/watchlists/", json={"name": "Temp"}).json()
        r = db_client.delete(f"/api/watchlists/{created['id']}")
        assert r.status_code == 204
        r = db_client.get(f"/api/watchlists/{created['id']}")
        assert r.status_code == 404

    def test_delete_watchlist_not_found(self, db_client):
        r = db_client.delete("/api/watchlists/9999")
        assert r.status_code == 404


class TestWatchlistTickers:
    def _create_watchlist(self, db_client, name="Test"):
        return db_client.post("/api/watchlists/", json={"name": name}).json()

    def test_add_ticker(self, db_client):
        wl = self._create_watchlist(db_client)
        r = db_client.post(f"/api/watchlists/{wl['id']}/tickers", json={"symbol": "AAPL"})
        assert r.status_code == 201
        data = r.json()
        assert data["symbol"] == "AAPL"

    def test_add_ticker_uppercased(self, db_client):
        wl = self._create_watchlist(db_client)
        r = db_client.post(f"/api/watchlists/{wl['id']}/tickers", json={"symbol": "msft"})
        assert r.status_code == 201
        assert r.json()["symbol"] == "MSFT"

    def test_add_duplicate_ticker_rejected(self, db_client):
        wl = self._create_watchlist(db_client)
        db_client.post(f"/api/watchlists/{wl['id']}/tickers", json={"symbol": "AAPL"})
        r = db_client.post(f"/api/watchlists/{wl['id']}/tickers", json={"symbol": "AAPL"})
        assert r.status_code == 409

    def test_add_ticker_to_missing_watchlist(self, db_client):
        r = db_client.post("/api/watchlists/9999/tickers", json={"symbol": "AAPL"})
        assert r.status_code == 404

    def test_ticker_appears_in_watchlist(self, db_client):
        wl = self._create_watchlist(db_client)
        db_client.post(f"/api/watchlists/{wl['id']}/tickers", json={"symbol": "TSLA"})
        r = db_client.get(f"/api/watchlists/{wl['id']}")
        symbols = [t["symbol"] for t in r.json()["tickers"]]
        assert "TSLA" in symbols

    def test_remove_ticker(self, db_client):
        wl = self._create_watchlist(db_client)
        db_client.post(f"/api/watchlists/{wl['id']}/tickers", json={"symbol": "NVDA"})
        r = db_client.delete(f"/api/watchlists/{wl['id']}/tickers/NVDA")
        assert r.status_code == 204
        r = db_client.get(f"/api/watchlists/{wl['id']}")
        symbols = [t["symbol"] for t in r.json()["tickers"]]
        assert "NVDA" not in symbols

    def test_remove_ticker_not_found(self, db_client):
        wl = self._create_watchlist(db_client)
        r = db_client.delete(f"/api/watchlists/{wl['id']}/tickers/FAKE")
        assert r.status_code == 404

    def test_delete_watchlist_cascades_tickers(self, db_client):
        wl = self._create_watchlist(db_client)
        db_client.post(f"/api/watchlists/{wl['id']}/tickers", json={"symbol": "AAPL"})
        db_client.delete(f"/api/watchlists/{wl['id']}")
        # watchlist is gone; a new list should start empty
        r = db_client.get("/api/watchlists/")
        assert r.json() == []
