from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import quotes, history, portfolio, watchlists, saved_portfolios, fundamentals, news, search
from app.core.config import settings
from app.core.database import engine, Base
import app.models.db  # noqa: F401 — registers all models on Base.metadata

# Auto-create tables for SQLite (local dev). Postgres uses Alembic migrations.
if settings.database_url.startswith("sqlite"):
    Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FinDash API",
    description="Financial data dashboard API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(quotes.router, prefix="/api/quotes", tags=["quotes"])
app.include_router(history.router, prefix="/api/history", tags=["history"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(watchlists.router, prefix="/api/watchlists", tags=["watchlists"])
app.include_router(saved_portfolios.router, prefix="/api/saved-portfolios", tags=["saved-portfolios"])
app.include_router(fundamentals.router, prefix="/api/fundamentals", tags=["fundamentals"])
app.include_router(news.router, prefix="/api/news", tags=["news"])
app.include_router(search.router, prefix="/api/search", tags=["search"])


@app.get("/health")
def health_check():
    return {"status": "ok"}
