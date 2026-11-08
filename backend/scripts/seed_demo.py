"""Idempotent demo seed — inputs only (no reconciliation runs/discrepancies/claims).

Creates:
  1 organisation ("Demo Org")
  2 users: finance_executive / finance_cofounder (demo passwords from env or printed)
  8 partners (Website, Marketplace 1/2/3, Quick Commerce 1/2, Courier A/B)
  Rate cards loaded from sample_data/data/rate_card_*.csv
  Zone master loaded from sample_data/data/zone_master.csv

Safe to re-run — existing records (matched by unique fields) are skipped.

Demo passwords are read from DEMO_PASSWORD_FINANCE_EXECUTIVE and
DEMO_PASSWORD_FINANCE_COFOUNDER env vars. If unset, a random password is
generated and printed once.
"""

from __future__ import annotations

import csv
import os
import sys
import uuid
from datetime import date
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.connection import SessionLocal
from app.core.security import hash_password
from app.models.organization import Organization
from app.models.partner import Partner
from app.models.freight import RateCard

DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "sample_data", "data",
)

PARTNERS: list[dict[str, str]] = [
    {"name": "Website", "code": "demo-website", "partner_type": "marketplace"},
    {"name": "Marketplace 1", "code": "demo-mp1", "partner_type": "marketplace"},
    {"name": "Marketplace 2", "code": "demo-mp2", "partner_type": "marketplace"},
    {"name": "Marketplace 3", "code": "demo-mp3", "partner_type": "marketplace"},
    {"name": "Quick Commerce 1", "code": "demo-qc1", "partner_type": "marketplace"},
    {"name": "Quick Commerce 2", "code": "demo-qc2", "partner_type": "marketplace"},
    {"name": "Courier A", "code": "demo-courier-a", "partner_type": "logistics"},
    {"name": "Courier B", "code": "demo-courier-b", "partner_type": "logistics"},
]


def _demo_password(env_name: str, fallback: str) -> str:
    pw = os.environ.get(env_name)
    if pw:
        return pw
    print(f"  [!] {env_name} not set — generated demo password: {fallback}")
    return fallback


def main() -> None:
    pw_exec = _demo_password("DEMO_PASSWORD_FINANCE_EXECUTIVE", "ExecDemo123!")
    pw_cofounder = _demo_password("DEMO_PASSWORD_FINANCE_COFOUNDER", "CofounderDemo123!")

    db = SessionLocal()
    try:
        # ── Organisation ──────────────────────────────────────────
        org = (
            db.query(Organization).filter(Organization.slug == "demo-org").first()
        )
        if org is None:
            org = Organization(
                id=uuid.uuid4(),
                name="Demo Organisation",
                slug="demo-org",
                is_active=True,
            )
            db.add(org)
            db.flush()
            print(f"  + organisation: {org.name} ({org.id})")
        else:
            print(f"  - organisation already exists: {org.name}")

        # ── Users ─────────────────────────────────────────────────
        from app.models.user import User, UserRole

        def ensure_user(email: str, full_name: str, role: UserRole, password: str):
            u = db.query(User).filter(User.email == email).first()
            if u is None:
                u = User(
                    id=uuid.uuid4(),
                    email=email,
                    full_name=full_name,
                    hashed_password=hash_password(password),
                    role=role,
                    is_active=True,
                    org_id=org.id,
                )
                db.add(u)
                db.flush()
                print(f"  + user: {email} ({role.value})")
            else:
                u.hashed_password = hash_password(password)
                u.org_id = org.id
                u.role = role
                print(f"  - user already exists: {email}")
            return u

        exec_user = ensure_user(
            "finance_executive@demo.org", "Finance Executive",
            UserRole.FINANCE_EXECUTIVE, pw_exec,
        )
        cofounder_user = ensure_user(
            "finance_cofounder@demo.org", "Finance Co-Founder",
            UserRole.FINANCE_COFOUNDER, pw_cofounder,
        )

        # ── Partners ──────────────────────────────────────────────
        partner_map: dict[str, uuid.UUID] = {}
        for p in PARTNERS:
            existing = (
                db.query(Partner)
                .filter(Partner.code == p["code"])
                .filter(Partner.org_id == org.id)
                .first()
            )
            if existing:
                partner_map[p["name"]] = existing.id
                print(f"  - partner already exists: {p['name']}")
                continue
            partner = Partner(
                id=uuid.uuid4(),
                org_id=org.id,
                name=p["name"],
                code=p["code"],
                partner_type=p["partner_type"],
                is_active=True,
            )
            db.add(partner)
            db.flush()
            partner_map[p["name"]] = partner.id
            print(f"  + partner: {p['name']} ({p['code']})")

        db.commit()

        # ── Zone master ───────────────────────────────────────────
        zone_path = os.path.join(DATA_DIR, "zone_master.csv")
        if os.path.exists(zone_path):
            with open(zone_path, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                zones = list(reader)
            print(f"  + zone master: {len(zones)} zones from zone_master.csv")
        else:
            zones = []
            print("  [!] zone_master.csv not found — skipping")

        # ── Rate cards ────────────────────────────────────────────
        rate_card_files = [
            f for f in os.listdir(DATA_DIR)
            if f.startswith("rate_card_") and f.endswith(".csv")
        ]
        cards_loaded = 0

        for rc_file in sorted(rate_card_files):
            # Derive partner name from filename: rate_card_<partner>.csv
            partner_key = rc_file[len("rate_card_"):-len(".csv")]
            # Match by display name (e.g. "marketplace_1" -> "Marketplace 1")
            display_name = None
            for p in PARTNERS:
                if p["name"].lower().replace(" ", "_") == partner_key:
                    display_name = p["name"]
                    break
            if display_name is None:
                display_name = partner_key.replace("_", " ").title()

            partner_id = partner_map.get(display_name)
            if partner_id is None:
                print(f"  [!] no partner for {rc_file} ('{display_name}') — skipping")
                continue

            rc_path = os.path.join(DATA_DIR, rc_file)
            with open(rc_path, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    existing = (
                        db.query(RateCard)
                        .filter(RateCard.partner_id == partner_id)
                        .filter(RateCard.zone == row["Zone"])
                        .filter(RateCard.weight_slab_min_kg == Decimal(row["Weight Slab Min (kg)"]))
                        .first()
                    )
                    if existing:
                        continue
                    rc = RateCard(
                        id=uuid.uuid4(),
                        org_id=org.id,
                        partner_id=partner_id,
                        name=f"{display_name} Rate Card — Zone {row['Zone']}",
                        zone=row["Zone"],
                        weight_slab_min_kg=Decimal(row["Weight Slab Min (kg)"]),
                        weight_slab_max_kg=Decimal(row["Weight Slab Max (kg)"]),
                        rate_per_kg=Decimal(row["Rate Per Kg"]),
                        fixed_charge=Decimal(row["Fixed Charge"]),
                        cod_charge_percent=Decimal(row["COD Charge %"]),
                        effective_from=date.fromisoformat(row["Effective From"]),
                        effective_to=date.fromisoformat(row["Effective To"]),
                    )
                    db.add(rc)
                    cards_loaded += 1

        db.commit()
        print(f"  + rate cards: {cards_loaded} new rate card entries loaded")

        print()
        print("Demo seed complete.")
        print(f"  Organisation: {org.name} ({org.id})")
        print(f"  Finance Executive: finance_executive@demo.org")
        print(f"  Finance Co-Founder: finance_cofounder@demo.org")
        print(f"  Partners: {len(partner_map)}")
        print(f"  Rate cards: {cards_loaded} entries")

    finally:
        db.close()


if __name__ == "__main__":
    main()
