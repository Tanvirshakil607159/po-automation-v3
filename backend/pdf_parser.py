"""PDF table extraction using pdfplumber with smart header detection.
   Stops at Terms & Conditions and skips irrelevant LC/shipping tables."""

import pdfplumber
import re
from io import BytesIO

# Keywords to identify the ACCESSORIES header row
HEADER_KEYWORDS = [
    "style", "item", "description", "material", "size", "qty",
    "quantity", "order", "color", "colour", "unit", "uom",
    "article", "code", "name", "spec", "specification", "ratio",
    "s/l", "sl", "serial", "no", "po", "buyer", "supplier",
]

# If ANY cell in a row contains these → STOP scraping entirely
# (everything after T&C is not accessories data)
STOP_KEYWORDS = [
    "terms & conditions", "terms and conditions", "terms&conditions",
    "terms & condition", "terms and condition",
    "t&c", "t & c",
]

# Irrelevant fields — skip individual rows containing these
SKIP_KEYWORDS = [
    "transshipment", "shippedby", "shipped by",
    "advisingbank", "advising bank",
    "applicantbank", "applicant bank",
    "beneficiary bank", "negotiating bank", "issuing bank",
    "port of loading", "port of discharge", "port of shipment",
    "country of origin", "country of destination",
    "latest ship date", "latest shipment date", "expiry date",
    "payment terms", "incoterm",
    "documentary credit", "partial shipment",
    "tenor of draft",
]


def _clean_text(text: str | None) -> str:
    """Normalize whitespace in a cell value."""
    if text is None:
        return ""
    return re.sub(r"\s+", " ", str(text)).strip()


def _is_header_row(row: list[str]) -> bool:
    """Check if a row looks like an accessories header based on keyword matches."""
    cleaned = [_clean_text(c).lower() for c in row]
    matches = sum(
        1 for c in cleaned if any(kw in c for kw in HEADER_KEYWORDS)
    )
    return matches >= 2


def _normalize_header(header: str) -> str:
    """Create a clean, consistent column name."""
    h = _clean_text(header)
    if not h:
        return "unnamed"
    return h


def _row_contains_stop_keyword(cells: list[str]) -> bool:
    """Check if any cell in the row signals we should STOP scraping (e.g. T&C)."""
    for cell in cells:
        t = cell.lower().strip()
        for kw in STOP_KEYWORDS:
            if kw in t:
                return True
    return False


def _should_skip_cell_text(text: str) -> bool:
    """Check if text contains any irrelevant LC/shipping keyword."""
    t = re.sub(r"[\s_]+", " ", text.lower().strip())
    t_nospace = re.sub(r"\s+", "", t)
    for kw in SKIP_KEYWORDS:
        kw_nospace = kw.replace(" ", "")
        if kw in t or kw_nospace in t_nospace:
            return True
    return False


def _should_skip_raw_row(cells: list[str]) -> bool:
    """Check if any cell in a raw row contains skip keywords."""
    for cell in cells:
        if _should_skip_cell_text(cell):
            return True
    return False


def extract_tables_from_pdf(file_bytes: bytes) -> list[dict]:
    """
    Extract only the accessories table from a PDF.
    
    - Auto-detects the header row
    - Stops scraping at Terms & Conditions
    - Skips irrelevant LC/shipping/banking rows
    """
    all_rows = []
    headers = None
    stop_scraping = False

    with pdfplumber.open(BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            if stop_scraping:
                break

            tables = page.extract_tables()
            for table in tables:
                if stop_scraping:
                    break
                if not table:
                    continue

                for row in table:
                    cleaned_row = [_clean_text(c) for c in row]

                    # Skip empty rows
                    if all(c == "" for c in cleaned_row):
                        continue

                    # STOP if we hit Terms & Conditions
                    if _row_contains_stop_keyword(cleaned_row):
                        stop_scraping = True
                        break

                    # Skip irrelevant LC/shipping/banking rows
                    if _should_skip_raw_row(cleaned_row):
                        continue

                    # Detect header row
                    if headers is None and _is_header_row(cleaned_row):
                        headers = [_normalize_header(c) for c in cleaned_row]
                        continue

                    # If we haven't found headers yet, skip
                    if headers is None:
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
