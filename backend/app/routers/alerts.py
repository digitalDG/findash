from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models import db as models
from app.models.db import User
from app.models.schemas import AlertCreate, AlertSchema

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.get("/", response_model=list[AlertSchema])
def list_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(models.PriceAlertModel)
        .filter(
            models.PriceAlertModel.user_id == current_user.id,
            models.PriceAlertModel.fired_at.is_(None),
        )
        .all()
    )


@router.post("/", response_model=AlertSchema, status_code=201)
@limiter.limit("20/minute")
def create_alert(
    request: Request,
    payload: AlertCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    active_count = (
        db.query(models.PriceAlertModel)
        .filter(
            models.PriceAlertModel.user_id == current_user.id,
            models.PriceAlertModel.fired_at.is_(None),
        )
        .count()
    )
    if active_count >= settings.max_alerts_per_email:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {settings.max_alerts_per_email} active alerts per account",
        )

    alert = models.PriceAlertModel(
        ticker=payload.ticker.upper(),
        target_price=payload.target_price,
        direction=payload.direction,
        email=current_user.email,
        user_id=current_user.id,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@router.delete("/{alert_id}", status_code=204)
def delete_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = db.get(models.PriceAlertModel, alert_id)
    if not alert or alert.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.delete(alert)
    db.commit()
