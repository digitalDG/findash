from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import db as models
from app.models.db import User
from app.models.schemas import (
    AddTickerRequest,
    WatchlistCreate,
    WatchlistRename,
    WatchlistSchema,
    WatchlistTickerSchema,
)

router = APIRouter()


def _get_watchlist(watchlist_id: int, user: User, db: Session) -> models.Watchlist:
    wl = db.get(models.Watchlist, watchlist_id)
    if not wl or wl.user_id != user.id:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    return wl


@router.get("/", response_model=list[WatchlistSchema])
def list_watchlists(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(models.Watchlist).filter(models.Watchlist.user_id == current_user.id).all()


@router.post("/", response_model=WatchlistSchema, status_code=201)
def create_watchlist(
    payload: WatchlistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wl = models.Watchlist(name=payload.name, user_id=current_user.id)
    db.add(wl)
    db.commit()
    db.refresh(wl)
    return wl


@router.get("/{watchlist_id}", response_model=WatchlistSchema)
def get_watchlist(
    watchlist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_watchlist(watchlist_id, current_user, db)


@router.patch("/{watchlist_id}", response_model=WatchlistSchema)
def rename_watchlist(
    watchlist_id: int,
    payload: WatchlistRename,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wl = _get_watchlist(watchlist_id, current_user, db)
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Name cannot be empty")
    wl.name = name
    db.commit()
    db.refresh(wl)
    return wl


@router.delete("/{watchlist_id}", status_code=204)
def delete_watchlist(
    watchlist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wl = _get_watchlist(watchlist_id, current_user, db)
    db.delete(wl)
    db.commit()


@router.post("/{watchlist_id}/tickers", response_model=WatchlistTickerSchema, status_code=201)
def add_ticker(
    watchlist_id: int,
    payload: AddTickerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wl = _get_watchlist(watchlist_id, current_user, db)
    symbol = payload.symbol.upper()
    if any(t.symbol == symbol for t in wl.tickers):
        raise HTTPException(status_code=409, detail=f"{symbol} already in watchlist")
    ticker = models.WatchlistTicker(watchlist_id=watchlist_id, symbol=symbol)
    db.add(ticker)
    db.commit()
    db.refresh(ticker)
    return ticker


@router.delete("/{watchlist_id}/tickers/{symbol}", status_code=204)
def remove_ticker(
    watchlist_id: int,
    symbol: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_watchlist(watchlist_id, current_user, db)
    ticker = (
        db.query(models.WatchlistTicker)
        .filter_by(watchlist_id=watchlist_id, symbol=symbol.upper())
        .first()
    )
    if not ticker:
        raise HTTPException(status_code=404, detail="Ticker not found in watchlist")
    db.delete(ticker)
    db.commit()
