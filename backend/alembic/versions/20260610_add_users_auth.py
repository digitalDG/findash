"""add users table and user_id foreign keys

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-06-10 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.add_column("watchlists", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_watchlists_user_id", "watchlists", "users", ["user_id"], ["id"])

    op.add_column("portfolios", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_portfolios_user_id", "portfolios", "users", ["user_id"], ["id"])

    op.add_column("price_alerts", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_price_alerts_user_id", "price_alerts", "users", ["user_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_price_alerts_user_id", "price_alerts", type_="foreignkey")
    op.drop_column("price_alerts", "user_id")

    op.drop_constraint("fk_portfolios_user_id", "portfolios", type_="foreignkey")
    op.drop_column("portfolios", "user_id")

    op.drop_constraint("fk_watchlists_user_id", "watchlists", type_="foreignkey")
    op.drop_column("watchlists", "user_id")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")
