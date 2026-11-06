"""Partner repository."""
from __future__ import annotations
from uuid import UUID
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.partner import Partner


class PartnerRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, partner_id: UUID) -> Partner | None:
        return self.db.query(Partner).filter(Partner.id == partner_id).first()

    def get_by_code(self, code: str) -> Partner | None:
        return self.db.query(Partner).filter(func.lower(Partner.code) == code.lower()).first()

    def name_exists_in_org(self, name: str, org_id: UUID) -> bool:
        return (
            self.db.query(Partner)
            .filter(func.lower(Partner.name) == name.lower())
            .filter(Partner.org_id == org_id)
            .first()
        ) is not None

    def list_by_org(self, org_id: UUID, active_only: bool = True) -> list[Partner]:
        q = self.db.query(Partner).filter(Partner.org_id == org_id)
        if active_only:
            q = q.filter(Partner.is_active == True)  # noqa
        return q.order_by(Partner.name).all()

    def create(self, partner: Partner) -> Partner:
        self.db.add(partner)
        self.db.commit()
        self.db.refresh(partner)
        return partner

    def update(self, partner: Partner) -> Partner:
        self.db.commit()
        self.db.refresh(partner)
        return partner

    def code_exists(self, code: str) -> bool:
        return self.get_by_code(code) is not None
