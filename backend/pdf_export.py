"""PDF export with sorted items, consumption calculator, and thread weight calculation.
   Uses reportlab for professional PDF generation. All white background, no colors."""

from io import BytesIO
import math
import os
from num2words import num2words
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

# Watermark logo path (same directory as this script)
_WATERMARK_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "watermark.png")


def _draw_watermark(canvas_obj, doc):
    """Draw a semi-transparent watermark logo in the center of every page."""
    if not os.path.exists(_WATERMARK_PATH):
        return
    canvas_obj.saveState()
    page_w, page_h = A4
    # Medium-large: ~60% of the shorter dimension
    wm_size = min(page_w, page_h) * 0.6
    x = (page_w - wm_size) / 2
    y = (page_h - wm_size) / 2
    canvas_obj.setFillAlpha(0.06)
    canvas_obj.drawImage(
        _WATERMARK_PATH, x, y, width=wm_size, height=wm_size,
        preserveAspectRatio=True, mask='auto',
    )
    canvas_obj.restoreState()


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
    export_type: str = "work_order",
    invoice_info: dict | None = None,
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
    
    if export_type == "invoice":
        elements.append(Paragraph("Invoice Sheet", subtitle_style))
    else:
        elements.append(Paragraph("Booking Order", subtitle_style))

    elements.append(HRFlowable(width="100%", thickness=0.5, color=BLACK, spaceAfter=4))

    # ── Header Information ────────────────────────────────────────
    available = A4[0] - 20 * mm

    def _lbl(text: str) -> Paragraph:
        return Paragraph(f"<b>{text}</b>", booking_label_style)

    def _val(text: str) -> Paragraph:
        return Paragraph(text or "", booking_value_style)

    if export_type == "invoice" and invoice_info:
        applicant_str = "K.A. DESIGN WEAR LTD.<br/>308/1 TILARGATI, TONGI, GAZIPUR-1712<br/>BANGLADESH"
        beneficiary_str = "K.A. DESIGN ACCESSORIES LTD.<br/>356/1, BLOCK-B, TEK KATHORA, SALNA, GAZIPUR-1703, BANGLADESH"

        header_rows = [
            [_lbl("Date:"), _val(invoice_info.get("date", ""))],
            [_lbl("BILL:"), _val(invoice_info.get("bill", ""))],
            [_lbl("PERFORMA INVOICE NO:"), _val(invoice_info.get("performa_invoice_no", ""))],
            [_lbl("APPLICANT:"), _val(applicant_str)],
            [_lbl("BENEFICIARY:"), _val(beneficiary_str)],
            [_lbl("BANK DETAILS:"), _val(invoice_info.get("bank_details", ""))],
            [_lbl("BUYER:"), _val(invoice_info.get("buyer", ""))],
        ]
        
        booking_tbl = Table(header_rows, colWidths=[available * 0.30, available * 0.70])
        booking_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), WHITE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))
        elements.append(booking_tbl)
        elements.append(Spacer(1, 6))

    elif export_type == "work_order" and booking_info:
        bi = booking_info

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

    if export_type == "invoice":
        # ── Invoice specific layout: Single Summary Table ────────────────────
        elements.append(Paragraph("<b>DESCRIPTION OF GOODS</b>", section_style))
        elements.append(Spacer(1, 4))
        
        headers_for_table = ["SL NO.", "ITEM DESCRIPTION", "PID NO.", "QTY", "UNIT", "UNIT PRICE", "TOTAL AMOUNT"]
        header_row = [Paragraph(f"<b>{h}</b>", header_cell_style) for h in headers_for_table]
        table_data = [header_row]
        
        price_col_idx = _get_price_col_index(base_headers)
        qty_col_idx = _get_qty_col_index(base_headers)
        
        grand_total_amount = 0.0
        grand_total_qty = 0.0
        sl_no = 1
        
        for po_name, po_data in po_groups.items():
            categories = po_data.get("categories", {})
            for cat_name, cat_data in categories.items():
                
                # Function to process rows for the invoice
                def process_invoice_rows(rows, group_name):
                    nonlocal sl_no, grand_total_amount, grand_total_qty
                    for r_idx, row in enumerate(rows):
                        order_qty = float(row.get("_computed_qty", 0))
                        grand_total_qty += order_qty
                        
                        unit_price = 0.0
                        if price_col_idx >= 0:
                            price_val = str(row.get(base_headers[price_col_idx], "0")).replace(",", "")
                            try:
                                unit_price = float(price_val)
                            except ValueError:
                                unit_price = 0.0
                        
                        row_amount = unit_price * order_qty
                        grand_total_amount += row_amount
                        
                        # Fallbacks to find UNIT 
                        unit_val = ""
                        for h in base_headers:
                            if "unit" in h.lower() and "price" not in h.lower() and "rate" not in h.lower():
                                unit_val = str(row.get(h, ""))
                                break
                        if not unit_val:
                            unit_val = "PCS" # Default

                        item_desc = group_name if group_name and group_name != "_flat" else cat_name

                        row_cells = [
                            Paragraph(str(sl_no), cell_style),
                            Paragraph(item_desc, cell_left_style),
                            Paragraph(po_name, cell_left_style),
                            Paragraph(f"{order_qty:,.0f}", cell_style),
                            Paragraph(unit_val, cell_style),
                            Paragraph(f"{unit_price:,.2f}" if unit_price > 0 else "", cell_style),
                            Paragraph(f"<b>{row_amount:,.2f}</b>" if row_amount > 0 else "", cell_style),
                        ]
                        table_data.append(row_cells)
                        sl_no += 1

                if isinstance(cat_data, dict) and "_sub_groups" in cat_data:
                    for sub_name, rows in cat_data.get("_sub_groups", {}).items():
                        process_invoice_rows(rows, sub_name)
                elif isinstance(cat_data, list):
                    process_invoice_rows(cat_data, cat_name)
        
        # ── Grand Total Row ────────────────────────────────────
        total_row = [
            "", 
            "", 
            Paragraph("<b>TOTAL</b>", cell_style), 
            Paragraph(f"<b>{grand_total_qty:,.0f}</b>", cell_style), 
            "", 
            "", 
            Paragraph(f"<b>{grand_total_amount:,.2f}</b>", cell_style)
        ]
        table_data.append(total_row)
        
        # Column weights
        num_cols = len(headers_for_table)
        col_widths = [available * 0.05, available * 0.35, available * 0.25, available * 0.08, available * 0.07, available * 0.1, available * 0.1]
        
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
        ]))
        elements.append(tbl)
        elements.append(Spacer(1, 10))

        if grand_total_amount > 0:
            words = num2words(grand_total_amount, lang='en')
            # capitalize correctly
            words = words.replace("-", " ").title()
            words += " Taka Only"
            
            in_words_style = ParagraphStyle(
                "InWords", parent=styles["Normal"],
                fontSize=9, leading=12, textColor=BLACK,
            )
            elements.append(Paragraph(f"<b>IN WORDS:</b> {words}", in_words_style))
            elements.append(Spacer(1, 15))

        # ── Weights under table ────────────────────────────────────────
        if export_type == "invoice" and invoice_info:
            weight_style = ParagraphStyle(
                "WeightStyle", parent=styles["Normal"],
                fontSize=9, leading=12, textColor=BLACK,
            )
            net_weight_str = invoice_info.get("net_weight", "")
            gross_weight_str = invoice_info.get("gross_weight", "")
            if net_weight_str:
                elements.append(Paragraph(f"<b>NET WEIGHT:</b> {net_weight_str}", weight_style))
                elements.append(Spacer(1, 2))
            if gross_weight_str:
                elements.append(Paragraph(f"<b>GROSS WEIGHT:</b> {gross_weight_str}", weight_style))
                elements.append(Spacer(1, 15))

        terms_style = ParagraphStyle(
            "Terms", parent=styles["Normal"],
            fontSize=9, leading=12, textColor=BLACK,
        )
        elements.append(Paragraph("<b>TERMS AND CONDITIONS:</b> CASH ON DELIVERY", terms_style))

    else:
        # ── Standard Work Order flow: separated by PO and Category ───
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

    doc.build(elements, onFirstPage=_draw_watermark, onLaterPages=_draw_watermark)
    buffer.seek(0)
    return buffer.getvalue()
