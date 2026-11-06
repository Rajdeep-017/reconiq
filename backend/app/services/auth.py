"""Authentication service — business logic for login, registration, and tokens."""

from __future__ import annotations

from datetime import timedelta

from sqlalchemy.orm import Session

from app.config import Settings
from app.core.exceptions import ConflictException, UnauthorizedException
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User, UserRole
from app.repositories.user import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse


class AuthService:
    """Handles user authentication and registration."""

    def __init__(self, db: Session, settings: Settings):
        self.repo = UserRepository(db)
        self.settings = settings

    def register(self, data: RegisterRequest) -> User:
        """Register a new user account.

        Raises:
            ConflictException: if the email is already taken.
        """
        if self.repo.email_exists(data.email):
            raise ConflictException(
                message="A user with this email already exists",
                details={"email": data.email},
            )

        user = User(
            email=data.email.lower(),
            full_name=data.full_name,
            hashed_password=hash_password(data.password),
            role=UserRole(data.role),
            is_active=True,
        )
        return self.repo.create(user)

    def login(self, data: LoginRequest) -> TokenResponse:
        """Authenticate a user and return a JWT token.

        Raises:
            UnauthorizedException: if credentials are invalid.
        """
        user = self.repo.get_by_email(data.email)
        if user is None or not verify_password(data.password, user.hashed_password):
            raise UnauthorizedException("Invalid email or password")
        if not user.is_active:
            raise UnauthorizedException("Account is deactivated")

        expires_delta = timedelta(minutes=self.settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        token = create_access_token(
            data={"sub": str(user.id), "role": user.role.value},
            secret_key=self.settings.SECRET_KEY,
            algorithm=self.settings.ALGORITHM,
            expires_delta=expires_delta,
        )

        return TokenResponse(
            access_token=token,
            token_type="bearer",
            expires_in=self.settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

