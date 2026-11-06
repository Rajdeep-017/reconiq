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

    def create_partner(self, data: PartnerCreate, org_id: UUID) -> Partner:
        if self.repo.code_exists(data.code):
            raise ConflictException(f"Partner code '{data.code}' already exists")
        # Check name uniqueness within org
        if self.repo.name_exists_in_org(data.name, org_id):
            raise ConflictException(f"Partner name '{data.name}' already exists in this organization")
        partner = Partner(
            org_id=org_id,
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

    def list_partners(self, org_id: UUID) -> list[Partner]:
        return self.repo.list_by_org(org_id)

    def update_partner(self, partner_id: UUID, data: PartnerUpdate) -> Partner:
        p = self.get_partner(partner_id)
        if data.name is not None:
            p.name = data.name
        if data.description is not None:
            p.description = data.description
        if data.is_active is not None:
            p.is_active = data.is_active
        return self.repo.update(p)
