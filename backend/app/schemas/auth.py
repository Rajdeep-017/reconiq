"""Pydantic schemas for authentication."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Login request body."""

    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)


class RegisterRequest(BaseModel):
    """User registration request body."""

    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(
        default="finance_executive",
        pattern="^(finance_executive|finance_cofounder)$",
    )


class TokenResponse(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class AuthMessageResponse(BaseModel):
    """Simple message response for auth operations."""

    message: str

