# ReconIQ — Deployment Guide

## 1. Development Setup

### 1.1 Prerequisites

Ensure the following are installed:

| Tool | Version | Purpose |
|---|---|---|
| Python | 3.12+ | Backend runtime |
| Node.js | 20+ | Frontend runtime |
| Docker | Latest | Container runtime |
| Docker Compose | v2+ | Service orchestration |
| Git | Latest | Version control |

### 1.2 Clone the Repository

```bash
git clone https://github.com/your-org/reconiq.git
cd reconiq
```

### 1.3 Environment Configuration

```bash
# Copy the example environment file
cp .env.example backend/.env

# Edit the .env file if needed
# For local development, the defaults should work out of the box
```

### 1.4 Start Infrastructure

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Verify services are running
docker-compose ps

# Check PostgreSQL health
docker-compose exec postgres pg_isready -U reconiq

# Check Redis health
docker-compose exec redis redis-cli ping
```

### 1.5 Backend Setup

```bash
cd backend

# Create Python virtual environment
python -m venv .venv

# Activate the virtual environment
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Windows CMD:
.venv\Scripts\activate.bat
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Verify the setup
python -c "from app.core.config import settings; print(f'Database: {settings.DATABASE_URL}')"
```

### 1.6 Frontend Setup

```bash
cd frontend

# Install Node.js dependencies
npm install

# Verify the setup
npm run build
```

### 1.7 Start Development Servers

Open two terminal windows:

**Terminal 1 — Backend:**
```bash
cd backend
.venv\Scripts\activate  # or source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

---

## 2. Docker Compose Setup

### 2.1 Services

The `docker-compose.yml` defines two services:

| Service | Image | Port | Purpose |
|---|---|---|---|
| `postgres` | postgres:16-alpine | 5432 | Primary database |
| `redis` | redis:7-alpine | 6379 | Caching and task queues |

### 2.2 Volumes

- `pgdata` — Named volume for PostgreSQL data persistence across container restarts

### 2.3 Database Initialization

The `init-db.sql` file runs automatically on the first PostgreSQL container start. It creates the `reconiq_test` database for pytest.

> **Note**: Docker init scripts only run when the volume is first created. If you need to re-initialize, remove the volume:
> ```bash
> docker-compose down -v
> docker-compose up -d
> ```

### 2.4 Common Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes (reset data)
docker-compose down -v

# View logs
docker-compose logs -f postgres
docker-compose logs -f redis

# Connect to PostgreSQL
docker-compose exec postgres psql -U reconiq -d reconiq

# Connect to Redis CLI
docker-compose exec redis redis-cli
```

---

## 3. Environment Variables

### 3.1 Database

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg://reconiq:reconiq_dev@localhost:5432/reconiq` | Primary database connection |
| `TEST_DATABASE_URL` | `postgresql+psycopg://reconiq:reconiq_dev@localhost:5432/reconiq_test` | Test database connection |

### 3.2 Security

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | `change-me-...` | JWT signing key. **Must be changed in production!** |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Token expiry time |

### 3.3 CORS

| Variable | Default | Description |
|---|---|---|
| `CORS_ORIGINS` | `["http://localhost:5173"]` | Allowed frontend origins |

### 3.4 File Storage

| Variable | Default | Description |
|---|---|---|
| `UPLOAD_DIR` | `../storage/uploads` | Uploaded file storage path |
| `EXPORT_DIR` | `../storage/exports` | Generated export path |
| `MAX_UPLOAD_SIZE_MB` | `50` | Maximum upload size in MB |

### 3.5 Redis

| Variable | Default | Description |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection URL |

### 3.6 AI (Optional)

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API URL |
| `OLLAMA_MODEL` | `llama3.2` | LLM model name |

---

## 4. Database Migrations

### 4.1 Overview

ReconIQ uses Alembic for database schema migrations. Migrations are auto-generated from SQLAlchemy model changes.

### 4.2 Common Commands

```bash
cd backend

# Apply all pending migrations
alembic upgrade head

# Rollback last migration
alembic downgrade -1

# Rollback all migrations
alembic downgrade base

# View current revision
alembic current

# View migration history
alembic history

# Generate a new migration from model changes
alembic revision --autogenerate -m "add new column to users"

# Create an empty migration (for manual SQL)
alembic revision -m "add custom index"
```

### 4.3 Migration Best Practices

1. **Always review auto-generated migrations** before applying. Alembic can miss some changes.
2. **Test migrations against a copy** of production data before deploying.
3. **Never edit a migration** that has been applied to production. Create a new migration instead.
4. **Include both upgrade and downgrade** functions in every migration.
5. **Use batch operations** for large table alterations to avoid locking issues.

---

## 5. Running Tests

### 5.1 Test Database

Tests use a separate database (`reconiq_test`) to avoid affecting development data. This database is created automatically by `init-db.sql` on first Docker run.

### 5.2 Running the Test Suite

```bash
cd backend

# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_auth.py

# Run specific test function
pytest tests/test_auth.py::test_register_user

# Run tests matching a pattern
pytest -k "test_login"

# Run with coverage report
pytest --cov=app --cov-report=html --cov-report=term-missing

# Run tests in parallel (if pytest-xdist is installed)
pytest -n auto
```

### 5.3 Test Configuration

Tests are configured via `pytest.ini` or `pyproject.toml`:

```ini
[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
filterwarnings = ["ignore::DeprecationWarning"]
```

### 5.4 Test Structure

```
tests/
├── conftest.py          # Shared fixtures (DB session, test client, auth)
├── test_auth.py         # Authentication tests
├── test_uploads.py      # File upload tests
├── test_mappings.py     # Column mapping tests
├── test_reconciliation.py  # Reconciliation engine tests
├── test_discrepancies.py   # Discrepancy detection tests
└── test_claims.py       # Claims management tests
```

---

## 6. Production Considerations

### 6.1 Security Checklist

- [ ] Generate a strong random `SECRET_KEY` (64+ characters)
- [ ] Set `CORS_ORIGINS` to your actual frontend domain
- [ ] Enable HTTPS (TLS termination at load balancer or reverse proxy)
- [ ] Set `ACCESS_TOKEN_EXPIRE_MINUTES` appropriately (15–30 for high-security)
- [ ] Use a managed PostgreSQL instance with encryption at rest
- [ ] Enable Redis password authentication
- [ ] Set up rate limiting
- [ ] Configure WAF rules
- [ ] Run security audit (`pip-audit`, `npm audit`)

### 6.2 Performance Checklist

- [ ] Enable PostgreSQL connection pooling (PgBouncer or built-in)
- [ ] Configure Redis maxmemory policy
- [ ] Set up database read replicas for reporting queries
- [ ] Enable gzip compression on API responses
- [ ] Configure proper worker count for Uvicorn/Gunicorn
- [ ] Set up CDN for frontend static assets
- [ ] Create database indexes per `docs/database_design.md`

### 6.3 Monitoring

- [ ] Application logging (structured JSON logs)
- [ ] Error tracking (Sentry)
- [ ] APM (Application Performance Monitoring)
- [ ] Database monitoring (slow query log, connection pool stats)
- [ ] Uptime monitoring
- [ ] Alert rules for error rates, latency, and resource usage

### 6.4 Backup Strategy

- [ ] Daily automated PostgreSQL backups (pg_dump or WAL archiving)
- [ ] Backup retention policy (30 days minimum)
- [ ] Regular backup restore tests
- [ ] File storage backups (uploaded files)
- [ ] Disaster recovery plan documented and tested

### 6.5 Production Deployment

```bash
# Example: Run with Gunicorn + Uvicorn workers
pip install gunicorn

gunicorn app.main:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --workers 4 \
    --bind 0.0.0.0:8000 \
    --access-logfile - \
    --error-logfile -
```

### 6.6 Recommended Architecture

```
                    ┌─────────────┐
                    │  CloudFront │
                    │  / CDN      │
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │  ALB / Nginx│
                    │  (TLS)      │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────┴─────┐ ┌───┴───┐ ┌─────┴─────┐
        │ Gunicorn  │ │ React │ │ Gunicorn  │
        │ Worker 1  │ │ SPA   │ │ Worker 2  │
        └─────┬─────┘ └───────┘ └─────┬─────┘
              │                        │
        ┌─────┴────────────────────────┴─────┐
        │           PgBouncer                │
        └─────────────┬─────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │     PostgreSQL (RDS)      │
        │     Primary + Replica     │
        └───────────────────────────┘
```
