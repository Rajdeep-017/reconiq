"""Pytest fixtures and test configuration.

The conftest uses a lazy database setup: the session-scoped `_db_engine` fixture
only connects when a test actually requires the `db` or `client` fixture. Pure unit
tests (like test_security.py) that don't request database fixtures will never
attempt a PostgreSQL connection.
"""

from __future__ import annotations

import os
import uuid
from collections.abc import Generator

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# Override settings before importing the app
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://reconiq:reconiq_dev@localhost:5432/reconiq_test",
)
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")

from app.config import get_settings  # noqa: E402

# Invalidate the cached settings so our env overrides take effect
get_settings.cache_clear()
settings = get_settings()


# ── Database engine (lazy, only created when needed) ──────────────────────

@pytest.fixture(scope="session")
def _db_engine():
    """Create the test DB engine and tables once per session."""
    test_url = os.environ.get(
        "TEST_DATABASE_URL",
        "postgresql+psycopg://reconiq:reconiq_dev@localhost:5432/reconiq_test",
    )
    engine = create_engine(test_url, echo=False)

    import app.models  # noqa: F401 — register all models
    from app.database.base import Base

    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


# ── Per-test database session (transactional) ─────────────────────────────

@pytest.fixture()
def db(_db_engine) -> Generator[Session, None, None]:
    """Provide a transactional DB session that rolls back after each test."""
    TestingSessionLocal = sessionmaker(
        bind=_db_engine, autocommit=False, autoflush=False
    )
    connection = _db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


# ── FastAPI test client ───────────────────────────────────────────────────

@pytest.fixture()
def client(db: Session):
    """FastAPI test client with the test database session injected."""
    from fastapi.testclient import TestClient
    from app.database.connection import get_db
    from app.main import app

    def _override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ── User fixtures ─────────────────────────────────────────────────────────

@pytest.fixture()
def test_user(db: Session):
    """Create a test finance_executive user."""
    from app.core.security import hash_password
    from app.models.user import User, UserRole

    user = User(
        id=uuid.uuid4(),
        email=f"test_{uuid.uuid4().hex[:8]}@example.com",
        full_name="Test User",
        hashed_password=hash_password("testpassword123"),
        role=UserRole.FINANCE_EXECUTIVE,
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture()
def admin_user(db: Session):
    """Create a test finance_cofounder (admin) user."""
    from app.core.security import hash_password
    from app.models.user import User, UserRole

    user = User(
        id=uuid.uuid4(),
        email=f"admin_{uuid.uuid4().hex[:8]}@example.com",
        full_name="Admin User",
        hashed_password=hash_password("adminpassword123"),
        role=UserRole.FINANCE_COFOUNDER,
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user


# ── Auth header fixtures ──────────────────────────────────────────────────

@pytest.fixture()
def auth_headers(test_user) -> dict[str, str]:
    """Authorization headers for the test_user."""
    from app.core.security import create_access_token

    token = create_access_token(
        data={"sub": str(test_user.id), "role": test_user.role.value},
        secret_key=settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def admin_headers(admin_user) -> dict[str, str]:
    """Authorization headers for the admin_user."""
    from app.core.security import create_access_token

    token = create_access_token(
        data={"sub": str(admin_user.id), "role": admin_user.role.value},
        secret_key=settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return {"Authorization": f"Bearer {token}"}
