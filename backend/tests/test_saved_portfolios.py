"""Tests for saved portfolio CRUD endpoints using an in-memory SQLite database."""


class TestPortfolioCRUD:
    def test_list_empty(self, auth_client):
        r = auth_client.get("/api/saved-portfolios/")
        assert r.status_code == 200
        assert r.json() == []

    def test_create_portfolio(self, auth_client):
        r = auth_client.post("/api/saved-portfolios/", json={"name": "Retirement"})
        assert r.status_code == 201
        data = r.json()
        assert data["name"] == "Retirement"
        assert data["id"] is not None
        assert data["holdings"] == []

    def test_list_after_create(self, auth_client):
        auth_client.post("/api/saved-portfolios/", json={"name": "My Portfolio"})
        r = auth_client.get("/api/saved-portfolios/")
        assert len(r.json()) == 1

    def test_get_portfolio_by_id(self, auth_client):
        created = auth_client.post("/api/saved-portfolios/", json={"name": "Growth"}).json()
        r = auth_client.get(f"/api/saved-portfolios/{created['id']}")
        assert r.status_code == 200
        assert r.json()["name"] == "Growth"

    def test_get_portfolio_not_found(self, auth_client):
        r = auth_client.get("/api/saved-portfolios/9999")
        assert r.status_code == 404

    def test_delete_portfolio(self, auth_client):
        created = auth_client.post("/api/saved-portfolios/", json={"name": "Temp"}).json()
        r = auth_client.delete(f"/api/saved-portfolios/{created['id']}")
        assert r.status_code == 204
        r = auth_client.get(f"/api/saved-portfolios/{created['id']}")
        assert r.status_code == 404

    def test_delete_portfolio_not_found(self, auth_client):
        r = auth_client.delete("/api/saved-portfolios/9999")
        assert r.status_code == 404


class TestPortfolioHoldings:
    def _create_portfolio(self, auth_client, name="Test"):
        return auth_client.post("/api/saved-portfolios/", json={"name": name}).json()

    def test_add_holding(self, auth_client):
        p = self._create_portfolio(auth_client)
        r = auth_client.post(f"/api/saved-portfolios/{p['id']}/holdings",
                           json={"symbol": "AAPL", "shares": 10})
        assert r.status_code == 201
        data = r.json()
        assert data["symbol"] == "AAPL"
        assert data["shares"] == 10.0
        assert data["cost_basis"] is None

    def test_add_holding_with_cost_basis(self, auth_client):
        p = self._create_portfolio(auth_client)
        r = auth_client.post(f"/api/saved-portfolios/{p['id']}/holdings",
                           json={"symbol": "MSFT", "shares": 5, "cost_basis": 300.0})
        assert r.status_code == 201
        data = r.json()
        assert data["cost_basis"] == 300.0

    def test_add_holding_symbol_uppercased(self, auth_client):
        p = self._create_portfolio(auth_client)
        r = auth_client.post(f"/api/saved-portfolios/{p['id']}/holdings",
                           json={"symbol": "nvda", "shares": 3})
        assert r.status_code == 201
        assert r.json()["symbol"] == "NVDA"

    def test_add_duplicate_holding_rejected(self, auth_client):
        p = self._create_portfolio(auth_client)
        auth_client.post(f"/api/saved-portfolios/{p['id']}/holdings",
                       json={"symbol": "AAPL", "shares": 10})
        r = auth_client.post(f"/api/saved-portfolios/{p['id']}/holdings",
                           json={"symbol": "AAPL", "shares": 5})
        assert r.status_code == 409

    def test_add_holding_to_missing_portfolio(self, auth_client):
        r = auth_client.post("/api/saved-portfolios/9999/holdings",
                           json={"symbol": "AAPL", "shares": 10})
        assert r.status_code == 404

    def test_holding_appears_in_portfolio(self, auth_client):
        p = self._create_portfolio(auth_client)
        auth_client.post(f"/api/saved-portfolios/{p['id']}/holdings",
                       json={"symbol": "TSLA", "shares": 7})
        r = auth_client.get(f"/api/saved-portfolios/{p['id']}")
        symbols = [h["symbol"] for h in r.json()["holdings"]]
        assert "TSLA" in symbols

    def test_remove_holding(self, auth_client):
        p = self._create_portfolio(auth_client)
        holding = auth_client.post(f"/api/saved-portfolios/{p['id']}/holdings",
                                  json={"symbol": "GOOG", "shares": 2}).json()
        r = auth_client.delete(f"/api/saved-portfolios/{p['id']}/holdings/{holding['id']}")
        assert r.status_code == 204
        r = auth_client.get(f"/api/saved-portfolios/{p['id']}")
        assert r.json()["holdings"] == []

    def test_remove_holding_not_found(self, auth_client):
        p = self._create_portfolio(auth_client)
        r = auth_client.delete(f"/api/saved-portfolios/{p['id']}/holdings/9999")
        assert r.status_code == 404

    def test_remove_holding_wrong_portfolio(self, auth_client):
        p1 = self._create_portfolio(auth_client, "P1")
        p2 = self._create_portfolio(auth_client, "P2")
        holding = auth_client.post(f"/api/saved-portfolios/{p1['id']}/holdings",
                                  json={"symbol": "AAPL", "shares": 1}).json()
        r = auth_client.delete(f"/api/saved-portfolios/{p2['id']}/holdings/{holding['id']}")
        assert r.status_code == 404

    def test_delete_portfolio_cascades_holdings(self, auth_client):
        p = self._create_portfolio(auth_client)
        auth_client.post(f"/api/saved-portfolios/{p['id']}/holdings",
                       json={"symbol": "AAPL", "shares": 5})
        auth_client.delete(f"/api/saved-portfolios/{p['id']}")
        r = auth_client.get("/api/saved-portfolios/")
        assert r.json() == []
