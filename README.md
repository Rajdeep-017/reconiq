# ReconIQ

[![CI](https://github.com/Rajdeep-017/reconiq/actions/workflows/ci.yml/badge.svg)](https://github.com/Rajdeep-017/reconiq/actions/workflows/ci.yml)
[![Deploy](https://github.com/Rajdeep-017/reconiq/actions/workflows/deploy.yml/badge.svg)](https://github.com/Rajdeep-017/reconiq/actions/workflows/deploy.yml)

**Intelligent financial reconciliation for Indian e-commerce.**

ReconIQ brings marketplace settlements, payment gateways, COD remittances, freight invoices, and returns into one reconciliation workspace. It is built for sellers and D2C finance teams that need deterministic calculations, a clear audit trail, and human-controlled approvals.

The repository contains both the public product site and the authenticated application:

| URL | Purpose |
|---|---|
| `/` | Public landing page |
| `/login`, `/register` | Authentication |
| `/dashboard` | Authenticated reconciliation workspace |
| `/api/v1/*` | FastAPI API |
| `/api/v1/public/overview` | Public, explicitly labelled demo dataset used by the landing page |

---

## Highlights

- **Multi-partner reconciliation** - match orders against settlements, COD, freight, and returns.
- **Column mapping** - rule-based suggestions with optional AI assistance. A human confirms mappings before they are used.
- **Deterministic matching** - exact, assisted/fuzzy, and manual-review passes. Calculations never depend on an LLM.
- **Discrepancy detection** - short payments, missing settlements, COD gaps, freight overcharges, and return/refund issues.
- **Claims lifecycle** - draft, submit, review, resolve, and track recovery.
- **Financial correctness** - monetary values use `Decimal`/PostgreSQL `NUMERIC`, never floating point.
- **Tenant isolation** - organization-scoped data and role-based access.
- **Operational visibility** - dashboard, analytics, reconciliation runs, and audit logs.
- **Public demo data** - the landing page reads a backend-owned demonstration dataset and labels it as such. It never invents live customer statistics.

---

## Architecture at a glance

```text
Browser
  |
  +-- /, /login, /register, /dashboard ...  React SPA (Vite)
  |
  +-- /api/v1/*  ------------------------->  FastAPI
                                              |
                         +--------------------+--------------------+
                         |                                         |
                   PostgreSQL 16                              Redis 7
                   (tenant data)                        (cache / queues)
```

In the production container stack, Nginx serves the built SPA and proxies `/api/` to the backend. The browser therefore makes same-origin API calls.

### Key routes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Liveness probe |
| GET | `/ready` | No | Database and migration readiness probe |
| GET | `/api/v1/public/overview` | No | Landing-page demo dataset |
| POST | `/api/v1/auth/register` | No | Create an account |
| POST | `/api/v1/auth/login` | No | Obtain a JWT |
| GET | `/api/v1/auth/me` | Bearer | Current user |
| GET | `/api/v1/dashboard/*` | Bearer | Dashboard aggregates |
| POST | `/api/v1/uploads` | Bearer | Upload a CSV/XLSX report |
| POST | `/api/v1/reconciliation/runs` | Bearer | Start a reconciliation run |
| GET | `/api/v1/discrepancies` | Bearer | List discrepancies |
| GET | `/api/v1/claims` | Bearer | List claims |

The public endpoint uses no database session and exposes only aggregate demonstration values. It does not return tenant IDs, user records, settlements, tokens, or organization identifiers.

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12+, FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Database | PostgreSQL 16 |
| Cache / queues | Redis 7 |
| Migrations | Alembic |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Recharts |
| Auth | Argon2 + JWT (`python-jose`) |
| Optional AI | Ollama (advisory mapping/anomaly hints only) |
| Deployment | Docker, Docker Compose, Nginx |

---

## Prerequisites

- Python **3.12+**
- Node.js **20+**
- Docker Desktop with Docker Compose v2
- Git

> **Important:** run backend commands with the project virtualenv, not a global or Anaconda Python. A global interpreter that does not have `psycopg` installed produces `ModuleNotFoundError: No module named 'psycopg'`.

---

## Quick start (local development)

### 1. Start PostgreSQL and Redis

```powershell
docker compose up -d postgres redis
docker compose ps
```

### 2. Backend

```powershell
# From the repository root, create the local environment file
Copy-Item .env.example .env

cd backend

# Create and activate the virtualenv
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
python -m pip install -r requirements.txt

# Apply migrations
python -m alembic upgrade head

# Start the API from the virtualenv
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Windows CMD users can run `start.bat` after installing dependencies. On macOS/Linux, activate with `source .venv/bin/activate` and use the same `python -m ...` commands.

### 3. Seed demo data (optional)

The seed is idempotent and creates one demo organization, two users, partners, and rate cards. It does not create reconciliation runs, discrepancies, or claims.

```powershell
cd backend
$env:DEMO_PASSWORD_FINANCE_EXECUTIVE = "ExecDemo123!"
$env:DEMO_PASSWORD_FINANCE_COFOUNDER = "CofounderDemo123!"
python scripts/seed_demo.py
```

Demo users:

| Email | Password |
|---|---|
| `finance_executive@demo.org` | `ExecDemo123!` |
| `finance_cofounder@demo.org` | `CofounderDemo123!` |

Change these credentials before exposing a shared environment.

### 4. Frontend

```powershell
cd frontend
npm ci
npm run dev
```

### 5. Open the application

| Service | URL |
|---|---|
| Public landing page | http://localhost:5173/ |
| Login | http://localhost:5173/login |
| Authenticated app | http://localhost:5173/dashboard |
| API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |
| Readiness | http://localhost:8000/ready |

The Vite dev server proxies `/api` to `http://localhost:8000`. If `VITE_API_BASE_URL` is not set, development uses `http://localhost:8000/api/v1`; production builds default to same-origin `/api/v1`.

---

## Environment configuration

| File | Commit? | Purpose |
|---|---|---|
| `.env.example` | Yes | Local development template |
| `.env` | No | Local development values |
| `.env.production.example` | Yes | Production-like Docker Compose template |
| `.env.production` | No | Deployment secrets and host ports |

The backend reads the repository-root `.env` whether it is started from the
repository root or from `backend/`. Both local files are git-ignored; only the
two `.example` templates are committed.

Core variables:

| Variable | Default | Notes |
|---|---|---|
| `ENV` | `dev` | Set to `production` in deployed environments |
| `DATABASE_URL` | `postgresql+psycopg://reconiq:reconiq_dev@localhost:5432/reconiq` | Use `postgres:5432` inside Compose |
| `SECRET_KEY` | development placeholder | Must be a strong random value in production |
| `CORS_ORIGINS` | localhost origins | JSON array of exact browser origins |
| `REDIS_URL` | `redis://localhost:6379/0` | Use `redis://redis:6379/0` inside Compose |
| `UPLOAD_DIR` / `EXPORT_DIR` | `../storage/...` | Container paths are `/app/storage/...` |
| `MAX_UPLOAD_SIZE_MB` | `50` | Nginx allows 55 MB to cover multipart overhead |
| `DATABASE_CONNECT_TIMEOUT` | `10` | Alembic/psycopg connect timeout |
| `MIGRATION_CONNECT_ATTEMPTS` | `10` | Startup retry count for migrations |
| `MIGRATION_RETRY_DELAY_SECONDS` | `3` | Delay between migration attempts |
| `RUN_MIGRATIONS` | `true` | Entrypoint migration switch |
| `UVICORN_WORKERS` | `2` | API worker count |
| `VITE_API_BASE_URL` | `/api/v1` in production | Frontend build-time API base |

Provider `postgres://` and `postgresql://` database URLs are automatically
adapted to the installed psycopg 3 driver.

Generate a production secret with:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

See [deployment.md](deployment.md) for the full variable reference and production checklist.

---

## Public landing data

The landing page calls `GET /api/v1/public/overview`. The response includes:

- `mode: "demo"` and an explicit disclaimer
- overview counts and matching rate
- seven-day trend
- matching breakdown
- settlement preview
- discrepancy preview
- claim lifecycle preview

The frontend renders loading, error, and retry states. If the endpoint is unavailable, it shows "Product preview unavailable" rather than falling back to hardcoded business values.

Backend tests verify:

- the endpoint is accessible without authentication
- arithmetic is internally consistent
- no tenant, organization, user, email, or token fields leak

---

## Project structure

```text
reconiq/
├── backend/
│   ├── app/
│   │   ├── api/v1/              # Auth, uploads, matching, claims, public demo
│   │   ├── core/                # Config, security, dependencies
│   │   ├── models/              # SQLAlchemy models
│   │   ├── modules/             # Ingestion, mapping, matching, claims
│   │   └── main.py              # FastAPI application factory
│   ├── alembic/                 # Database migrations
│   ├── scripts/                 # Demo seed and partner seed
│   ├── tests/                   # Pytest suite
│   ├── Dockerfile               # Production backend image
│   └── docker-entrypoint.sh     # Migrate, then start Uvicorn
├── frontend/
│   ├── public/                  # Favicon and Open Graph image
│   ├── src/
│   │   ├── components/landing/  # Public landing sections and previews
│   │   ├── hooks/               # Typed data hooks
│   │   ├── pages/               # Landing, auth, dashboard, workspace
│   │   ├── services/            # Shared API services
│   │   ├── types/               # Shared TypeScript types
│   │   ├── landing.css          # Scoped landing design system
│   │   └── routes.tsx           # Public and authenticated routes
│   ├── Dockerfile               # Vite build + Nginx runtime
│   └── nginx.conf               # SPA fallback and /api reverse proxy
├── .github/workflows/           # CI and SSH deployment pipelines
├── docs/                        # Architecture, database, data-flow docs
├── sample_data/                 # Synthetic CSV fixtures, generator, and demo-seed inputs
├── docker-compose.yml           # Local PostgreSQL + Redis
├── docker-compose.prod.yml      # Production-like full stack
├── .env.example
├── .env.production.example
├── deploy.ps1
├── deployment.md
└── README.md
```

---

## Testing and quality checks

### Backend

Run with the project virtualenv:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m pytest tests/test_public.py -q
```

The same commands run in GitHub Actions against PostgreSQL 16 and Redis 7. See [CI/CD](#cicd) for the pipeline details.

### Frontend

```powershell
cd frontend
npm run typecheck
npm run build
```

There is currently no frontend test framework or test files in the repository. The `lint` script references ESLint, but ESLint is not installed or configured in this checkout, so `npm run lint` fails with `'eslint' is not recognized`.

The production build emits a chunk-size warning because the main JavaScript bundle is approximately 1.23 MB. The build still succeeds.

### Manual verification

- Landing page at 320, 375, 430, 768, 1024, 1366, 1440, and 1920 px with no horizontal overflow.
- Navigation, mobile menu, tabs, FAQ accordion, skip link, and reduced-motion behavior.
- Unauthenticated `/dashboard` redirects to `/login`.
- Login redirects to `/dashboard`.
- Public endpoint returns `mode: "demo"` and the disclaimer.
- Error state shows a retry action and no fabricated totals.

---

## Production deployment

The repository includes a complete production-like stack:

- `Dockerfile` - Python 3.12, migrations on startup, non-root runtime
- `frontend/Dockerfile` - Vite build served by Nginx
- `frontend/nginx.conf` - SPA fallback, static caching, `/api` proxy
- `docker-compose.prod.yml` - PostgreSQL, Redis, backend, frontend, health checks, volumes
- `.env.production.example` - deployment environment template
- `deploy.ps1` - Windows helper

Quick start:

```powershell
Copy-Item .env.production.example .env.production
# Edit POSTGRES_PASSWORD, SECRET_KEY, and ports as needed.

docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Then:

| Service | URL |
|---|---|
| Public landing page | http://localhost:8080/ |
| API through Nginx | http://localhost:8080/api/v1/public/overview |
| Direct API | http://localhost:8000 |
| API docs | http://localhost:8000/docs |

Seed demo data only for a demonstration environment:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T backend python scripts/seed_demo.py
```

Or use the helper:

```powershell
.\deploy.ps1 -SeedDemo
```

The full production guide, including TLS, backups, rollback, and scaling, is in [deployment.md](deployment.md).

---

## CI/CD

Two GitHub Actions workflows live in `.github/workflows/`:

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | Push to `main` or `phase-*`, pull request to `main`, manual dispatch | Runs the backend pytest suite against PostgreSQL 16 and Redis 7, type-checks and builds the frontend, validates the production Compose file, and builds both Docker images |
| `deploy.yml` | Successful `CI` run on `main`, manual dispatch | Pulls `main` on the deployment host over SSH, rebuilds the production Compose stack, and checks `/healthz` and the public overview endpoint |

### Deployment secrets

Add these under **Settings → Secrets and variables → Actions** (or on the
`production` environment):

| Secret | Required | Purpose |
|---|---|---|
| `DEPLOY_HOST` | Yes | SSH host name or IP |
| `DEPLOY_USER` | Yes | SSH user that can run Docker |
| `DEPLOY_SSH_KEY` | Yes | Private key for that user |
| `DEPLOY_PATH` | Yes | Absolute path to the repository checkout on the host |
| `DEPLOY_PORT` | No | SSH port, defaults to `22` |

The host must already have the repository checked out at `DEPLOY_PATH`, a
configured `.env.production`, Docker Engine, and the Compose plugin. The
deploy job pulls only fast-forward changes and fails visibly instead of
overwriting local modifications. If any required secret is absent, the job
skips with a notice instead of failing.

---

## Troubleshooting

### `ModuleNotFoundError: No module named 'psycopg'`

You are running Uvicorn with a Python interpreter that does not have the backend dependencies. Use the project virtualenv:

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Or run `backend\start.bat`. Verify the interpreter with:

```powershell
.\.venv\Scripts\python.exe -c "import psycopg; print(psycopg.__version__)"
```

### `connection timeout expired` or `password authentication failed`

Check that PostgreSQL is running and that the host in `DATABASE_URL` matches where the process runs:

```powershell
docker compose ps
Test-NetConnection 127.0.0.1 -Port 5432
```

- Host process: `127.0.0.1:5432`
- Inside Docker Compose: `postgres:5432`

If the database volume was initialized with a different password, either use the original password or recreate the volume with `docker compose ... down -v` (destructive).

### Port already in use

Change `FRONTEND_PORT`, `BACKEND_PORT`, `POSTGRES_PORT`, or `REDIS_PORT` in `.env.production`, or stop the development stack first.

### `502 Bad Gateway`

The frontend Nginx container cannot reach a healthy backend. Check:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml logs backend
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Common causes are failed migrations, an incorrect `DATABASE_URL`, or the backend still starting.

### Blank page or 404 on `/dashboard`

Nginx must serve `index.html` for client-side routes. Confirm the `try_files $uri $uri/ /index.html;` rule in `frontend/nginx.conf` is present in the running image.

### CORS errors

Set `CORS_ORIGINS` to a JSON array containing the exact scheme, host, and port of the browser origin. With the bundled Nginx proxy, browser requests are same-origin and do not need CORS.

---

## Documentation

- [Deployment guide](deployment.md)
- [Architecture](docs/architecture.md)
- [Database design](docs/database_design.md)
- [Data flow](docs/data_flow.md)

---

## License

MIT. See [LICENSE](LICENSE).
