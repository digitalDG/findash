import asyncio
import logging
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from logtail import LogtailHandler
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings

def _drop_yfinance_noise(event, hint):
    exc = hint.get("exc_info")
    if exc:
        msg = str(exc[1])
        if "database is locked" in msg or "Invalid Crumb" in msg or "Failed download" in msg:
            return None
    return event


if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        integrations=[StarletteIntegration(), FastApiIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False,
        before_send=_drop_yfinance_noise,
    )

if settings.better_stack_token:
    _logtail = LogtailHandler(source_token=settings.better_stack_token)
    for name in ("uvicorn.access", "uvicorn.error", "app"):
        logging.getLogger(name).addHandler(_logtail)
from app.core.database import Base, engine
from app.routers import (
    alerts,
    fundamentals,
    history,
    news,
    portfolio,
    quotes,
    saved_portfolios,
    search,
    watchlists,
)
from app.routers import auth as auth_router
from app.services.alert_checker import run_alert_checker
import app.models.db  # noqa: F401 — registers all models on Base.metadata

# Auto-create tables for SQLite (local dev). Postgres uses Alembic migrations.
if settings.database_url.startswith("sqlite"):
    Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(run_alert_checker())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="FinDash API",
    description="Financial data dashboard API",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = alerts.limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(quotes.router, prefix="/api/quotes", tags=["quotes"])
app.include_router(history.router, prefix="/api/history", tags=["history"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(watchlists.router, prefix="/api/watchlists", tags=["watchlists"])
app.include_router(saved_portfolios.router, prefix="/api/saved-portfolios", tags=["saved-portfolios"])
app.include_router(fundamentals.router, prefix="/api/fundamentals", tags=["fundamentals"])
app.include_router(news.router, prefix="/api/news", tags=["news"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])


@app.get("/health")
def health_check():
    return {"status": "ok"}
