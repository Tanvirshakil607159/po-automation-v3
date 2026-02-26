"use client";

import { useCallback, useState } from "react";
import { useAppStore } from "@/lib/store";
import { uploadPDF, fetchHistory } from "@/lib/api";

export default function UploadZone() {
    const { setUploadResult, setIsUploading, isUploading, setHistory } = useAppStore();
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFile = useCallback(async (file: File) => {
        if (!file.name.toLowerCase().endsWith(".pdf")) { setError("Please upload a PDF file."); return; }
        setError(null); setIsUploading(true);
        try {
            const result = await uploadPDF(file); setUploadResult(result);
            const history = await fetchHistory(); setHistory(history);
        } catch (err: unknown) { setError(err instanceof Error ? err.message : "Upload failed"); }
        finally { setIsUploading(false); }
    }, [setUploadResult, setIsUploading, setHistory]);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false);
        const file = e.dataTransfer.files[0]; if (file) handleFile(file);
    }, [handleFile]);

    return (
        <div
            className={`relative rounded-lg p-8 sm:p-10 text-center transition-all cursor-pointer
                ${dragOver ? "border-2 border-[#2563eb] bg-[#eff6ff] dark:bg-[#1e3a5f]"
                    : "border-2 border-dashed border-[#d4d4d8] dark:border-[#3f3f46] bg-white dark:bg-[#18181b] hover:border-[#a1a1aa] dark:hover:border-[#52525b]"}
                ${isUploading ? "pointer-events-none opacity-60" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => document.getElementById("pdf-input")?.click()}
            id="upload-zone"
        >
            <input id="pdf-input" type="file" accept=".pdf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

            {isUploading ? (
                <div className="py-2">
                    <div className="inline-flex items-center justify-center w-10 h-10 mb-4">
                        <div className="w-8 h-8 rounded-full animate-spin border-2 border-[#e5e5e5] dark:border-[#3f3f46] border-t-[#18181b] dark:border-t-[#fafafa]" />
                    </div>
                    <p className="text-[14px] font-medium text-[#18181b] dark:text-[#fafafa]">Processing your PDF...</p>
                    <p className="text-[12px] text-[#a1a1aa] dark:text-[#71717a] mt-1">Extracting tables & sorting items</p>
                </div>
            ) : (
                <div className="py-2">
                    <svg className="w-6 h-6 mx-auto mb-4 text-[#a1a1aa] dark:text-[#52525b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-[14px] font-medium text-[#18181b] dark:text-[#fafafa]">Drop your PO file here</p>
                    <p className="text-[12px] text-[#a1a1aa] dark:text-[#71717a] mt-1.5">
                        or <span className="text-[#2563eb] dark:text-[#60a5fa]">browse files</span> · PDF only
                    </p>
                </div>
            )}

            {error && (
                <div className="mt-4 mx-auto max-w-xs px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-[12px] font-medium">
                    {error}
                </div>
            )}
        </div>
    );
}
