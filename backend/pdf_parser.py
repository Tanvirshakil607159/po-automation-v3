"""PDF table extraction using pdfplumber with smart header detection."""

import pdfplumber
import re
from io import BytesIO

# Keywords to identify header rows
HEADER_KEYWORDS = [
    "style", "item", "description", "material", "size", "qty",
    "quantity", "order", "color", "colour", "unit", "uom",
    "article", "code", "name", "spec", "specification", "ratio",
    "s/l", "sl", "serial", "no", "po", "buyer", "supplier",
]


def _clean_text(text: str | None) -> str:
    """Normalize whitespace in a cell value."""
    if text is None:
        return ""
    return re.sub(r"\s+", " ", str(text)).strip()


def _is_header_row(row: list[str]) -> bool:
    """Check if a row looks like a header based on keyword matches."""
    cleaned = [_clean_text(c).lower() for c in row]
    matches = sum(
        1 for c in cleaned if any(kw in c for kw in HEADER_KEYWORDS)
    )
    # At least 2 keyword matches in the row
    return matches >= 2


def _normalize_header(header: str) -> str:
    """Create a clean, consistent column name."""
    h = _clean_text(header)
    if not h:
        return "unnamed"
    return h


def extract_tables_from_pdf(file_bytes: bytes) -> list[dict]:
    """
    Extract all tables from a PDF and return a list of row dictionaries.
    
    Handles multi-page PDFs, auto-detects header rows, and skips empty rows.
    """
    all_rows = []
    headers = None

    with pdfplumber.open(BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                if not table:
                    continue

                for row in table:
                    cleaned_row = [_clean_text(c) for c in row]

                    # Skip empty rows
                    if all(c == "" for c in cleaned_row):
                        continue

                    # Detect header row
                    if headers is None and _is_header_row(cleaned_row):
                        headers = [_normalize_header(c) for c in cleaned_row]
                        continue

                    # If we haven't found headers yet, try first non-empty row
                    if headers is None:
                        headers = [_normalize_header(c) for c in cleaned_row]
                        continue

                    # Build row dict, padding if needed
                    row_dict = {}
                    for i, h in enumerate(headers):
                        val = cleaned_row[i] if i < len(cleaned_row) else ""
                        row_dict[h] = val

                    # Skip rows where all values are empty
                    if all(v == "" for v in row_dict.values()):
                        continue

                    all_rows.append(row_dict)

    return all_rows
