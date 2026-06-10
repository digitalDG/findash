from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import db as models
from app.models.schemas import (
    WatchlistSchema, WatchlistCreate,
    WatchlistTickerSchema, AddTickerRequest,
)

router = APIRouter()


@router.get("/", response_model=list[WatchlistSchema])
def list_watchlists(db: Session = Depends(get_db)):
    return db.query(models.Watchlist).all()


@router.post("/", response_model=WatchlistSchema, status_code=201)
def create_watchlist(payload: WatchlistCreate, db: Session = Depends(get_db)):
    wl = models.Watchlist(name=payload.name)
    db.add(wl)
    db.commit()
    db.refresh(wl)
    return wl


@router.get("/{watchlist_id}", response_model=WatchlistSchema)
def get_watchlist(watchlist_id: int, db: Session = Depends(get_db)):
    wl = db.get(models.Watchlist, watchlist_id)
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    return wl


@router.delete("/{watchlist_id}", status_code=204)
def delete_watchlist(watchlist_id: int, db: Session = Depends(get_db)):
    wl = db.get(models.Watchlist, watchlist_id)
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    db.delete(wl)
    db.commit()


@router.post("/{watchlist_id}/tickers", response_model=WatchlistTickerSchema, status_code=201)
def add_ticker(watchlist_id: int, payload: AddTickerRequest, db: Session = Depends(get_db)):
    wl = db.get(models.Watchlist, watchlist_id)
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    symbol = payload.symbol.upper()
    if any(t.symbol == symbol for t in wl.tickers):
        raise HTTPException(status_code=409, detail=f"{symbol} already in watchlist")
    ticker = models.WatchlistTicker(watchlist_id=watchlist_id, symbol=symbol)
    db.add(ticker)
    db.commit()
    db.refresh(ticker)
    return ticker


@router.delete("/{watchlist_id}/tickers/{symbol}", status_code=204)
def remove_ticker(watchlist_id: int, symbol: str, db: Session = Depends(get_db)):
    ticker = (
        db.query(models.WatchlistTicker)
        .filter_by(watchlist_id=watchlist_id, symbol=symbol.upper())
        .first()
    )
    if not ticker:
        raise HTTPException(status_code=404, detail="Ticker not found in watchlist")
    db.delete(ticker)
    db.commit()
