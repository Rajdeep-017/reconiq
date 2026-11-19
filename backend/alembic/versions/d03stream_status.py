"""Phase D: stream_status column + engine discrepancy types.

Revision ID: d03stream_status
Revises: f02norm_pipeline
Create Date: 2026-11-09
"""
from __future__ import annotations

from typing import Union

from alembic import op
import sqlalchemy as sa

revision: str = "d03stream_status"
down_revision: Union[str, None] = "f02norm_pipeline"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None

NEW_DISCREPANCY_TYPES = (
    "SHORT_PAID",
    "UNPAID_PAST_DUE",
    "MISSING_FREIGHT_INVOICE",
    "FREIGHT_OVERCHARGED",
    "DUPLICATE_AWB_BILLING",
    "RETURN_NOT_RECEIVED",
    "SETTLED_LATE",
)


def upgrade() -> None:
    op.add_column(
        "reconciliation_results",
        sa.Column("stream_status", sa.String(length=40), nullable=True),
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_reconciliation_results_stream_status "
        "ON reconciliation_results (stream_status)"
    )
    with op.get_context().autocommit_block():
        for value in NEW_DISCREPANCY_TYPES:
            op.execute(f"ALTER TYPE discrepancy_type ADD VALUE IF NOT EXISTS '{value}'")


def downgrade() -> None:
    op.drop_index(
        op.f("ix_reconciliation_results_stream_status"), table_name="reconciliation_results"
    )
    op.drop_column("reconciliation_results", "stream_status")
    # Postgres cannot remove values from an enum; the new values remain harmless.
