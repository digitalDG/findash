from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import db as models
from app.models.schemas import (
    PortfolioSchema, PortfolioCreate,
    PortfolioHoldingSchema, AddHoldingRequest,
)

router = APIRouter()


@router.get("/", response_model=list[PortfolioSchema])
def list_portfolios(db: Session = Depends(get_db)):
    return db.query(models.Portfolio).all()


@router.post("/", response_model=PortfolioSchema, status_code=201)
def create_portfolio(payload: PortfolioCreate, db: Session = Depends(get_db)):
    portfolio = models.Portfolio(name=payload.name)
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)
    return portfolio


@router.get("/{portfolio_id}", response_model=PortfolioSchema)
def get_portfolio(portfolio_id: int, db: Session = Depends(get_db)):
    portfolio = db.get(models.Portfolio, portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio


@router.delete("/{portfolio_id}", status_code=204)
def delete_portfolio(portfolio_id: int, db: Session = Depends(get_db)):
    portfolio = db.get(models.Portfolio, portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    db.delete(portfolio)
    db.commit()


@router.post("/{portfolio_id}/holdings", response_model=PortfolioHoldingSchema, status_code=201)
def add_holding(portfolio_id: int, payload: AddHoldingRequest, db: Session = Depends(get_db)):
    portfolio = db.get(models.Portfolio, portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    symbol = payload.symbol.upper()
    if any(h.symbol == symbol for h in portfolio.holdings):
        raise HTTPException(status_code=409, detail=f"{symbol} already in portfolio")
    holding = models.PortfolioHolding(
        portfolio_id=portfolio_id,
        symbol=symbol,
        shares=payload.shares,
        cost_basis=payload.cost_basis,
    )
    db.add(holding)
    db.commit()
    db.refresh(holding)
    return holding


@router.delete("/{portfolio_id}/holdings/{holding_id}", status_code=204)
def remove_holding(portfolio_id: int, holding_id: int, db: Session = Depends(get_db)):
    holding = db.get(models.PortfolioHolding, holding_id)
    if not holding or holding.portfolio_id != portfolio_id:
        raise HTTPException(status_code=404, detail="Holding not found")
    db.delete(holding)
    db.commit()
