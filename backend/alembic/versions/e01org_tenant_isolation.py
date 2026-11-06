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


def upgrade() -> None:
    # Create organizations table (owner_id FK added after users table exists)
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

    # Add org_id to users (must come before organizations.owner_id FK)
    op.add_column('users', sa.Column('org_id', sa.UUID(), nullable=True, index=True))
    op.create_index(op.f('ix_users_org_id'), 'users', ['org_id'], unique=False)
    op.create_foreign_key('fk_users_org_id', 'users', 'organizations', ['org_id'], ['id'])

    # Now add the organizations.owner_id -> users.id foreign key
    op.create_foreign_key('fk_organizations_owner_id', 'organizations', 'users', ['owner_id'], ['id'])

    # Add org_id to partners
    op.add_column('partners', sa.Column('org_id', sa.UUID(), nullable=False, index=True))
    op.create_index(op.f('ix_partners_org_id'), 'partners', ['org_id'], unique=False)
    op.create_foreign_key('fk_partners_org_id', 'partners', 'organizations', ['org_id'], ['id'])
    # Update partner uniqueness: code stays globally unique, name becomes unique per org
    op.drop_constraint('partners_name_key', 'partners', type_='unique')
    op.create_unique_constraint('uq_partners_org_id_name', 'partners', ['org_id', 'name'])

    # Add org_id to uploads
    op.add_column('uploads', sa.Column('org_id', sa.UUID(), nullable=False, index=True))
    op.create_index(op.f('ix_uploads_org_id'), 'uploads', ['org_id'], unique=False)
    op.create_foreign_key('fk_uploads_org_id', 'uploads', 'organizations', ['org_id'], ['id'])

    # Add org_id to import_rows
    op.add_column('import_rows', sa.Column('org_id', sa.UUID(), nullable=False, index=True))
    op.create_index(op.f('ix_import_rows_org_id'), 'import_rows', ['org_id'], unique=False)
    op.create_foreign_key('fk_import_rows_org_id', 'import_rows', 'organizations', ['org_id'], ['id'])

    # Add org_id to column_mappings
    op.add_column('column_mappings', sa.Column('org_id', sa.UUID(), nullable=False, index=True))
    op.create_index(op.f('ix_column_mappings_org_id'), 'column_mappings', ['org_id'], unique=False)
    op.create_foreign_key('fk_column_mappings_org_id', 'column_mappings', 'organizations', ['org_id'], ['id'])

    # Add org_id to column_mapping_templates
    op.add_column('column_mapping_templates', sa.Column('org_id', sa.UUID(), nullable=False, index=True))
    op.create_index(op.f('ix_column_mapping_templates_org_id'), 'column_mapping_templates', ['org_id'], unique=False)
    op.create_foreign_key('fk_column_mapping_templates_org_id', 'column_mapping_templates', 'organizations', ['org_id'], ['id'])

    # Add org_id to orders
    op.add_column('orders', sa.Column('org_id', sa.UUID(), nullable=False, index=True))
    op.create_index(op.f('ix_orders_org_id'), 'orders', ['org_id'], unique=False)
    op.create_foreign_key('fk_orders_org_id', 'orders', 'organizations', ['org_id'], ['id'])

    # Add org_id to returns
    op.add_column('returns', sa.Column('org_id', sa.UUID(), nullable=False, index=True))
    op.create_index(op.f('ix_returns_org_id'), 'returns', ['org_id'], unique=False)
    op.create_foreign_key('fk_returns_org_id', 'returns', 'organizations', ['org_id'], ['id'])

    # Add org_id to settlements
    op.add_column('settlements', sa.Column('org_id', sa.UUID(), nullable=False, index=True))
    op.create_index(op.f('ix_settlements_org_id'), 'settlements', ['org_id'], unique=False)
    op.create_foreign_key('fk_settlements_org_id', 'settlements', 'organizations', ['org_id'], ['id'])

    # Add org_id to cod_remittances
    op.add_column('cod_remittances', sa.Column('org_id', sa.UUID(), nullable=False, index=True))
    op.create_index(op.f('ix_cod_remittances_org_id'), 'cod_remittances', ['org_id'], unique=False)
    op.create_foreign_key('fk_cod_remittances_org_id', 'cod_remittances', 'organizations', ['org_id'], ['id'])

    # Add org_id to freight_records
    op.add_column('freight_records', sa.Column('org_id', sa.UUID(), nullable=False, index=True))
    op.create_index(op.f('ix_freight_records_org_id'), 'freight_records', ['org_id'], unique=False)
    op.create_foreign_key('fk_freight_records_org_id', 'freight_records', 'organizations', ['org_id'], ['id'])

    # Add org_id to rate_cards
    op.add_column('rate_cards', sa.Column('org_id', sa.UUID(), nullable=False, index=True))
    op.create_index(op.f('ix_rate_cards_org_id'), 'rate_cards', ['org_id'], unique=False)
    op.create_foreign_key('fk_rate_cards_org_id', 'rate_cards', 'organizations', ['org_id'], ['id'])

    # Add org_id to reconciliation_runs
    op.add_column('reconciliation_runs', sa.Column('org_id', sa.UUID(), nullable=False, index=True))
    op.create_index(op.f('ix_reconciliation_runs_org_id'), 'reconciliation_runs', ['org_id'], unique=False)
    op.create_foreign_key('fk_reconciliation_runs_org_id', 'reconciliation_runs', 'organizations', ['org_id'], ['id'])

    # Add org_id to reconciliation_results
    op.add_column('reconciliation_results', sa.Column('org_id', sa.UUID(), nullable=False, index=True))
    op.create_index(op.f('ix_reconciliation_results_org_id'), 'reconciliation_results', ['org_id'], unique=False)
    op.create_foreign_key('fk_reconciliation_results_org_id', 'reconciliation_results', 'organizations', ['org_id'], ['id'])

    # Add org_id to match_suggestions
    op.add_column('match_suggestions', sa.Column('org_id', sa.UUID(), nullable=False, index=True))
    op.create_index(op.f('ix_match_suggestions_org_id'), 'match_suggestions', ['org_id'], unique=False)
    op.create_foreign_key('fk_match_suggestions_org_id', 'match_suggestions', 'organizations', ['org_id'], ['id'])

    # Add org_id to discrepancies
    op.add_column('discrepancies', sa.Column('org_id', sa.UUID(), nullable=False, index=True))
    op.create_index(op.f('ix_discrepancies_org_id'), 'discrepancies', ['org_id'], unique=False)
    op.create_foreign_key('fk_discrepancies_org_id', 'discrepancies', 'organizations', ['org_id'], ['id'])

    # Add org_id to claims
    op.add_column('claims', sa.Column('org_id', sa.UUID(), nullable=False, index=True))
    op.create_index(op.f('ix_claims_org_id'), 'claims', ['org_id'], unique=False)
    op.create_foreign_key('fk_claims_org_id', 'claims', 'organizations', ['org_id'], ['id'])

    # Add org_id to claim_evidence
    op.add_column('claim_evidence', sa.Column('org_id', sa.UUID(), nullable=False, index=True))
    op.create_index(op.f('ix_claim_evidence_org_id'), 'claim_evidence', ['org_id'], unique=False)
    op.create_foreign_key('fk_claim_evidence_org_id', 'claim_evidence', 'organizations', ['org_id'], ['id'])

    # Add org_id to audit_logs
    op.add_column('audit_logs', sa.Column('org_id', sa.UUID(), nullable=False, index=True))
    op.create_index(op.f('ix_audit_logs_org_id'), 'audit_logs', ['org_id'], unique=False)
    op.create_foreign_key('fk_audit_logs_org_id', 'audit_logs', 'organizations', ['org_id'], ['id'])


def downgrade() -> None:
    # Remove foreign keys and org_id columns in reverse order
    op.drop_constraint('fk_audit_logs_org_id', 'audit_logs', type_='foreignkey')
    op.drop_index(op.f('ix_audit_logs_org_id'), table_name='audit_logs')
    op.drop_column('audit_logs', 'org_id')

    op.drop_constraint('fk_claim_evidence_org_id', 'claim_evidence', type_='foreignkey')
    op.drop_index(op.f('ix_claim_evidence_org_id'), table_name='claim_evidence')
    op.drop_column('claim_evidence', 'org_id')

    op.drop_constraint('fk_claims_org_id', 'claims', type_='foreignkey')
    op.drop_index(op.f('ix_claims_org_id'), table_name='claims')
    op.drop_column('claims', 'org_id')

    op.drop_constraint('fk_discrepancies_org_id', 'discrepancies', type_='foreignkey')
    op.drop_index(op.f('ix_discrepancies_org_id'), table_name='discrepancies')
    op.drop_column('discrepancies', 'org_id')

    op.drop_constraint('fk_match_suggestions_org_id', 'match_suggestions', type_='foreignkey')
    op.drop_index(op.f('ix_match_suggestions_org_id'), table_name='match_suggestions')
    op.drop_column('match_suggestions', 'org_id')

    op.drop_constraint('fk_reconciliation_results_org_id', 'reconciliation_results', type_='foreignkey')
    op.drop_index(op.f('ix_reconciliation_results_org_id'), table_name='reconciliation_results')
    op.drop_column('reconciliation_results', 'org_id')

    op.drop_constraint('fk_reconciliation_runs_org_id', 'reconciliation_runs', type_='foreignkey')
    op.drop_index(op.f('ix_reconciliation_runs_org_id'), table_name='reconciliation_runs')
    op.drop_column('reconciliation_runs', 'org_id')

    op.drop_constraint('fk_rate_cards_org_id', 'rate_cards', type_='foreignkey')
    op.drop_index(op.f('ix_rate_cards_org_id'), table_name='rate_cards')
    op.drop_column('rate_cards', 'org_id')

    op.drop_constraint('fk_freight_records_org_id', 'freight_records', type_='foreignkey')
    op.drop_index(op.f('ix_freight_records_org_id'), table_name='freight_records')
    op.drop_column('freight_records', 'org_id')

    op.drop_constraint('fk_cod_remittances_org_id', 'cod_remittances', type_='foreignkey')
    op.drop_index(op.f('ix_cod_remittances_org_id'), table_name='cod_remittances')
    op.drop_column('cod_remittances', 'org_id')

    op.drop_constraint('fk_settlements_org_id', 'settlements', type_='foreignkey')
    op.drop_index(op.f('ix_settlements_org_id'), table_name='settlements')
    op.drop_column('settlements', 'org_id')

    op.drop_constraint('fk_returns_org_id', 'returns', type_='foreignkey')
    op.drop_index(op.f('ix_returns_org_id'), table_name='returns')
    op.drop_column('returns', 'org_id')

    op.drop_constraint('fk_orders_org_id', 'orders', type_='foreignkey')
    op.drop_index(op.f('ix_orders_org_id'), table_name='orders')
    op.drop_column('orders', 'org_id')

    op.drop_constraint('fk_column_mapping_templates_org_id', 'column_mapping_templates', type_='foreignkey')
    op.drop_index(op.f('ix_column_mapping_templates_org_id'), table_name='column_mapping_templates')
    op.drop_column('column_mapping_templates', 'org_id')

    op.drop_constraint('fk_column_mappings_org_id', 'column_mappings', type_='foreignkey')
    op.drop_index(op.f('ix_column_mappings_org_id'), table_name='column_mappings')
    op.drop_column('column_mappings', 'org_id')

    op.drop_constraint('fk_import_rows_org_id', 'import_rows', type_='foreignkey')
    op.drop_index(op.f('ix_import_rows_org_id'), table_name='import_rows')
    op.drop_column('import_rows', 'org_id')

    op.drop_constraint('fk_uploads_org_id', 'uploads', type_='foreignkey')
    op.drop_index(op.f('ix_uploads_org_id'), table_name='uploads')
    op.drop_column('uploads', 'org_id')

    # Restore partner name uniqueness
    op.drop_constraint('uq_partners_org_id_name', 'partners', type_='unique')
    op.create_unique_constraint('partners_name_key', 'partners', ['name'])
    op.drop_constraint('fk_partners_org_id', 'partners', type_='foreignkey')
    op.drop_index(op.f('ix_partners_org_id'), table_name='partners')
    op.drop_column('partners', 'org_id')

    op.drop_constraint('fk_organizations_owner_id', 'organizations', type_='foreignkey')
    op.drop_constraint('fk_users_org_id', 'users', type_='foreignkey')
    op.drop_index(op.f('ix_users_org_id'), table_name='users')
    op.drop_column('users', 'org_id')

    op.drop_index(op.f('ix_organizations_slug'), table_name='organizations')
    op.drop_table('organizations')
