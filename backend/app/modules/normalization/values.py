"""Deterministic value parsers for normalized financial data.

All parsers are total: invalid input returns ``None`` so callers can record a
row-level rejection reason instead of crashing a whole import.
"""
from __future__ import annotations

import math
import re
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any

try:  # pandas depends on python-dateutil, so this is available transitively
    from dateutil import parser as _dateutil_parser
except ImportError:  # pragma: no cover - defensive fallback
    _dateutil_parser = None


_BLANK_VALUES = {
    "",
    "-",
    "--",
    "—",
    "n/a",
    "na",
    "null",
    "none",
    "nan",
    "nil",
}

_CURRENCY_RE = re.compile(r"(?i)(?:₹|rs\.?|inr|usd|eur|gbp|\$|€|£)")
_ORDINAL_RE = re.compile(r"(\d+)(st|nd|rd|th)\b", re.IGNORECASE)
_WHITESPACE_RE = re.compile(r"\s+")

_DATE_FORMATS = (
    "%Y-%m-%d",
    "%Y/%m/%d",
    "%Y.%m.%d",
    "%Y%m%d",
    "%d-%m-%Y",
    "%d/%m/%Y",
    "%d.%m.%Y",
    "%d-%m-%y",
    "%d/%m/%y",
    "%d %b %Y",
    "%d %B %Y",
    "%d-%b-%Y",
    "%d-%B-%Y",
    "%d %b %y",
    "%d-%b-%y",
    "%b %d, %Y",
    "%B %d, %Y",
    "%b %d %Y",
    "%B %d %Y",
    "%b %d, %y",
    "%d %b %Y %H:%M:%S",
    "%d/%m/%Y %H:%M:%S",
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%dT%H:%M:%S",
    "%d %B %Y %I:%M %p",
    "%d %b %Y %I:%M %p",
)


def is_blank(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, float) and math.isnan(value):
        return True
    if isinstance(value, str):
        return value.strip().replace("\u00a0", " ").lower() in _BLANK_VALUES
    return False


def clean_text(value: Any, max_length: int | None = None) -> str | None:
    if is_blank(value):
        return None
    text = str(value).replace("\ufeff", "").strip()
    text = _WHITESPACE_RE.sub(" ", text)
    if not text:
        return None
    return text[:max_length] if max_length else text


def normalize_id(value: Any, max_length: int = 100) -> str | None:
    """Trim identifiers without changing their meaningful case.

    Marketplace references are case-sensitive in practice (``ORD-amzn-10001``),
    so we only remove surrounding noise, never uppercase the value.
    """
    if is_blank(value):
        return None
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    text = str(value).replace("\ufeff", "").strip().strip('"').strip("'")
    text = _WHITESPACE_RE.sub(" ", text)
    if not text or text.lower() in _BLANK_VALUES:
        return None
    return text[:max_length]


def parse_decimal(value: Any, places: int = 2) -> Decimal | None:
    """Parse money/weight values containing ₹, Rs., commas and parentheses."""
    if is_blank(value):
        return None
    if isinstance(value, Decimal):
        parsed = value
    elif isinstance(value, int):
        parsed = Decimal(value)
    elif isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        parsed = Decimal(str(value))
    else:
        text = str(value).replace("\u00a0", " ").strip()
        negative = text.startswith("(") and text.endswith(")")
        if negative:
            text = text[1:-1]
        text = _CURRENCY_RE.sub("", text)
        text = text.replace(",", "").replace("_", "").strip()
        text = re.sub(r"(?i)\bonly\b", "", text).strip()
        # Space-grouped amounts (e.g. "1 23 456.78") are common in exports.
        if re.fullmatch(r"[+-]?\d{1,3}(?: \d{2,3})+(?:\.\d+)?", text):
            text = text.replace(" ", "")
        if text.endswith("%"):
            text = text[:-1].strip()
        if text in {"", "-", "--"}:
            return None
        try:
            parsed = Decimal(text)
        except InvalidOperation:
            return None
        if negative:
            parsed = -parsed
    try:
        quantum = Decimal(1).scaleb(-places)
        return parsed.quantize(quantum, rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError):
        return None


def parse_int(value: Any) -> int | None:
    parsed = parse_decimal(value, places=0)
    if parsed is None:
        return None
    try:
        return int(parsed)
    except (OverflowError, ValueError):
        return None


def parse_date(value: Any) -> date | None:
    """Parse common Indian marketplace date formats and Excel serial dates."""
    if is_blank(value):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        number = float(value)
        if 20_000 <= number <= 80_000:  # Excel 1900 date system
            return (datetime(1899, 12, 30) + timedelta(days=int(number))).date()
        if 19_000_101 <= number <= 21_001_231:  # YYYYMMDD numeric
            text = str(int(number))
            try:
                return datetime.strptime(text, "%Y%m%d").date()
            except ValueError:
                return None
        return None

    text = str(value).replace("\ufeff", "").strip()
    if not text:
        return None

    # Try explicit formats first (deterministic and day-first for India).
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue

    # Normalise 15th September 2024 / 15-Sep-24 / 15.09.2024
    candidate = _ORDINAL_RE.sub(r"\1", text)
    if re.fullmatch(r"\d{1,2}[./-]\d{1,2}[./-]\d{2,4}", candidate):
        candidate = candidate.replace(".", "/").replace("-", "/")
    candidate = re.sub(r"\s+", " ", candidate).strip()

    if _dateutil_parser is not None:
        try:
            return _dateutil_parser.parse(
                candidate,
                dayfirst=True,
                fuzzy=False,
                default=datetime(2000, 1, 1),
            ).date()
        except (ValueError, OverflowError, TypeError):
            pass
    return None


def normalise_key(value: str) -> str:
    """Normalise a status/enum-like value for lookup."""
    return re.sub(r"[\s\-]+", "_", str(value).strip().lower())


def map_enum(value: Any, mapping: dict[str, Any], default: Any = None) -> Any:
    if is_blank(value):
        return default
    return mapping.get(normalise_key(value), default)
