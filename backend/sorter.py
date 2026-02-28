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

# Keywords that indicate a pantone column
PANTONE_COLUMN_KEYWORDS = [
    "pantone", "panton", "pantone no", "pantone code", "pantone ref",
    "pantone number", "pantone #", "pms", "pms no", "pms code",
    "panton no", "panton code",
]

# Keywords that indicate a dimension/size column
DIMENSION_COLUMN_KEYWORDS = [
    "dimension", "dim", "size", "ticket", "count", "measurement"
]

# Keywords that indicate a color column (fallback)
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

# Keywords that identify care label items
CARE_LABEL_KEYWORDS = [
    "care label", "care-label", "c/label", "c.label", "c label"
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


def _find_column_by_keywords(headers: list[str], keywords: list[str], exclude_compound: bool = False) -> str | None:
    """Find the best matching column from a list of keywords.
    If exclude_compound is True, skip columns with compound separators like '--'
    (e.g. 'Order No--Style No' is NOT a PO column)."""
    header_lower = {h: h.lower().strip() for h in headers}

    def _is_compound(h_low: str) -> bool:
        """Check if header looks like a compound/joined field."""
        return "--" in h_low or " - " in h_low or "/" in h_low

    # Pass 1: Exact match
    for h, h_low in header_lower.items():
        if exclude_compound and _is_compound(h_low):
            continue
        for kw in keywords:
            if h_low == kw:
                return h

    # Pass 2: Partial match
    for h, h_low in header_lower.items():
        if exclude_compound and _is_compound(h_low):
            continue
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


def _is_care_label_item(category_name: str) -> bool:
    """Check if a category name refers to a care label."""
    cat_low = category_name.lower()
    for kw in CARE_LABEL_KEYWORDS:
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


def _dedup_pantone(val: str) -> str:
    """Deduplicate repeated pantone values.
    e.g. 'Black PANTONE® 19-4008 TCX-Black PANTONE® 19-4008 TCX' → 'Black PANTONE® 19-4008 TCX'
    """
    v = val.strip()
    # Try splitting by common separators: -, /, |, or just check if first half == second half
    for sep in ["-", "/", "|", ","]:
        if sep in v:
            parts = v.split(sep)
            # Check if all non-empty parts are the same (after stripping)
            cleaned = [p.strip() for p in parts if p.strip()]
            if len(cleaned) >= 2:
                # Check if it's the same value repeated
                first = cleaned[0]
                if all(p == first for p in cleaned):
                    return first
    # Also handle exact duplication without separator (halved string)
    mid = len(v) // 2
    if len(v) > 6 and len(v) % 2 == 0:
        if v[:mid].strip() == v[mid:].strip():
            return v[:mid].strip()
    return v


def _normalize_category(value: str) -> str:
    """Clean up category name for tab display."""
    v = re.sub(r"\s+", " ", value).strip()
    if not v:
        return ""
    return v.title()


# Item values that are actually repeated PDF header rows or irrelevant fields — skip them
JUNK_ITEM_KEYWORDS = [
    "order no--style no", "order no - style no", "order no-style no",
    "accessories", "accessory", "item description", "item name",
    "material name", "material", "description", "particular", "particulars",
    "trims", "sl", "sl no", "sl.", "s/l", "serial",
    # LC / shipping / banking fields (not actual items)
    "transshipment", "trans shipment", "trans-shipment",
    "shippedby", "shipped by", "shipped_by",
    "advisingbank", "advising bank", "advising_bank",
    "applicantbank", "applicant bank", "applicant_bank",
    "beneficiary", "beneficiary bank", "negotiating bank",
    "issuing bank", "issuingbank", "port of loading", "port of discharge",
    "country of origin", "country of destination",
    "latest ship date", "latest shipment date", "expiry date",
    "payment terms", "payment term", "incoterm", "incoterms",
    "lc number", "lc no", "l/c no", "l/c number",
    # Terms & Conditions — not accessories
    "terms and conditions", "terms & conditions", "terms and condition",
    "terms & condition", "terms", "conditions", "condition",
    "terms of delivery", "delivery terms",
]


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
    po_col = _find_column_by_keywords(headers, PO_COLUMN_KEYWORDS, exclude_compound=True)
    grouping_col = _find_column_by_keywords(headers, ITEM_COLUMN_KEYWORDS)
    pantone_col = _find_column_by_keywords(headers, PANTONE_COLUMN_KEYWORDS)
    color_col = _find_column_by_keywords(headers, COLOR_COLUMN_KEYWORDS)
    dimension_col = _find_column_by_keywords(headers, DIMENSION_COLUMN_KEYWORDS)

    po_groups = {}
    all_categories_set = set()
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

        # Skip rows where item name is a repeated PDF header or junk empty values
        if not cat_val:
            skipped += 1
            continue
            
        cat_low = cat_val.lower().strip()
        cat_low_clean = re.sub(r'[^\w\s]', '', cat_low).strip().replace(" ", "")
        
        is_junk = False
        if cat_low in JUNK_ITEM_KEYWORDS or cat_low_clean in [j.replace(" ", "") for j in JUNK_ITEM_KEYWORDS]:
            is_junk = True
        
        # Aggressive substring block for shipping/banking fields that might have messy OCR/parsing
        # We check BOTH the category name AND all other cell values in the row
        junk_kws = [
            "advisingbank", "applicantbank", "shippedby", "transshipment", 
            "beneficiary", "portofloading", "portofdischarge", "countryof", 
            "latestship", "paymentterm", "incoterm", "termsandcondition"
        ]
        
        for junk_kw in junk_kws:
            if junk_kw in cat_low_clean:
                is_junk = True
                break
                
        # If not caught by category name, scan all row values just in case it shifted columns
        if not is_junk:
            for val in row.values():
                val_clean = re.sub(r'[^\w\s]', '', str(val).lower()).strip().replace(" ", "")
                for junk_kw in junk_kws:
                    if junk_kw in val_clean:
                        is_junk = True
                        break
                if is_junk:
                    break

        if is_junk:
            skipped += 1
            continue

        # Unify sewing thread variants under one main category name
        if _is_thread_item(cat_val):
            cat_val = "Sewing Thread"

        # Unify care label variants under one main category name
        if _is_care_label_item(cat_val):
            cat_val = "Care Label"

        if cat_val == "Sewing Thread":
            sub_key_val = ""
            if dimension_col:
                dv = str(row.get(dimension_col, "")).strip()
                if dv and dv.lower() not in ("", "n/a", "na", "-", "none"):
                    sub_key_val = dv
            if not sub_key_val and color_col:
                cv = str(row.get(color_col, "")).strip()
                if cv and cv.lower() not in ("", "n/a", "na", "-", "none"):
                    sub_key_val = cv
            if not sub_key_val:
                # Fallback to scanning for anything that looks like a dimension or count
                for _, value in row.items():
                    vs = str(value).strip()
                    if re.search(r'\b(tex\s*\d+|t-\d+|ticket\s*\d+|\d+\s*m)\b', vs, re.IGNORECASE):
                        sub_key_val = vs
                        break
            if not sub_key_val:
                sub_key_val = "Other"
            pantone_key = sub_key_val
        elif cat_val == "Care Label":
            # For Care Labels, group them strictly by their Purchase Order number.
            pantone_key = f"PO {po_val}" if po_val and po_val != "All Orders" else "All POs"
        else:
            # Extract Pantone code for standard items
            pantone_val = ""
            if pantone_col:
                pv = str(row.get(pantone_col, "")).strip()
                if pv and pv.lower() not in ("", "n/a", "na", "-", "none"):
                    pantone_val = pv
            if not pantone_val:
                # Scan all cell values for pantone-like patterns
                for _, value in row.items():
                    vs = str(value).strip()
                    if re.search(r'pantone|panton|pms', vs, re.IGNORECASE):
                        pantone_val = vs
                        break
            if pantone_val:
                pantone_key = _dedup_pantone(pantone_val)
            else:
                pantone_key = "Other"

        if po_val not in po_groups:
            po_groups[po_val] = {}

        # ALL categories use sub-groups by Pantone
        if cat_val not in po_groups[po_val]:
            po_groups[po_val][cat_val] = {"_sub_groups": {}}
        sub = po_groups[po_val][cat_val]["_sub_groups"]
        if pantone_key not in sub:
            sub[pantone_key] = []
        sub[pantone_key].append(row)

        all_categories_set.add(cat_val)

    sorted_po_groups = {}
    for po_key in sorted(po_groups.keys()):
        cats = {}
        for cat_key in sorted(po_groups[po_key].keys()):
            cat_data = po_groups[po_key][cat_key]
            if isinstance(cat_data, dict) and "_sub_groups" in cat_data:
                # Sort sub-groups alphabetically
                cats[cat_key] = {"_sub_groups": dict(sorted(cat_data["_sub_groups"].items()))}
            else:
                cats[cat_key] = cat_data
        sorted_po_groups[po_key] = {"categories": cats}

    return {
        "po_column": po_col,
        "grouping_column": grouping_col,
        "po_groups": sorted_po_groups,
        "headers": headers,
        "all_categories": sorted(all_categories_set),
        "skipped_rows": skipped,
    }
