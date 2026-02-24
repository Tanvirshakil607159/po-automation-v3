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
            className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-12 text-center transition-all duration-300 cursor-pointer
        ${dragOver
                    ? "border-amber-400 bg-amber-400/10 scale-[1.02]"
                    : "border-gray-600 bg-gray-800/50 hover:border-amber-500/50 hover:bg-gray-800/80"
                }
        ${isUploading ? "pointer-events-none opacity-60" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => document.getElementById("pdf-input")?.click()}
            id="upload-zone"
        >
            <input
                id="pdf-input"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={onFileSelect}
            />

            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
            </div>

            {isUploading ? (
                <div>
                    <div className="inline-block w-6 h-6 sm:w-8 sm:h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-2 sm:mb-3" />
                    <p className="text-sm sm:text-base text-gray-300 font-medium">Processing PDF...</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">Extracting tables & sorting items</p>
                </div>
            ) : (
                <div>
                    <p className="text-base sm:text-lg font-semibold text-gray-200">
                        Drop your PO PDF here
                    </p>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1.5 sm:mt-2">
                        or <span className="text-amber-400 underline">tap to select</span>
                    </p>
                </div>
            )}

            {error && (
                <div className="mt-3 sm:mt-4 px-3 sm:px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs sm:text-sm">
                    {error}
                </div>
            )}
        </div>
    );
}
