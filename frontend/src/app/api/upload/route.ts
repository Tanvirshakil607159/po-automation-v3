import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

import FormDataNode from "form-data";

export async function POST(request: NextRequest) {
    try {
        const incomingData = await request.formData();
        const file = incomingData.get("file") as File;

        if (!file) {
            return NextResponse.json({ detail: "No file provided" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const backendFormData = new FormDataNode();
        backendFormData.append("file", buffer, {
            filename: file.name,
            contentType: file.type,
        });

        const backendResponse = await fetch(`${BACKEND_URL}/api/upload`, {
            method: "POST",
            body: backendFormData as any, 
            headers: backendFormData.getHeaders(),
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
