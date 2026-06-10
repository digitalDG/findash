from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String, nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    avatar        = Column(Text, nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    watchlists = relationship("Watchlist", back_populates="user", cascade="all, delete-orphan")
    portfolios = relationship("Portfolio", back_populates="user", cascade="all, delete-orphan")
    alerts     = relationship("PriceAlertModel", back_populates="user", cascade="all, delete-orphan")


class Watchlist(Base):
    __tablename__ = "watchlists"

    id      = Column(Integer, primary_key=True, index=True)
    name    = Column(String, nullable=False, default="My Watchlist")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    tickers = relationship("WatchlistTicker", back_populates="watchlist", cascade="all, delete-orphan")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="watchlists")


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
    user_id  = Column(Integer, ForeignKey("users.id"), nullable=True)
    holdings = relationship("PortfolioHolding", back_populates="portfolio", cascade="all, delete-orphan")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="portfolios")


class PortfolioHolding(Base):
    __tablename__ = "portfolio_holdings"

    id           = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    symbol       = Column(String, nullable=False)
    shares       = Column(Float, nullable=False)
    cost_basis   = Column(Float, nullable=True)
    portfolio    = relationship("Portfolio", back_populates="holdings")


class PriceAlertModel(Base):
    __tablename__ = "price_alerts"

    id           = Column(Integer, primary_key=True, index=True)
    ticker       = Column(String, nullable=False, index=True)
    target_price = Column(Float, nullable=False)
    direction    = Column(String, nullable=False)  # "above" | "below"
    email        = Column(String, nullable=False)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    fired_at     = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="alerts")
