from fastapi import APIRouter, HTTPException
from app.models.schemas import PortfolioRequest, PortfolioSummary, HoldingResult
from app.services.market_data import get_quotes_batch

router = APIRouter()


@router.post("/", response_model=PortfolioSummary)
def calculate_portfolio(request: PortfolioRequest):
    if not request.holdings:
        raise HTTPException(status_code=400, detail="Portfolio must contain at least one holding")
    if len(request.holdings) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 holdings per portfolio")

    tickers = [h.ticker.upper() for h in request.holdings]
    quotes = get_quotes_batch(tickers)

    holdings_result: list[HoldingResult] = []
    total_value = 0.0
    total_day_change = 0.0

    for holding in request.holdings:
        quote = quotes.get(holding.ticker.upper())
        if not quote:
            continue

        market_value = round(holding.shares * quote.price, 2)
        day_change = round(holding.shares * quote.change, 2)

        total_cost = None
        unrealized_gain = None
        unrealized_gain_pct = None
        if holding.cost_basis and holding.cost_basis > 0:
            total_cost = round(holding.shares * holding.cost_basis, 2)
            unrealized_gain = round(market_value - total_cost, 2)
            unrealized_gain_pct = round((unrealized_gain / total_cost) * 100, 2) if total_cost else 0.0

        holdings_result.append(HoldingResult(
            ticker=quote.ticker,
            name=quote.name,
            shares=holding.shares,
            current_price=quote.price,
            market_value=market_value,
            day_change=day_change,
            day_change_pct=quote.change_pct,
            cost_basis=holding.cost_basis,
            total_cost=total_cost,
            unrealized_gain=unrealized_gain,
            unrealized_gain_pct=unrealized_gain_pct,
        ))
        total_value += market_value
        total_day_change += day_change

    total_day_change_pct = (
        round((total_day_change / (total_value - total_day_change)) * 100, 2)
        if total_value > total_day_change else 0.0
    )

    # Aggregate unrealized P&L across holdings that have cost basis
    costed = [h for h in holdings_result if h.unrealized_gain is not None and h.total_cost is not None]
    total_unrealized_gain = None
    total_unrealized_gain_pct = None
    if costed:
        total_unrealized_gain = round(sum(h.unrealized_gain for h in costed), 2)  # type: ignore[arg-type]
        total_cost_sum = sum(h.total_cost for h in costed)  # type: ignore[misc]
        total_unrealized_gain_pct = (
            round((total_unrealized_gain / total_cost_sum) * 100, 2) if total_cost_sum else 0.0
        )

    return PortfolioSummary(
        total_value=round(total_value, 2),
        total_day_change=round(total_day_change, 2),
        total_day_change_pct=total_day_change_pct,
        total_unrealized_gain=total_unrealized_gain,
        total_unrealized_gain_pct=total_unrealized_gain_pct,
        holdings=holdings_result,
    )
