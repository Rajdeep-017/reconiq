
"""Security utilities: password hashing (Argon2) and JWT tokens."""

from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import (
    VerifyMismatchError,
    VerificationError,
)
from jose import jwt, JWTError


# Argon2id password hasher with secure defaults
_ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
)


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2id."""
    return _ph.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    """Verify a plaintext password against an Argon2id hash."""
    try:
        return _ph.verify(hashed_password, plain_password)

    except (VerifyMismatchError, VerificationError, ValueError):
        return False


def create_access_token(
    data: dict,
    secret_key: str,
    algorithm: str = "HS256",
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()

    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=60))

    to_encode.update({
        "exp": expire,
        "iat": now,
    })

    return jwt.encode(
        to_encode,
        secret_key,
        algorithm=algorithm,
    )


def decode_access_token(
    token: str,
    secret_key: str,
    algorithm: str = "HS256",
) -> dict | None:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(
            token,
            secret_key,
            algorithms=[algorithm],
        )
        return payload

    except JWTError:
        return None
