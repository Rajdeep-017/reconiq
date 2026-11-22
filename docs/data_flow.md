# ReconIQ - Data Flow Documentation

## 1. Overview

This document describes how data moves through ReconIQ:

1. Public landing-page demo data
2. Authentication
3. File upload and parsing
4. Column mapping and approval
5. Normalization into canonical financial records
6. Reconciliation and matching
7. Discrepancy detection
8. Claims and recovery

All tenant-owned flows are scoped by `org_id`. Monetary calculations use `Decimal` and PostgreSQL `NUMERIC`.

---

## 2. Public landing data flow

The public landing page is intentionally isolated from tenant data.

```mermaid
sequenceDiagram
    participant B as Browser
    participant N as Nginx
    participant A as FastAPI /api/v1/public
    participant R as React Landing

    B->>N: GET /
    N-->>B: index.html + assets
    R->>N: GET /api/v1/public/overview
    N->>A: Proxy request
    A-->>N: Demo overview JSON
    N-->>R: mode=demo + disclaimer + aggregates
    R-->>B: Render preview panels
```

### Contract

`GET /api/v1/public/overview` returns:

- `mode: "demo"`
- `disclaimer`: explicitly states the values are not live customer data
- `generated_at`
- `overview`: total, matched, pending, matching rate, status
- `trend`: seven daily points
- `matching_breakdown`
- `settlement`: expected, actual, difference, status
- `discrepancies`: open, under review, resolved, categories
- `claims`: lifecycle counts and recovered amount

### Guarantees

- No authentication is required.
- No database session is used.
- No tenant, organization, user, email, settlement, or token fields are returned.
- Arithmetic is internally consistent; tests enforce it.
- The frontend never falls back to hardcoded business totals.
- If the endpoint fails, the landing page shows an unavailable state with a retry action.

---

## 3. Authentication flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as React
    participant A as FastAPI /auth
    participant D as PostgreSQL

    U->>F: Email + password
    F->>A: POST /api/v1/auth/login
    A->>D: Lookup user by email
    D-->>A: User + Argon2 hash
    A->>A: Verify password, sign JWT
    A-->>F: access_token, token_type, expires_in
    F->>A: GET /api/v1/auth/me (Bearer)
    A-->>F: User profile
    F-->>U: Redirect to /dashboard
```

- Tokens are stored in browser local storage under `reconiq_token`.
- The shared Axios client attaches `Authorization: Bearer <token>`.
- A `401` response clears stored credentials and redirects to `/login`.
- The authenticated layout redirects unauthenticated users to `/login`.
- Login and registration redirect authenticated users to `/dashboard`.

---

## 4. File upload flow

```mermaid
flowchart TD
    A["User selects CSV/XLSX"] --> B["Frontend validates extension and size"]
    B --> C["POST /api/v1/uploads"]
    C --> D{"Backend validation"}
    D -->|Invalid| E["422 / 413 error"]
    D -->|Valid| F["Store file with UUID filename"]
    F --> G["Create uploads row (status=uploaded)"]
    G --> H["Parse headers, sample rows, row count"]
    H --> I["Create import_rows"]
    I --> J["Update status=parsed"]
    J --> K["Return upload metadata and preview"]
```

### Details

| Step | Component | Behaviour |
|---|---|---|
| 1 | Frontend | Accepts `.csv` and `.xlsx`, checks `MAX_UPLOAD_SIZE_MB` |
| 2 | API | Re-validates type and size |
| 3 | Storage | Saves under `UPLOAD_DIR` with a UUID filename |
| 4 | Database | Creates an `uploads` row with checksum and metadata |
| 5 | Parser | Extracts headers, sample rows, and row count |
| 6 | Database | Creates `import_rows` for raw row storage |
| 7 | Database | Sets `status=parsed` |

Upload status lifecycle:

```text
uploaded -> parsed -> mapped -> processing -> processed
                                             \-> failed
```

---

## 5. Column mapping flow

```mermaid
flowchart TD
    A["Parsed upload"] --> B["Load canonical schema for document type"]
    B --> C{"AI suggestions enabled?"}
    C -->|Yes| D["Ollama suggests mappings + confidence"]
    C -->|No| E["Rule-based header matching"]
    D --> F["Present suggestions to user"]
    E --> F
    F --> G{"User reviews"}
    G -->|Adjust| H["Edit mapping"]
    H --> G
    G -->|Approve| I["POST /api/v1/mappings/{id}/approve"]
    I --> J["Save column_mappings (is_approved=true)"]
    J --> K{"Save as template?"}
    K -->|Yes| L["Upsert column_mapping_templates"]
    K -->|No| M["Continue"]
    L --> M
    M --> N["Upload status=mapped"]
```

### Rules

- AI suggestions are advisory and optional.
- A human must approve the mapping before normalization.
- The approved mapping is stored with version, approver, and timestamp.
- Templates are organization- and partner-scoped.

### Canonical fields

| Document type | Required fields | Optional fields |
|---|---|---|
| Orders | `order_reference`, `net_amount` | date, SKU, product, quantity, discount, payment method, customer location, status |
| Settlements | `order_reference`, `actual_received` | settlement date, commission, shipping fee, other fees, TCS, TDS |
| COD remittances | `order_reference`, `cod_amount`, `remitted_amount` | remittance date, UTR, status |
| Freight invoices | `order_reference`, `total_freight` | AWB, invoice date, zone, actual/charged weight, rate, COD charges |
| Returns | `order_reference`, `refund_amount` | return date, reason, return status, refund status/date |
| Warehouse scans | `order_reference`, `scan_date` | scan reference, AWB, scan type, status, location |

---

## 6. Normalization flow

```mermaid
flowchart TD
    A["Approved mapping"] --> B["Load import_rows"]
    B --> C["Apply mapping to each row"]
    C --> D["Coerce dates and Decimal amounts"]
    D --> E["Validate required fields"]
    E --> F{"Duplicate hash exists?"}
    F -->|Yes| G["Increment duplicate_count, skip"]
    F -->|No| H["Insert canonical record"]
    H --> I["Link upload_id, partner_id, import_row_id"]
    I --> J{"More rows?"}
    G --> J
    J -->|Yes| C
    J -->|No| K["Update processed/rejected/duplicate counts"]
    K --> L["Upload status=processed or failed"]
```

Canonical tables:

- `orders`
- `settlements`
- `cod_remittances`
- `freight_records`
- `returns`
- `warehouse_scans`

Normalization records:

- `processed_count` - successfully inserted rows
- `rejected_count` - validation failures
- `duplicate_count` - rows skipped by duplicate hash
- `error_message` - fatal parsing/normalization detail

Deduplication uses a SHA-256 hash over key fields. The hash is stored on `orders.dedup_hash` and used to prevent duplicate imports.

---

## 7. Reconciliation flow

```mermaid
flowchart TD
    A["User creates reconciliation run"] --> B["Select recon type and uploads"]
    B --> C["Snapshot rule_configs into run.config"]
    C --> D["Set run status=running"]
    D --> E["Execute matching engine"]

    E --> F["Settlement matching"]
    E --> G["COD matching"]
    E --> H["Freight matching"]
    E --> I["Return matching"]

    F --> J["Write reconciliation_results"]
    G --> J
    H --> J
    I --> J

    J --> K["Detect discrepancies"]
    K --> L["Write discrepancies"]
    L --> M["Compute summary and totals"]
    M --> N["Set run status=completed"]
    N --> O["Dashboard and workspace update"]
```

### Run types

- `settlement` - orders vs marketplace settlements
- `cod` - orders vs COD remittances
- `freight` - orders vs freight invoices and rate cards
- `return` - returns vs warehouse scans and refunds

### Match methods

| Method | Meaning |
|---|---|
| `exact` | Exact order/reference match |
| `composite` | Match on multiple fields |
| `fuzzy` | Similar reference/amount/date |
| `ai_assisted` | AI suggested candidate, human still reviews |
| `manual` | Human-created or human-confirmed match |

### Match statuses

- `matched`
- `partial`
- `unmatched`
- `review_pending`
- `confirmed`
- `rejected`

### Rule configuration

`rule_configs` stores organization-scoped or global defaults for:

- amount tolerance
- settlement due days
- COD due days
- late grace days
- return scan window
- RTO expected multiplier
- severity thresholds

The active values are copied into `reconciliation_runs.config` so historical runs remain explainable even after defaults change.

---

## 8. Discrepancy flow

```mermaid
flowchart TD
    A["Reconciliation result"] --> B{"Difference or stream issue?"}
    B -->|No| C["No discrepancy"]
    B -->|Yes| D["Create discrepancy"]
    D --> E["Assign type, severity, expected/actual/difference"]
    E --> F["Status=detected"]
    F --> G{"Reviewer decision"}
    G -->|Confirm| H["Status=verified"]
    G -->|Dispute| I["Status=disputed"]
    G -->|Dismiss| J["Status=dismissed"]
    H --> K{"Resolve directly or create claim?"}
    K -->|Resolve| L["Status=resolved"]
    K -->|Claim| M["Create claim from discrepancy"]
```

### Severity

- `low`
- `medium`
- `high`
- `critical`

Thresholds are configurable through `rule_configs`.

### Discrepancy categories

Short payment, missing settlement, unpaid order, missing COD remittance, freight overcharge, incorrect freight weight, incorrect freight zone, return/refund mismatch, duplicate deduction, excess payment, and stream-specific categories such as `short_paid`, `unpaid_past_due`, `freight_overcharged`, `return_not_received`, and `settled_late`.

---

## 9. Claims flow

```mermaid
stateDiagram-v2
    [*] --> Draft: Create from verified discrepancy
    Draft --> Submitted: Submit to partner
    Submitted --> Acknowledged: Partner acknowledges
    Acknowledged --> UnderReview: Partner reviews
    UnderReview --> Resolved: Accepted / partially accepted
    UnderReview --> Rejected: Rejected
    Resolved --> Closed: Recovery confirmed
    Rejected --> Closed: Written off or re-filed
    Draft --> Closed: Cancelled
```

### Claim records

- `claims` stores reference, type, amount, recovered amount, status, notes, and lifecycle timestamps.
- `claim_evidence` stores an immutable snapshot of the discrepancy and supporting data.
- Recovery amounts are recorded as `Decimal`/`NUMERIC`.
- Claim actions are written to `audit_logs`.

---

## 10. End-to-end flow

```mermaid
flowchart LR
    subgraph Ingest["1. Ingest"]
        A["CSV/XLSX"] --> B["Parse"]
    end

    subgraph Map["2. Map"]
        B --> C["Suggest mappings"]
        C --> D["Human approves"]
    end

    subgraph Normalize["3. Normalize"]
        D --> E["Canonical records"]
        E --> F["Deduplicate and count"]
    end

    subgraph Reconcile["4. Reconcile"]
        F --> G["Run matching"]
        G --> H["Detect discrepancies"]
    end

    subgraph Recover["5. Recover"]
        H --> I["Create claims"]
        I --> J["Track recovery"]
    end

    style Ingest fill:#e3f2fd
    style Map fill:#f3e5f5
    style Normalize fill:#e8f5e9
    style Reconcile fill:#fff3e0
    style Recover fill:#fce4ec
```

---

## 11. Failure and retry behaviour

| Failure | Behaviour |
|---|---|
| Invalid file type/size | API returns `413` or `422`; no upload row |
| Parse failure | Upload status `failed`, error message stored |
| Mapping not approved | Normalization cannot start |
| Row validation failure | Row rejected; `rejected_count` increments |
| Duplicate row | Skipped; `duplicate_count` increments |
| Matching failure | Run status `failed`; error captured |
| Public endpoint unavailable | Landing shows unavailable state and retry button |
| Expired/invalid JWT | API returns `401`; frontend clears credentials and redirects to `/login` |
| Database unavailable | `/ready` reports not ready; containers remain unhealthy |

---

## 12. Data boundaries

- Public landing data is aggregate demo data only.
- Tenant-owned endpoints require a bearer token and filter by `org_id`.
- AI outputs are advisory and never mutate financial records.
- Uploaded files are stored outside the web root.
- Audit logs record sensitive workflow actions.
- Claim evidence is append-oriented and retained for dispute history.
