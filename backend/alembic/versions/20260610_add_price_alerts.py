"""add price_alerts table

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-10 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "c3d4e5f6a7b8"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "price_alerts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ticker", sa.String(), nullable=False),
        sa.Column("target_price", sa.Float(), nullable=False),
        sa.Column("direction", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("fired_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_price_alerts_id", "price_alerts", ["id"])
    op.create_index("ix_price_alerts_ticker", "price_alerts", ["ticker"])


def downgrade() -> None:
    op.drop_index("ix_price_alerts_ticker", table_name="price_alerts")
    op.drop_index("ix_price_alerts_id", table_name="price_alerts")
    op.drop_table("price_alerts")
