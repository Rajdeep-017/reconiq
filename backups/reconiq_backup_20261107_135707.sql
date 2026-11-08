-- ReconIQ logical backup
-- Generated: 2026-11-07T13:57:07.352724
-- Database: reconiq

---- TABLE SCHEMA ----

-- Table: alembic_version
CREATE TABLE IF NOT EXISTS alembic_version (
    version_num character varying NOT NULL
,
    PRIMARY KEY (version_num)

);

CREATE UNIQUE INDEX alembic_version_pkc ON public.alembic_version USING btree (version_num);

-- Table: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    user_id uuid NULL,
    action character varying NOT NULL,
    entity_type character varying NOT NULL,
    entity_id character varying NULL,
    description text NULL,
    changes jsonb NULL,
    ip_address character varying NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid DEFAULT gen_random_uuid() NOT NULL
,
    PRIMARY KEY (id)

);

CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);

CREATE INDEX ix_audit_logs_action ON public.audit_logs USING btree (action);

CREATE INDEX ix_audit_logs_entity_type ON public.audit_logs USING btree (entity_type);

CREATE INDEX ix_audit_logs_org_id ON public.audit_logs USING btree (org_id);

CREATE INDEX ix_audit_logs_user_id ON public.audit_logs USING btree (user_id);

ALTER TABLE audit_logs ADD FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE audit_logs ADD FOREIGN KEY (org_id) REFERENCES organizations(id);

-- Table: claim_evidence
CREATE TABLE IF NOT EXISTS claim_evidence (
    claim_id uuid NOT NULL,
    evidence_type character varying NOT NULL,
    title character varying NOT NULL,
    description text NULL,
    file_path character varying NULL,
    snapshot_data jsonb NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid DEFAULT gen_random_uuid() NOT NULL
,
    PRIMARY KEY (id)

);

CREATE UNIQUE INDEX claim_evidence_pkey ON public.claim_evidence USING btree (id);

CREATE INDEX ix_claim_evidence_claim_id ON public.claim_evidence USING btree (claim_id);

CREATE INDEX ix_claim_evidence_org_id ON public.claim_evidence USING btree (org_id);

ALTER TABLE claim_evidence ADD FOREIGN KEY (claim_id) REFERENCES claims(id);

ALTER TABLE claim_evidence ADD FOREIGN KEY (org_id) REFERENCES organizations(id);

-- Table: claims
CREATE TABLE IF NOT EXISTS claims (
    discrepancy_id uuid NOT NULL,
    partner_id uuid NULL,
    created_by_id uuid NOT NULL,
    claim_reference character varying NOT NULL,
    claim_type character varying NOT NULL,
    claim_amount numeric NOT NULL,
    recovered_amount numeric NOT NULL,
    status USER-DEFINED NOT NULL,
    notes text NULL,
    submitted_at timestamp with time zone NULL,
    acknowledged_at timestamp with time zone NULL,
    resolved_at timestamp with time zone NULL,
    closed_at timestamp with time zone NULL,
    metadata_extra jsonb NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid DEFAULT gen_random_uuid() NOT NULL
,
    PRIMARY KEY (id)

);

CREATE UNIQUE INDEX claims_pkey ON public.claims USING btree (id);

CREATE UNIQUE INDEX ix_claims_claim_reference ON public.claims USING btree (claim_reference);

CREATE INDEX ix_claims_discrepancy_id ON public.claims USING btree (discrepancy_id);

CREATE INDEX ix_claims_org_id ON public.claims USING btree (org_id);

CREATE INDEX ix_claims_partner_id ON public.claims USING btree (partner_id);

ALTER TABLE claims ADD FOREIGN KEY (created_by_id) REFERENCES users(id);

ALTER TABLE claims ADD FOREIGN KEY (discrepancy_id) REFERENCES discrepancies(id);

ALTER TABLE claims ADD FOREIGN KEY (partner_id) REFERENCES partners(id);

ALTER TABLE claims ADD FOREIGN KEY (org_id) REFERENCES organizations(id);

-- Table: cod_remittances
CREATE TABLE IF NOT EXISTS cod_remittances (
    upload_id uuid NULL,
    order_id uuid NULL,
    partner_id uuid NULL,
    remittance_reference character varying NOT NULL,
    order_reference character varying NOT NULL,
    remittance_date date NULL,
    cod_amount numeric NOT NULL,
    remitted_amount numeric NOT NULL,
    utr_number character varying NULL,
    status USER-DEFINED NOT NULL,
    raw_data jsonb NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid DEFAULT gen_random_uuid() NOT NULL
,
    PRIMARY KEY (id)

);

CREATE UNIQUE INDEX cod_remittances_pkey ON public.cod_remittances USING btree (id);

CREATE INDEX ix_cod_remittances_order_id ON public.cod_remittances USING btree (order_id);

CREATE INDEX ix_cod_remittances_order_reference ON public.cod_remittances USING btree (order_reference);

CREATE INDEX ix_cod_remittances_org_id ON public.cod_remittances USING btree (org_id);

CREATE INDEX ix_cod_remittances_remittance_reference ON public.cod_remittances USING btree (remittance_reference);

CREATE INDEX ix_cod_remittances_upload_id ON public.cod_remittances USING btree (upload_id);

ALTER TABLE cod_remittances ADD FOREIGN KEY (order_id) REFERENCES orders(id);

ALTER TABLE cod_remittances ADD FOREIGN KEY (partner_id) REFERENCES partners(id);

ALTER TABLE cod_remittances ADD FOREIGN KEY (upload_id) REFERENCES uploads(id);

ALTER TABLE cod_remittances ADD FOREIGN KEY (org_id) REFERENCES organizations(id);

-- Table: column_mapping_templates
CREATE TABLE IF NOT EXISTS column_mapping_templates (
    name character varying NOT NULL,
    partner_id uuid NULL,
    document_type character varying NOT NULL,
    mappings jsonb NOT NULL,
    is_default boolean NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid DEFAULT gen_random_uuid() NOT NULL
,
    PRIMARY KEY (id)

);

CREATE UNIQUE INDEX column_mapping_templates_pkey ON public.column_mapping_templates USING btree (id);

CREATE INDEX ix_column_mapping_templates_org_id ON public.column_mapping_templates USING btree (org_id);

ALTER TABLE column_mapping_templates ADD FOREIGN KEY (partner_id) REFERENCES partners(id);

ALTER TABLE column_mapping_templates ADD FOREIGN KEY (org_id) REFERENCES organizations(id);

-- Table: column_mappings
CREATE TABLE IF NOT EXISTS column_mappings (
    upload_id uuid NOT NULL,
    version integer NOT NULL,
    mappings jsonb NOT NULL,
    confidence_scores jsonb NULL,
    is_approved boolean NOT NULL,
    approved_by_id uuid NULL,
    approved_at timestamp with time zone NULL,
    notes text NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid DEFAULT gen_random_uuid() NOT NULL
,
    PRIMARY KEY (id)

);

CREATE UNIQUE INDEX column_mappings_pkey ON public.column_mappings USING btree (id);

CREATE INDEX ix_column_mappings_org_id ON public.column_mappings USING btree (org_id);

CREATE INDEX ix_column_mappings_upload_id ON public.column_mappings USING btree (upload_id);

ALTER TABLE column_mappings ADD FOREIGN KEY (approved_by_id) REFERENCES users(id);

ALTER TABLE column_mappings ADD FOREIGN KEY (upload_id) REFERENCES uploads(id);

ALTER TABLE column_mappings ADD FOREIGN KEY (org_id) REFERENCES organizations(id);

-- Table: discrepancies
CREATE TABLE IF NOT EXISTS discrepancies (
    run_id uuid NOT NULL,
    result_id uuid NULL,
    partner_id uuid NULL,
    order_reference character varying NOT NULL,
    discrepancy_type USER-DEFINED NOT NULL,
    severity USER-DEFINED NOT NULL,
    status USER-DEFINED NOT NULL,
    expected_amount numeric NOT NULL,
    actual_amount numeric NOT NULL,
    difference_amount numeric NOT NULL,
    explanation text NULL,
    resolution text NULL,
    resolved_by_id uuid NULL,
    resolved_at timestamp with time zone NULL,
    metadata_extra jsonb NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid DEFAULT gen_random_uuid() NOT NULL
,
    PRIMARY KEY (id)

);

CREATE UNIQUE INDEX discrepancies_pkey ON public.discrepancies USING btree (id);

CREATE INDEX ix_discrepancies_order_reference ON public.discrepancies USING btree (order_reference);

CREATE INDEX ix_discrepancies_org_id ON public.discrepancies USING btree (org_id);

CREATE INDEX ix_discrepancies_partner_id ON public.discrepancies USING btree (partner_id);

CREATE INDEX ix_discrepancies_result_id ON public.discrepancies USING btree (result_id);

CREATE INDEX ix_discrepancies_run_id ON public.discrepancies USING btree (run_id);

ALTER TABLE discrepancies ADD FOREIGN KEY (partner_id) REFERENCES partners(id);

ALTER TABLE discrepancies ADD FOREIGN KEY (resolved_by_id) REFERENCES users(id);

ALTER TABLE discrepancies ADD FOREIGN KEY (result_id) REFERENCES reconciliation_results(id);

ALTER TABLE discrepancies ADD FOREIGN KEY (run_id) REFERENCES reconciliation_runs(id);

ALTER TABLE discrepancies ADD FOREIGN KEY (org_id) REFERENCES organizations(id);

-- Table: freight_records
CREATE TABLE IF NOT EXISTS freight_records (
    upload_id uuid NULL,
    order_id uuid NULL,
    partner_id uuid NULL,
    invoice_reference character varying NOT NULL,
    order_reference character varying NOT NULL,
    awb_number character varying NULL,
    invoice_date date NULL,
    origin_pincode character varying NULL,
    destination_pincode character varying NULL,
    zone character varying NULL,
    actual_weight_kg numeric NOT NULL,
    charged_weight_kg numeric NOT NULL,
    rate_per_kg numeric NOT NULL,
    freight_amount numeric NOT NULL,
    cod_charges numeric NOT NULL,
    total_freight numeric NOT NULL,
    raw_data jsonb NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid DEFAULT gen_random_uuid() NOT NULL
,
    PRIMARY KEY (id)

);

CREATE UNIQUE INDEX freight_records_pkey ON public.freight_records USING btree (id);

CREATE INDEX ix_freight_records_awb_number ON public.freight_records USING btree (awb_number);

CREATE INDEX ix_freight_records_invoice_reference ON public.freight_records USING btree (invoice_reference);

CREATE INDEX ix_freight_records_order_id ON public.freight_records USING btree (order_id);

CREATE INDEX ix_freight_records_order_reference ON public.freight_records USING btree (order_reference);

CREATE INDEX ix_freight_records_org_id ON public.freight_records USING btree (org_id);

CREATE INDEX ix_freight_records_partner_id ON public.freight_records USING btree (partner_id);

CREATE INDEX ix_freight_records_upload_id ON public.freight_records USING btree (upload_id);

ALTER TABLE freight_records ADD FOREIGN KEY (org_id) REFERENCES organizations(id);

ALTER TABLE freight_records ADD FOREIGN KEY (order_id) REFERENCES orders(id);

ALTER TABLE freight_records ADD FOREIGN KEY (partner_id) REFERENCES partners(id);

ALTER TABLE freight_records ADD FOREIGN KEY (upload_id) REFERENCES uploads(id);

-- Table: import_rows
CREATE TABLE IF NOT EXISTS import_rows (
    upload_id uuid NOT NULL,
    row_number integer NOT NULL,
    raw_data jsonb NOT NULL,
    is_valid boolean NOT NULL,
    validation_errors jsonb NULL,
    is_processed boolean NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid DEFAULT gen_random_uuid() NOT NULL
,
    PRIMARY KEY (id)

);

CREATE UNIQUE INDEX import_rows_pkey ON public.import_rows USING btree (id);

CREATE INDEX ix_import_rows_org_id ON public.import_rows USING btree (org_id);

CREATE INDEX ix_import_rows_upload_id ON public.import_rows USING btree (upload_id);

ALTER TABLE import_rows ADD FOREIGN KEY (org_id) REFERENCES organizations(id);

ALTER TABLE import_rows ADD FOREIGN KEY (upload_id) REFERENCES uploads(id);

-- Table: match_suggestions
CREATE TABLE IF NOT EXISTS match_suggestions (
    run_id uuid NOT NULL,
    source_record_id uuid NOT NULL,
    candidate_record_id uuid NOT NULL,
    confidence_score numeric NOT NULL,
    reasoning text NULL,
    is_accepted boolean NULL,
    reviewed_by_id uuid NULL,
    reviewed_at timestamp with time zone NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid DEFAULT gen_random_uuid() NOT NULL
,
    PRIMARY KEY (id)

);

CREATE INDEX ix_match_suggestions_org_id ON public.match_suggestions USING btree (org_id);

CREATE INDEX ix_match_suggestions_run_id ON public.match_suggestions USING btree (run_id);

CREATE UNIQUE INDEX match_suggestions_pkey ON public.match_suggestions USING btree (id);

ALTER TABLE match_suggestions ADD FOREIGN KEY (org_id) REFERENCES organizations(id);

ALTER TABLE match_suggestions ADD FOREIGN KEY (reviewed_by_id) REFERENCES users(id);

ALTER TABLE match_suggestions ADD FOREIGN KEY (run_id) REFERENCES reconciliation_runs(id);

-- Table: orders
CREATE TABLE IF NOT EXISTS orders (
    upload_id uuid NULL,
    import_row_id uuid NULL,
    partner_id uuid NULL,
    order_reference character varying NOT NULL,
    channel character varying NULL,
    order_date date NULL,
    sku character varying NULL,
    product_name character varying NULL,
    quantity integer NOT NULL,
    gross_amount numeric NOT NULL,
    discount numeric NOT NULL,
    net_amount numeric NOT NULL,
    payment_method character varying NULL,
    customer_city character varying NULL,
    customer_state character varying NULL,
    status USER-DEFINED NOT NULL,
    raw_data jsonb NULL,
    dedup_hash character varying NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid DEFAULT gen_random_uuid() NOT NULL
,
    PRIMARY KEY (id)

);

CREATE UNIQUE INDEX ix_orders_dedup_hash ON public.orders USING btree (dedup_hash);

CREATE INDEX ix_orders_order_date ON public.orders USING btree (order_date);

CREATE INDEX ix_orders_order_reference ON public.orders USING btree (order_reference);

CREATE INDEX ix_orders_org_id ON public.orders USING btree (org_id);

CREATE INDEX ix_orders_partner_id ON public.orders USING btree (partner_id);

CREATE INDEX ix_orders_upload_id ON public.orders USING btree (upload_id);

CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id);

ALTER TABLE orders ADD FOREIGN KEY (org_id) REFERENCES organizations(id);

ALTER TABLE orders ADD FOREIGN KEY (import_row_id) REFERENCES import_rows(id);

ALTER TABLE orders ADD FOREIGN KEY (partner_id) REFERENCES partners(id);

ALTER TABLE orders ADD FOREIGN KEY (upload_id) REFERENCES uploads(id);

-- Table: organizations
CREATE TABLE IF NOT EXISTS organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    slug character varying NOT NULL,
    owner_id uuid NULL,
    settings jsonb DEFAULT '{}'::jsonb NULL,
    is_active boolean DEFAULT true NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
,
    PRIMARY KEY (id)

);

CREATE INDEX ix_organizations_slug ON public.organizations USING btree (slug);

CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id);

CREATE UNIQUE INDEX organizations_slug_key ON public.organizations USING btree (slug);

ALTER TABLE organizations ADD FOREIGN KEY (owner_id) REFERENCES users(id);

-- Table: partners
CREATE TABLE IF NOT EXISTS partners (
    name character varying NOT NULL,
    code character varying NOT NULL,
    partner_type character varying NOT NULL,
    description text NULL,
    is_active boolean NOT NULL,
    settings jsonb NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid DEFAULT gen_random_uuid() NOT NULL
,
    PRIMARY KEY (id)

);

CREATE UNIQUE INDEX ix_partners_code ON public.partners USING btree (code);

CREATE INDEX ix_partners_org_id ON public.partners USING btree (org_id);

CREATE UNIQUE INDEX partners_name_key ON public.partners USING btree (name);

CREATE UNIQUE INDEX partners_pkey ON public.partners USING btree (id);

ALTER TABLE partners ADD FOREIGN KEY (org_id) REFERENCES organizations(id);

-- Table: rate_cards
CREATE TABLE IF NOT EXISTS rate_cards (
    partner_id uuid NOT NULL,
    name character varying NOT NULL,
    zone character varying NOT NULL,
    weight_slab_min_kg numeric NOT NULL,
    weight_slab_max_kg numeric NOT NULL,
    rate_per_kg numeric NOT NULL,
    fixed_charge numeric NOT NULL,
    cod_charge_percent numeric NOT NULL,
    effective_from date NOT NULL,
    effective_to date NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid DEFAULT gen_random_uuid() NOT NULL
,
    PRIMARY KEY (id)

);

CREATE INDEX ix_rate_cards_org_id ON public.rate_cards USING btree (org_id);

CREATE INDEX ix_rate_cards_partner_id ON public.rate_cards USING btree (partner_id);

CREATE UNIQUE INDEX rate_cards_pkey ON public.rate_cards USING btree (id);

ALTER TABLE rate_cards ADD FOREIGN KEY (org_id) REFERENCES organizations(id);

ALTER TABLE rate_cards ADD FOREIGN KEY (partner_id) REFERENCES partners(id);

-- Table: reconciliation_results
CREATE TABLE IF NOT EXISTS reconciliation_results (
    run_id uuid NOT NULL,
    order_reference character varying NOT NULL,
    source_record_id uuid NULL,
    target_record_id uuid NULL,
    match_method USER-DEFINED NOT NULL,
    match_status USER-DEFINED NOT NULL,
    confidence_score numeric NOT NULL,
    expected_amount numeric NOT NULL,
    actual_amount numeric NOT NULL,
    difference numeric NOT NULL,
    explanation text NULL,
    details jsonb NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid DEFAULT gen_random_uuid() NOT NULL
,
    PRIMARY KEY (id)

);

CREATE INDEX ix_reconciliation_results_order_reference ON public.reconciliation_results USING btree (order_reference);

CREATE INDEX ix_reconciliation_results_org_id ON public.reconciliation_results USING btree (org_id);

CREATE INDEX ix_reconciliation_results_run_id ON public.reconciliation_results USING btree (run_id);

CREATE UNIQUE INDEX reconciliation_results_pkey ON public.reconciliation_results USING btree (id);

ALTER TABLE reconciliation_results ADD FOREIGN KEY (org_id) REFERENCES organizations(id);

ALTER TABLE reconciliation_results ADD FOREIGN KEY (run_id) REFERENCES reconciliation_runs(id);

-- Table: reconciliation_runs
CREATE TABLE IF NOT EXISTS reconciliation_runs (
    created_by_id uuid NOT NULL,
    name character varying NOT NULL,
    recon_type USER-DEFINED NOT NULL,
    source_upload_id uuid NOT NULL,
    target_upload_id uuid NOT NULL,
    status USER-DEFINED NOT NULL,
    config jsonb NULL,
    summary jsonb NULL,
    total_source integer NOT NULL,
    total_target integer NOT NULL,
    matched_count integer NOT NULL,
    unmatched_count integer NOT NULL,
    discrepancy_count integer NOT NULL,
    total_expected numeric NOT NULL,
    total_received numeric NOT NULL,
    total_discrepancy numeric NOT NULL,
    started_at timestamp with time zone NULL,
    completed_at timestamp with time zone NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid DEFAULT gen_random_uuid() NOT NULL
,
    PRIMARY KEY (id)

);

CREATE INDEX ix_reconciliation_runs_org_id ON public.reconciliation_runs USING btree (org_id);

CREATE UNIQUE INDEX reconciliation_runs_pkey ON public.reconciliation_runs USING btree (id);

ALTER TABLE reconciliation_runs ADD FOREIGN KEY (org_id) REFERENCES organizations(id);

ALTER TABLE reconciliation_runs ADD FOREIGN KEY (created_by_id) REFERENCES users(id);

ALTER TABLE reconciliation_runs ADD FOREIGN KEY (source_upload_id) REFERENCES uploads(id);

ALTER TABLE reconciliation_runs ADD FOREIGN KEY (target_upload_id) REFERENCES uploads(id);

-- Table: returns
CREATE TABLE IF NOT EXISTS returns (
    upload_id uuid NULL,
    order_id uuid NULL,
    partner_id uuid NULL,
    return_id_reference character varying NOT NULL,
    order_reference character varying NOT NULL,
    return_date date NULL,
    return_reason character varying NULL,
    return_status USER-DEFINED NOT NULL,
    refund_amount numeric NOT NULL,
    refund_status USER-DEFINED NOT NULL,
    refund_date date NULL,
    raw_data jsonb NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid DEFAULT gen_random_uuid() NOT NULL
,
    PRIMARY KEY (id)

);

CREATE INDEX ix_returns_order_id ON public.returns USING btree (order_id);

CREATE INDEX ix_returns_order_reference ON public.returns USING btree (order_reference);

CREATE INDEX ix_returns_org_id ON public.returns USING btree (org_id);

CREATE INDEX ix_returns_return_id_reference ON public.returns USING btree (return_id_reference);

CREATE INDEX ix_returns_upload_id ON public.returns USING btree (upload_id);

CREATE UNIQUE INDEX returns_pkey ON public.returns USING btree (id);

ALTER TABLE returns ADD FOREIGN KEY (org_id) REFERENCES organizations(id);

ALTER TABLE returns ADD FOREIGN KEY (order_id) REFERENCES orders(id);

ALTER TABLE returns ADD FOREIGN KEY (partner_id) REFERENCES partners(id);

ALTER TABLE returns ADD FOREIGN KEY (upload_id) REFERENCES uploads(id);

-- Table: settlements
CREATE TABLE IF NOT EXISTS settlements (
    upload_id uuid NULL,
    order_id uuid NULL,
    partner_id uuid NULL,
    settlement_reference character varying NOT NULL,
    order_reference character varying NOT NULL,
    settlement_date date NULL,
    transaction_type character varying NULL,
    gross_amount numeric NOT NULL,
    commission numeric NOT NULL,
    shipping_fee numeric NOT NULL,
    other_fees numeric NOT NULL,
    tcs_deducted numeric NOT NULL,
    tds_deducted numeric NOT NULL,
    expected_net_settlement numeric NOT NULL,
    actual_received numeric NOT NULL,
    difference numeric NOT NULL,
    raw_data jsonb NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid DEFAULT gen_random_uuid() NOT NULL
,
    PRIMARY KEY (id)

);

CREATE INDEX ix_settlements_order_id ON public.settlements USING btree (order_id);

CREATE INDEX ix_settlements_order_reference ON public.settlements USING btree (order_reference);

CREATE INDEX ix_settlements_org_id ON public.settlements USING btree (org_id);

CREATE INDEX ix_settlements_partner_id ON public.settlements USING btree (partner_id);

CREATE INDEX ix_settlements_settlement_date ON public.settlements USING btree (settlement_date);

CREATE INDEX ix_settlements_settlement_reference ON public.settlements USING btree (settlement_reference);

CREATE INDEX ix_settlements_upload_id ON public.settlements USING btree (upload_id);

CREATE UNIQUE INDEX settlements_pkey ON public.settlements USING btree (id);

ALTER TABLE settlements ADD FOREIGN KEY (org_id) REFERENCES organizations(id);

ALTER TABLE settlements ADD FOREIGN KEY (order_id) REFERENCES orders(id);

ALTER TABLE settlements ADD FOREIGN KEY (partner_id) REFERENCES partners(id);

ALTER TABLE settlements ADD FOREIGN KEY (upload_id) REFERENCES uploads(id);

-- Table: uploads
CREATE TABLE IF NOT EXISTS uploads (
    uploaded_by_id uuid NOT NULL,
    partner_id uuid NULL,
    original_filename character varying NOT NULL,
    stored_filename character varying NOT NULL,
    file_type character varying NOT NULL,
    document_type USER-DEFINED NOT NULL,
    file_size bigint NOT NULL,
    sha256_checksum character varying NOT NULL,
    row_count integer NULL,
    column_headers jsonb NULL,
    sample_data jsonb NULL,
    status USER-DEFINED NOT NULL,
    error_message text NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid DEFAULT gen_random_uuid() NOT NULL
,
    PRIMARY KEY (id)

);

CREATE INDEX ix_uploads_org_id ON public.uploads USING btree (org_id);

CREATE INDEX ix_uploads_sha256_checksum ON public.uploads USING btree (sha256_checksum);

CREATE UNIQUE INDEX uploads_pkey ON public.uploads USING btree (id);

ALTER TABLE uploads ADD FOREIGN KEY (org_id) REFERENCES organizations(id);

ALTER TABLE uploads ADD FOREIGN KEY (partner_id) REFERENCES partners(id);

ALTER TABLE uploads ADD FOREIGN KEY (uploaded_by_id) REFERENCES users(id);

-- Table: users
CREATE TABLE IF NOT EXISTS users (
    email character varying NOT NULL,
    full_name character varying NOT NULL,
    hashed_password character varying NOT NULL,
    role USER-DEFINED NOT NULL,
    is_active boolean NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid NULL
,
    PRIMARY KEY (id)

);

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);

CREATE INDEX ix_users_org_id ON public.users USING btree (org_id);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

ALTER TABLE users ADD FOREIGN KEY (org_id) REFERENCES organizations(id);

---- TABLE DATA ----

-- Data for alembic_version (1 rows)
INSERT INTO alembic_version (version_num) VALUES ('e00c4281d615');

-- Data for organizations (4 rows)
INSERT INTO organizations (id, name, slug, owner_id, settings, is_active, created_at, updated_at) VALUES (910e1922-8ee0-4423-a614-6cc28fd6dd50, 'Rs''s Organization', 'example', e655b6cc-953e-4ce3-ad62-01a8c12dd963, {}, true, 2026-11-06 19:48:00.495336+00:00, 2026-11-06 19:48:00.495336+00:00);
INSERT INTO organizations (id, name, slug, owner_id, settings, is_active, created_at, updated_at) VALUES (4e25cfff-6408-48e3-9faa-37cace46da75, 'pppp''s Organization', 'example-1', 8ad26245-dec2-4450-8da1-38adec7f90ba, {}, true, 2026-11-06 19:49:31.270770+00:00, 2026-11-06 19:49:31.270770+00:00);
INSERT INTO organizations (id, name, slug, owner_id, settings, is_active, created_at, updated_at) VALUES (56f4cf0e-761e-428c-baaf-f60f2b8fda02, 'Test User''s Organization', 'example-2', d2f6064d-3039-4948-ab60-523e48ea636c, {}, true, 2026-11-06 21:36:59.036424+00:00, 2026-11-06 21:36:59.036424+00:00);
INSERT INTO organizations (id, name, slug, owner_id, settings, is_active, created_at, updated_at) VALUES (689aacb1-64be-4868-9cf0-383d0a80f40f, 'ppp''s Organization', 'gmail', 544427b6-601c-404a-b879-d38a33dab973, {}, true, 2026-11-07 06:30:54.767942+00:00, 2026-11-07 06:30:54.767942+00:00);

-- Data for users (4 rows)
INSERT INTO users (email, full_name, hashed_password, role, is_active, id, created_at, updated_at, org_id) VALUES ('wokrer@example.com', 'Rs', '$argon2id$v=19$m=65536,t=3,p=4$o6G5Xgm01kZlW2Z4libZGg$3x7ZrmxMvtviUAPoWfXzVpWB+Cs3sSG/jtgdSmcMxjg', 'FINANCE_EXECUTIVE', true, e655b6cc-953e-4ce3-ad62-01a8c12dd963, 2026-11-06 19:48:00.495336+00:00, 2026-11-06 19:48:00.495336+00:00, 910e1922-8ee0-4423-a614-6cc28fd6dd50);
INSERT INTO users (email, full_name, hashed_password, role, is_active, id, created_at, updated_at, org_id) VALUES ('worker@example.com', 'pppp', '$argon2id$v=19$m=65536,t=3,p=4$dt78dWNTZLciPTgWjcUZ/g$9jiYWGGcooheD77j074VnPfhsUhigSTqH6Z8X3b+fxE', 'FINANCE_EXECUTIVE', true, 8ad26245-dec2-4450-8da1-38adec7f90ba, 2026-11-06 19:49:31.270770+00:00, 2026-11-06 19:49:31.270770+00:00, 4e25cfff-6408-48e3-9faa-37cace46da75);
INSERT INTO users (email, full_name, hashed_password, role, is_active, id, created_at, updated_at, org_id) VALUES ('test@example.com', 'Test User', '$argon2id$v=19$m=65536,t=3,p=4$yHoQMLuqrhQzjrVuaEnXxw$lgb0boxDZmCtFyVA1cN2bR28eOJMGmUwBh5NhYY/HUw', 'FINANCE_EXECUTIVE', true, d2f6064d-3039-4948-ab60-523e48ea636c, 2026-11-06 21:36:59.036424+00:00, 2026-11-06 21:36:59.036424+00:00, 56f4cf0e-761e-428c-baaf-f60f2b8fda02);
INSERT INTO users (email, full_name, hashed_password, role, is_active, id, created_at, updated_at, org_id) VALUES ('work@gmail.com', 'ppp', '$argon2id$v=19$m=65536,t=3,p=4$ewazZSvqbZJ+ExLDH/FDBw$wAKwyRjpm2KPKzbkg9J59OvPB7jb2M8PdQWBCE2TQsw', 'FINANCE_EXECUTIVE', true, 544427b6-601c-404a-b879-d38a33dab973, 2026-11-07 06:30:54.767942+00:00, 2026-11-07 06:30:54.767942+00:00, 689aacb1-64be-4868-9cf0-383d0a80f40f);

-- alembic_version: [('e00c4281d615',)]

-- END OF BACKUP