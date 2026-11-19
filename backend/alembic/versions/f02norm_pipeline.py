"""Normalization pipeline: status lifecycle, counts, warehouse scans.

Revision ID: f02norm_pipeline
Revises: e01org_tenant_isolation
Create Date: 2026-11-09
"""
from __future__ import annotations

from typing import Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "f02norm_pipeline"
down_revision: Union[str, None] = "e01org_tenant_isolation"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    # 1. Normalization result counters on uploads.
    op.add_column(
        "uploads",
        sa.Column("processed_count", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "uploads",
        sa.Column("rejected_count", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "uploads",
        sa.Column("duplicate_count", sa.Integer(), server_default="0", nullable=False),
    )

    # 2. Warehouse scans are a first-class document type.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'WAREHOUSE_SCANS'")

    # 3. Upload status lifecycle: uploaded -> parsed -> mapped -> processing
    #    -> processed | failed. Existing rows are mapped to the new vocabulary.
    op.execute("ALTER TABLE uploads ALTER COLUMN status DROP DEFAULT")
    op.execute(
        "CREATE TYPE upload_status_new AS ENUM "
        "('UPLOADED', 'PARSED', 'MAPPED', 'PROCESSING', 'PROCESSED', 'FAILED')"
    )
    op.execute(
        """
        ALTER TABLE uploads
        ALTER COLUMN status TYPE upload_status_new
        USING (
            CASE status::text
                WHEN 'UPLOADED' THEN 'UPLOADED'
                WHEN 'VALIDATING' THEN 'PARSED'
                WHEN 'VALIDATED' THEN 'PARSED'
                WHEN 'MAPPING_PENDING' THEN 'PARSED'
                WHEN 'MAPPING_APPROVED' THEN 'MAPPED'
                WHEN 'PROCESSING' THEN 'PROCESSING'
                WHEN 'RECONCILING' THEN 'PROCESSING'
                WHEN 'COMPLETED' THEN 'PROCESSED'
                WHEN 'VALIDATION_FAILED' THEN 'FAILED'
                WHEN 'MAPPING_FAILED' THEN 'FAILED'
                WHEN 'PROCESSING_FAILED' THEN 'FAILED'
                WHEN 'RECONCILIATION_FAILED' THEN 'FAILED'
                ELSE 'FAILED'
            END
        )::upload_status_new
        """
    )
    op.execute("DROP TYPE upload_status")
    op.execute("ALTER TYPE upload_status_new RENAME TO upload_status")

    # 4. Warehouse return scan events.
    op.create_table(
        "warehouse_scans",
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("upload_id", sa.UUID(), nullable=True),
        sa.Column("partner_id", sa.UUID(), nullable=True),
        sa.Column("scan_reference", sa.String(length=100), nullable=False),
        sa.Column("order_reference", sa.String(length=100), nullable=False),
        sa.Column("awb_number", sa.String(length=100), nullable=True),
        sa.Column("scan_date", sa.Date(), nullable=True),
        sa.Column("scan_type", sa.String(length=50), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=True),
        sa.Column("location", sa.String(length=100), nullable=True),
        sa.Column("raw_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
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
        sa.ForeignKeyConstraint(["upload_id"], ["uploads.id"]),
        sa.ForeignKeyConstraint(["partner_id"], ["partners.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_warehouse_scans_org_id"),
        "warehouse_scans",
        ["org_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_warehouse_scans_upload_id"),
        "warehouse_scans",
        ["upload_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_warehouse_scans_scan_reference"),
        "warehouse_scans",
        ["scan_reference"],
        unique=False,
    )
    op.create_index(
        op.f("ix_warehouse_scans_order_reference"),
        "warehouse_scans",
        ["order_reference"],
        unique=False,
    )
    op.create_index(
        op.f("ix_warehouse_scans_awb_number"),
        "warehouse_scans",
        ["awb_number"],
        unique=False,
    )
    op.create_index(
        op.f("ix_warehouse_scans_scan_date"),
        "warehouse_scans",
        ["scan_date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_warehouse_scans_scan_date"), table_name="warehouse_scans")
    op.drop_index(op.f("ix_warehouse_scans_awb_number"), table_name="warehouse_scans")
    op.drop_index(
        op.f("ix_warehouse_scans_order_reference"), table_name="warehouse_scans"
    )
    op.drop_index(
        op.f("ix_warehouse_scans_scan_reference"), table_name="warehouse_scans"
    )
    op.drop_index(
        op.f("ix_warehouse_scans_upload_id"), table_name="warehouse_scans"
    )
    op.drop_index(op.f("ix_warehouse_scans_org_id"), table_name="warehouse_scans")
    op.drop_table("warehouse_scans")

    op.execute("ALTER TABLE uploads ALTER COLUMN status DROP DEFAULT")
    op.execute(
        "CREATE TYPE upload_status_old AS ENUM "
        "('UPLOADED', 'VALIDATING', 'VALIDATED', 'MAPPING_PENDING', "
        "'MAPPING_APPROVED', 'PROCESSING', 'RECONCILING', 'COMPLETED', "
        "'VALIDATION_FAILED', 'MAPPING_FAILED', 'PROCESSING_FAILED', "
        "'RECONCILIATION_FAILED')"
    )
    op.execute(
        """
        ALTER TABLE uploads
        ALTER COLUMN status TYPE upload_status_old
        USING (
            CASE status::text
                WHEN 'UPLOADED' THEN 'UPLOADED'
                WHEN 'PARSED' THEN 'VALIDATED'
                WHEN 'MAPPED' THEN 'MAPPING_APPROVED'
                WHEN 'PROCESSING' THEN 'PROCESSING'
                WHEN 'PROCESSED' THEN 'COMPLETED'
                WHEN 'FAILED' THEN 'PROCESSING_FAILED'
                ELSE 'PROCESSING_FAILED'
            END
        )::upload_status_old
        """
    )
    op.execute("DROP TYPE upload_status")
    op.execute("ALTER TYPE upload_status_old RENAME TO upload_status")

    op.drop_column("uploads", "duplicate_count")
    op.drop_column("uploads", "rejected_count")
    op.drop_column("uploads", "processed_count")
