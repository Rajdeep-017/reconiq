"""Phase C: deterministic ingestion → normalization pipeline tests.

Covers the requested fixture families:
* Marketplace 1 September/October header variants
* Marketplace 3 ₹ strings, lowercase headers/statuses and trailing spaces
* Marketplace 2 XLSX files
* QC2 semicolon-delimited files
* duplicate payout references
* blank order ids (rejected, never inserted)
"""
from __future__ import annotations

import io
import uuid
from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook
from sqlalchemy import func

from app.config import get_settings
from app.core.security import create_access_token
from app.models.order import Order, WarehouseScan
from app.models.organization import Organization
from app.models.partner import Partner
from app.models.settlement import CODRemittance, Settlement
from app.models.upload import DocumentType, ImportRow, Upload
from app.models.user import User, UserRole
from app.models.freight import FreightRecord

settings = get_settings()


# ── Fixtures ──────────────────────────────────────────────────────────


@pytest.fixture()
def org(db):
    org = Organization(
        id=uuid.uuid4(),
        name="Normalization Test Org",
        slug=f"norm-{uuid.uuid4().hex[:8]}",
        is_active=True,
    )
    db.add(org)
    db.flush()
    return org


@pytest.fixture()
def user(db, org):
    user = User(
        id=uuid.uuid4(),
        email=f"norm-{uuid.uuid4().hex[:8]}@example.com",
        full_name="Normalization User",
        hashed_password="hashed",
        role=UserRole.FINANCE_EXECUTIVE,
        is_active=True,
        org_id=org.id,
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture()
def headers(user):
    token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value},
        secret_key=settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def partner(db, org):
    partner = Partner(
        id=uuid.uuid4(),
        org_id=org.id,
        name="Website",
        code=f"website-{uuid.uuid4().hex[:6]}",
        partner_type="marketplace",
        is_active=True,
    )
    db.add(partner)
    db.flush()
    return partner


def _upload(
    client: TestClient,
    headers: dict[str, str],
    content: bytes,
    filename: str,
    document_type: str,
    mime: str = "text/csv",
) -> dict:
    response = client.post(
        "/api/v1/uploads",
        headers=headers,
        files={"file": (filename, io.BytesIO(content), mime)},
        data={"document_type": document_type},
    )
    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload["status"] == "parsed", payload
    return payload


def _approve_mapping(
    client: TestClient, headers: dict[str, str], upload_id: str
) -> dict:
    suggestion = client.get(
        f"/api/v1/mappings/suggest/{upload_id}", headers=headers
    )
    assert suggestion.status_code == 200, suggestion.text
    mappings = {
        column: item["target_field"]
        for column, item in suggestion.json()["mappings"].items()
        if item.get("target_field")
    }
    response = client.post(
        "/api/v1/mappings",
        headers=headers,
        json={"upload_id": upload_id, "mappings": mappings, "approved": True},
    )
    assert response.status_code == 201, response.text
    return mappings


def _upload_and_approve(
    client: TestClient,
    headers: dict[str, str],
    content: bytes,
    filename: str,
    document_type: str,
    mime: str = "text/csv",
) -> tuple[dict, dict]:
    upload = _upload(client, headers, content, filename, document_type, mime)
    mappings = _approve_mapping(client, headers, upload["id"])
    result = client.get(f"/api/v1/uploads/{upload['id']}", headers=headers)
    assert result.status_code == 200, result.text
    return result.json(), mappings


# ── Value parser unit tests ───────────────────────────────────────────


class TestValueParsers:
    def test_money_formats(self):
        from app.modules.normalization.values import parse_decimal

        assert parse_decimal("₹1,499.00") == Decimal("1499.00")
        assert parse_decimal("Rs. 1,23,456.78") == Decimal("123456.78")
        assert parse_decimal("INR 1 499") == Decimal("1499.00")
        assert parse_decimal("(1,000.50)") == Decimal("-1000.50")
        assert parse_decimal("") is None
        assert parse_decimal("-") is None

    def test_date_formats(self):
        from app.modules.normalization.values import parse_date

        assert parse_date("2024-09-15") == date(2024, 9, 15)
        assert parse_date("15/09/2024") == date(2024, 9, 15)
        assert parse_date("15-09-2024") == date(2024, 9, 15)
        assert parse_date("15 Sep 2024") == date(2024, 9, 15)
        assert parse_date("Sep 15, 2024") == date(2024, 9, 15)
        assert parse_date("15th September 2024") == date(2024, 9, 15)
        assert parse_date("15.09.2024") == date(2024, 9, 15)
        assert parse_date("15/09/24") == date(2024, 9, 15)
        assert parse_date(45519) == date(2024, 8, 15)


# ── Header variants / Marketplace 1 ───────────────────────────────────


class TestMarketplace1Headers:
    def test_september_and_october_header_variants_map_to_same_fields(
        self, client: TestClient, headers: dict[str, str], partner
    ):
        september = (
            "Order ID,Order Date,Order Status,SKU,Gross Amount,Discount,"
            "Net Amount,Partner\n"
            "ORD-M1-SEP-1,2024-09-01,Delivered,SKU-1,1000,100,900,Website\n"
        ).encode()
        october = (
            "order_id,ordered date,order status,sku,gross amount,discount,"
            "net amount,partner\n"
            "ORD-M1-OCT-1,01/10/2024,delivered,SKU-2,2000,200,1800,website\n"
        ).encode()

        upload_sep, mappings_sep = _upload_and_approve(
            client, headers, september, "m1_sep.csv", "orders"
        )
        upload_oct, mappings_oct = _upload_and_approve(
            client, headers, october, "m1_oct.csv", "orders"
        )

        assert mappings_sep["Order ID"] == "order_reference"
        assert mappings_oct["order_id"] == "order_reference"
        assert upload_sep["status"] == "processed"
        assert upload_sep["processed_count"] == 1
        assert upload_oct["status"] == "processed"
        assert upload_oct["processed_count"] == 1

        from app.database.connection import get_db

        db = next(client.app.dependency_overrides[get_db]())
        try:
            assert db.query(Order).filter(Order.upload_id == upload_sep["id"]).count() == 1
            assert db.query(Order).filter(Order.upload_id == upload_oct["id"]).count() == 1
        finally:
            db.close()


# ── Marketplace 3: currency, lowercase, trailing spaces ───────────────


class TestMarketplace3Values:
    def test_rupee_strings_lowercase_and_trailing_spaces(
        self, client: TestClient, headers: dict[str, str], partner
    ):
        content = (
            "order id ,order date ,order status ,sku ,gross amount ,net amount ,partner \n"
            "ORD-M3-1   ,15/09/2024,delivered,sku-1,\"₹1,999.00\",\"₹1,499.00\",Website \n"
        ).encode("utf-8")

        upload, mappings = _upload_and_approve(
            client, headers, content, "marketplace3.csv", "orders"
        )
        assert mappings["order id "] == "order_reference"
        assert upload["status"] == "processed", upload
        assert upload["processed_count"] == 1

        from app.database.connection import get_db

        db = next(client.app.dependency_overrides[get_db]())
        try:
            order = db.query(Order).filter(Order.upload_id == upload["id"]).one()
            assert order.order_reference == "ORD-M3-1"
            assert order.order_date == date(2024, 9, 15)
            assert order.net_amount == Decimal("1499.00")
            assert order.gross_amount == Decimal("1999.00")
            assert order.status.value == "delivered"
            assert order.raw_data["net amount "] == "₹1,499.00"
        finally:
            db.close()


# ── Marketplace 2: XLSX ───────────────────────────────────────────────


class TestMarketplace2Xlsx:
    def test_xlsx_upload_and_normalization(
        self, client: TestClient, headers: dict[str, str], partner
    ):
        workbook = Workbook()
        sheet = workbook.active
        sheet.append(
            [
                "Order ID",
                "Order Date",
                "Status",
                "SKU",
                "Gross Amount",
                "Net Amount",
                "Partner",
            ]
        )
        sheet.append(
            ["ORD-M2-1", date(2024, 9, 5), "Delivered", "SKU-X", 1200, 1100, "Website"]
        )
        sheet.append(
            ["ORD-M2-2", date(2024, 9, 6), "Delivered", "SKU-Y", 800, 750, "Website"]
        )
        buffer = io.BytesIO()
        workbook.save(buffer)

        upload, mappings = _upload_and_approve(
            client,
            headers,
            buffer.getvalue(),
            "marketplace2.xlsx",
            "orders",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        assert mappings["Order ID"] == "order_reference"
        assert upload["status"] == "processed", upload
        assert upload["processed_count"] == 2

        from app.database.connection import get_db

        db = next(client.app.dependency_overrides[get_db]())
        try:
            orders = (
                db.query(Order)
                .filter(Order.upload_id == upload["id"])
                .order_by(Order.order_reference)
                .all()
            )
            assert [o.order_reference for o in orders] == ["ORD-M2-1", "ORD-M2-2"]
            assert orders[0].order_date == date(2024, 9, 5)
            assert orders[0].net_amount == Decimal("1100.00")
        finally:
            db.close()


# ── QC2: semicolon files ──────────────────────────────────────────────


class TestQC2Semicolon:
    def test_semicolon_delimited_file_is_parsed(
        self, client: TestClient, headers: dict[str, str], partner
    ):
        content = (
            "Order ID;Order Date;Status;SKU;Gross Amount;Net Amount;Partner\n"
            "ORD-QC2-1;2024-09-10;Delivered;SKU-Q;500;450;Website\n"
            "ORD-QC2-2;2024-09-11;Delivered;SKU-R;600;550;Website\n"
        ).encode()
        upload, _ = _upload_and_approve(
            client, headers, content, "qc2_semicolon.csv", "orders"
        )
        assert upload["row_count"] == 2
        assert upload["processed_count"] == 2, upload
        assert upload["status"] == "processed"

        from app.database.connection import get_db

        db = next(client.app.dependency_overrides[get_db]())
        try:
            assert (
                db.query(Order).filter(Order.upload_id == upload["id"]).count() == 2
            )
        finally:
            db.close()


# ── Duplicate payout references + rerun idempotency ──────────────────


class TestDuplicatePayoutReferences:
    def test_duplicate_payout_refs_are_skipped_and_reprocess_is_idempotent(
        self, client: TestClient, headers: dict[str, str], partner
    ):
        content = (
            "Settlement ID,Settlement Date,Order Reference,Gross Amount,Commission,"
            "Net Settlement,TCS,TDS\n"
            "PAYOUT-001,2024-09-15,ORD-S-1,1000,100,880,10,10\n"
            "PAYOUT-001,2024-09-15,ORD-S-1,1000,100,880,10,10\n"
            "PAYOUT-002,2024-09-15,ORD-S-2,2000,200,1780,10,10\n"
        ).encode()
        upload, _ = _upload_and_approve(
            client, headers, content, "settlements_dupes.csv", "settlements"
        )
        assert upload["status"] == "processed", upload
        assert upload["processed_count"] == 2
        assert upload["duplicate_count"] == 1

        from app.database.connection import get_db

        db = next(client.app.dependency_overrides[get_db]())
        try:
            assert (
                db.query(Settlement)
                .filter(Settlement.upload_id == upload["id"])
                .count()
                == 2
            )
        finally:
            db.close()

        # Explicit endpoint rerun must not create extra rows.
        rerun = client.post(
            f"/api/v1/uploads/{upload['id']}/process", headers=headers
        )
        assert rerun.status_code == 200, rerun.text
        assert rerun.json()["processed_count"] == 2
        assert rerun.json()["duplicate_count"] == 1

        db = next(client.app.dependency_overrides[get_db]())
        try:
            assert (
                db.query(Settlement)
                .filter(Settlement.upload_id == upload["id"])
                .count()
                == 2
            )
        finally:
            db.close()

    def test_duplicate_payout_ref_across_uploads_is_skipped(
        self, client: TestClient, headers: dict[str, str], partner
    ):
        header = (
            "Settlement ID,Settlement Date,Order Reference,Gross Amount,Commission,"
            "Net Settlement\n"
        )
        first, _ = _upload_and_approve(
            client,
            headers,
            (header + "PAYOUT-X,2024-09-15,ORD-X-1,500,50,450\n").encode(),
            "settlements_x1.csv",
            "settlements",
        )
        second, _ = _upload_and_approve(
            client,
            headers,
            (header + "PAYOUT-X,2024-09-15,ORD-X-1,500,50,450.00\n").encode(),
            "settlements_x2.csv",
            "settlements",
        )
        assert first["processed_count"] == 1
        assert second["processed_count"] == 0
        assert second["duplicate_count"] == 1

        from app.database.connection import get_db

        db = next(client.app.dependency_overrides[get_db]())
        try:
            assert db.query(Settlement).filter(Settlement.org_id == partner.org_id).count() == 1
        finally:
            db.close()


# ── Blank order ids ───────────────────────────────────────────────────


class TestBlankOrderIds:
    def test_blank_order_id_is_rejected_never_inserted(
        self, client: TestClient, headers: dict[str, str], partner
    ):
        content = (
            "Order ID,Order Date,Status,SKU,Gross Amount,Net Amount,Partner\n"
            "ORD-BLANK-OK,2024-09-15,Delivered,SKU-1,100,90,Website\n"
            ",2024-09-16,Delivered,SKU-2,200,180,Website\n"
            "   ,2024-09-17,Delivered,SKU-3,300,270,Website\n"
        ).encode()
        upload, _ = _upload_and_approve(
            client, headers, content, "blank_order_ids.csv", "orders"
        )
        assert upload["status"] == "processed", upload
        assert upload["processed_count"] == 1
        assert upload["rejected_count"] == 2

        from app.database.connection import get_db

        db = next(client.app.dependency_overrides[get_db]())
        try:
            assert db.query(Order).filter(Order.upload_id == upload["id"]).count() == 1
            rejected = (
                db.query(ImportRow)
                .filter(ImportRow.upload_id == upload["id"])
                .filter(ImportRow.is_valid.is_(False))
                .all()
            )
            assert len(rejected) == 2
            assert all(
                "missing_order_reference" in row.validation_errors["errors"]
                for row in rejected
            )
        finally:
            db.close()


# ── Process endpoint guard ───────────────────────────────────────────


class TestProcessEndpoint:
    def test_process_without_approved_mapping_returns_422(
        self, client: TestClient, headers: dict[str, str], partner
    ):
        upload = _upload(
            client,
            headers,
            b"Order ID,Net Amount\nORD-NOMAP-1,100\n",
            "no_mapping.csv",
            "orders",
        )
        response = client.post(
            f"/api/v1/uploads/{upload['id']}/process", headers=headers
        )
        assert response.status_code == 422
        assert "approved column mapping" in response.json()["message"].lower()


# ── Routing for every document type ──────────────────────────────────


class TestDocumentRouting:
    @pytest.mark.parametrize(
        "document_type,filename,content,model",
        [
            (
                "orders",
                "route_orders.csv",
                "Order ID,Order Date,SKU,Gross Amount,Net Amount,Status\n"
                "ORD-R-1,2024-09-01,SKU-R,100,90,Delivered\n",
                Order,
            ),
            (
                "settlements",
                "route_settlements.csv",
                "Settlement ID,Settlement Date,Order Reference,Gross Amount,"
                "Commission,Net Settlement\n"
                "PAY-R-1,2024-09-01,ORD-R-1,100,10,90\n",
                Settlement,
            ),
            (
                "cod_remittances",
                "route_cod.csv",
                "Remittance ID,Remittance Date,Order Reference,COD Amount,"
                "Remitted Amount,UTR Number,Status\n"
                "REM-R-1,2024-09-02,ORD-R-1,100,100,UTR-R-1,Remitted\n",
                CODRemittance,
            ),
            (
                "freight_records",
                "route_freight.csv",
                "Invoice ID,Invoice Date,Order Reference,AWB Number,Zone,"
                "Weight (kg),Charged Weight (kg),Freight Amount,Total Freight\n"
                "INV-R-1,2024-09-03,ORD-R-1,AWB-R-1,A,1.0,1.2,80,80\n",
                FreightRecord,
            ),
            (
                "returns",
                "route_returns.csv",
                "Return ID,Return Date,Order Reference,Return Status,Refund Amount,"
                "Refund Status\n"
                "RET-R-1,2024-09-04,ORD-R-1,Received,90,Processed\n",
                None,  # Return imported lazily below
            ),
            (
                "warehouse_scans",
                "route_scans.csv",
                "Scan ID,Scan Date,Order Reference,Scan Type,Status,Location\n"
                "SCN-R-1,2024-09-05,ORD-R-1,RECEIVED,Success,WH-1\n",
                WarehouseScan,
            ),
        ],
    )
    def test_routes_to_correct_table(
        self,
        client: TestClient,
        headers: dict[str, str],
        partner,
        document_type,
        filename,
        content,
        model,
    ):
        if model is None:
            from app.models.order import Return

            model = Return
        upload, _ = _upload_and_approve(
            client, headers, content.encode(), filename, document_type
        )
        assert upload["status"] == "processed", upload
        assert upload["processed_count"] == 1

        from app.database.connection import get_db

        db = next(client.app.dependency_overrides[get_db]())
        try:
            row = db.query(model).filter(model.upload_id == upload["id"]).one()
            assert str(row.org_id) == str(partner.org_id)
            assert str(row.upload_id) == upload["id"]
        finally:
            db.close()
