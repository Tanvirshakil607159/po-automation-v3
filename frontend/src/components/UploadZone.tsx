"use client";

import { useCallback, useState } from "react";
import { useAppStore } from "@/lib/store";
import { uploadPDF, fetchHistory } from "@/lib/api";

export default function UploadZone() {
    const { setUploadResult, setIsUploading, isUploading, setHistory } = useAppStore();
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFile = useCallback(
        async (file: File) => {
            if (!file.name.toLowerCase().endsWith(".pdf")) {
                setError("Please upload a PDF file.");
                return;
            }
            setError(null);
            setIsUploading(true);
            try {
                const result = await uploadPDF(file);
                setUploadResult(result);
                const history = await fetchHistory();
                setHistory(history);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Upload failed");
            } finally {
                setIsUploading(false);
            }
        },
        [setUploadResult, setIsUploading, setHistory]
    );

    const onDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    return (
        <div
            className="relative rounded-2xl p-8 sm:p-10 text-center transition-all duration-300 cursor-pointer overflow-hidden"
            style={{
                background: dragOver ? "var(--accent-light)" : "var(--bg-card)",
                border: dragOver ? "2px solid var(--accent)" : "2px dashed var(--border)",
                transform: dragOver ? "scale(1.01)" : "scale(1)",
                boxShadow: "0 1px 3px rgba(60,50,40,0.04), 0 4px 12px rgba(60,50,40,0.03)",
                opacity: isUploading ? 0.7 : 1,
                pointerEvents: isUploading ? "none" : "auto",
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => document.getElementById("pdf-input")?.click()}
            id="upload-zone"
        >
            <input id="pdf-input" type="file" accept=".pdf" className="hidden" onChange={onFileSelect} />

            {isUploading ? (
                <div className="py-2">
                    <div className="relative inline-flex items-center justify-center w-12 h-12 mb-4">
                        <div className="absolute inset-0 rounded-full" style={{ border: "2px solid var(--border-light)" }} />
                        <div className="absolute inset-0 rounded-full animate-spin"
                            style={{ border: "2px solid transparent", borderTopColor: "var(--accent)" }} />
                        <svg className="w-5 h-5" style={{ color: "var(--accent)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <p className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>Processing your PDF...</p>
                    <p className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>Extracting tables & sorting items</p>
                </div>
            ) : (
                <div className="py-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
                        style={{ background: "var(--bg-base)", border: "1px solid var(--border-light)" }}>
                        <svg className="w-6 h-6" style={{ color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <p className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>
                        Drop your PO file here
                    </p>
                    <p className="text-[12px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                        or <span className="font-medium" style={{ color: "var(--accent)" }}>browse files</span> · PDF only
                    </p>
                </div>
            )}

            {error && (
                <div className="mt-4 mx-auto max-w-xs px-3 py-2 rounded-lg"
                    style={{ background: "#fdf2f2", border: "1px solid #f5d0d0", color: "#c0392b" }}>
                    <p className="text-[12px] font-medium">{error}</p>
                </div>
            )}
        </div>
    );
}
