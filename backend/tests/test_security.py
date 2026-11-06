"""Unit tests for core security utilities."""

from datetime import timedelta

import pytest

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    """Tests for Argon2 password hashing."""

    def test_hash_and_verify(self):
        """Hashing a password and verifying it succeeds."""
        password = "my_secure_password_123"
        hashed = hash_password(password)
        assert hashed != password
        assert verify_password(password, hashed)

    def test_wrong_password_fails(self):
        """Wrong password does not verify."""
        hashed = hash_password("correct_password")
        assert not verify_password("wrong_password", hashed)

    def test_different_hashes(self):
        """Same password produces different hashes (salt)."""
        h1 = hash_password("same_password")
        h2 = hash_password("same_password")
        assert h1 != h2  # Argon2 uses random salt

    def test_empty_password_hashes(self):
        """Empty string can be hashed (validation is app-level)."""
        hashed = hash_password("")
        assert verify_password("", hashed)

    def test_invalid_hash_returns_false(self):
        """Verifying against garbage hash returns False, not an exception."""
        assert not verify_password("password", "not-a-valid-hash")


class TestJWT:
    """Tests for JWT token creation and decoding."""

    SECRET = "test-jwt-secret"

    def test_create_and_decode(self):
        """Token roundtrip: create → decode returns original payload."""
        token = create_access_token(
            data={"sub": "user-123", "role": "finance_executive"},
            secret_key=self.SECRET,
        )
        payload = decode_access_token(token, self.SECRET)
        assert payload is not None
        assert payload["sub"] == "user-123"
        assert payload["role"] == "finance_executive"

    def test_expired_token_returns_none(self):
        """Expired token decodes as None."""
        token = create_access_token(
            data={"sub": "user-123"},
            secret_key=self.SECRET,
            expires_delta=timedelta(seconds=-10),
        )
        assert decode_access_token(token, self.SECRET) is None

    def test_wrong_secret_returns_none(self):
        """Token decoded with wrong secret returns None."""
        token = create_access_token(
            data={"sub": "user-123"},
            secret_key=self.SECRET,
        )
        assert decode_access_token(token, "wrong-secret") is None

    def test_garbage_token_returns_none(self):
        """Completely invalid token returns None."""
        assert decode_access_token("not.a.jwt", self.SECRET) is None

    def test_custom_expiry(self):
        """Token with custom expiry encodes exp claim."""
        token = create_access_token(
            data={"sub": "user-123"},
            secret_key=self.SECRET,
            expires_delta=timedelta(hours=2),
        )
        payload = decode_access_token(token, self.SECRET)
        assert payload is not None
        assert "exp" in payload
        assert "iat" in payload

