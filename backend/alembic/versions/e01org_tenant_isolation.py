"""Add organization model and org_id tenant isolation

Revision ID: e01org_tenant_isolation
Revises: e00c4281d615
Create Date: 2026-11-06 00:00:00.000000

"""
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e01org_tenant_isolation'
down_revision: Union[str, None] = 'e00c4281d615'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Tables that receive an org_id column, in dependency-safe backfill order.
# Every table is backfilled from its parent where possible; anything still
# orphaned is assigned to a single legacy organization (created on demand).
ORG_TABLES: list[tuple[str, str | None]] = [
    ('uploads', "UPDATE uploads u SET org_id = usr.org_id FROM users usr WHERE u.uploaded_by_id = usr.id AND u.org_id IS NULL"),
    ('import_rows', "UPDATE import_rows ir SET org_id = u.org_id FROM uploads u WHERE ir.upload_id = u.id AND ir.org_id IS NULL"),
    ('column_mappings', "UPDATE column_mappings cm SET org_id = u.org_id FROM uploads u WHERE cm.upload_id = u.id AND cm.org_id IS NULL"),
    ('orders', "UPDATE orders o SET org_id = u.org_id FROM uploads u WHERE o.upload_id = u.id AND o.org_id IS NULL"),
    ('returns', "UPDATE returns r SET org_id = u.org_id FROM uploads u WHERE r.upload_id = u.id AND r.org_id IS NULL"),
    ('settlements', "UPDATE settlements s SET org_id = u.org_id FROM uploads u WHERE s.upload_id = u.id AND s.org_id IS NULL"),
    ('cod_remittances', "UPDATE cod_remittances cr SET org_id = u.org_id FROM uploads u WHERE cr.upload_id = u.id AND cr.org_id IS NULL"),
    ('freight_records', "UPDATE freight_records fr SET org_id = u.org_id FROM uploads u WHERE fr.upload_id = u.id AND fr.org_id IS NULL"),
    (
        'partners',
        """
        UPDATE partners p
        SET org_id = COALESCE(
            (SELECT u.org_id FROM uploads u WHERE u.partner_id = p.id AND u.org_id IS NOT NULL LIMIT 1),
            (SELECT o.org_id FROM orders o WHERE o.partner_id = p.id AND o.org_id IS NOT NULL LIMIT 1),
            (SELECT r.org_id FROM returns r WHERE r.partner_id = p.id AND r.org_id IS NOT NULL LIMIT 1),
            (SELECT s.org_id FROM settlements s WHERE s.partner_id = p.id AND s.org_id IS NOT NULL LIMIT 1),
            (SELECT c.org_id FROM cod_remittances c WHERE c.partner_id = p.id AND c.org_id IS NOT NULL LIMIT 1),
            (SELECT f.org_id FROM freight_records f WHERE f.partner_id = p.id AND f.org_id IS NOT NULL LIMIT 1)
        )
        WHERE p.org_id IS NULL
        """,
    ),
    ('column_mapping_templates', "UPDATE column_mapping_templates t SET org_id = p.org_id FROM partners p WHERE t.partner_id = p.id AND t.org_id IS NULL"),
    ('rate_cards', "UPDATE rate_cards rc SET org_id = p.org_id FROM partners p WHERE rc.partner_id = p.id AND rc.org_id IS NULL"),
    ('reconciliation_runs', "UPDATE reconciliation_runs rr SET org_id = u.org_id FROM users u WHERE rr.created_by_id = u.id AND rr.org_id IS NULL"),
    ('reconciliation_results', "UPDATE reconciliation_results res SET org_id = rr.org_id FROM reconciliation_runs rr WHERE res.run_id = rr.id AND res.org_id IS NULL"),
    ('match_suggestions', "UPDATE match_suggestions ms SET org_id = rr.org_id FROM reconciliation_runs rr WHERE ms.run_id = rr.id AND ms.org_id IS NULL"),
    ('discrepancies', "UPDATE discrepancies d SET org_id = rr.org_id FROM reconciliation_runs rr WHERE d.run_id = rr.id AND d.org_id IS NULL"),
    ('claims', "UPDATE claims c SET org_id = d.org_id FROM discrepancies d WHERE c.discrepancy_id = d.id AND c.org_id IS NULL"),
    ('claim_evidence', "UPDATE claim_evidence ce SET org_id = c.org_id FROM claims c WHERE ce.claim_id = c.id AND ce.org_id IS NULL"),
    ('audit_logs', "UPDATE audit_logs al SET org_id = u.org_id FROM users u WHERE al.user_id = u.id AND al.org_id IS NULL"),
]

# One tenant for pre-tenant rows whose parent cannot be resolved. Created only
# when a table actually has orphaned rows, so fresh databases stay clean.
LEGACY_ORG_ID = uuid.uuid4()


def _ensure_legacy_org(table_name: str) -> None:
    op.execute(
        sa.text(
            """
            INSERT INTO organizations (id, name, slug, settings, is_active, created_at, updated_at)
            SELECT :id, 'Legacy Import', 'legacy-import', {empty}::jsonb, true, now(), now()
            WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'legacy-import')
              AND EXISTS (SELECT 1 FROM {table} WHERE org_id IS NULL)
            """.format(table=table_name, empty="'{}'")
        ).bindparams(id=LEGACY_ORG_ID)
    )


def _add_org_id_column(op, table_name: str, backfill_sql: str | None) -> None:
    """Add org_id to a table: nullable column → backfill → NOT NULL → index → FK."""

    # 1. Add nullable org_id column (index created explicitly below)
    op.add_column(
        table_name,
        sa.Column('org_id', sa.UUID(), nullable=True),
    )
    op.create_index(op.f(f'ix_{table_name}_org_id'), table_name, ['org_id'], unique=False)

    # 2. Backfill org_id from relationships (if SQL provided)
    if backfill_sql:
        op.execute(sa.text(backfill_sql))

    # 3. Rows with no discoverable parent still need a tenant before NOT NULL.
    _ensure_legacy_org(table_name)
    op.execute(
        sa.text(
            f"UPDATE {table_name} SET org_id = :legacy_org_id WHERE org_id IS NULL"
        ).bindparams(legacy_org_id=LEGACY_ORG_ID)
    )

    # 4. Enforce NOT NULL (safe on empty tables; populated tables are backfilled above)
    op.alter_column(table_name, 'org_id', existing_type=sa.UUID(), nullable=False)

    # 5. Foreign key to organizations
    op.create_foreign_key(
        f'fk_{table_name}_org_id',
        table_name,
        'organizations',
        ['org_id'],
        ['id'],
    )


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. Create organizations table (owner_id nullable — no FK yet due to circular ref)
    # ------------------------------------------------------------------
    op.create_table(
        'organizations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('owner_id', sa.UUID(), nullable=True),
        sa.Column('settings', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_organizations_slug'), 'organizations', ['slug'], unique=True)
    op.create_index(op.f('ix_organizations_owner_id'), 'organizations', ['owner_id'], unique=False)

    # ------------------------------------------------------------------
    # 2. Add users.org_id (nullable) + index + FK to organizations
    # ------------------------------------------------------------------
    op.add_column(
        'users',
        sa.Column('org_id', sa.UUID(), nullable=True),
    )
    op.create_index(op.f('ix_users_org_id'), 'users', ['org_id'], unique=False)
    op.create_foreign_key(
        'fk_users_org_id',
        'users',
        'organizations',
        ['org_id'],
        ['id'],
    )

    # ------------------------------------------------------------------
    # 3. BACKFILL: create an organization for every user without one,
    #    BEFORE any org_id column becomes NOT NULL. Set-based SQL keeps this
    #    migration usable in both online and --sql (offline) mode.
    # ------------------------------------------------------------------
    op.execute(
        sa.text("""
            INSERT INTO organizations (id, name, slug, settings, is_active, created_at, updated_at)
            SELECT gen_random_uuid(),
                   'User Org ' || u.id::text,
                   'user-org-' || u.id::text,
                   '{}'::jsonb,
                   true,
                   now(),
                   now()
            FROM users u
            WHERE u.org_id IS NULL
              AND NOT EXISTS (
                  SELECT 1 FROM organizations o
                  WHERE o.slug = 'user-org-' || u.id::text
              )
        """)
    )
    op.execute(
        sa.text("""
            UPDATE users u
            SET org_id = o.id
            FROM organizations o
            WHERE o.slug = 'user-org-' || u.id::text
              AND u.org_id IS NULL
        """)
    )

    # ------------------------------------------------------------------
    # 4. Set organizations.owner_id → point to a user in that org
    # ------------------------------------------------------------------
    op.execute(
        sa.text("""
            UPDATE organizations o
            SET owner_id = (
                SELECT u.id FROM users u WHERE u.org_id = o.id LIMIT 1
            )
            WHERE o.owner_id IS NULL
        """)
    )

    # ------------------------------------------------------------------
    # 5. Now add the organizations.owner_id → users.id foreign key
    # ------------------------------------------------------------------
    op.create_foreign_key(
        'fk_organizations_owner_id',
        'organizations',
        'users',
        ['owner_id'],
        ['id'],
    )

    # ------------------------------------------------------------------
    # 6. Add org_id to all remaining tenant-scoped tables
    # ------------------------------------------------------------------
    for table_name, backfill_sql in ORG_TABLES:
        _add_org_id_column(op, table_name, backfill_sql)

    # ------------------------------------------------------------------
    # 7. Update partner uniqueness: code stays globally unique,
    #    name becomes unique per organization
    # ------------------------------------------------------------------
    op.create_unique_constraint('uq_partners_org_id_name', 'partners', ['org_id', 'name'])


def downgrade() -> None:
    # Remove foreign keys and org_id columns in reverse order
    op.drop_constraint('uq_partners_org_id_name', 'partners', type_='unique')

    for table_name, _ in reversed(ORG_TABLES):
        op.drop_constraint(f'fk_{table_name}_org_id', table_name, type_='foreignkey')
        op.drop_index(op.f(f'ix_{table_name}_org_id'), table_name=table_name)
        op.drop_column(table_name, 'org_id')

    op.drop_constraint('fk_organizations_owner_id', 'organizations', type_='foreignkey')
    op.drop_constraint('fk_users_org_id', 'users', type_='foreignkey')
    op.drop_index(op.f('ix_users_org_id'), table_name='users')
    op.drop_column('users', 'org_id')

    op.drop_index(op.f('ix_organizations_slug'), table_name='organizations')
    op.drop_table('organizations')
