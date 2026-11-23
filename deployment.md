# ReconIQ Deployment Guide

This guide covers local development, the production-like Docker Compose stack, database migrations, verification, backups, rollback, and troubleshooting.

---

## 1. Deployment topology

```text
                         Internet / browser
                                |
                     +----------+----------+
                     |                     |
              frontend:80              backend:8000
              Nginx + React SPA        FastAPI + Uvicorn
                     |                     |
                     +------ /api/ --------+
                                           |
                              +------------+------------+
                              |                         |
                        PostgreSQL 16                Redis 7
                        tenant data                  cache/queues
```

- The public landing page and authenticated SPA are served by Nginx.
- Nginx proxies `/api/` to the backend, so browser API calls are same-origin.
- PostgreSQL and Redis are internal services. Their host ports are published only for local administration and should be removed or firewalled in real production.
- Alembic migrations run from the backend entrypoint before Uvicorn starts.

### Public and authenticated routes

| Route | Access |
|---|---|
| `/` | Public landing page |
| `/login`, `/register` | Public authentication |
| `/dashboard` and other workspace routes | Requires a valid JWT |
| `/api/v1/public/overview` | Public demo dataset, no database session |
| `/api/v1/auth/*` | Public login/registration |
| Other `/api/v1/*` routes | Bearer token, tenant-scoped |

---

## 2. Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Docker Desktop | Latest | Containers |
| Docker Compose | v2.20+ | Stack orchestration |
| Python | 3.12+ | Backend development and migrations |
| Node.js | 20+ | Frontend development and builds |
| Git | Latest | Source control |
| PowerShell 7 or Windows PowerShell 5.1 | Current | Windows commands in this guide |

Verify:

```powershell
docker version
docker compose version
python --version
node --version
```

> **Interpreter warning:** backend commands must use `backend\.venv\Scripts\python.exe` (Windows) or `backend/.venv/bin/python` (macOS/Linux). Running Uvicorn with a global or Anaconda Python that lacks `psycopg` produces `ModuleNotFoundError: No module named 'psycopg'`.

---

## 3. Environment configuration

### 3.1 Files

| File | Commit? | Purpose |
|---|---|---|
| `.env.example` | Yes | Local development template |
| `.env` | No | Local development values |
| `.env.production.example` | Yes | Production Compose template |
| `.env.production` | No | Deployment secrets and host ports |

The backend loads the repository-root `.env` whether it is started from the
repository root or from `backend/`; a `backend/.env` override is no longer
needed.

Create the production file:

```powershell
Copy-Item .env.production.example .env.production
```

Generate values:

```powershell
# JWT signing key
python -c "import secrets; print(secrets.token_hex(32))"

# PostgreSQL password (alphanumeric avoids URL-encoding issues)
python -c "import secrets; print(secrets.token_urlsafe(24).replace('-', 'x').replace('_', 'y'))"
```

Edit `.env.production` and replace `POSTGRES_PASSWORD` and `SECRET_KEY`.

### 3.2 Core variables

| Variable | Example | Description |
|---|---|---|
| `ENV` | `production` | Enables production startup checks |
| `DATABASE_URL` | `postgresql+psycopg://reconiq:...@postgres:5432/reconiq` | Built by Compose from the PostgreSQL variables |
| `SECRET_KEY` | 64-character hex | JWT signing key; must be secret |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Token lifetime |
| `CORS_ORIGINS` | `["https://app.example.com"]` | JSON array of allowed browser origins |
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection |
| `UPLOAD_DIR` | `/app/storage/uploads` | Uploaded report storage |
| `EXPORT_DIR` | `/app/storage/exports` | Generated export storage |
| `MAX_UPLOAD_SIZE_MB` | `50` | Application upload limit |
| `DATABASE_CONNECT_TIMEOUT` | `10` | Database connect timeout |
| `MIGRATION_CONNECT_ATTEMPTS` | `20` | Migration retry count |
| `MIGRATION_RETRY_DELAY_SECONDS` | `3` | Delay between migration attempts |
| `RUN_MIGRATIONS` | `true` | Run Alembic from the entrypoint |
| `UVICORN_WORKERS` | `2` | API worker processes |
| `FORWARDED_ALLOW_IPS` | `*` | Trusted reverse-proxy addresses |
| `OLLAMA_BASE_URL` | `http://host.docker.internal:11434` | Optional AI endpoint |
| `OLLAMA_MODEL` | `llama3.2` | Optional AI model |

### 3.3 Host ports

| Variable | Default | Service |
|---|---|---|
| `FRONTEND_PORT` | `8080` | Nginx/React |
| `BACKEND_PORT` | `8000` | FastAPI direct access |
| `POSTGRES_PORT` | `5432` | PostgreSQL administration |
| `REDIS_PORT` | `6379` | Redis administration |

To run the production stack alongside the development stack, use different host ports:

```dotenv
FRONTEND_PORT=8080
BACKEND_PORT=8001
POSTGRES_PORT=5433
REDIS_PORT=6380
```

The containers still communicate over the internal network on `postgres:5432` and `redis:6379`; only the host mappings change.

### 3.4 Database host matrix

| Where the process runs | `DATABASE_URL` host |
|---|---|
| Host machine, development | `127.0.0.1:5432` |
| Backend container in Compose | `postgres:5432` |
| Managed PostgreSQL | provider hostname |

`localhost` inside a container refers to the container itself, not the host. It causes connection timeouts.

### 3.5 CORS

`CORS_ORIGINS` is a JSON array. Include the exact browser origin, including scheme and port:

```dotenv
CORS_ORIGINS=["https://app.example.com","https://www.example.com"]
```

With the bundled Nginx proxy, the browser calls the same origin, so CORS is primarily relevant to direct API clients and separate frontends.

---

## 4. Local development deployment

### 4.1 Start infrastructure

```powershell
docker compose up -d postgres redis
docker compose ps
docker compose exec postgres pg_isready -U reconiq
docker compose exec redis redis-cli ping
```

### 4.2 Backend

```powershell
# From the repository root
Copy-Item .env.example .env

cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt

python -m alembic upgrade head
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Windows CMD users can run:

```bat
cd backend
start.bat
```

`start.bat` activates `.venv` before starting Uvicorn. If you use `start_server.py`, run it with the virtualenv Python:

```powershell
.\.venv\Scripts\python.exe start_server.py
```

Verify:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:8000/ready
```

`/ready` should report `"ready": true` and a migration version.

### 4.3 Frontend

```powershell
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173/`.

The Vite dev server proxies `/api` to `http://localhost:8000`. In development, the API client falls back to `http://localhost:8000/api/v1` if `VITE_API_BASE_URL` is not set.

### 4.4 Demo seed

```powershell
cd backend
$env:DEMO_PASSWORD_FINANCE_EXECUTIVE = "ExecDemo123!"
$env:DEMO_PASSWORD_FINANCE_COFOUNDER = "CofounderDemo123!"
python scripts/seed_demo.py
```

The seed is idempotent. It creates:

- one organization (`Demo Org`)
- two users
- eight partners
- rate cards and zone master data from `sample_data/data`

It does not create reconciliation runs, discrepancies, or claims.

Demo users:

| Email | Password |
|---|---|
| `finance_executive@demo.org` | `ExecDemo123!` |
| `finance_cofounder@demo.org` | `CofounderDemo123!` |

---

## 5. Production-like Docker deployment

### 5.1 Files used

| File | Purpose |
|---|---|
| `docker-compose.prod.yml` | PostgreSQL, Redis, backend, frontend |
| `Dockerfile` | Backend image (build context: repository root) |
| `backend/docker-entrypoint.sh` | Migrate then start Uvicorn |
| `frontend/Dockerfile` | Vite build + Nginx runtime |
| `frontend/nginx.conf` | SPA fallback and `/api` proxy |
| `.env.production.example` | Environment template |
| `deploy.ps1` | Windows helper |

### 5.2 First deployment

```powershell
# 1. Configure
Copy-Item .env.production.example .env.production
# Edit POSTGRES_PASSWORD, SECRET_KEY, CORS_ORIGINS, and ports.

# 2. Build and start
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build

# 3. Check
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Or:

```powershell
.\deploy.ps1
```

The backend entrypoint runs `alembic upgrade head` automatically. The frontend waits for the backend health check before starting.

### 5.3 Service endpoints

| Service | URL |
|---|---|
| Public landing page | `http://localhost:8080/` |
| API through Nginx | `http://localhost:8080/api/v1/public/overview` |
| Direct API | `http://localhost:8000` |
| Swagger UI | `http://localhost:8000/docs` |
| ReDoc | `http://localhost:8000/redoc` |
| Liveness | `http://localhost:8000/health` |
| Readiness | `http://localhost:8000/ready` |
| PostgreSQL | `127.0.0.1:5432` |
| Redis | `127.0.0.1:6379` |

The direct API and database ports are bound to `127.0.0.1` and are intended for local administration. In real production, remove those host mappings or restrict them with a firewall. The frontend port is the only service intended for external access.

### 5.4 Seed the demo environment

Only for a demonstration or staging environment:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T backend python scripts/seed_demo.py
```

Or:

```powershell
.\deploy.ps1 -SeedDemo
```

For a real customer deployment, create the first organization and administrator through your onboarding process instead of seeding demo users.

### 5.5 Useful lifecycle commands

```powershell
$compose = @("compose", "--env-file", ".env.production", "-f", "docker-compose.prod.yml")

docker @compose ps
docker @compose logs -f backend
docker @compose logs -f frontend
docker @compose restart backend
docker @compose down
docker @compose down -v   # destructive: removes database and upload volumes
```

To rebuild after a code change:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

To pull newer base images:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml build --pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

### 5.6 GitHub Actions CI/CD

`.github/workflows/ci.yml` runs on every push to `main` or a `phase-*` branch,
on pull requests to `main`, and on manual dispatch:

1. Backend tests (`pytest`) against PostgreSQL 16 and Redis 7 service
   containers, using the same `DATABASE_URL`/`TEST_DATABASE_URL` shape as local
   development.
2. Frontend `npm ci`, `npm run typecheck`, and `npm run build`.
3. Production Compose validation (`docker compose config`), then Docker builds
   of the root `Dockerfile` and `frontend/Dockerfile`.

`.github/workflows/deploy.yml` runs after a successful `CI` run on `main`, or
manually. It connects to the deployment host over SSH and runs:

```bash
cd "$DEPLOY_PATH"
git fetch --prune origin main
git checkout main
git pull --ff-only origin main
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml ps
curl -fsS "http://127.0.0.1:${FRONTEND_PORT:-8080}/healthz"
```

Configure the repository or `production` environment secrets:

| Secret | Required | Purpose |
|---|---|---|
| `DEPLOY_HOST` | Yes | SSH host name or IP |
| `DEPLOY_USER` | Yes | SSH user with Docker access |
| `DEPLOY_SSH_KEY` | Yes | Private key for the deploy user |
| `DEPLOY_PATH` | Yes | Absolute repository path on the host |
| `DEPLOY_PORT` | No | SSH port, default `22` |

Prerequisites on the host:

- The repository is already cloned at `DEPLOY_PATH`.
- `.env.production` exists and is not overwritten by the pipeline.
- The deploy user can run `docker compose` without an interactive prompt.
- The host can reach `origin` over SSH or HTTPS for `git pull`.
- A firewall or reverse proxy exposes only the frontend port; the direct API,
  PostgreSQL, and Redis ports remain bound to `127.0.0.1`.

The deploy job deliberately uses `git pull --ff-only`; it fails instead of
discarding uncommitted server-side changes. Database migrations run from the
backend container entrypoint after the new image starts. If migrations are
owned by a separate release job, set `RUN_MIGRATIONS=false` in
`.env.production` and run `alembic upgrade head` before starting the API.

To skip deployment until a host is ready, leave `DEPLOY_HOST`, `DEPLOY_USER`,
`DEPLOY_SSH_KEY`, or `DEPLOY_PATH` unset. The workflow reports a notice and
completes without failing.

---

## 6. Container reference

### 6.1 Backend image

- Base: `python:3.12-slim`
- Installs `backend/requirements.txt`
- Copies the app, Alembic migrations, scripts, and `sample_data/`
- Runs as numeric user `10001:10001`
- Creates `/app/storage/uploads` and `/app/storage/exports`
- Entrypoint: `alembic upgrade head`, then Uvicorn
- Uvicorn workers: `UVICORN_WORKERS` (default 2)
- Health check: `GET /health`

### 6.2 Frontend image

- Build stage: `node:20-alpine`, `npm ci`, `npm run build`
- Runtime: `nginx:1.27-alpine`
- Serves `/usr/share/nginx/html`
- Proxies `/api/` to `http://backend:8000`
- SPA fallback to `index.html`
- Static assets under `/assets/` cached for one year
- Health check: `GET /healthz`

### 6.3 Compose services

| Service | Container | Internal port | Host port |
|---|---|---|---|
| `postgres` | `reconiq-prod-postgres` | 5432 | `${POSTGRES_PORT}` |
| `redis` | `reconiq-prod-redis` | 6379 | `${REDIS_PORT}` |
| `backend` | `reconiq-prod-backend` | 8000 | `${BACKEND_PORT}` |
| `frontend` | `reconiq-prod-frontend` | 80 | `${FRONTEND_PORT}` |

Named volumes:

- `reconiq-prod-pgdata`
- `reconiq-prod-redisdata`
- `reconiq-prod-uploads`
- `reconiq-prod-exports`

The Compose project name is `reconiq-prod`, so it does not share containers or volumes with the development stack.

---

## 7. Database migrations

### 7.1 Preflight checks

Run from `backend` with the virtualenv:

```powershell
cd backend
.\.venv\Scripts\python.exe -m alembic heads
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic history
```

There must be exactly one head. The current branch head is `e04_rule_configs`.

Offline SQL review:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head --sql | Out-File -Encoding utf8 ..\backups\schema.sql
```

Migration regression tests (they create isolated databases):

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_migrations.py -q
```

### 7.2 Applying migrations in Docker

Automatic on backend startup:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml up -d backend
```

Manual:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T backend alembic upgrade head
```

One-off migration without starting the API:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm --entrypoint alembic backend upgrade head
```

### 7.3 Fresh database

The production stack creates an empty `reconiq` database on first start. Alembic builds the schema from the migrations. There is no `init-db.sql` mount in the production stack because the test database is not needed there.

### 7.4 Rollback

Prefer restoring a backup over downgrading a live financial database. If a migration must be reversed and the downgrade is known to be safe:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T backend alembic downgrade -1
```

Then restart the backend and verify `/ready`.

### 7.5 Multiple API replicas

Do not run migrations from every replica. Set `RUN_MIGRATIONS=false` for API containers and run migrations once as a release job:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm --entrypoint alembic backend upgrade head
```

---

## 8. Verification checklist

### 8.1 Container health

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

All services should be `healthy` or `running`. The frontend only starts after the backend is healthy.

### 8.2 API health and readiness

```powershell
Invoke-RestMethod http://localhost:8000/health
Invoke-RestMethod http://localhost:8000/ready
```

Expected readiness includes `"ready": true`, `"database": "ok"`, and the current migration version.

### 8.3 Public endpoint

```powershell
Invoke-RestMethod http://localhost:8080/api/v1/public/overview
```

Verify:

- `mode` is `"demo"`
- `disclaimer` states the values are not live customer data
- no tenant, organization, user, email, or token fields are present
- the trend, matching breakdown, discrepancy categories, and claim lifecycle are internally consistent

### 8.4 Landing page

Open `http://localhost:8080/` and check:

- hero, navigation, preview panels, tabs, FAQ, and footer
- mobile menu at narrow widths
- no horizontal overflow
- no console errors
- public preview loads, or shows the retry state if the API is unavailable

### 8.5 Authentication

```powershell
$body = @{
  email = "finance_executive@demo.org"
  password = "ExecDemo123!"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri http://localhost:8080/api/v1/auth/login `
  -ContentType "application/json" `
  -Body $body
```

Then open `http://localhost:8080/login`, sign in, and confirm the redirect to `/dashboard`.

### 8.6 Logs

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail 100 backend
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail 100 frontend
```

Look for migration failures, database connection errors, 5xx responses, and Nginx upstream errors.

---

## 9. Security checklist

- [ ] Replace `SECRET_KEY` with a random 64-character value.
- [ ] Replace `POSTGRES_PASSWORD`; never use `reconiq_dev` in production.
- [ ] Do not commit `.env.production`.
- [ ] Remove or firewall published PostgreSQL, Redis, and backend ports.
- [ ] Terminate TLS at a load balancer, reverse proxy, or ingress.
- [ ] Set `CORS_ORIGINS` to the exact production origin(s).
- [ ] Set `ACCESS_TOKEN_EXPIRE_MINUTES` to a suitable value (15-60).
- [ ] Disable or restrict `/docs` and `/redoc` if the API is public.
- [ ] Add rate limiting at the edge, especially for `/api/v1/auth/*` and the public endpoint.
- [ ] Use a managed PostgreSQL instance with encryption at rest and automated backups.
- [ ] Require Redis authentication if Redis is reachable outside the Compose network.
- [ ] Run `pip-audit` and `npm audit` in CI.
- [ ] Keep Docker images and base images updated.
- [ ] Do not seed demo users in a real customer environment.
- [ ] Review the public demo endpoint before launch; it is intentionally unauthenticated and must remain free of tenant data.

### TLS example

Put a TLS-terminating proxy in front of the frontend container. A minimal Caddy service on the same Docker network can use:

```caddyfile
reconiq.example.com {
    encode gzip
    reverse_proxy frontend:80
}
```

Attach Caddy to `reconiq-prod-network` and expose ports 80/443. Alternatively, terminate TLS at your cloud load balancer and forward to the frontend container.

---

## 10. Backups and restore

### 10.1 PostgreSQL backup

Use `pg_dump` inside the container and copy the file out. This avoids PowerShell redirection corrupting a binary dump.

```powershell
New-Item -ItemType Directory -Force backups | Out-Null

docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres `
  pg_dump -U reconiq -d reconiq -Fc -f /tmp/reconiq.dump

docker cp reconiq-prod-postgres:/tmp/reconiq.dump .\backups\reconiq.dump
```

### 10.2 PostgreSQL restore

```powershell
docker cp .\backups\reconiq.dump reconiq-prod-postgres:/tmp/reconiq.dump

docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres `
  pg_restore -U reconiq -d reconiq --clean --if-exists /tmp/reconiq.dump
```

Test restores regularly. A backup that has never been restored is not a verified backup.

### 10.3 Upload and export volumes

```powershell
docker run --rm `
  -v reconiq-prod-uploads:/data `
  -v "${PWD}\backups:/backup" `
  alpine tar czf /backup/uploads.tar.gz -C /data .
```

Repeat with `reconiq-prod-exports` for generated exports.

### 10.4 Retention

- Keep at least 30 daily database backups.
- Store backups outside the Docker host.
- Encrypt backups at rest.
- Document and test the restore procedure.

---

## 11. Updating and rollback

### 11.1 Application update

```powershell
git pull

docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

The backend entrypoint applies new migrations on start.

### 11.2 Application rollback

```powershell
git checkout <previous-tag-or-commit>

docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

If the previous release expects an older schema, restore the matching database backup. Do not assume every Alembic downgrade is safe for financial data.

### 11.3 Zero-downtime notes

Compose on a single host restarts containers in place. For zero-downtime deployments, use an orchestrator (Swarm, Kubernetes, ECS) with multiple backend replicas, a separate migration job, health-gated rollouts, and shared object storage.

---

## 12. Scaling guidance

- Increase `UVICORN_WORKERS` for CPU-bound work, but keep total workers within the container memory limit.
- Run multiple backend containers behind a load balancer for availability.
- Set `RUN_MIGRATIONS=false` on API replicas and run migrations once per release.
- Move uploads/exports to S3-compatible object storage before scaling horizontally; local Docker volumes are node-local.
- Add PgBouncer or a managed connection pooler when the number of API workers grows.
- Use a managed Redis instance for shared caching and queues.
- Serve static assets through a CDN.
- Add read replicas for reporting queries if dashboard/analytics load grows.

---

## 13. Troubleshooting

### 13.1 `ModuleNotFoundError: No module named 'psycopg'`

Cause: Uvicorn is running under a global or Anaconda Python without backend dependencies.

Fix:

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Or run `backend\start.bat`. Verify:

```powershell
.\.venv\Scripts\python.exe -c "import psycopg; print(psycopg.__version__)"
```

### 13.2 `connection timeout expired`

Cause: PostgreSQL is not running, the host is wrong, or a firewall is blocking the port.

```powershell
docker compose ps
Test-NetConnection 127.0.0.1 -Port 5432
```

- Host process: use `127.0.0.1:5432`.
- Backend container: use `postgres:5432`.
- Managed database: use the provider hostname and allowlist the client IP.

### 13.3 `password authentication failed for user "reconiq"`

Cause: the PostgreSQL volume was initialized with a different password.

Options:

1. Use the original password in `.env.production`.
2. Recreate the volume with `docker compose ... down -v` (destructive).

### 13.4 Port already allocated

Change the host ports in `.env.production`:

```dotenv
FRONTEND_PORT=8081
BACKEND_PORT=8001
POSTGRES_PORT=5433
REDIS_PORT=6380
```

Then restart the stack.

### 13.5 `502 Bad Gateway`

The frontend cannot reach a healthy backend.

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs backend
```

Check migrations, `DATABASE_URL`, and backend health. The frontend starts only after the backend health check passes.

### 13.6 `413 Request Entity Too Large`

Increase both limits:

- `MAX_UPLOAD_SIZE_MB` in `.env.production`
- `client_max_body_size` in `frontend/nginx.conf`

Rebuild the frontend image after changing Nginx configuration.

### 13.7 CORS errors

Set `CORS_ORIGINS` to a JSON array with the exact origin:

```dotenv
CORS_ORIGINS=["https://app.example.com"]
```

Restart the backend. With the bundled Nginx proxy, same-origin requests should not trigger CORS.

### 13.8 Blank page or 404 on client-side routes

Confirm Nginx contains:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

Rebuild the frontend image after editing `nginx.conf`.

### 13.9 `npm ci` fails

`npm ci` requires `package-lock.json` to match `package.json`. Run:

```powershell
cd frontend
npm install
npm ci
npm run build
```

Commit the updated lockfile.

### 13.10 Windows line endings in the entrypoint

The backend entrypoint is invoked with `sh`, and `.gitattributes` enforces LF for shell scripts. If you copy files manually, ensure `backend/docker-entrypoint.sh` uses LF, not CRLF.

### 13.11 Multiple Alembic heads

```powershell
cd backend
.\.venv\Scripts\python.exe -m alembic heads
```

If more than one head appears, create a merge migration before deploying:

```powershell
.\.venv\Scripts\python.exe -m alembic merge heads -m "merge migration heads"
.\.venv\Scripts\python.exe -m alembic upgrade head
```

### 13.12 Login returns 401

- Confirm the demo seed ran, or create a real user.
- Confirm PostgreSQL is reachable and migrations are at head.
- Clear stale `reconiq_token` and `reconiq_user` entries in browser local storage.
- Confirm the frontend is calling `/api/v1` through Nginx, not an old API host.

---

## 14. Known limitations

- The frontend has no automated test framework or test files in this checkout; CI covers type-checking and the production build.
- `npm run lint` fails because ESLint is not installed or configured, despite the script in `frontend/package.json`.
- The frontend production build emits a chunk-size warning because the main bundle is approximately 1.23 MB.
- The public landing dataset is intentionally demonstration data, not live customer metrics.
- The local Compose stack serves HTTP. TLS must be terminated by an external proxy or load balancer.
- The Open Graph image uses a relative URL. Set an absolute canonical URL and `og:url` once the production domain is known.
- Ollama is optional. Reconciliation calculations, approvals, and claims never depend on AI output.

---

## 15. Deployment checklist

- [ ] `.env.production` created and excluded from version control
- [ ] `SECRET_KEY` and `POSTGRES_PASSWORD` replaced
- [ ] `CORS_ORIGINS` set to production origin(s)
- [ ] Host ports chosen and firewalled
- [ ] `docker compose ... build` succeeds
- [ ] `docker compose ... up -d` starts all services
- [ ] `/health` and `/ready` return healthy
- [ ] Alembic current equals the single head
- [ ] Demo seed run only in demo/staging
- [ ] Landing page loads and public endpoint returns `mode: "demo"`
- [ ] Login and `/dashboard` work
- [ ] Logs show no migration, database, or upstream errors
- [ ] Database backup completed and restore tested
- [ ] TLS, DNS, and monitoring configured
- [ ] Rate limiting and WAF rules reviewed
- [ ] Demo credentials disabled or changed
