"""PDF export with sorted items, consumption calculator, and thread weight calculation.
   Uses reportlab for professional PDF generation. All white background, no colors."""

from io import BytesIO
import math
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
    HRFlowable, KeepTogether, Image
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# Thread weight divisors
THREAD_DIVISORS = {
    "50/2": 19202.4,
    "40/2": 15362,
}

BLACK = colors.black
WHITE = colors.white
GRAY_LINE = colors.HexColor("#999999")


def _is_thread_category(name: str) -> bool:
    if not name:
        return False
    low = str(name).lower()
    return "thread" in low or "sewing" in low


def _get_qty_col_index(headers: list[str]) -> int:
    for i, h in enumerate(headers):
        low = h.lower()
        if "qty" in low or "quantity" in low:
            return i
    return -1


def _get_price_col_index(headers: list[str]) -> int:
    for i, h in enumerate(headers):
        low = h.lower()
        if any(kw in low for kw in ["unit price", "u.price", "u. price", "price", "rate"]):
            return i
    return -1


def _get_amount_col_index(headers: list[str]) -> int:
    for i, h in enumerate(headers):
        low = h.lower()
        if any(kw in low for kw in ["amount", "total amount", "total price"]):
            return i
    return -1


def _build_table_elements(
    rows: list[dict],
    base_headers: list[str],
    qty_col_idx: int,
    display_headers: list[str],
    header_cell_style,
    cell_style,
    cell_left_style,
    consumption_values: dict | None,
    po_name: str,
    cons_key: str,
    available_width: float,
    is_thread: bool = False,
    thread_count: str = "50/2",
    cone_length: float = 4000,
    wastage_for_weight: float = 5.0,
) -> list:
    """Build table + optional thread weight for a set of rows. Returns list of flowable elements."""
    
    headers_for_table = ["#"] + base_headers + ["Cons/Unit"]
    if not is_thread:
        headers_for_table.append("Wastage %")
    headers_for_table.append("Total Req.")

    header_row = [Paragraph(f"<b>{h}</b>", header_cell_style) for h in headers_for_table]
    table_data = [header_row]

    price_col_idx = _get_price_col_index(base_headers)
    amount_col_idx = _get_amount_col_index(base_headers)

    grand_total = 0.0
    grand_qty = 0.0
    grand_amount = 0.0

    for row_idx, row_data in enumerate(rows):
        order_qty = float(row_data.get("_computed_qty", 0))
        grand_qty += order_qty

        consumption = float(row_data.get("_computed_cons", 1))
        # total_req is already calculated in the backend before passing to this function usually, 
        # or we calculate it here. 
        total_req = float(row_data.get("_computed_total_req", 0))
        grand_total += total_req

        # Manual Price & Amount Logic
        unit_price = 0.0
        if price_col_idx >= 0:
            price_val = str(row_data.get(base_headers[price_col_idx], "0")).replace(",", "")
            try:
                unit_price = float(price_val)
            except ValueError:
                unit_price = 0.0
        
        row_amount = unit_price * order_qty
        grand_amount += row_amount

        row_cells = [Paragraph(str(row_idx + 1), cell_style)]
        for i, h in enumerate(base_headers):
            if i == amount_col_idx:
                # Override original amount with calculated one
                val = f"<b>{row_amount:,.2f}</b>" if row_amount > 0 else ""
                row_cells.append(Paragraph(val, cell_style))
            else:
                val = str(row_data.get(h, ""))
                row_cells.append(Paragraph(val, cell_left_style))

        row_cells.append(Paragraph(f"{consumption:.2f}" if consumption > 0 else "", cell_style))
        if not is_thread:
            wastage = float(row_data.get("_computed_was", 5))
            row_cells.append(Paragraph(f"{wastage:.1f}%", cell_style))
        
        row_cells.append(Paragraph(
            f"<b>{total_req:,.2f}</b>" if total_req > 0 else "", cell_style,
        ))
        table_data.append(row_cells)

    # ── Grand Total Row ────────────────────────────────────
    total_row_len = len(headers_for_table)
    total_row = [""] * total_row_len
    if qty_col_idx >= 0:
        total_row[qty_col_idx + 1] = Paragraph(f"<b>{grand_qty:,.0f}</b>", cell_style)
    
    if amount_col_idx >= 0:
        total_row[amount_col_idx + 1] = Paragraph(f"<b>{grand_amount:,.2f}</b>", cell_style)

    total_row[-2] = Paragraph("<b>TOTAL</b>", cell_style)
    total_row[-1] = Paragraph(
        f"<b>{grand_total:,.2f}</b>" if grand_total > 0 else "", cell_style,
    )
    table_data.append(total_row)

    # ── Column widths ──────────────────────────────────────
    num_cols = len(headers_for_table)
    if not is_thread:
        fixed_cols = {0: 14, num_cols - 3: 32, num_cols - 2: 32, num_cols - 1: 38}
    else:
        fixed_cols = {0: 14, num_cols - 2: 32, num_cols - 1: 38}
    
    fixed_total = sum(fixed_cols.values())
    remaining = available_width - fixed_total
    data_cols = num_cols - len(fixed_cols)
    data_col_w = remaining / max(data_cols, 1)

    col_widths = [fixed_cols.get(i, data_col_w) for i in range(num_cols)]

    # ── Table style — ALL WHITE, black borders only ────────
    tbl = Table(table_data, colWidths=col_widths, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), WHITE),
        ("TEXTCOLOR", (0, 0), (-1, -1), BLACK),
        ("FONTSIZE", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 0), (-1, 0), 1, BLACK),
        ("TOPPADDING", (0, 0), (-1, 0), 4),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 4),
        ("LINEABOVE", (0, -1), (-1, -1), 1, BLACK),
        ("TOPPADDING", (0, -1), (-1, -1), 4),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 4),
        ("GRID", (0, 0), (-1, -1), 0.25, GRAY_LINE),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("ALIGN", (num_cols - 3 if not is_thread else num_cols - 2, 0), (-1, -1), "CENTER"),
    ]))

    result = [tbl]

    # ── Thread Weight ──────────────────────────────────────
    if is_thread and cone_length > 0 and grand_total > 0:
        # Instead of calculating from scratch, see if a sub-group weight was passed
        # This function processes rows, but the parent loop knows the sub-group weight
        # Unfortunately, _build_table_elements doesn't receive the sub_group dict natively,
        # but wait, the Thread Weight here is for the specific table (sub-group or flat).
        # We can extract the thread weight if we modified the signature, or just calculate it
        # strictly here since grand_total is EXACTLY mathematically matched now.
        
        divisor = THREAD_DIVISORS.get(thread_count, 19202.4)
        base_weight = grand_total * (cone_length / divisor)
        weight_with_wastage = base_weight * (1 + wastage_for_weight / 100)
        weight_lbs = math.ceil(weight_with_wastage)
        weight_kg = math.ceil(weight_lbs * 0.453592)

        weight_data = [[
            Paragraph(
                f"<b>Thread Weight:</b> Count: {thread_count}  |  "
                f"Cone: {cone_length:,.0f}m  |  "
                f"Wastage: {wastage_for_weight:,.1f}%  |  "
                f"<b>{weight_lbs:,} lbs</b> ({weight_kg:,} kg)",
                cell_left_style,
            ),
        ]]
        weight_tbl = Table(weight_data, colWidths=[available_width])
        weight_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), WHITE),
            ("BOX", (0, 0), (-1, -1), 0.25, GRAY_LINE),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        result.append(weight_tbl)

    return result


def create_export_pdf(
    grouped_data: dict,
    consumption_values: dict | None = None,
    thread_settings: dict | None = None,
    booking_info: dict | None = None,
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=10 * mm,
        rightMargin=10 * mm,
        topMargin=12 * mm,
        bottomMargin=12 * mm,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "CustomTitle", parent=styles["Title"],
        fontSize=14, textColor=BLACK, spaceAfter=2, alignment=TA_CENTER,
    )
    subtitle_style = ParagraphStyle(
        "CustomSubtitle", parent=styles["Normal"],
        fontSize=8, textColor=BLACK, alignment=TA_CENTER, spaceAfter=6,
    )
    po_style = ParagraphStyle(
        "POTitle", parent=styles["Heading1"],
        fontSize=11, textColor=BLACK, alignment=TA_LEFT,
        spaceBefore=10, spaceAfter=4,
    )
    section_style = ParagraphStyle(
        "SectionTitle", parent=styles["Heading2"],
        fontSize=9, textColor=BLACK, spaceBefore=8, spaceAfter=3,
    )
    sub_section_style = ParagraphStyle(
        "SubSectionTitle", parent=styles["Heading3"],
        fontSize=8, textColor=BLACK, spaceBefore=4, spaceAfter=2,
    )
    cell_style = ParagraphStyle(
        "CellStyle", parent=styles["Normal"],
        fontSize=6, leading=8, alignment=TA_CENTER, textColor=BLACK,
    )
    cell_left_style = ParagraphStyle(
        "CellLeftStyle", parent=styles["Normal"],
        fontSize=6, leading=8, alignment=TA_LEFT, textColor=BLACK,
    )
    header_cell_style = ParagraphStyle(
        "HeaderCellStyle", parent=styles["Normal"],
        fontSize=6, leading=8, alignment=TA_CENTER, textColor=BLACK,
    )

    # Style for booking header labels and values
    booking_label_style = ParagraphStyle(
        "BookingLabel", parent=styles["Normal"],
        fontSize=10, leading=12, textColor=BLACK, alignment=TA_LEFT,
    )
    booking_value_style = ParagraphStyle(
        "BookingValue", parent=styles["Normal"],
        fontSize=10, leading=12, textColor=BLACK, alignment=TA_LEFT,
    )

    elements = []

    # ── Header (Logo) ───────────────────────────────────────────────
    try:
        logo_path = "logo.png"
        img = Image(logo_path)
        # Scale logo to fit page width (~95% of available width)
        available_width = A4[0] - 20 * mm
        target_width = available_width * 0.95
        
        orig_w, orig_h = img.drawWidth, img.drawHeight
        aspect = orig_h / orig_w
        img.drawWidth = target_width
        img.drawHeight = target_width * aspect
        img.hAlign = 'CENTER'
        elements.append(img)
        elements.append(Spacer(1, 4))
    except Exception:
        # Fallback if logo is missing
        elements.append(Paragraph("K.A. Design Accessories Ltd.", title_style))
    
    elements.append(Paragraph("Booking Order", subtitle_style))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=BLACK, spaceAfter=4))

    # ── Booking Sheet Header ────────────────────────────────────────
    if booking_info:
        bi = booking_info
        available = A4[0] - 20 * mm

        def _lbl(text: str) -> Paragraph:
            return Paragraph(f"<b>{text}</b>", booking_label_style)

        def _val(text: str) -> Paragraph:
            return Paragraph(text or "", booking_value_style)

        # 1-column fields
        header_rows = [
            [_lbl("Date:"), _val(bi.get("date", ""))],
            [_lbl("Supplier Name:"), _val(bi.get("supplier_name", ""))],
            [_lbl("Address:"), _val(bi.get("address", ""))],
            [_lbl("Attention:"), _val(bi.get("attention", ""))],
            [_lbl("From:"), _val(bi.get("from_field", ""))],
            [_lbl("Order No.:"), _val(bi.get("order_no", ""))],
            [_lbl("Ref. No.:"), _val(bi.get("ref_no", ""))],
        ]
        
        # Table with no borders
        booking_tbl = Table(header_rows, colWidths=[available * 0.20, available * 0.80])
        booking_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), WHITE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            # NO GRID/BORDERS as requested
        ]))

        elements.append(booking_tbl)
        elements.append(Spacer(1, 6))

    base_headers = grouped_data.get("headers", [])
    qty_col_idx = _get_qty_col_index(base_headers)
    po_groups = grouped_data.get("po_groups", {})

    if not po_groups:
        categories = grouped_data.get("categories", {})
        po_groups = {"All Orders": {"categories": categories}}

    # Shared display headers and available width
    display_headers = ["#"] + base_headers + ["Cons/Unit", "Wastage %", "Total Req."]
    available = A4[0] - 20 * mm

    # Thread settings — now a per-sub-group map:
    # { "Pantone X": { "count": "50/2", "cone_length": 5000 }, ... }
    thread_settings_map = thread_settings or {}

    for po_name, po_data in po_groups.items():
        categories = po_data.get("categories", {})
        if not categories:
            continue

        elements.append(Paragraph(f"<b>PO: {po_name}</b>", po_style))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=BLACK, spaceAfter=4))

        for cat_name, cat_data in categories.items():
            is_thread = _is_thread_category(cat_name) or _is_thread_category(po_name)
            has_sub_groups = isinstance(cat_data, dict) and "_sub_groups" in cat_data

            if has_sub_groups:
                # ── Thread category with Pantone sub-groups ────────────
                sub_groups = cat_data.get("_sub_groups", {})
                if not sub_groups:
                    continue

                elements.append(Paragraph(
                    f"<b>{cat_name}</b> ({len(sub_groups)} sub-groups)", section_style,
                ))

                for sub_name, rows in sub_groups.items():
                    row_count = len(rows)
                    sub_header = Paragraph(
                        f"&nbsp;&nbsp;▸ <b>{sub_name}</b> ({row_count} items)",
                        sub_section_style,
                    )
                    # Get per-sub-group thread settings
                    sub_ts = thread_settings_map.get(f"{po_name}::{sub_name}", {})
                    sub_count = sub_ts.get("count", "50/2") if sub_ts else "50/2"
                    sub_cone = float(sub_ts.get("cone_length", 4000)) if sub_ts else 4000.0
                    sub_wastage = float(sub_ts.get("wastage", 5.0)) if sub_ts else 5.0

                    section_elements = [sub_header]
                    section_elements += _build_table_elements(
                        rows, base_headers, qty_col_idx, display_headers,
                        header_cell_style, cell_style, cell_left_style,
                        consumption_values, po_name, f"{cat_name}::{sub_name}",
                        available, is_thread=is_thread,
                        thread_count=sub_count, cone_length=sub_cone,
                        wastage_for_weight=sub_wastage,
                    )
                    section_elements.append(Spacer(1, 4))
                    elements.append(KeepTogether(section_elements))

                # ── All Threads Grand Summary ─────────────────────────
                if is_thread:
                    all_thread_total = float(cat_data.get("_computed_all_thread_total", 0.0))
                    all_thread_weight_lbs = int(cat_data.get("_computed_all_thread_weight_lbs", 0))

                    if all_thread_total > 0:
                        summary_parts = [
                            f"<b>🧵 ALL THREADS SUMMARY</b>  |  "
                            f"Total Req: <b>{all_thread_total:,.2f}</b>"
                        ]
                        if all_thread_weight_lbs > 0:
                            weight_kg = math.ceil(all_thread_weight_lbs * 0.453592)
                            summary_parts.append(
                                f"  |  Total Weight: <b>{all_thread_weight_lbs:,} lbs</b> ({weight_kg:,} kg)"
                            )

                        summary_style = ParagraphStyle(
                            "ThreadSummary", parent=cell_left_style,
                            fontSize=11, leading=16,
                        )
                        summary_data = [[Paragraph("".join(summary_parts), summary_style)]]
                        summary_tbl = Table(summary_data, colWidths=[available])
                        summary_tbl.setStyle(TableStyle([
                            ("BACKGROUND", (0, 0), (-1, -1), WHITE),
                            ("BOX", (0, 0), (-1, -1), 1.5, BLACK),
                            ("TOPPADDING", (0, 0), (-1, -1), 8),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                            ("LEFTPADDING", (0, 0), (-1, -1), 8),
                        ]))
                        elements.append(summary_tbl)
                        elements.append(Spacer(1, 8))

            elif isinstance(cat_data, list):
                # ── Normal flat category ───────────────────────────────
                rows = cat_data
                if not rows:
                    continue
                row_count = len(rows)
                cat_header = Paragraph(
                    f"<b>{cat_name}</b> ({row_count} items)", section_style,
                )
                section_elements = [cat_header]
                section_elements += _build_table_elements(
                    rows, base_headers, qty_col_idx, display_headers,
                    header_cell_style, cell_style, cell_left_style,
                    consumption_values, po_name, cat_name,
                    available, is_thread=False,
                )
                section_elements.append(Spacer(1, 6))
                elements.append(KeepTogether(section_elements))

        # ── PO Grand Total Amount ────────────────────────────────────
        po_total_amount = float(po_data.get("_computed_po_total_amount", 0.0))
        if po_total_amount > 0:
            total_amount_style = ParagraphStyle(
                "POTotalAmount", parent=cell_left_style,
                fontSize=9, leading=12, alignment=TA_RIGHT,
            )
            total_amount_data = [[
                Paragraph("<b>Grand Total Amount:</b>", total_amount_style),
                Paragraph(f"<b>৳ {po_total_amount:,.2f}</b>", total_amount_style)
            ]]
            total_amount_tbl = Table(total_amount_data, colWidths=[available * 0.7, available * 0.3])
            total_amount_tbl.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#16a34a")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (1, 0), (1, 0), 12),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#16a34a"))
            ]))
            elements.append(Spacer(1, 6))
            elements.append(total_amount_tbl)
            elements.append(Spacer(1, 10))

    # ── Footer ─────────────────────────────────────────────────────
    elements.append(HRFlowable(width="100%", thickness=0.25, color=GRAY_LINE, spaceBefore=8))
    footer_style = ParagraphStyle(
        "Footer", parent=styles["Normal"],
        fontSize=6, textColor=BLACK, alignment=TA_CENTER,
    )
    elements.append(Paragraph(
        "Generated by K.A. Design Accessories Ltd. — PO Automation v3.0", footer_style,
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
