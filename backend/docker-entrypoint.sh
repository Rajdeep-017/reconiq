#!/bin/sh
# Apply migrations, then start the API. RUN_MIGRATIONS=false is useful when a
# separate release job owns schema changes in a multi-replica deployment.
set -eu

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] Applying database migrations..."
  alembic upgrade head
fi

echo "[entrypoint] Starting ReconIQ API..."
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers "${UVICORN_WORKERS:-2}" \
  --proxy-headers \
  --forwarded-allow-ips="${FORWARDED_ALLOW_IPS:-*}"
