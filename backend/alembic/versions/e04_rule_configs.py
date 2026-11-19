"""Persist reconciliation rule parameters.

Revision ID: e04_rule_configs
Revises: d03stream_status
"""
from __future__ import annotations

import uuid

from alembic import op
import sqlalchemy as sa

revision: str = "e04_rule_configs"
down_revision: str | None = "d03stream_status"
branch_labels: str | None = None
depends_on: str | None = None


DEFAULTS = {
    "tolerance": "10.00",
    "settlement_due_days": "15",
    "cod_due_days": "15",
    "late_grace_days": "0",
    "return_scan_window_days": "7",
    "rto_expected_multiplier": "0.50",
    "severity_critical_threshold": "5000",
    "severity_high_threshold": "1000",
    "severity_medium_threshold": "100",
}


def upgrade() -> None:
    op.create_table(
        "rule_configs",
        sa.Column("org_id", sa.UUID(), nullable=True),
        sa.Column("param_key", sa.String(length=80), nullable=False),
        sa.Column("param_value", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("org_id", "param_key", name="uq_rule_configs_org_param"),
    )
    op.create_index("ix_rule_configs_org_id", "rule_configs", ["org_id"])
    op.create_index("ix_rule_configs_param_key", "rule_configs", ["param_key"])

    connection = op.get_bind()
    connection.execute(
        sa.text(
            "INSERT INTO rule_configs (id, org_id, param_key, param_value, description) "
            "VALUES (:id, NULL, :key, :value, :description)"
        ),
        [
            {
                "id": uuid.uuid4(),
                "key": key,
                "value": value,
                "description": f"System default for {key.replace('_', ' ')}",
            }
            for key, value in DEFAULTS.items()
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_rule_configs_param_key", table_name="rule_configs")
    op.drop_index("ix_rule_configs_org_id", table_name="rule_configs")
    op.drop_table("rule_configs")
