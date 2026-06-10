from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import db as models
from app.models.db import User
from app.models.schemas import (
    AddHoldingRequest,
    PortfolioCreate,
    PortfolioHoldingSchema,
    PortfolioSchema,
)

router = APIRouter()


def _get_portfolio(portfolio_id: int, user: User, db: Session) -> models.Portfolio:
    portfolio = db.get(models.Portfolio, portfolio_id)
    if not portfolio or portfolio.user_id != user.id:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio


@router.get("/", response_model=list[PortfolioSchema])
def list_portfolios(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(models.Portfolio).filter(models.Portfolio.user_id == current_user.id).all()


@router.post("/", response_model=PortfolioSchema, status_code=201)
def create_portfolio(
    payload: PortfolioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    portfolio = models.Portfolio(name=payload.name, user_id=current_user.id)
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)
    return portfolio


@router.get("/{portfolio_id}", response_model=PortfolioSchema)
def get_portfolio(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_portfolio(portfolio_id, current_user, db)


@router.delete("/{portfolio_id}", status_code=204)
def delete_portfolio(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    portfolio = _get_portfolio(portfolio_id, current_user, db)
    db.delete(portfolio)
    db.commit()


@router.post("/{portfolio_id}/holdings", response_model=PortfolioHoldingSchema, status_code=201)
def add_holding(
    portfolio_id: int,
    payload: AddHoldingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    portfolio = _get_portfolio(portfolio_id, current_user, db)
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
def remove_holding(
    portfolio_id: int,
    holding_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    holding = db.get(models.PortfolioHolding, holding_id)
    if not holding or holding.portfolio_id != portfolio_id:
        raise HTTPException(status_code=404, detail="Holding not found")
    _get_portfolio(portfolio_id, current_user, db)
    db.delete(holding)
    db.commit()
