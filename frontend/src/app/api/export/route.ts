import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const res = await fetch(`${BACKEND_URL}/api/export`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const err = await res.json();
            return NextResponse.json(err, { status: res.status });
        }

        const blob = await res.arrayBuffer();
        return new NextResponse(blob, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": res.headers.get("Content-Disposition") || 'attachment; filename="export.pdf"',
            },
        });
    } catch {
        return NextResponse.json({ detail: "Export failed" }, { status: 502 });
    }
}
