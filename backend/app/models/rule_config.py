"""Rule configuration model — DB-driven reconciliation parameters.

Instead of hard-coding tolerances, due days, and severity thresholds,
the system reads from this table (per-org, with global defaults).
"""
from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import (
    ForeignKey,
    Numeric,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.base import UUIDPrimaryKeyMixin, TimestampMixin


class RuleConfig(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Per-org (or global) reconciliation rule parameters.

    When ``org_id`` is NULL the row serves as the system-wide default.
    Per-org rows override the default for that parameter.
    """

    __tablename__ = "rule_configs"
    __table_args__ = (
        UniqueConstraint("org_id", "param_key", name="uq_rule_configs_org_param"),
    )

    org_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True, index=True
    )
    param_key: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    param_value: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)


# ---------------------------------------------------------------------------
# Default values — used when no row exists in rule_configs.
# ---------------------------------------------------------------------------

SYSTEM_DEFAULTS: dict[str, str] = {
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

