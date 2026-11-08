"""Idempotent seed for marketplace/logistics/courier partners.

Partners seeded:
  Website, Marketplace 1, Marketplace 2, Marketplace 3,
  Quick Commerce 1, Quick Commerce 2, Courier A, Courier B

Safe to re-run — existing partners (matched by code) are skipped.
"""

from __future__ import annotations

import sys
import os
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.connection import SessionLocal
from app.models.organization import Organization
from app.models.partner import Partner
from app.repositories.partner import PartnerRepository

PARTNERS: list[dict[str, str]] = [
    {"name": "Website", "code": "website", "partner_type": "marketplace"},
    {"name": "Marketplace 1", "code": "mp1", "partner_type": "marketplace"},
    {"name": "Marketplace 2", "code": "mp2", "partner_type": "marketplace"},
    {"name": "Marketplace 3", "code": "mp3", "partner_type": "marketplace"},
    {"name": "Quick Commerce 1", "code": "qc1", "partner_type": "marketplace"},
    {"name": "Quick Commerce 2", "code": "qc2", "partner_type": "marketplace"},
    {"name": "Courier A", "code": "courier-a", "partner_type": "logistics"},
    {"name": "Courier B", "code": "courier-b", "partner_type": "logistics"},
]


def main() -> None:
    db = SessionLocal()
    try:
        # Ensure a default org exists for partner ownership
        org = (
            db.query(Organization).filter(Organization.slug == "default").first()
        )
        if org is None:
            org = Organization(
                id=uuid.uuid4(),
                name="Default Organization",
                slug="default",
                is_active=True,
            )
            db.add(org)
            db.flush()

        repo = PartnerRepository(db)
        created = 0
        skipped = 0

        for p in PARTNERS:
            if repo.code_exists(p["code"]):
                skipped += 1
                continue
            partner = Partner(
                id=uuid.uuid4(),
                org_id=org.id,
                name=p["name"],
                code=p["code"],
                partner_type=p["partner_type"],
                description=None,
                is_active=True,
            )
            repo.create(partner)
            created += 1

        db.commit()
        print(f"Partners seed complete: {created} created, {skipped} already existed.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
