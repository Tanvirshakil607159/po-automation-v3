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
            className={`relative rounded-2xl p-8 sm:p-10 text-center transition-all duration-300 cursor-pointer shadow-sm
                ${dragOver ? "border-2 border-[#5b7a6a] bg-[#eef3f0] scale-[1.01]"
                    : "border-2 border-dashed border-[#e6e0d6] bg-[#fffefb] hover:border-[#5b7a6a]/40 hover:bg-[#f8f6f2]"}
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
                    <div className="relative inline-flex items-center justify-center w-12 h-12 mb-4">
                        <div className="absolute inset-0 rounded-full border-2 border-[#eee9e1]" />
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#5b7a6a] animate-spin" />
                        <svg className="w-5 h-5 text-[#5b7a6a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <p className="text-[14px] font-semibold text-[#3b3730]">Processing your PDF...</p>
                    <p className="text-[12px] text-[#a09888] mt-1">Extracting tables & sorting items</p>
                </div>
            ) : (
                <div className="py-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#f4f1ec] border border-[#eee9e1] mb-4">
                        <svg className="w-6 h-6 text-[#a09888]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <p className="text-[14px] font-semibold text-[#3b3730]">Drop your PO file here</p>
                    <p className="text-[12px] text-[#a09888] mt-1.5">
                        or <span className="font-medium text-[#5b7a6a]">browse files</span> · PDF only
                    </p>
                </div>
            )}

            {error && (
                <div className="mt-4 mx-auto max-w-xs px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-[12px] font-medium">
                    {error}
                </div>
            )}
        </div>
    );
}
