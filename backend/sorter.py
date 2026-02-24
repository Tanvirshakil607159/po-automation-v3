"""Anti-Gravity Sorting Logic — two-level grouping: PO Number → Item Category.
   Sewing thread items are further sub-grouped by color.
   Filters out rows with invalid/irrelevant PO values."""

import re

# Keywords that likely indicate the PO number grouping column
PO_COLUMN_KEYWORDS = [
    "po number", "po no", "po#", "po #", "purchase order",
    "order no", "order number", "order #", "order",
    "po", "p.o.", "p.o",
]

# Keywords that likely indicate the item/material grouping column
ITEM_COLUMN_KEYWORDS = [
    "item description", "item name", "material name", "material",
    "description", "item", "accessory", "accessories", "trim",
    "trims", "component", "article name", "article description",
    "particular", "particulars",
]

# Keywords that indicate a color column
COLOR_COLUMN_KEYWORDS = [
    "color", "colour", "color name", "colour name",
    "color code", "colour code", "shade", "dye",
    "thread color", "thread colour",
]

# Keywords that identify sewing thread items
THREAD_KEYWORDS = [
    "sewing thread", "thread", "sewing", "s/thread", "s.thread",
    "polyester thread", "cotton thread", "nylon thread",
    "embroidery thread",
]

# ── Common garment/textile colors for extraction from text ──────────────
KNOWN_COLORS = [
    # Basic colors
    "white", "black", "red", "blue", "green", "yellow", "orange", "purple",
    "pink", "brown", "grey", "gray", "beige", "cream", "ivory", "navy",
    "maroon", "burgundy", "wine", "olive", "khaki", "tan", "gold", "silver",
    # Extended garment colors
    "off white", "off-white", "natural", "ecru", "charcoal", "dark grey",
    "light grey", "dark gray", "light gray", "sky blue", "royal blue",
    "baby blue", "navy blue", "dark blue", "light blue", "cobalt",
    "teal", "turquoise", "aqua", "cyan", "mint", "sage",
    "dark green", "light green", "forest green", "lime", "emerald",
    "hot pink", "light pink", "baby pink", "magenta", "fuchsia", "rose",
    "coral", "salmon", "peach", "rust", "copper", "bronze",
    "dark red", "light red", "crimson", "scarlet",
    "dark brown", "light brown", "chocolate", "coffee", "camel",
    "lavender", "lilac", "violet", "plum", "mauve",
    "lemon", "mustard", "amber", "canary",
    "neon green", "neon pink", "neon orange", "neon yellow",
    "fluorescent", "fl. green", "fl. orange", "fl. yellow", "fl. pink",
    # Neutral/mixed
    "multi", "multicolor", "multi-color", "assorted", "mixed",
    "transparent", "clear",
]

# Sort by length (longest first) so "off white" matches before "white"
KNOWN_COLORS.sort(key=len, reverse=True)

# Compile a regex pattern for color matching
_COLOR_PATTERN = re.compile(
    r'\b(' + '|'.join(re.escape(c) for c in KNOWN_COLORS) + r')\b',
    re.IGNORECASE
)

# ── PO Validation ───────────────────────────────────────────────────────
JUNK_PO_KEYWORDS = [
    "cash", "sample", "test", "n/a", "na", "nil", "none", "unknown",
    "total", "grand total", "sub total", "subtotal", "sum",
    "header", "footer", "note", "remark", "remarks", "comment",
    "page", "date", "signature", "approved", "prepared",
    "uncategorized", "misc", "miscellaneous", "other", "others",
    "blank", "tba", "tbd", "pending", "-", "--", "---", ".",
]

VALID_PO_PATTERN = re.compile(r"\d")


def _is_valid_po(value: str) -> bool:
    """Check if a value looks like a real PO/Order number."""
    v = value.strip().lower()
    if not v or len(v) < 1:
        return False
    if v in JUNK_PO_KEYWORDS:
        return False
    for junk in JUNK_PO_KEYWORDS:
        if v.startswith(junk + " ") or v.startswith(junk + ":"):
            return False
    if not VALID_PO_PATTERN.search(v):
        return False
    return True


def _find_column_by_keywords(headers: list[str], keywords: list[str]) -> str | None:
    """Find the best matching column from a list of keywords."""
    header_lower = {h: h.lower().strip() for h in headers}

    for h, h_low in header_lower.items():
        for kw in keywords:
            if h_low == kw:
                return h

    for h, h_low in header_lower.items():
        for kw in keywords:
            if kw in h_low or h_low in kw:
                return h

    return None


def _is_thread_item(category_name: str) -> bool:
    """Check if a category name refers to sewing thread."""
    cat_low = category_name.lower()
    for kw in THREAD_KEYWORDS:
        if kw in cat_low:
            return True
    return False


def _extract_color_from_text(text: str) -> str | None:
    """Extract a color name from free text using known color list."""
    match = _COLOR_PATTERN.search(text)
    if match:
        return match.group(1).title()
    return None


def _extract_color(row: dict, color_col: str | None, item_col: str | None) -> str:
    """
    Extract color from a row using multiple strategies:
    1. Dedicated color column
    2. Any column with 'color/colour/shade' in its name
    3. Parse color name from the item description text
    4. Parse color from ALL cell values in the row
    """
    # Strategy 1: Dedicated color column
    if color_col:
        val = str(row.get(color_col, "")).strip()
        if val and val.lower() not in ("", "n/a", "na", "-", "none"):
            return val.title()

    # Strategy 2: Columns with color-related names
    for key, value in row.items():
        k_low = key.lower()
        if any(c in k_low for c in ["color", "colour", "shade"]):
            val = str(value).strip()
            if val and val.lower() not in ("", "n/a", "na", "-", "none"):
                return val.title()

    # Strategy 3: Extract color from the item description column
    if item_col:
        desc = str(row.get(item_col, ""))
        color = _extract_color_from_text(desc)
        if color:
            return color

    # Strategy 4: Search ALL cell values for color keywords
    for key, value in row.items():
        val_str = str(value).strip()
        if len(val_str) > 1 and len(val_str) < 50:  # Skip very short or very long values
            color = _extract_color_from_text(val_str)
            if color:
                return color

    return "No Color"


def _normalize_category(value: str) -> str:
    """Clean up category name for tab display."""
    v = re.sub(r"\s+", " ", value).strip()
    if not v:
        return "Uncategorized"
    return v.title()


def _normalize_po(value: str) -> str:
    """Clean up PO number for grouping."""
    v = re.sub(r"\s+", " ", value).strip()
    if not v:
        return ""
    return v


def group_by_item(rows: list[dict]) -> dict:
    """
    Two-level grouping: first by PO Number, then by Item Category.
    Sewing thread items are further sub-grouped by color.
    Rows with invalid PO values are filtered out.
    """
    if not rows:
        return {
            "po_column": None,
            "grouping_column": None,
            "po_groups": {},
            "headers": [],
            "all_categories": [],
            "skipped_rows": 0,
        }

    headers = list(rows[0].keys())
    po_col = _find_column_by_keywords(headers, PO_COLUMN_KEYWORDS)
    grouping_col = _find_column_by_keywords(headers, ITEM_COLUMN_KEYWORDS)
    color_col = _find_column_by_keywords(headers, COLOR_COLUMN_KEYWORDS)

    po_groups: dict[str, dict[str, list[dict]]] = {}
    all_categories_set: set[str] = set()
    skipped = 0

    for row in rows:
        if po_col:
            raw_po = row.get(po_col, "")
            po_val = _normalize_po(raw_po)
            if not _is_valid_po(po_val):
                skipped += 1
                continue
        else:
            po_val = "All Orders"

        if grouping_col:
            cat_val = _normalize_category(row.get(grouping_col, ""))
        else:
            cat_val = "All Items"

        # Sewing thread items → group ALL thread variants by color
        # "Sewing Thread", "Sewing Thread-2", "Sewing Thread 3" all merge
        # into one section named by color, e.g. "Black Sewing Thread"
        if _is_thread_item(cat_val):
            color = _extract_color(row, color_col, grouping_col)
            cat_val = f"{color} Sewing Thread"

        if po_val not in po_groups:
            po_groups[po_val] = {}

        if cat_val not in po_groups[po_val]:
            po_groups[po_val][cat_val] = []

        po_groups[po_val][cat_val].append(row)
        all_categories_set.add(cat_val)

    sorted_po_groups = {}
    for po_key in sorted(po_groups.keys()):
        sorted_po_groups[po_key] = {
            "categories": dict(sorted(po_groups[po_key].items()))
        }

    return {
        "po_column": po_col,
        "grouping_column": grouping_col,
        "po_groups": sorted_po_groups,
        "headers": headers,
        "all_categories": sorted(all_categories_set),
        "skipped_rows": skipped,
    }
