import sys
from pdf_export import create_export_pdf

grouped_data = {
    "headers": ["Item", "Qty", "Price"],
    "po_groups": {
        "PO-1": {
            "categories": {
                "T-Shirts": [{"Item": "Red T-Shirt", "_computed_qty": 100, "_computed_cons": 1, "_computed_total_req": 100}]
            }
        }
    }
}
try:
    pdf_bytes = create_export_pdf(
        grouped_data=grouped_data,
        export_type="invoice",
        invoice_info={"date": "2026-03-16", "bill": "test", "performa_invoice_no": "123", "bank_details": "test", "buyer": "test"}
    )
    with open("test_invoice_v7.pdf", "wb") as f:
        f.write(pdf_bytes)
    print("PDF generation successful.")
except Exception as e:
    import traceback
    traceback.print_exc()
    sys.exit(1)
