"""FastAPI backend for PO Automation & Consumption Calculator."""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from io import BytesIO

from pdf_parser import extract_tables_from_pdf
from sorter import group_by_item
from pdf_export import create_export_pdf
from database import save_upload, get_all_uploads, get_upload, delete_upload

app = FastAPI(title="PO Automation API", version="3.0")

# CORS — allow all origins for deployment flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Upload & Parse ─────────────────────────────────────────────────────
@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a PDF, parse tables, group by item, save to history."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Step 1: Extract tables from PDF
    try:
        rows = extract_tables_from_pdf(contents)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"PDF parsing failed: {str(e)}")

    if not rows:
        raise HTTPException(
            status_code=422,
            detail="No table data found in this PDF. Please check the file format.",
        )

    # Step 2: Group by item category
    grouped = group_by_item(rows)

    # Step 3: Save to history
    upload_id = save_upload(file.filename, grouped)

    return {
        "id": upload_id,
        "filename": file.filename,
        "total_rows": len(rows),
        "categories_count": len(grouped.get("all_categories", [])),
        "data": grouped,
    }


# ── History ─────────────────────────────────────────────────────────────
@app.get("/api/history")
async def list_history():
    """Return all upload records."""
    return get_all_uploads()


@app.get("/api/history/{upload_id}")
async def get_history_item(upload_id: int):
    """Return parsed data for a specific upload."""
    record = get_upload(upload_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Upload not found.")
    return record


@app.delete("/api/history/{upload_id}")
async def delete_history_item(upload_id: int):
    """Delete a history entry."""
    success = delete_upload(upload_id)
    if not success:
        raise HTTPException(status_code=404, detail="Upload not found.")
    return {"message": "Deleted successfully."}


# ── Export ──────────────────────────────────────────────────────────────
class ExportRequest(BaseModel):
    grouped_data: dict
    consumption_values: dict | None = None
    thread_settings: dict | None = None
    filename: str = "PO_Export"


@app.post("/api/export")
async def export_pdf(req: ExportRequest):
    """Generate and return a PDF report."""
    try:
        pdf_bytes = create_export_pdf(
            req.grouped_data,
            req.consumption_values,
            req.thread_settings,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{req.filename}.pdf"'
        },
    )


@app.get("/")
async def root():
    return {"message": "PO Automation API v3.0 is running."}
