"""Add organization model and org_id tenant isolation

Revision ID: e01org_tenant_isolation
Revises: e00c4281d615
Create Date: 2026-11-06 00:00:00.000000

"""
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
# Each entry: (table_name, backfill_sql or None)
# backfill_sql is a SQL fragment that sets org_id from a related table.
ORG_TABLES: list[tuple[str, str | None]] = [
    ('users', None),  # special-cased: users get their own org via backfill below
    ('partners', None),  # no clear parent; org_id left nullable until explicitly set
    ('uploads', "UPDATE uploads u SET org_id = usr.org_id FROM users usr WHERE u.uploaded_by_id = usr.id AND u.org_id IS NULL"),
    ('import_rows', "UPDATE import_rows ir SET org_id = u.org_id FROM uploads u WHERE ir.upload_id = u.id AND ir.org_id IS NULL"),
    ('column_mappings', "UPDATE column_mappings cm SET org_id = u.org_id FROM uploads u WHERE cm.upload_id = u.id AND cm.org_id IS NULL"),
    ('column_mapping_templates', None),  # no parent; left nullable
    ('orders', "UPDATE orders o SET org_id = u.org_id FROM uploads u WHERE o.upload_id = u.id AND o.org_id IS NULL"),
    ('returns', "UPDATE returns r SET org_id = u.org_id FROM uploads u WHERE r.upload_id = u.id AND r.org_id IS NULL"),
    ('settlements', "UPDATE settlements s SET org_id = u.org_id FROM uploads u WHERE s.upload_id = u.id AND s.org_id IS NULL"),
    ('cod_remittances', "UPDATE cod_remittances cr SET org_id = u.org_id FROM uploads u WHERE cr.upload_id = u.id AND cr.org_id IS NULL"),
    ('freight_records', "UPDATE freight_records fr SET org_id = u.org_id FROM uploads u WHERE fr.upload_id = u.id AND fr.org_id IS NULL"),
    ('rate_cards', "UPDATE rate_cards rc SET org_id = p.org_id FROM partners p WHERE rc.partner_id = p.id AND rc.org_id IS NULL"),
    ('reconciliation_runs', "UPDATE reconciliation_runs rr SET org_id = u.org_id FROM users u WHERE rr.created_by_id = u.id AND rr.org_id IS NULL"),
    ('reconciliation_results', "UPDATE reconciliation_results res SET org_id = rr.org_id FROM reconciliation_runs rr WHERE res.run_id = rr.id AND res.org_id IS NULL"),
    ('match_suggestions', "UPDATE match_suggestions ms SET org_id = rr.org_id FROM reconciliation_runs rr WHERE ms.run_id = rr.id AND ms.org_id IS NULL"),
    ('discrepancies', "UPDATE discrepancies d SET org_id = rr.org_id FROM reconciliation_runs rr WHERE d.run_id = rr.id AND d.org_id IS NULL"),
    ('claims', "UPDATE claims c SET org_id = d.org_id FROM discrepancies d WHERE c.discrepancy_id = d.id AND c.org_id IS NULL"),
    ('claim_evidence', "UPDATE claim_evidence ce SET org_id = c.org_id FROM claims c WHERE ce.claim_id = c.id AND ce.org_id IS NULL"),
    ('audit_logs', "UPDATE audit_logs al SET org_id = u.org_id FROM users u WHERE al.user_id = u.id AND al.org_id IS NULL"),
]


def _add_org_id_column(op, table_name: str, backfill_sql: str | None) -> None:
    """Add org_id to a table: nullable column → backfill → NOT NULL → index → FK."""
    conn = op.get_bind()

    # 1. Add nullable org_id column + index
    op.add_column(
        table_name,
        sa.Column('org_id', sa.UUID(), nullable=True, index=True),
    )
    op.create_index(op.f(f'ix_{table_name}_org_id'), table_name, ['org_id'], unique=False)

    # 2. Backfill org_id from relationships (if SQL provided)
    if backfill_sql:
        conn.execute(sa.text(backfill_sql))

    # 3. Enforce NOT NULL (safe on empty tables; on populated tables all rows are backfilled above)
    op.alter_column(table_name, 'org_id', existing_type=sa.UUID(), nullable=False)

    # 4. Foreign key to organizations
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
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug')
    )
    op.create_index(op.f('ix_organizations_slug'), 'organizations', ['slug'], unique=False)

    # ------------------------------------------------------------------
    # 2. Add users.org_id (nullable) + index + FK to organizations
    # ------------------------------------------------------------------
    op.add_column(
        'users',
        sa.Column('org_id', sa.UUID(), nullable=True, index=True),
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
    #    BEFORE any org_id column becomes NOT NULL.
    # ------------------------------------------------------------------
    conn = op.get_bind()

    users_without_org = conn.execute(
        sa.text("SELECT id FROM users WHERE org_id IS NULL")
    ).fetchall()

    for (user_id,) in users_without_org:
        result = conn.execute(
            sa.text("""
                INSERT INTO organizations (name, slug, settings, is_active, created_at, updated_at)
                VALUES (:name, :slug, '{}', true, now(), now())
                RETURNING id
            """),
            {"name": f"User Org {user_id}", "slug": f"user-org-{user_id}"},
        )
        new_org_id = result.fetchone()[0]
        conn.execute(
            sa.text("UPDATE users SET org_id = :org_id WHERE id = :user_id"),
            {"org_id": new_org_id, "user_id": user_id},
        )

    # ------------------------------------------------------------------
    # 4. Set organizations.owner_id → point to a user in that org
    # ------------------------------------------------------------------
    conn.execute(
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
        if table_name == 'users':
            continue  # already handled above
        _add_org_id_column(op, table_name, backfill_sql)

    # ------------------------------------------------------------------
    # 7. Update partner uniqueness: code stays globally unique,
    #    name becomes unique per organization
    # ------------------------------------------------------------------
    op.drop_constraint('partners_name_key', 'partners', type_='unique')
    op.create_unique_constraint('uq_partners_org_id_name', 'partners', ['org_id', 'name'])


def downgrade() -> None:
    # Remove foreign keys and org_id columns in reverse order
    op.drop_constraint('uq_partners_org_id_name', 'partners', type_='unique')
    op.create_unique_constraint('partners_name_key', 'partners', ['name'])

    for table_name, _ in reversed(ORG_TABLES):
        if table_name == 'users':
            continue
        op.drop_constraint(f'fk_{table_name}_org_id', table_name, type_='foreignkey')
        op.drop_index(op.f(f'ix_{table_name}_org_id'), table_name=table_name)
        op.drop_column(table_name, 'org_id')

    op.drop_constraint('fk_organizations_owner_id', 'organizations', type_='foreignkey')
    op.drop_constraint('fk_users_org_id', 'users', type_='foreignkey')
    op.drop_index(op.f('ix_users_org_id'), table_name='users')
    op.drop_column('users', 'org_id')

    op.drop_index(op.f('ix_organizations_slug'), table_name='organizations')
    op.drop_table('organizations')
