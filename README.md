# FinDash

A financial data dashboard with a **FastAPI + Python** backend and **React + TypeScript** frontend.

Live stock quotes, historical price charts, company fundamentals, news feed, watchlist and portfolio tracking — all persisted to PostgreSQL, cached in Redis, and powered by `yfinance` (no API key needed). Includes CSV export for watchlists and portfolios, and browser push notifications for price alerts.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0 |
| Database | PostgreSQL 16 + Alembic migrations |
| Cache | Redis 7 (in-memory fallback when Redis is unavailable) |
| Market Data | yfinance (`yf.download()` for rate-limit-safe batch fetching) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v3, TanStack Query v5, Recharts, Lucide React |
| Dev Infra | Docker Compose (Postgres + Redis + backend + frontend) |
| CI/CD | GitHub Actions (lint, test, type-check, build) |
| Deploy | Railway (backend + frontend + Postgres + Redis) |

---

## Quick Start (Docker Compose)

The easiest way to run the full stack locally:

```bash
docker compose up --build
```

This starts four services automatically:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |
| Postgres | localhost:5432 |
| Redis | localhost:6379 |

Alembic migrations run automatically on backend startup (`alembic upgrade head`).

---

## Manual Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy and edit environment variables
cp .env.example .env

# Run migrations (requires running Postgres)
alembic upgrade head

# Start dev server
uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local       # set VITE_API_URL=http://localhost:8000
npm run dev
```

---

## API Endpoints

### Market Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quotes/{ticker}` | Current quote for a ticker |
| GET | `/api/quotes/batch/{tickers}` | Batch quotes (comma-separated) |
| GET | `/api/history/{ticker}?period=30d` | Historical prices (7d/30d/90d/1y) |
| GET | `/api/fundamentals/{ticker}` | P/E, EPS, market cap, 52-week range, etc. |
| GET | `/api/news/{ticker}` | Recent news articles for a ticker |
| GET | `/api/search/?q=` | Search tickers by symbol or company name |
| POST | `/api/portfolio/` | Portfolio value + daily P&L + unrealized gain calculation |

### Watchlists (DB-persisted)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/watchlists/` | List all watchlists |
| POST | `/api/watchlists/` | Create a watchlist |
| GET | `/api/watchlists/{id}` | Get a watchlist with tickers |
| DELETE | `/api/watchlists/{id}` | Delete a watchlist |
| POST | `/api/watchlists/{id}/tickers` | Add ticker to watchlist |
| DELETE | `/api/watchlists/{id}/tickers/{symbol}` | Remove ticker |

### Saved Portfolios (DB-persisted)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/saved-portfolios/` | List all portfolios |
| POST | `/api/saved-portfolios/` | Create a portfolio |
| GET | `/api/saved-portfolios/{id}` | Get a portfolio with holdings |
| DELETE | `/api/saved-portfolios/{id}` | Delete a portfolio |
| POST | `/api/saved-portfolios/{id}/holdings` | Add holding (ticker, shares, optional cost basis) |
| DELETE | `/api/saved-portfolios/{id}/holdings/{holdingId}` | Remove holding |

| Misc | | |
|------|--|--|
| GET | `/health` | Health check |

---

## Project Structure

```
findash/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app, CORS, router registration
│   │   ├── core/
│   │   │   ├── config.py            # Pydantic Settings (env vars)
│   │   │   └── database.py          # SQLAlchemy engine, SessionLocal, Base
│   │   ├── models/
│   │   │   ├── db.py                # SQLAlchemy ORM models
│   │   │   └── schemas.py           # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── quotes.py            # GET /api/quotes
│   │   │   ├── history.py           # GET /api/history
│   │   │   ├── fundamentals.py      # GET /api/fundamentals
│   │   │   ├── news.py              # GET /api/news
│   │   │   ├── search.py            # GET /api/search
│   │   │   ├── portfolio.py         # POST /api/portfolio (value + P&L calc)
│   │   │   ├── watchlists.py        # CRUD /api/watchlists
│   │   │   └── saved_portfolios.py  # CRUD /api/saved-portfolios
│   │   └── services/
│   │       ├── cache.py             # Redis with in-memory fallback
│   │       └── market_data.py       # yfinance wrapper, stale cache
│   ├── alembic/                     # Database migrations
│   │   └── versions/
│   ├── tests/
│   │   ├── conftest.py              # In-memory SQLite fixtures
│   │   ├── test_api.py              # Quote, history, portfolio endpoints
│   │   ├── test_market_data.py      # yfinance service layer
│   │   ├── test_saved_portfolios.py # Saved portfolio CRUD
│   │   └── test_watchlists.py       # Watchlist CRUD
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Watchlist.tsx        # DB-backed watchlist with pagination
│       │   ├── Portfolio.tsx        # DB-backed portfolio with cost basis + pagination
│       │   ├── StockDetail.tsx      # Price chart, fundamentals, news
│       │   ├── TickerSearch.tsx     # Debounced ticker/company search input
│       │   ├── AlertButton.tsx      # Per-row bell icon + popover for price alerts
│       │   └── Paginator.tsx        # Reusable prev/next paginator
│       ├── hooks/
│       │   ├── useFinance.ts        # All TanStack Query query/mutation hooks
│       │   ├── useAlerts.ts         # Browser push price alerts (localStorage-persisted)
│       │   └── usePagination.ts     # Generic pagination hook
│       ├── utils/
│       │   └── exportCsv.ts         # CSV blob download helper
│       ├── test/
│       │   ├── setup.ts             # Vitest + jest-dom setup
│       │   ├── App.test.tsx
│       │   ├── Watchlist.test.tsx
│       │   ├── Portfolio.test.tsx
│       │   └── StockDetail.test.tsx
│       └── types/
│           └── api.ts               # TypeScript types mirroring backend schemas
├── docker-compose.yml               # Postgres + Redis + backend + frontend
└── .github/
    └── workflows/
        └── ci.yml                   # Lint, test, type-check, build on push
```

---

## Caching

The backend uses a two-layer cache to stay responsive when Yahoo Finance is slow or rate-limited:

| Layer | Storage | TTL | Purpose |
|-------|---------|-----|---------|
| Fresh cache | Redis (or in-memory) | 60s quotes / 5m history | Avoid redundant API calls |
| Stale cache | Redis (or in-memory) | No expiry | Serve last-known-good data if a fetch fails |
| Name cache | Redis (or in-memory) | 24h | Company names fetched in background thread |

All prices are fetched via a single `yf.download()` call per batch (not per ticker), with a `fast_info` fallback for individual requests.

---

## Environment Variables

### Backend (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/findash` | Postgres connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `ALLOWED_ORIGINS` | _(empty)_ | Extra CORS origins (comma-separated) |
| `QUOTE_TTL` | `60` | Quote cache TTL in seconds |
| `HISTORY_TTL` | `300` | History cache TTL in seconds |
| `NAME_TTL` | `86400` | Company name cache TTL in seconds |

### Frontend (`.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend base URL |

---

## Deployment (Railway)

Railway hosts the entire stack on one platform.

1. **New project → Deploy from GitHub**
2. Add a **Postgres** plugin — `DATABASE_URL` injected automatically
3. Add a **Redis** plugin — `REDIS_URL` injected automatically
4. **Backend service**
   - Root directory: `backend`
   - Start command: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Env var: `ALLOWED_ORIGINS=https://your-frontend.railway.app`
5. **Frontend service**
   - Root directory: `frontend`
   - Build command: `npm install && npm run build`
   - Output directory: `dist`
   - Env var: `VITE_API_URL=https://your-backend.railway.app`

> **Tip:** Railway projects can be suspended from the dashboard (Settings → Danger Zone → Suspend) at no charge — useful for portfolio projects you want to keep but not pay for continuously.
