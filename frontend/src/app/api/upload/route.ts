import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
    try {
        const incomingData = await request.formData();
        const file = incomingData.get("file") as File;

        if (!file) {
            return NextResponse.json({ detail: "No file provided" }, { status: 400 });
        }

        const backendFormData = new FormData();
        backendFormData.append("file", file);

        const backendResponse = await fetch(`${BACKEND_URL}/api/upload`, {
            method: "POST",
            body: backendFormData,
        });

        const data = await backendResponse.json();

        if (!backendResponse.ok) {
            return NextResponse.json(data, { status: backendResponse.status });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Upload proxy error:", error.message || error);
        return NextResponse.json(
            { detail: "Upload failed - backend unreachable" },
            { status: 502 }
        );
    }
}
