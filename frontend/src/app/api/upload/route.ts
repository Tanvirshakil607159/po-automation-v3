import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
    try {
        // Forward the exact request with headers to preserve multipart boundaries
        const backendResponse = await fetch(`${BACKEND_URL}/api/upload`, {
            method: "POST",
            headers: {
                "Content-Type": request.headers.get("content-type") || "",
            },
            body: request.body,
            // @ts-ignore - Required for passing ReadableStream in Next.js fetch
            duplex: "half",
        });

        const data = await backendResponse.json();

        if (!backendResponse.ok) {
            return NextResponse.json(data, { status: backendResponse.status });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Upload proxy error:", error);
        return NextResponse.json(
            { detail: "Upload failed - backend unreachable" },
            { status: 502 }
        );
    }
}
