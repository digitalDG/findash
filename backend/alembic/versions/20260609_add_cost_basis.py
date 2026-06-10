"""add cost_basis to portfolio_holdings

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-09 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("portfolio_holdings", sa.Column("cost_basis", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("portfolio_holdings", "cost_basis")
