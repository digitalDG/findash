"""Tests for watchlist CRUD endpoints using an in-memory SQLite database."""


class TestWatchlistCRUD:
    def test_list_empty(self, auth_client):
        r = auth_client.get("/api/watchlists/")
        assert r.status_code == 200
        assert r.json() == []

    def test_create_watchlist(self, auth_client):
        r = auth_client.post("/api/watchlists/", json={"name": "Tech Picks"})
        assert r.status_code == 201
        data = r.json()
        assert data["name"] == "Tech Picks"
        assert data["id"] is not None
        assert data["tickers"] == []

    def test_list_after_create(self, auth_client):
        auth_client.post("/api/watchlists/", json={"name": "My List"})
        r = auth_client.get("/api/watchlists/")
        assert len(r.json()) == 1

    def test_get_watchlist_by_id(self, auth_client):
        created = auth_client.post("/api/watchlists/", json={"name": "Growth"}).json()
        r = auth_client.get(f"/api/watchlists/{created['id']}")
        assert r.status_code == 200
        assert r.json()["name"] == "Growth"

    def test_get_watchlist_not_found(self, auth_client):
        r = auth_client.get("/api/watchlists/9999")
        assert r.status_code == 404

    def test_delete_watchlist(self, auth_client):
        created = auth_client.post("/api/watchlists/", json={"name": "Temp"}).json()
        r = auth_client.delete(f"/api/watchlists/{created['id']}")
        assert r.status_code == 204
        r = auth_client.get(f"/api/watchlists/{created['id']}")
        assert r.status_code == 404

    def test_delete_watchlist_not_found(self, auth_client):
        r = auth_client.delete("/api/watchlists/9999")
        assert r.status_code == 404


class TestWatchlistTickers:
    def _create_watchlist(self, auth_client, name="Test"):
        return auth_client.post("/api/watchlists/", json={"name": name}).json()

    def test_add_ticker(self, auth_client):
        wl = self._create_watchlist(auth_client)
        r = auth_client.post(f"/api/watchlists/{wl['id']}/tickers", json={"symbol": "AAPL"})
        assert r.status_code == 201
        data = r.json()
        assert data["symbol"] == "AAPL"

    def test_add_ticker_uppercased(self, auth_client):
        wl = self._create_watchlist(auth_client)
        r = auth_client.post(f"/api/watchlists/{wl['id']}/tickers", json={"symbol": "msft"})
        assert r.status_code == 201
        assert r.json()["symbol"] == "MSFT"

    def test_add_duplicate_ticker_rejected(self, auth_client):
        wl = self._create_watchlist(auth_client)
        auth_client.post(f"/api/watchlists/{wl['id']}/tickers", json={"symbol": "AAPL"})
        r = auth_client.post(f"/api/watchlists/{wl['id']}/tickers", json={"symbol": "AAPL"})
        assert r.status_code == 409

    def test_add_ticker_to_missing_watchlist(self, auth_client):
        r = auth_client.post("/api/watchlists/9999/tickers", json={"symbol": "AAPL"})
        assert r.status_code == 404

    def test_ticker_appears_in_watchlist(self, auth_client):
        wl = self._create_watchlist(auth_client)
        auth_client.post(f"/api/watchlists/{wl['id']}/tickers", json={"symbol": "TSLA"})
        r = auth_client.get(f"/api/watchlists/{wl['id']}")
        symbols = [t["symbol"] for t in r.json()["tickers"]]
        assert "TSLA" in symbols

    def test_remove_ticker(self, auth_client):
        wl = self._create_watchlist(auth_client)
        auth_client.post(f"/api/watchlists/{wl['id']}/tickers", json={"symbol": "NVDA"})
        r = auth_client.delete(f"/api/watchlists/{wl['id']}/tickers/NVDA")
        assert r.status_code == 204
        r = auth_client.get(f"/api/watchlists/{wl['id']}")
        symbols = [t["symbol"] for t in r.json()["tickers"]]
        assert "NVDA" not in symbols

    def test_remove_ticker_not_found(self, auth_client):
        wl = self._create_watchlist(auth_client)
        r = auth_client.delete(f"/api/watchlists/{wl['id']}/tickers/FAKE")
        assert r.status_code == 404

    def test_delete_watchlist_cascades_tickers(self, auth_client):
        wl = self._create_watchlist(auth_client)
        auth_client.post(f"/api/watchlists/{wl['id']}/tickers", json={"symbol": "AAPL"})
        auth_client.delete(f"/api/watchlists/{wl['id']}")
        # watchlist is gone; a new list should start empty
        r = auth_client.get("/api/watchlists/")
        assert r.json() == []
