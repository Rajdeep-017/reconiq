"""Model registry — import all models here so Alembic can discover them."""

# Identity
from app.models.organization import Organization  # noqa: F401
from app.models.user import User, UserRole  # noqa: F401

# Partners
from app.models.partner import Partner  # noqa: F401

# Uploads
from app.models.upload import Upload, UploadStatus, DocumentType, ImportRow  # noqa: F401

# Mappings
from app.models.mapping import ColumnMapping, ColumnMappingTemplate  # noqa: F401

# Commerce
from app.models.order import Order, OrderStatus, Return, ReturnStatus, RefundStatus  # noqa: F401

# Payments
from app.models.settlement import Settlement, CODRemittance, CODRemittanceStatus  # noqa: F401

# Logistics
from app.models.freight import FreightRecord, RateCard  # noqa: F401

# Reconciliation
from app.models.reconciliation import (  # noqa: F401
    ReconciliationRun,
    ReconStatus,
    ReconType,
    ReconciliationResult,
    MatchMethod,
    MatchStatus,
    MatchSuggestion,
)

# Discrepancy & Claims
from app.models.discrepancy import (  # noqa: F401
    Discrepancy,
    DiscrepancyType,
    DiscrepancySeverity,
    DiscrepancyStatus,
    Claim,
    ClaimStatus,
    ClaimEvidence,
)

# Audit
from app.models.audit import AuditLog  # noqa: F401
