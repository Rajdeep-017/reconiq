"""Authentication endpoints: register, login, current user."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.dependencies import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.user import UserResponse
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=201,
    summary="Register a new user",
)
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> UserResponse:
    """Create a new user account.

    Returns the created user profile (without password).
    """
    service = AuthService(db, settings)
    user = service.register(data)
    return UserResponse.model_validate(user)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and obtain JWT token",
)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> TokenResponse:
    """Authenticate with email and password.

    Returns a JWT access token.
    """
    service = AuthService(db, settings)
    return service.login(data)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user",
)
def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Return the profile of the currently authenticated user."""
    return UserResponse.model_validate(current_user)

