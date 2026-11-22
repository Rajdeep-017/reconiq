# ReconIQ - System Architecture

## 1. System overview

ReconIQ is a financial reconciliation platform for Indian e-commerce sellers and D2C brands. It reconciles orders, marketplace settlements, payment-gateway payouts, COD remittances, freight invoices, returns, and warehouse scans.

The repository contains two frontends in one React application:

- a public landing page at `/`
- an authenticated reconciliation workspace starting at `/dashboard`

The public page reads an explicitly labelled demonstration dataset from the backend. It never reads tenant records and never hardcodes live business statistics in the frontend.

### Core principles

- **Financial accuracy first** - money uses Python `Decimal` and PostgreSQL `NUMERIC(15, 2)`, never floating point.
- **Deterministic reconciliation** - business rules, tolerances, and approvals are explicit and auditable.
- **AI as advisor** - AI may suggest mappings or anomaly hints, but it never writes financial records, calculates money, or approves matches.
- **Multi-tenant by design** - every tenant-owned record carries `org_id`, and API queries are organization-scoped.
- **Public data is separate** - the public endpoint returns only aggregate demo values and has no database dependency.

---

## 2. Runtime topology

```text
Browser
  |
  |  HTTPS
  v
Nginx / load balancer
  |-- /, /login, /register, /dashboard ... --> React SPA (Vite build)
  |
  |-- /api/ --------------------------------> FastAPI (Uvicorn)
                                                |
                              +-----------------+-----------------+
                              |                                   |
                        PostgreSQL 16                         Redis 7
                        tenant data                     cache / queues
```

In local development, Vite serves the SPA on port 5173 and proxies `/api` to Uvicorn on port 8000. In the production container stack, Nginx serves the SPA and proxies `/api/` to the backend service.

### Route ownership

| Route | Owner | Auth |
|---|---|---|
| `/` | Public landing page | No |
| `/login`, `/register` | Authentication pages | No |
| `/dashboard` | Dashboard | Bearer JWT |
| `/uploads`, `/mapping`, `/reconciliation`, `/match-review` | Reconciliation workspace | Bearer JWT |
| `/discrepancies`, `/claims`, `/analytics` | Finance workflows | Bearer JWT |
| `/partners`, `/users`, `/settings`, `/audit-logs` | Administration | Bearer JWT |
| `/api/v1/public/overview` | FastAPI public router | No |
| `/api/v1/auth/*` | FastAPI auth router | No |
| Other `/api/v1/*` | FastAPI protected routers | Bearer JWT |

Unknown client-side paths redirect to `/`.

---

## 3. Technology stack

| Layer | Technology |
|---|---|
| Backend framework | FastAPI, Python 3.12+ |
| ORM | SQLAlchemy 2.0 |
| Validation | Pydantic v2 |
| Database | PostgreSQL 16 |
| Migrations | Alembic |
| Cache / queues | Redis 7, Celery |
| Auth | Argon2 password hashing, JWT (`python-jose`) |
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, scoped landing CSS |
| Charts | Recharts |
| Data fetching | TanStack Query, Axios |
| Optional AI | Ollama, local LLM |
| Production serving | Nginx |
| Containerization | Docker, Docker Compose |

---

## 4. Backend layout

```text
backend/app/
├── api/v1/                 # HTTP routers
│   ├── auth.py
│   ├── users.py
│   ├── partners.py
│   ├── uploads.py
│   ├── mappings.py
│   ├── reconciliation.py
│   ├── discrepancies.py
│   ├── claims.py
│   ├── dashboard.py
│   ├── analytics.py
│   └── public.py           # Unauthenticated landing demo data
├── core/                   # Security, dependencies, exceptions
├── database/               # Engine, session, Base
├── models/                 # SQLAlchemy models
├── modules/
│   ├── ingestion/          # File parsing and import rows
│   ├── mapping/            # Column mapping and optional AI suggestions
│   ├── normalization/      # Canonical record builders
│   ├── matching/           # Settlement, COD, freight, returns engines
│   ├── reconciliation/     # Run orchestration
│   ├── discrepancies/      # Detection and review
│   ├── claims/             # Claim lifecycle
│   ├── analytics/          # Aggregates
│   └── ai/                 # Optional advisory helpers
├── repositories/           # Data-access helpers
├── schemas/                # Pydantic request/response models
├── services/               # Application services
├── workers/                # Background tasks
├── config.py               # Pydantic settings
└── main.py                 # Application factory
```

### Router groups

| Prefix | Responsibility |
|---|---|
| `/api/v1/auth` | Registration, login, current user |
| `/api/v1/users` | User administration |
| `/api/v1/partners` | Marketplace and logistics partners |
| `/api/v1/uploads` | CSV/XLSX ingestion |
| `/api/v1/mappings` | Column mapping review and approval |
| `/api/v1/reconciliation` | Runs, results, and match review |
| `/api/v1/discrepancies` | Discrepancy review and resolution |
| `/api/v1/claims` | Claim creation and lifecycle |
| `/api/v1/dashboard` | Dashboard aggregates |
| `/api/v1/analytics` | Analytics queries |
| `/api/v1/public` | Public landing demo dataset |

---

## 5. Frontend layout

```text
frontend/src/
├── components/
│   ├── landing/            # Public nav, hero, panels, sections, FAQ, footer
│   ├── layout/             # Authenticated shell, sidebar, header
│   └── ui/                 # Shared primitives
├── hooks/                  # Auth and data hooks
├── lib/                    # API client, query client, utilities
├── pages/                  # Landing, auth, dashboard, workspace
├── services/               # Typed API services
├── types/                  # Shared TypeScript types
├── landing.css             # Scoped public landing design system
├── routes.tsx              # Public and authenticated routes
└── main.tsx                # Providers and error boundary
```

### Public landing composition

1. Floating glass navigation with active-section tracking and mobile menu.
2. Hero with product copy, CTAs, particles, light beams, and a curved arc.
3. Three live React preview panels: reconciliation overview, settlement reconciliation, discrepancy overview.
4. Platform capabilities and the reconciliation problem.
5. Five-step "How ReconIQ works" workflow.
6. Tabbed product showcase: Overview, Reconciliation, Discrepancies, Claims.
7. Solutions, FAQ accordion, final CTA, and footer.
8. Loading, error, retry, and reduced-motion states.

The preview panels use `usePublicOverview` and the shared API client. They never contain fallback business totals. If the public endpoint fails, the UI shows an unavailable state with a retry action.

---

## 6. Reconciliation pipeline

```text
Upload -> Parse -> Map columns -> Approve mapping -> Normalize
       -> Match -> Detect discrepancies -> Review -> Claim -> Recover
```

### 6.1 Ingestion

- CSV and XLSX files are validated and stored with a UUID filename.
- The upload record stores checksum, row count, headers, sample rows, and status.
- Status lifecycle: `uploaded -> parsed -> mapped -> processing -> processed | failed`.

### 6.2 Mapping

- Rule-based header matching proposes canonical fields.
- Optional AI suggestions add confidence scores and reasoning.
- A human approves the mapping before normalization.
- Approved mappings can be reused as partner templates.

### 6.3 Normalization

- Raw rows become typed canonical records: orders, settlements, COD remittances, freight records, returns, and warehouse scans.
- Dates are parsed, amounts become `Decimal`, and duplicate hashes are computed.
- Processing, rejected, and duplicate counts are stored on the upload.

### 6.4 Matching

Reconciliation runs are typed as `settlement`, `freight`, `cod`, or `return`. Match methods include:

- `exact`
- `composite`
- `fuzzy`
- `ai_assisted`
- `manual`

Match statuses include `matched`, `partial`, `unmatched`, `review_pending`, `confirmed`, and `rejected`.

### 6.5 Discrepancies

Detected discrepancies are categorized, assigned a severity, and reviewed. Categories include short payment, missing settlement, unpaid order, missing COD remittance, freight overcharge, incorrect freight weight/zone, return/refund mismatch, duplicate deduction, excess payment, and other.

### 6.6 Claims

A confirmed discrepancy can become a claim. The lifecycle is:

```text
draft -> submitted -> acknowledged -> under_review -> resolved | rejected -> closed
```

Claim evidence is stored as an immutable snapshot attached to the claim.

---

## 7. Financial calculation principles

ReconIQ follows an expected / received / difference model.

```text
Expected = order net amount adjusted by commissions and applicable fees
Received = actual settlement, remittance, or refund amount
Difference = Expected - Received
```

Interpretation:

- `Difference > 0` - short payment; the seller may be owed money.
- `Difference < 0` - excess payment; review required.
- `Difference = 0` - reconciled within tolerance.

Rules:

- Monetary columns use `NUMERIC(15, 2)`.
- Python calculations use `Decimal` with explicit rounding.
- Tolerance is configurable per organization and reconciliation type.
- Rule parameters are stored in `rule_configs` and are versioned by the audit trail.
- No financial calculation depends on an LLM.

---

## 8. AI boundaries

### AI may

- suggest column mappings
- provide confidence scores and reasoning
- surface anomaly hints for human review

### AI may not

- create, modify, or delete financial records
- auto-approve mappings or matches
- calculate or adjust monetary amounts
- override reconciliation rules
- submit claims

AI is optional. All reconciliation and claim workflows work without Ollama.

---

## 9. Security model

### Authentication

- Argon2 password hashing.
- JWT access tokens with configurable expiry.
- Tokens are sent as `Authorization: Bearer <token>`.

### Authorization and tenancy

- Role-based access control.
- Every tenant-owned query is scoped by `org_id`.
- Users belong to an organization; organization ownership is explicit.
- Cross-tenant access is rejected at the service and repository layers.

### API and data protection

- CORS uses an explicit origin allowlist.
- Upload size and type limits are enforced.
- Pydantic validates all request bodies.
- SQLAlchemy parameterizes queries.
- Uploaded files are stored outside the web root.
- The public landing endpoint uses no database session and exposes only aggregate demo data.
- Rate limiting and WAF rules are recommended at the edge.

---

## 10. Database overview

PostgreSQL 16 is the system of record. Key characteristics:

- UUID primary keys.
- `org_id` on tenant-owned tables.
- `created_at` and `updated_at` timestamps.
- `NUMERIC(15, 2)` for money.
- JSONB for mappings, raw rows, summaries, and metadata.
- B-tree indexes on foreign keys and common lookup columns.
- GIN indexes where JSONB containment queries are used.

Major table groups:

| Group | Tables |
|---|---|
| Identity and tenancy | `organizations`, `users`, `partners` |
| Ingestion | `uploads`, `import_rows`, `column_mappings`, `column_mapping_templates` |
| Canonical records | `orders`, `settlements`, `cod_remittances`, `freight_records`, `returns`, `warehouse_scans` |
| Reconciliation | `reconciliation_runs`, `reconciliation_results`, `match_suggestions`, `rule_configs` |
| Recovery | `discrepancies`, `claims`, `claim_evidence` |
| Operations | `rate_cards`, `audit_logs` |

See [database_design.md](database_design.md) for the full schema reference.

---

## 11. API overview

Base URL:

```text
http://localhost:8000/api/v1
```

Interactive documentation:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Public endpoint

`GET /api/v1/public/overview` returns:

- `mode: "demo"`
- an explicit disclaimer
- overview counts and matching rate
- seven-day trend
- matching breakdown
- settlement preview
- discrepancy preview
- claim lifecycle preview

It does not return tenant IDs, organization IDs, user records, settlements, tokens, or emails.

### Protected endpoints

Protected endpoints require a bearer token. Dashboard and analytics endpoints return organization-scoped aggregates; workflow endpoints return tenant-owned records.

### Errors

FastAPI returns standard error responses. Validation errors use `422`; authentication failures use `401`; authorization failures use `403`; missing resources use `404`.

---

## 12. Deployment architecture

The production-like stack is defined in `docker-compose.prod.yml`:

- `postgres` - PostgreSQL 16 with a named data volume.
- `redis` - Redis 7 with append-only persistence.
- `backend` - Python 3.12 image, Alembic migrations, Uvicorn workers.
- `frontend` - Vite build served by Nginx, with `/api` proxied to the backend.

Nginx provides:

- SPA fallback for client-side routes.
- One-year caching for hashed assets.
- `client_max_body_size` sized for uploads.
- Security headers.
- A `/healthz` endpoint for container health checks.

PostgreSQL, Redis, and the direct backend port are bound to `127.0.0.1` for local administration. Only the frontend port is intended for external access. See [deployment.md](../deployment.md) for the full production guide.

---

## 13. Testing and observability

- Backend tests use pytest and a separate `reconiq_test` database.
- Public endpoint tests verify arithmetic consistency and the absence of tenant fields.
- Frontend verification uses TypeScript, the production build, and headless browser checks for responsive layout, interactions, error states, and reduced motion.
- Health endpoints: `/health` for liveness and `/ready` for database and migration readiness.
- Container logs use Docker's `json-file` driver with rotation.
- Recommended production additions: Sentry, structured JSON logs, metrics, uptime checks, and database slow-query monitoring.
