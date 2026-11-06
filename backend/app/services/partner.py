"""Partner service."""
from __future__ import annotations
from uuid import UUID
from sqlalchemy.orm import Session
from app.core.exceptions import ConflictException, NotFoundException
from app.models.partner import Partner
from app.repositories.partner import PartnerRepository
from app.schemas.partner import PartnerCreate, PartnerUpdate


class PartnerService:
    def __init__(self, db: Session):
        self.repo = PartnerRepository(db)

    def create_partner(self, data: PartnerCreate) -> Partner:
        if self.repo.code_exists(data.code):
            raise ConflictException(f"Partner code '{data.code}' already exists")
        partner = Partner(
            name=data.name,
            code=data.code.lower(),
            partner_type=data.partner_type,
            description=data.description,
        )
        return self.repo.create(partner)

    def get_partner(self, partner_id: UUID) -> Partner:
        p = self.repo.get_by_id(partner_id)
        if not p:
            raise NotFoundException(f"Partner {partner_id} not found")
        return p

    def list_partners(self) -> list[Partner]:
        return self.repo.list_all()

    def update_partner(self, partner_id: UUID, data: PartnerUpdate) -> Partner:
        p = self.get_partner(partner_id)
        if data.name is not None:
            p.name = data.name
        if data.description is not None:
            p.description = data.description
        if data.is_active is not None:
            p.is_active = data.is_active
        return self.repo.update(p)

