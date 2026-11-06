"""Authentication service — business logic for login, registration, and tokens."""

from __future__ import annotations

import uuid
from datetime import timedelta

from sqlalchemy.orm import Session

from app.config import Settings
from app.core.exceptions import ConflictException, UnauthorizedException
from app.core.security import create_access_token, hash_password, verify_password
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.repositories.user import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse


class AuthService:
    """Handles user authentication and registration."""

    def __init__(self, db: Session, settings: Settings):
        self.db = db
        self.repo = UserRepository(db)
        self.settings = settings

    def register(self, data: RegisterRequest) -> User:
        """Register a new user account and create their organization.

        Raises:
            ConflictException: if the email is already taken.
        """
        if self.repo.email_exists(data.email):
            raise ConflictException(
                message="A user with this email already exists",
                details={"email": data.email},
            )

        # Derive a slug from the email domain or full name
        email_domain = data.email.split("@")[-1] if "@" in data.email else "org"
        base_slug = email_domain.split(".")[0].lower().replace(" ", "-")
        slug = base_slug

        # Ensure slug uniqueness
        from app.models.organization import Organization as OrgModel
        existing = self.db.query(OrgModel).filter(OrgModel.slug == slug).first()
        counter = 1
        while existing:
            slug = f"{base_slug}-{counter}"
            existing = self.db.query(OrgModel).filter(OrgModel.slug == slug).first()
            counter += 1

        # Create organization first (owner_id will be set after user creation)
        org = Organization(
            name=data.full_name + "'s Organization",
            slug=slug,
            is_active=True,
        )
        self.db.add(org)
        self.db.flush()  # Get org.id without committing

        # Create user linked to the organization
        user = User(
            email=data.email.lower(),
            full_name=data.full_name,
            hashed_password=hash_password(data.password),
            role=UserRole(data.role),
            is_active=True,
            org_id=org.id,
        )
        self.db.add(user)
        self.db.flush()

        # Set the organization owner to this user (first user = owner)
        org.owner_id = user.id

        self.db.commit()
        self.db.refresh(user)
        return user

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
