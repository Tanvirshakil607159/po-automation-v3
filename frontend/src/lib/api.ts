const API_BASE = ""; // Proxied through Next.js rewrites — works for both local and public access

export async function uploadPDF(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(err.detail || "Upload failed");
    }

    return res.json();
}

export async function fetchHistory() {
    const res = await fetch(`${API_BASE}/api/history`);
    if (!res.ok) throw new Error("Failed to fetch history");
    return res.json();
}

export async function fetchHistoryItem(id: number) {
    const res = await fetch(`${API_BASE}/api/history/${id}`);
    if (!res.ok) throw new Error("History item not found");
    return res.json();
}

export async function deleteHistoryItem(id: number) {
    const res = await fetch(`${API_BASE}/api/history/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Delete failed");
    return res.json();
}

export async function exportPDF(
    groupedData: Record<string, unknown>,
    consumptionValues: Record<string, unknown> | null,
    filename: string,
    threadSettings?: Record<string, { count: string; cone_length: number }> | null,
) {
    const res = await fetch(`${API_BASE}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            grouped_data: groupedData,
            consumption_values: consumptionValues,
            thread_settings: threadSettings || null,
            filename,
        }),
    });

    if (!res.ok) throw new Error("Export failed");

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
}
