# ReconIQ backend image.
# Build from the repository root so the demo seed can include sample_data/.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    HOME=/tmp

WORKDIR /app

# Runtime dependencies. psycopg[binary] ships its own libpq, so no compiler or
# libpq development package is required in the final image.
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/alembic.ini ./
COPY backend/alembic ./alembic
COPY backend/app ./app
COPY backend/scripts ./scripts
COPY sample_data/data ./sample_data/data

# The container runs as an unprivileged numeric user. The storage directories
# are created and owned here so fresh named volumes inherit the ownership.
RUN mkdir -p /app/storage/uploads /app/storage/exports \
    && chown -R 10001:10001 /app/storage

COPY backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER 10001:10001

EXPOSE 8000

ENTRYPOINT ["sh", "/usr/local/bin/docker-entrypoint.sh"]
