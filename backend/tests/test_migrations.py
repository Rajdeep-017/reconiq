"""Alembic migration regression tests.

Run these before deploying: they verify a clean upgrade, an upgrade of a
database that already contains pre-tenant rows, full downgrade, and offline
``--sql`` generation with percent-encoded credentials.
"""
from __future__ import annotations

import io
import uuid
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, make_url, text

from app.config import Settings, get_settings

BACKEND_DIR = Path(__file__).resolve().parents[1]


def _alembic_config() -> Config:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    return cfg


@pytest.mark.parametrize(
    "url",
    [
        "postgres://user:pass@db.example/reconiq",
        "postgresql://user:pass@db.example/reconiq",
    ],
)
def test_provider_database_urls_use_psycopg_driver(url):
    settings = Settings(DATABASE_URL=url, TEST_DATABASE_URL=url)

    assert settings.DATABASE_URL == "postgresql+psycopg://user:pass@db.example/reconiq"
    assert settings.TEST_DATABASE_URL == settings.DATABASE_URL


@pytest.fixture()
def migration_db(monkeypatch):
    """Create an isolated database and point Alembic at it for one test."""
    base_url = make_url(get_settings().DATABASE_URL)
    db_name = f"reconiq_migration_{uuid.uuid4().hex[:10]}"
    admin = create_engine(base_url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    target_url = base_url.set(database=db_name).render_as_string(hide_password=False)

    with admin.connect() as conn:
        conn.execute(text(f'DROP DATABASE IF EXISTS "{db_name}"'))
        conn.execute(text(f'CREATE DATABASE "{db_name}"'))

    monkeypatch.setenv("DATABASE_URL", target_url)
    get_settings.cache_clear()
    try:
        yield target_url
    finally:
        get_settings.cache_clear()
        with admin.connect() as conn:
            conn.execute(text(f'DROP DATABASE IF EXISTS "{db_name}"'))
        admin.dispose()


def test_upgrade_and_downgrade_empty_database(migration_db):
    cfg = _alembic_config()

    command.upgrade(cfg, "head")

    engine = create_engine(migration_db)
    try:
        with engine.connect() as conn:
            assert conn.execute(text("SELECT version_num FROM alembic_version")).scalar() == "e04_rule_configs"
            assert conn.execute(text("SELECT count(*) FROM rule_configs")).scalar() == 9
            # Fresh databases must not get a synthetic legacy tenant.
            assert conn.execute(
                text("SELECT count(*) FROM organizations WHERE slug = 'legacy-import'")
            ).scalar() == 0
    finally:
        engine.dispose()

    command.downgrade(cfg, "base")

    engine = create_engine(migration_db)
    try:
        with engine.connect() as conn:
            assert conn.execute(text("SELECT to_regclass('organizations')")).scalar() is None
    finally:
        engine.dispose()


def test_upgrade_backfills_pre_tenant_data(migration_db):
    cfg = _alembic_config()
    command.upgrade(cfg, "e00c4281d615")

    engine = create_engine(migration_db)
    try:
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO users (id, email, full_name, hashed_password, role, is_active, created_at, updated_at)
                VALUES ('11111111-1111-1111-1111-111111111111', 'owner@example.com', 'Owner',
                        'x', 'FINANCE_EXECUTIVE', true, now(), now())
            """))
            conn.execute(text("""
                INSERT INTO partners (id, name, code, partner_type, is_active, created_at, updated_at)
                VALUES ('22222222-2222-2222-2222-222222222222', 'Amazon', 'AMZ',
                        'MARKETPLACE', true, now(), now())
            """))
            conn.execute(text("""
                INSERT INTO uploads (id, uploaded_by_id, partner_id, original_filename,
                                     stored_filename, file_type, document_type, file_size,
                                     sha256_checksum, status, created_at, updated_at)
                VALUES ('33333333-3333-3333-3333-333333333333',
                        '11111111-1111-1111-1111-111111111111',
                        '22222222-2222-2222-2222-222222222222',
                        'orders.csv', 'stored.csv', 'csv', 'ORDERS', 100, 'abc',
                        'UPLOADED', now(), now())
            """))
            conn.execute(text("""
                INSERT INTO rate_cards (id, partner_id, name, zone, weight_slab_min_kg,
                                        weight_slab_max_kg, rate_per_kg, fixed_charge,
                                        cod_charge_percent, effective_from, created_at, updated_at)
                VALUES ('44444444-4444-4444-4444-444444444444',
                        '22222222-2222-2222-2222-222222222222',
                        'Default', 'A', 0, 1, 50, 0, 0, CURRENT_DATE, now(), now())
            """))
            # No user id: this row can only be assigned via the legacy tenant.
            conn.execute(text("""
                INSERT INTO audit_logs (id, user_id, action, entity_type, created_at, updated_at)
                VALUES ('55555555-5555-5555-5555-555555555555', NULL,
                        'legacy_action', 'system', now(), now())
            """))
    finally:
        engine.dispose()

    command.upgrade(cfg, "head")

    engine = create_engine(migration_db)
    try:
        with engine.connect() as conn:
            for table in ("users", "partners", "uploads", "rate_cards", "audit_logs"):
                assert conn.execute(
                    text(f"SELECT count(*) FROM {table} WHERE org_id IS NULL")
                ).scalar() == 0

            assert conn.execute(text("""
                SELECT p.org_id = u.org_id
                FROM partners p JOIN uploads u ON u.partner_id = p.id
            """)).scalar() is True

            assert conn.execute(
                text("SELECT count(*) FROM organizations WHERE slug = 'legacy-import'")
            ).scalar() == 1
    finally:
        engine.dispose()


def test_offline_sql_generation_with_encoded_password(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://user:p%40ss@localhost:5432/reconiq")
    get_settings.cache_clear()
    cfg = _alembic_config()
    cfg.output_buffer = io.StringIO()
    try:
        command.upgrade(cfg, "head", sql=True)
    finally:
        get_settings.cache_clear()

    sql = cfg.output_buffer.getvalue()
    assert "CREATE TABLE organizations" in sql
    assert "legacy-import" in sql
