"""Resolved rule parameters — cached per-org config loader."""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.rule_config import RuleConfig, SYSTEM_DEFAULTS


@dataclass(frozen=True)
class ReconParams:
    """Immutable set of reconciliation parameters for a single run."""

    tolerance: Decimal = Decimal("10.00")
    settlement_due_days: int = 15
    cod_due_days: int = 15
    late_grace_days: int = 0
    return_scan_window_days: int = 7
    rto_expected_multiplier: Decimal = Decimal("0.50")
    severity_critical_threshold: Decimal = Decimal("5000")
    severity_high_threshold: Decimal = Decimal("1000")
    severity_medium_threshold: Decimal = Decimal("100")


def load_params(db: Session, org_id: uuid.UUID | None) -> ReconParams:
    """Load rule parameters from DB, falling back to SYSTEM_DEFAULTS.

    Priority: per-org row > global row (org_id=NULL) > SYSTEM_DEFAULTS dict.
    """
    rows = db.execute(
        select(RuleConfig.org_id, RuleConfig.param_key, RuleConfig.param_value)
        .where(
            (RuleConfig.org_id == org_id) | (RuleConfig.org_id.is_(None))
        )
    ).all()

    # Apply global settings first, then organization-specific overrides.
    resolved: dict[str, str] = dict(SYSTEM_DEFAULTS)
    for row_org_id, key, value in rows:
        if row_org_id is None:
            resolved[key] = value
    for row_org_id, key, value in rows:
        if row_org_id is not None:
            resolved[key] = value  # org-specific wins

    return ReconParams(
        tolerance=Decimal(resolved["tolerance"]),
        settlement_due_days=int(resolved["settlement_due_days"]),
        cod_due_days=int(resolved["cod_due_days"]),
        late_grace_days=int(resolved["late_grace_days"]),
        return_scan_window_days=int(resolved["return_scan_window_days"]),
        rto_expected_multiplier=Decimal(resolved["rto_expected_multiplier"]),
        severity_critical_threshold=Decimal(resolved["severity_critical_threshold"]),
        severity_high_threshold=Decimal(resolved["severity_high_threshold"]),
        severity_medium_threshold=Decimal(resolved["severity_medium_threshold"]),
    )

