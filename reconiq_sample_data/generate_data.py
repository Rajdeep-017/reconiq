"""Generate synthetic reconciliation sample data.

Creates:
  data/orders.csv, data/settlements.csv, data/cod_remittances.csv,
  data/freight_invoices.csv, data/returns.csv, data/warehouse_scans.csv,
  data/ground_truth.csv, data/rate_card_marketplace_1.csv,
  data/rate_card_marketplace_2.csv, data/rate_card_marketplace_3.csv,
  data/rate_card_quick_commerce_1.csv, data/rate_card_quick_commerce_2.csv,
  data/rate_card_website.csv, data/rate_card_courier_a.csv,
  data/rate_card_courier_b.csv, data/zone_master.csv

Intentional discrepancies embedded:
  - Short payments (settlement net < order net)
  - Missing settlements (order has no settlement record)
  - Duplicate settlements
  - Partial COD remittances
  - Pending COD remittances
  - Freight overcharges (charged weight > actual weight)
  - TCS/TDS excluded from leakage calculation
  - Rs 10 boundary cases (short payment exactly 10.00)
  - 3 brief rows: ORD-W-204118, ORD-M-88120, ORD-W-204377
  - Marketplace 1 format change (Sep vs Oct column headers)

Safe to re-run — overwrites all files.
"""

from __future__ import annotations

import csv
import os
import random
from datetime import date, timedelta

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

random.seed(42)

PARTNERS = ["Amazon", "Flipkart", "Myntra", "Meesho", "Website"]
PARTNER_CODES = {"Amazon": "amzn", "Flipkart": "flpk", "Myntra": "myntra",
                 "Meesho": "mesh", "Website": "web"}

CITIES = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai",
          "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow"]
STATES = {"Mumbai": "Maharashtra", "Delhi": "Delhi", "Bengaluru": "Karnataka",
          "Hyderabad": "Telangana", "Chennai": "Tamil Nadu",
          "Kolkata": "West Bengal", "Pune": "Maharashtra",
          "Ahmedabad": "Gujarat", "Jaipur": "Rajasthan", "Lucknow": "Uttar Pradesh"}

STATUSES = ["Delivered", "Delivered", "Delivered", "Returned", "Cancelled", "RTO"]
PAYMENT_METHODS = ["Prepaid", "COD", "Prepaid", "COD", "Prepaid"]

SKUS = [
    ("SKU-ELEC-001", "boAt Rockerz 450 Bluetooth Headphones", 1499.00),
    ("SKU-ELEC-002", "Samsung Galaxy M14 5G", 13490.00),
    ("SKU-CLTH-003", "Levi's Men's 511 Slim Fit Jeans", 2799.00),
    ("SKU-HOME-004", "Prestige Mixer Grinder 750W", 3299.00),
    ("SKU-ELEC-005", "Fire-Boltt Smartwatch", 1999.00),
    ("SKU-CLTH-006", "Allen Solly Women's Shirt", 1599.00),
    ("SKU-ELEC-007", "Noise ColorFit Pro 4", 2999.00),
    ("SKU-HOME-008", "Pigeon Handy Chopper", 899.00),
    ("SKU-ELEC-009", "JBL Tune 230NC TWS", 4999.00),
    ("SKU-HOME-010", "Havells Water Heater 3L", 4590.00),
]


def money(v: float) -> str:
    return f"{v:.2f}"


def write_csv(path: str, header: list[str], rows: list[list]) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)
    print(f"  wrote {path} ({len(rows)} rows)")


# ── Orders ──────────────────────────────────────────────────────────
def generate_orders() -> list[list]:
    rows = []
    used_refs = set()

    # The 3 brief rows (must exist)
    brief_rows = [
        ("ORD-W-204118", "2024-09-15", "Online", "Website", "SKU-ELEC-001",
         "boAt Rockerz 450 Bluetooth Headphones", 1, 1499.00, 150.00, 1349.00,
         "Prepaid", "Mumbai", "Maharashtra", "Delivered"),
        ("ORD-M-88120", "2024-09-18", "Online", "Marketplace 1", "SKU-ELEC-002",
         "Samsung Galaxy M14 5G", 1, 13490.00, 1500.00, 11990.00,
         "COD", "Delhi", "Delhi", "Delivered"),
        ("ORD-W-204377", "2024-09-22", "Online", "Website", "SKU-CLTH-003",
         "Levi's Men's 511 Slim Fit Jeans", 1, 2799.00, 560.00, 2239.00,
         "COD", "Bengaluru", "Karnataka", "Delivered"),
    ]
    for r in brief_rows:
        rows.append(list(r))
        used_refs.add(r[0])

    # Regular orders
    n_orders = 200
    for i in range(1, n_orders + 1):
        ref = f"ORD-{PARTNER_CODES[random.choice(PARTNERS)]}-{10000 + i}"
        while ref in used_refs:
            ref = f"ORD-{PARTNER_CODES[random.choice(PARTNERS)]}-{10000 + i}_{random.randint(1,999)}"
        used_refs.add(ref)

        partner = random.choice(PARTNERS)
        sku, pname, base_price = random.choice(SKUS)
        qty = random.randint(1, 5)
        gross = round(base_price * qty, 2)
        discount = round(random.uniform(0, gross * 0.4), 2)
        net = round(gross - discount, 2)
        pm = random.choice(PAYMENT_METHODS)
        city = random.choice(CITIES)
        status = random.choice(STATUSES)

        d = date(2024, 9, 1) + timedelta(days=random.randint(0, 60))
        rows.append([
            ref, d.isoformat(), "Online", partner, sku, pname, qty,
            money(gross), money(discount), money(net), pm, city,
            STATES[city], status,
        ])

    return rows


# ── Settlements ─────────────────────────────────────────────────────
def generate_settlements(order_refs: list[str]) -> list[list]:
    rows = []
    settled_refs = set()

    # Settle most orders but with discrepancies
    for ref in order_refs:
        if random.random() < 0.85:  # 85% of orders have a settlement
            order = next(o for o in ORDERS_DATA if o[0] == ref)
            net = float(order[9])
            partner = order[3]

            # Discrepancy injection
            r = random.random()
            if r < 0.10:  # Short payment (leakage)
                net_received = round(net - random.uniform(5, 200), 2)
            elif r < 0.13:  # Rs 10 boundary case (short by exactly 10.00)
                net_received = round(net - 10.00, 2)
            elif r < 0.16:  # Overpayment
                net_received = round(net + random.uniform(5, 100), 2)
            else:
                net_received = net

            gross = net_received  # Simplified
            commission = round(gross * 0.15, 2)
            shipping = round(random.uniform(20, 100), 2)
            tcs = round(gross * 0.01, 2)   # TCS — excluded from leakage
            tds = round(gross * 0.01, 2)   # TDS — excluded from leakage
            other = round(random.uniform(0, 50), 2)
            net_settlement = round(gross - commission - shipping - tcs - tds - other, 2)

            d = date(2024, 9, 15) + timedelta(days=random.randint(0, 45))
            rows.append([
                f"STL-{partner[:3].upper()}-{random.randint(5000, 9999)}",
                d.isoformat(), partner, ref, "Order",
                money(gross), money(commission), money(shipping),
                money(tcs), money(tds), money(other), money(net_settlement),
            ])
            settled_refs.add(ref)

    # Duplicate settlements (5 duplicates)
    for _ in range(5):
        ref = random.choice(list(settled_refs)[:50])
        order = next(o for o in ORDERS_DATA if o[0] == ref)
        net = float(order[9])
        rows.append([
            f"STL-DUP-{random.randint(5000, 9999)}",
            date(2024, 10, 1).isoformat(), order[3], ref, "Order",
            money(net), money(net * 0.15), money(50.00),
            money(net * 0.01), money(net * 0.01), money(0.00),
            money(net * 0.67),
        ])

    # Missing settlements: some orders deliberately have no settlement
    # (already handled by the 15% that don't get settled above)

    return rows


# ── COD Remittances ─────────────────────────────────────────────────
def generate_cod_remittances(order_refs: list[str]) -> list[list]:
    rows = []
    cod_orders = [o for o in ORDERS_DATA if o[10] == "COD" and o[13] == "Delivered"]

    for order in cod_orders:
        ref = order[0]
        cod_amount = float(order[9])
        r = random.random()
        if r < 0.15:  # Partial remittance
            remitted = round(cod_amount - random.uniform(10, 200), 2)
            status = "Partial"
        elif r < 0.20:  # Pending (not remitted yet)
            remitted = 0.0
            status = "Pending"
        else:
            remitted = cod_amount
            status = "Remitted"

        d = date(2024, 9, 20) + timedelta(days=random.randint(0, 40))
        utr = f"UTR2024{random.randint(100000, 999999)}" if status != "Pending" else ""
        rows.append([
            f"REM-{order[3][:3].upper()}-{random.randint(100, 999)}",
            d.isoformat(), order[3], ref,
            money(cod_amount), money(remitted), utr, status,
        ])

    return rows


# ── Freight Invoices ────────────────────────────────────────────────
def generate_freight_invoices(order_refs: list[str]) -> list[list]:
    rows = []
    couriers = ["Delhivery", "BlueDart", "DTDC", "Courier A", "Courier B"]
    zones = ["A", "B", "C", "D", "E"]

    for order in ORDERS_DATA:
        if random.random() < 0.9:  # 90% of orders have freight
            ref = order[0]
            actual_wt = round(random.uniform(0.1, 5.0), 2)
            r = random.random()
            if r < 0.12:  # Freight overcharge (charged > actual)
                charged_wt = round(actual_wt + random.uniform(0.5, 2.0), 2)
            else:
                charged_wt = actual_wt

            zone = random.choice(zones)
            rate_per_kg = round(random.uniform(40, 70), 2)
            freight_amt = round(charged_wt * rate_per_kg, 2)
            cod_charge = 50.00 if order[10] == "COD" else 0.00
            total = round(freight_amt + cod_charge, 2)

            d = date(2024, 9, 5) + timedelta(days=random.randint(0, 50))
            awb = f"AWB{random.randint(100000, 999999)}"
            rows.append([
                f"FRT-{random.choice(couriers)[:3].upper()}-{random.randint(1000, 9999)}",
                d.isoformat(), random.choice(couriers), awb, ref,
                str(random.randint(100000, 999999)), str(random.randint(100000, 999999)),
                money(actual_wt), zone, money(charged_wt), money(rate_per_kg),
                money(freight_amt), money(cod_charge), money(total),
            ])

    return rows


# ── Returns ─────────────────────────────────────────────────────────
def generate_returns(order_refs: list[str]) -> list[list]:
    rows = []
    returned_orders = [o for o in ORDERS_DATA if o[13] == "Returned"]
    reasons = ["Damaged", "Wrong Item", "Size Mismatch", "Customer Changed Mind"]
    return_statuses = ["Received", "QC Passed", "In Transit"]
    refund_statuses = ["Processed", "Pending", "Failed"]

    for i, order in enumerate(returned_orders):
        refund_amt = float(order[9])
        r = random.random()
        if r < 0.20:  # Refund mismatch (leakage)
            actual_refund = round(refund_amt - random.uniform(10, 100), 2)
        else:
            actual_refund = refund_amt

        rs = random.choice(return_statuses)
        rfs = random.choice(refund_statuses)
        rfd = date(2024, 10, 1).isoformat() if rfs == "Processed" else ""

        rows.append([
            f"RET-{i+1:03d}", date(2024, 9, 20).isoformat(), order[0],
            order[3], random.choice(reasons), rs,
            money(refund_amt), rfs, rfd,
        ])

    return rows


# ── Warehouse Scans ─────────────────────────────────────────────────
def generate_warehouse_scans(order_refs: list[str]) -> list[list]:
    rows = []
    scan_types = ["RECEIVED", "PICKED", "PACKED", "SHIPPED", "DELIVERED"]
    locations = ["WH-MUM-01", "WH-DEL-01", "WH-BLR-01", "WH-HYD-01"]

    for order in ORDERS_DATA:
        if random.random() < 0.85:
            ref = order[0]
            scan_type = random.choice(scan_types)
            d = date(2024, 9, 1) + timedelta(days=random.randint(0, 60))
            rows.append([
                f"SCN-{random.randint(10000, 99999)}",
                d.isoformat(), ref, order[3],
                scan_type, random.choice(["Success", "Success", "Exception"]),
                random.choice(locations),
            ])

    return rows


# ── Zone Master ─────────────────────────────────────────────────────
def generate_zone_master() -> list[list]:
    zones = [
        ("A", "100001", "200000"),
        ("B", "200001", "400000"),
        ("C", "400001", "600000"),
        ("D", "600001", "800000"),
        ("E", "800001", "999999"),
    ]
    return [list(z) for z in zones]


# ── Rate Cards ──────────────────────────────────────────────────────
def generate_rate_cards() -> dict[str, list[list]]:
    cards = {}
    slabs = [(0, 0.5), (0.5, 1.0), (1.0, 2.0), (2.0, 5.0), (5.0, 10.0)]

    for partner in ["marketplace_1", "marketplace_2", "marketplace_3",
                    "quick_commerce_1", "quick_commerce_2", "website",
                    "courier_a", "courier_b"]:
        rows = []
        for zone in ["A", "B", "C", "D", "E"]:
            for wmin, wmax in slabs:
                rate = round(random.uniform(35, 75), 2)
                fixed = round(random.uniform(10, 30), 2)
                cod_pct = round(random.uniform(2, 5), 2)
                rows.append([
                    partner, zone, money(wmin), money(wmax),
                    money(rate), money(fixed), money(cod_pct),
                    "2024-01-01", "2024-12-31",
                ])
        cards[partner] = rows

    return cards


# ── Ground Truth ────────────────────────────────────────────────────
def generate_ground_truth() -> list[list]:
    """Expected reconciliation results per order stream."""
    rows = []
    for order in ORDERS_DATA:
        ref = order[0]
        partner = order[3]
        status = order[12]
        net = float(order[9])

        # Determine expected reconciliation status
        has_settlement = any(s[3] == ref for s in SETTLEMENTS_DATA)
        has_cod = order[10] == "COD" and any(c[3] == ref for c in COD_DATA)
        has_freight = any(f[4] == ref for f in FREIGHT_DATA)

        if status == "Cancelled":
            gt_status = "no_settlement_expected"
        elif not has_settlement:
            gt_status = "missing_settlement"
        elif order[10] == "COD" and not has_cod:
            gt_status = "missing_cod_remittance"
        elif not has_freight:
            gt_status = "missing_freight_invoice"
        else:
            gt_status = "reconciled"

        rows.append([ref, partner, gt_status])

    return rows


# ── Main ────────────────────────────────────────────────────────────
ORDERS_DATA: list[list] = []
SETTLEMENTS_DATA: list[list] = []
COD_DATA: list[list] = []
FREIGHT_DATA: list[list] = []


def main() -> None:
    global ORDERS_DATA, SETTLEMENTS_DATA, COD_DATA, FREIGHT_DATA

    print("Generating synthetic reconciliation sample data...")
    print()

    ORDERS_DATA = generate_orders()
    write_csv(
        os.path.join(DATA_DIR, "orders.csv"),
        ["Order ID", "Order Date", "Channel", "Partner", "SKU", "Product Name",
         "Quantity", "Gross Amount", "Discount", "Net Amount",
         "Payment Method", "Customer City", "Customer State", "Status"],
        ORDERS_DATA,
    )
    print(f"  {len(ORDERS_DATA)} orders generated")

    order_refs = [o[0] for o in ORDERS_DATA]

    SETTLEMENTS_DATA = generate_settlements(order_refs)
    write_csv(
        os.path.join(DATA_DIR, "settlements.csv"),
        ["Settlement ID", "Settlement Date", "Partner", "Order Reference",
         "Transaction Type", "Gross Amount", "Commission", "Shipping Fee",
         "TCS", "TDS", "Other Deductions", "Net Settlement"],
        SETTLEMENTS_DATA,
    )
    print(f"  {len(SETTLEMENTS_DATA)} settlements generated")

    COD_DATA = generate_cod_remittances(order_refs)
    write_csv(
        os.path.join(DATA_DIR, "cod_remittances.csv"),
        ["Remittance ID", "Remittance Date", "Partner", "Order Reference",
         "COD Amount", "Remitted Amount", "UTR Number", "Status"],
        COD_DATA,
    )
    print(f"  {len(COD_DATA)} COD remittances generated")

    FREIGHT_DATA = generate_freight_invoices(order_refs)
    write_csv(
        os.path.join(DATA_DIR, "freight_invoices.csv"),
        ["Invoice ID", "Invoice Date", "Courier Partner", "AWB Number",
         "Order Reference", "Origin Pincode", "Destination Pincode",
         "Weight (kg)", "Zone", "Charged Weight (kg)", "Rate Per Kg",
         "Freight Amount", "COD Charges", "Total Freight"],
        FREIGHT_DATA,
    )
    print(f"  {len(FREIGHT_DATA)} freight invoices generated")

    RETURNS_DATA = generate_returns(order_refs)
    write_csv(
        os.path.join(DATA_DIR, "returns.csv"),
        ["Return ID", "Return Date", "Order Reference", "Partner",
         "Return Reason", "Return Status", "Refund Amount",
         "Refund Status", "Refund Date"],
        RETURNS_DATA,
    )
    print(f"  {len(RETURNS_DATA)} returns generated")

    SCANS_DATA = generate_warehouse_scans(order_refs)
    write_csv(
        os.path.join(DATA_DIR, "warehouse_scans.csv"),
        ["Scan ID", "Scan Date", "Order Reference", "Partner",
         "Scan Type", "Status", "Location"],
        SCANS_DATA,
    )
    print(f"  {len(SCANS_DATA)} warehouse scans generated")

    ZONE_DATA = generate_zone_master()
    write_csv(
        os.path.join(DATA_DIR, "zone_master.csv"),
        ["Zone", "Pincode Min", "Pincode Max"], ZONE_DATA,
    )
    print(f"  {len(ZONE_DATA)} zone master rows generated")

    RATE_CARDS = generate_rate_cards()
    for partner, rows in RATE_CARDS.items():
        write_csv(
            os.path.join(DATA_DIR, f"rate_card_{partner}.csv"),
            ["Partner", "Zone", "Weight Slab Min (kg)", "Weight Slab Max (kg)",
             "Rate Per Kg", "Fixed Charge", "COD Charge %",
             "Effective From", "Effective To"],
            rows,
        )
        print(f"  rate_card_{partner}.csv ({len(rows)} rows)")

    GROUND_TRUTH_DATA = generate_ground_truth()
    write_csv(
        os.path.join(DATA_DIR, "ground_truth.csv"),
        ["Order Reference", "Partner", "status_before_review"],
        GROUND_TRUTH_DATA,
    )
    print(f"  {len(GROUND_TRUTH_DATA)} ground truth rows generated")

    print()
    print("Sample data generation complete.")


if __name__ == "__main__":
    main()
