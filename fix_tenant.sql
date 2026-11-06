-- Check if organizations table exists
SELECT to_regclass('organizations') AS organizations_exists;

-- Check if users.org_id exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name='users' AND column_name='org_id';

-- Create organizations table if it doesn't exist
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    owner_id UUID,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add org_id to users if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='org_id') THEN
        ALTER TABLE users ADD COLUMN org_id UUID;
    END IF;
END $$;

-- Add FK from users.org_id to organizations.id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_users_org_id') THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_org_id FOREIGN KEY (org_id) REFERENCES organizations(id);
    END IF;
END $$;

-- Add FK from organizations.owner_id to users.id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_organizations_owner_id') THEN
        ALTER TABLE organizations ADD CONSTRAINT fk_organizations_owner_id FOREIGN KEY (owner_id) REFERENCES users(id);
    END IF;
END $$;

-- Add org_id to other tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partners' AND column_name='org_id') THEN
        ALTER TABLE partners ADD COLUMN org_id UUID NOT NULL DEFAULT gen_random_uuid();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_partners_org_id') THEN
        ALTER TABLE partners ADD CONSTRAINT fk_partners_org_id FOREIGN KEY (org_id) REFERENCES organizations(id);
    END IF;
END $$;

-- Add org_id to uploads
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uploads' AND column_name='org_id') THEN
        ALTER TABLE uploads ADD COLUMN org_id UUID NOT NULL DEFAULT gen_random_uuid();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_uploads_org_id') THEN
        ALTER TABLE uploads ADD CONSTRAINT fk_uploads_org_id FOREIGN KEY (org_id) REFERENCES organizations(id);
    END IF;
END $$;

-- Add org_id to import_rows
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='import_rows' AND column_name='org_id') THEN
        ALTER TABLE import_rows ADD COLUMN org_id UUID NOT NULL DEFAULT gen_random_uuid();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_import_rows_org_id') THEN
        ALTER TABLE import_rows ADD CONSTRAINT fk_import_rows_org_id FOREIGN KEY (org_id) REFERENCES organizations(id);
    END IF;
END $$;

-- Add org_id to column_mappings
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='column_mappings' AND column_name='org_id') THEN
        ALTER TABLE column_mappings ADD COLUMN org_id UUID NOT NULL DEFAULT gen_random_uuid();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_column_mappings_org_id') THEN
        ALTER TABLE column_mappings ADD CONSTRAINT fk_column_mappings_org_id FOREIGN KEY (org_id) REFERENCES organizations(id);
    END IF;
END $$;

-- Add org_id to column_mapping_templates
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='column_mapping_templates' AND column_name='org_id') THEN
        ALTER TABLE column_mapping_templates ADD COLUMN org_id UUID NOT NULL DEFAULT gen_random_uuid();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_column_mapping_templates_org_id') THEN
        ALTER TABLE column_mapping_templates ADD CONSTRAINT fk_column_mapping_templates_org_id FOREIGN KEY (org_id) REFERENCES organizations(id);
    END IF;
END $$;

-- Add org_id to orders
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='org_id') THEN
        ALTER TABLE orders ADD COLUMN org_id UUID NOT NULL DEFAULT gen_random_uuid();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_orders_org_id') THEN
        ALTER TABLE orders ADD CONSTRAINT fk_orders_org_id FOREIGN KEY (org_id) REFERENCES organizations(id);
    END IF;
END $$;

-- Add org_id to returns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='returns' AND column_name='org_id') THEN
        ALTER TABLE returns ADD COLUMN org_id UUID NOT NULL DEFAULT gen_random_uuid();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_returns_org_id') THEN
        ALTER TABLE returns ADD CONSTRAINT fk_returns_org_id FOREIGN KEY (org_id) REFERENCES organizations(id);
    END IF;
END $$;

-- Add org_id to settlements
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='settlements' AND column_name='org_id') THEN
        ALTER TABLE settlements ADD COLUMN org_id UUID NOT NULL DEFAULT gen_random_uuid();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_settlements_org_id') THEN
        ALTER TABLE settlements ADD CONSTRAINT fk_settlements_org_id FOREIGN KEY (org_id) REFERENCES organizations(id);
    END IF;
END $$;

-- Add org_id to cod_remittances
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cod_remittances' AND column_name='org_id') THEN
        ALTER TABLE cod_remittances ADD COLUMN org_id UUID NOT NULL DEFAULT gen_random_uuid();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_cod_remittances_org_id') THEN
        ALTER TABLE cod_remittances ADD CONSTRAINT fk_cod_remittances_org_id FOREIGN KEY (org_id) REFERENCES organizations(id);
    END IF;
END $$;

-- Add org_id to freight_records
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='freight_records' AND column_name='org_id') THEN
        ALTER TABLE freight_records ADD COLUMN org_id UUID NOT NULL DEFAULT gen_random_uuid();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_freight_records_org_id') THEN
        ALTER TABLE freight_records ADD CONSTRAINT fk_freight_records_org_id FOREIGN KEY (org_id) REFERENCES organizations(id);
    END IF;
END $$;

-- Add org_id to rate_cards
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rate_cards' AND column_name='org_id') THEN
        ALTER TABLE rate_cards ADD COLUMN org_id UUID NOT NULL DEFAULT gen_random_uuid();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_rate_cards_org_id') THEN
        ALTER TABLE rate_cards ADD CONSTRAINT fk_rate_cards_org_id FOREIGN KEY (org_id) REFERENCES organizations(id);
    END IF;
END $$;

-- Add org_id to reconciliation_runs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reconciliation_runs' AND column_name='org_id') THEN
        ALTER TABLE reconciliation_runs ADD COLUMN org_id UUID NOT NULL DEFAULT gen_random_uuid();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_reconciliation_runs_org_id') THEN
        ALTER TABLE reconciliation_runs ADD CONSTRAINT fk_reconciliation_runs_org_id FOREIGN KEY (org_id) REFERENCES organizations(id);
    END IF;
END $$;

-- Add org_id to reconciliation_results
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reconciliation_results' AND column_name='org_id') THEN
        ALTER TABLE reconciliation_results ADD COLUMN org_id UUID NOT NULL DEFAULT gen_random_uuid();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_reconciliation_results_org_id') THEN
        ALTER TABLE reconciliation_results ADD CONSTRAINT fk_reconciliation_results_org_id FOREIGN KEY (org_id) REFERENCES organizations(id);
    END IF;
END $$;

-- Add org_id to match_suggestions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='match_suggestions' AND column_name='org_id') THEN
        ALTER TABLE match_suggestions ADD COLUMN org_id UUID NOT NULL DEFAULT gen_random_uuid();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_match_suggestions_org_id') THEN
        ALTER TABLE match_suggestions ADD CONSTRAINT fk_match_suggestions_org_id FOREIGN KEY (org_id) REFERENCES organizations(id);
    END IF;
END $$;

-- Add org_id to discrepancies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='discrepancies' AND column_name='org_id') THEN
        ALTER TABLE discrepancies ADD COLUMN org_id UUID NOT NULL DEFAULT gen_random_uuid();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_discrepancies_org_id') THEN
        ALTER TABLE discrepancies ADD CONSTRAINT fk_discrepancies_org_id FOREIGN KEY (org_id) REFERENCES organizations(id);
    END IF;
END $$;

-- Add org_id to claims
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claims' AND column_name='org_id') THEN
        ALTER TABLE claims ADD COLUMN org_id UUID NOT NULL DEFAULT gen_random_uuid();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_claims_org_id') THEN
        ALTER TABLE claims ADD CONSTRAINT fk_claims_org_id FOREIGN KEY (org_id) REFERENCES organizations(id);
    END IF;
END $$;

-- Add org_id to claim_evidence
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claim_evidence' AND column_name='org_id') THEN
        ALTER TABLE claim_evidence ADD COLUMN org_id UUID NOT NULL DEFAULT gen_random_uuid();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_claim_evidence_org_id') THEN
        ALTER TABLE claim_evidence ADD CONSTRAINT fk_claim_evidence_org_id FOREIGN KEY (org_id) REFERENCES organizations(id);
    END IF;
END $$;

-- Add org_id to audit_logs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='org_id') THEN
        ALTER TABLE audit_logs ADD COLUMN org_id UUID NOT NULL DEFAULT gen_random_uuid();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_audit_logs_org_id') THEN
        ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs_org_id FOREIGN KEY (org_id) REFERENCES organizations(id);
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS ix_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS ix_users_org_id ON users(org_id);
CREATE INDEX IF NOT EXISTS ix_partners_org_id ON partners(org_id);
CREATE INDEX IF NOT EXISTS ix_uploads_org_id ON uploads(org_id);
CREATE INDEX IF NOT EXISTS ix_import_rows_org_id ON import_rows(org_id);
CREATE INDEX IF NOT EXISTS ix_column_mappings_org_id ON column_mappings(org_id);
CREATE INDEX IF NOT EXISTS ix_column_mapping_templates_org_id ON column_mapping_templates(org_id);
CREATE INDEX IF NOT EXISTS ix_orders_org_id ON orders(org_id);
CREATE INDEX IF NOT EXISTS ix_returns_org_id ON returns(org_id);
CREATE INDEX IF NOT EXISTS ix_settlements_org_id ON settlements(org_id);
CREATE INDEX IF NOT EXISTS ix_cod_remittances_org_id ON cod_remittances(org_id);
CREATE INDEX IF NOT EXISTS ix_freight_records_org_id ON freight_records(org_id);
CREATE INDEX IF NOT EXISTS ix_rate_cards_org_id ON rate_cards(org_id);
CREATE INDEX IF NOT EXISTS ix_reconciliation_runs_org_id ON reconciliation_runs(org_id);
CREATE INDEX IF NOT EXISTS ix_reconciliation_results_org_id ON reconciliation_results(org_id);
CREATE INDEX IF NOT EXISTS ix_match_suggestions_org_id ON match_suggestions(org_id);
CREATE INDEX IF NOT EXISTS ix_discrepancies_org_id ON discrepancies(org_id);
CREATE INDEX IF NOT EXISTS ix_claims_org_id ON claims(org_id);
CREATE INDEX IF NOT EXISTS ix_claim_evidence_org_id ON claim_evidence(org_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_org_id ON audit_logs(org_id);

SELECT 'Migration completed successfully!' AS status;