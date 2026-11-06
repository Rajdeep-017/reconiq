# ReconIQ — System Architecture

## 1. System Overview

ReconIQ is a financial reconciliation platform purpose-built for Indian e-commerce sellers and D2C brands. It automates the tedious process of reconciling orders, settlements, freight charges, COD remittances, and returns across multiple marketplace partners (Amazon, Flipkart, Myntra, Meesho, etc.).

The platform follows a modular, layered architecture designed for correctness of financial calculations, extensibility across partners, and developer productivity.

### Core Principles

- **Financial Accuracy First**: All monetary values use `Decimal`/`NUMERIC` — never floating-point.
- **Deterministic Reconciliation**: Business rules are explicit, versioned, and auditable.
- **AI as Advisor, Not Decider**: AI assists with column mapping and anomaly hints but never modifies financial data.
- **Multi-Tenant by Design**: Every data record is scoped to an organization.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| **Backend Framework** | FastAPI (Python 3.12) |
| **ORM** | SQLAlchemy 2.0 (mapped_column, Mapped types) |
| **Database** | PostgreSQL 16 |
| **Migrations** | Alembic |
| **Caching / Queues** | Redis 7 |
| **Auth** | Argon2 (password hashing) + python-jose (JWT) |
| **Validation** | Pydantic v2 |
| **Frontend** | React 18 + TypeScript + Vite |
| **UI Components** | shadcn/ui + Tailwind CSS |
| **State Management** | TanStack Query |
| **AI (Optional)** | Ollama (local LLM) |
| **Containerization** | Docker + Docker Compose |

---

## 3. Module Descriptions

### 3.1 Auth Module (`app/modules/auth/`)
- User registration and login
- JWT access token issuance and validation
- Password hashing with Argon2
- Role-based access control (Owner, Admin, Member, Viewer)
- Organization-scoped permissions

### 3.2 File Upload Module (`app/modules/uploads/`)
- CSV/Excel file upload with size validation
- File type detection and storage
- Async parsing and preview generation
- Column metadata extraction
- Upload history and status tracking

### 3.3 Column Mapping Module (`app/modules/mappings/`)
- Map uploaded file columns to canonical schema fields
- AI-suggested mappings (via Ollama) with confidence scores
- User confirmation/override of mappings
- Mapping template save/reuse per partner
- Validation of required field coverage

### 3.4 Normalization Module (`app/modules/normalization/`)
- Transform raw uploaded data into canonical `NormalizedTransaction` records
- Data type coercion (dates, amounts, quantities)
- Currency validation (INR)
- Deduplication detection
- Data quality scoring

### 3.5 Reconciliation Engine (`app/modules/reconciliation/`)
- Core matching engine: order ↔ settlement, order ↔ freight, order ↔ COD
- Multi-pass matching (exact → fuzzy → manual)
- Configurable match rules and tolerance thresholds
- Reconciliation run management (create, execute, review)
- Match result persistence with audit trail

### 3.6 Discrepancy Module (`app/modules/discrepancies/`)
- Automatic discrepancy detection from reconciliation results
- Discrepancy categorization (short payment, overcharge, missing settlement, etc.)
- Severity classification
- Resolution workflow (auto-resolve, manual review, escalate)
- Discrepancy analytics and trends

### 3.7 Claims Module (`app/modules/claims/`)
- Generate claims from confirmed discrepancies
- Claim lifecycle management (Draft → Submitted → Acknowledged → Resolved → Closed)
- Claim document generation
- Partner-wise claim tracking
- Recovery amount tracking

### 3.8 AI Module (`app/modules/ai/`)
- Column mapping suggestions
- Anomaly detection hints
- Natural language query interface (future)
- All AI outputs are advisory — never auto-applied to financial data

---

## 4. Data Flow

### 4.1 End-to-End Pipeline

```
Upload → Parse → Map Columns → Normalize → Match → Reconcile → Detect Discrepancies → Generate Claims
```

### 4.2 Detailed Flow

```
┌─────────────┐    ┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│  File Upload │───▶│  Column Map  │───▶│  Normalize    │───▶│  Match       │
│  (CSV/XLSX)  │    │  (AI-assist) │    │  (Canonical)  │    │  (Rules)     │
└─────────────┘    └──────────────┘    └───────────────┘    └──────┬───────┘
                                                                   │
                                          ┌────────────────────────┘
                                          ▼
                                    ┌──────────────┐    ┌──────────────┐
                                    │  Discrepancy │───▶│  Claims      │
                                    │  Detection   │    │  Management  │
                                    └──────────────┘    └──────────────┘
```

### 4.3 Upload Flow
1. User uploads CSV/Excel file via the UI
2. Backend validates file size, type, and structure
3. File is stored in `storage/uploads/` with a UUID filename
4. Parser extracts column headers and a data preview (first 10 rows)
5. Upload record is persisted with metadata

### 4.4 Column Mapping Flow
1. System presents extracted columns alongside the canonical schema
2. AI module suggests mappings based on column names and sample data
3. User reviews, adjusts, and confirms mappings
4. Confirmed mappings are saved as a reusable template for the partner

### 4.5 Normalization Flow
1. Using confirmed mappings, raw rows are transformed into `NormalizedTransaction` records
2. Data types are coerced: dates parsed, amounts converted to `Decimal`
3. Deduplication checks run against existing records
4. Quality score is computed per record

### 4.6 Reconciliation Flow
1. User creates a reconciliation run, selecting datasets to compare (e.g., Orders vs. Settlements)
2. Engine executes multi-pass matching:
   - **Pass 1**: Exact match on order reference
   - **Pass 2**: Fuzzy match on amount + date proximity
   - **Pass 3**: Remaining items flagged for manual review
3. Match results are persisted with confidence scores
4. Discrepancies are auto-detected from mismatches

---

## 5. Financial Calculation Principles

ReconIQ follows the **E-R-D** framework for financial reconciliation:

### E — Expected Amount
The amount the seller expects to receive, calculated from order data:
```
Expected = Net Amount (from order) - Commission - Applicable Fees
```

### R — Received Amount
The amount actually received, sourced from settlement/remittance data:
```
Received = Net Settlement Amount (from partner payout)
```

### D — Discrepancy
The difference between expected and received:
```
Discrepancy = Expected - Received
```

- **D > 0**: Short payment (seller is owed money) → generates a claim
- **D < 0**: Overpayment (rare, needs verification)
- **D = 0**: Reconciled (matched)

### Tolerance Thresholds
- Configurable per reconciliation type
- Default: ±₹1.00 for rounding tolerance
- Amounts within tolerance are auto-reconciled

### Data Types
- All amounts stored as `NUMERIC(15, 2)` in PostgreSQL
- All calculations use Python `Decimal` with `ROUND_HALF_UP`
- No floating-point arithmetic is ever used for money

---

## 6. AI Boundaries

### What AI Does
- Suggests column mappings based on header names and sample data
- Provides confidence scores for mapping suggestions
- Detects anomalous patterns in financial data (advisory)
- Assists with natural language queries (future)

### What AI Does NOT Do
- Modify, create, or delete any financial records
- Auto-apply mappings without user confirmation
- Make reconciliation decisions
- Calculate or adjust monetary amounts
- Override business rules

### AI Infrastructure
- Runs locally via Ollama (no data leaves the server)
- Model: Llama 3.2 (configurable)
- Graceful degradation: all features work without AI

---

## 7. Security Model

### Authentication
- Argon2id password hashing (memory-hard, GPU-resistant)
- JWT access tokens (HS256, configurable expiry)
- Refresh token rotation (future)

### Authorization
- Role-Based Access Control (RBAC)
- Roles: Owner > Admin > Member > Viewer
- Organization-scoped data isolation
- Row-level security via `org_id` filtering on all queries

### API Security
- CORS with explicit origin whitelist
- Rate limiting via Redis (future)
- File upload size limits
- Input validation via Pydantic models
- SQL injection prevention via SQLAlchemy parameterized queries

### Data Security
- Passwords never stored in plaintext
- Sensitive config via environment variables
- File uploads stored outside web root
- No PII in logs

---

## 8. Database Overview

### Engine
PostgreSQL 16 with the following key characteristics:
- NUMERIC types for all monetary columns
- UUID primary keys (generated server-side)
- Timestamp columns (`created_at`, `updated_at`) on all tables
- Soft deletes where applicable
- GIN indexes for JSONB columns (column mappings, metadata)
- B-tree indexes on foreign keys and frequently queried columns

### Key Tables
| Table | Purpose |
|---|---|
| `users` | User accounts and credentials |
| `organizations` | Multi-tenant organization records |
| `uploaded_files` | File upload metadata and status |
| `column_mappings` | Mapping configurations per file/partner |
| `normalized_transactions` | Canonical transaction records |
| `reconciliation_runs` | Reconciliation execution metadata |
| `match_results` | Individual match outcomes |
| `discrepancies` | Detected financial discrepancies |
| `claims` | Claims generated from discrepancies |

### Migrations
- Managed via Alembic
- Auto-generation from SQLAlchemy models
- Version-controlled migration scripts

---

## 9. API Overview

### Base URL
```
http://localhost:8000/api/v1
```

### Interactive Docs
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Endpoint Groups
| Prefix | Description |
|---|---|
| `/api/v1/auth` | Registration, login, token refresh |
| `/api/v1/users` | User profile management |
| `/api/v1/uploads` | File upload and management |
| `/api/v1/mappings` | Column mapping CRUD |
| `/api/v1/reconciliation` | Reconciliation runs and results |
| `/api/v1/discrepancies` | Discrepancy review and resolution |
| `/api/v1/claims` | Claim lifecycle management |
| `/api/v1/ai` | AI-assisted features |

### Response Format
All responses follow a consistent envelope:
```json
{
  "status": "success",
  "data": { ... },
  "message": "Optional human-readable message"
}
```

### Error Format
```json
{
  "status": "error",
  "detail": "Description of what went wrong",
  "code": "ERROR_CODE"
}
```

### Pagination
List endpoints support cursor-based pagination:
```
GET /api/v1/uploads?limit=20&offset=0
```

### Authentication
All endpoints (except `/auth/register` and `/auth/login`) require:
```
Authorization: Bearer <access_token>
```
