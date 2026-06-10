from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Watchlist(Base):
    __tablename__ = "watchlists"

    id     = Column(Integer, primary_key=True, index=True)
    name   = Column(String, nullable=False, default="My Watchlist")
    tickers = relationship("WatchlistTicker", back_populates="watchlist", cascade="all, delete-orphan")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WatchlistTicker(Base):
    __tablename__ = "watchlist_tickers"

    id           = Column(Integer, primary_key=True, index=True)
    watchlist_id = Column(Integer, ForeignKey("watchlists.id"), nullable=False)
    symbol       = Column(String, nullable=False)
    watchlist    = relationship("Watchlist", back_populates="tickers")


class Portfolio(Base):
    __tablename__ = "portfolios"

    id       = Column(Integer, primary_key=True, index=True)
    name     = Column(String, nullable=False, default="My Portfolio")
    holdings = relationship("PortfolioHolding", back_populates="portfolio", cascade="all, delete-orphan")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PortfolioHolding(Base):
    __tablename__ = "portfolio_holdings"

    id           = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    symbol       = Column(String, nullable=False)
    shares       = Column(Float, nullable=False)
    cost_basis   = Column(Float, nullable=True)
    portfolio    = relationship("Portfolio", back_populates="holdings")
