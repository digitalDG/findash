import asyncio
import logging
from datetime import datetime, timezone

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.db import PriceAlertModel
from app.services.market_data import get_quotes_batch
from app.services.email_service import send_price_alert_email

logger = logging.getLogger(__name__)


async def run_alert_checker() -> None:
    """Background task: checks price alerts and sends emails when conditions are met."""
    while True:
        await asyncio.sleep(settings.alert_check_interval)
        try:
            await _check_once()
        except Exception:
            logger.exception("Alert checker error")


async def _check_once() -> None:
    db = SessionLocal()
    try:
        unfired = (
            db.query(PriceAlertModel)
            .filter(PriceAlertModel.fired_at.is_(None))
            .all()
        )
        if not unfired:
            return

        tickers = list({a.ticker for a in unfired})
        quotes = get_quotes_batch(tickers)

        for alert in unfired:
            quote = quotes.get(alert.ticker)
            if not quote:
                continue
            hit = (
                quote.price >= alert.target_price
                if alert.direction == "above"
                else quote.price <= alert.target_price
            )
            if not hit:
                continue
            try:
                await send_price_alert_email(
                    alert.email,
                    alert.ticker,
                    alert.direction,
                    alert.target_price,
                    quote.price,
                )
            except Exception:
                logger.exception("Failed to send alert email for %s → %s", alert.ticker, alert.email)
                continue
            alert.fired_at = datetime.now(timezone.utc)
            db.commit()
            logger.info("Fired alert %d: %s %s $%.2f → %s", alert.id, alert.ticker, alert.direction, alert.target_price, alert.email)
    finally:
        db.close()
