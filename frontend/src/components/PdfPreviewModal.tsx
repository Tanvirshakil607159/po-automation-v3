"use client";

import { useState, useEffect, useCallback } from "react";

interface Props {
    open: boolean;
    pdfUrl: string | null;
    filename: string;
    onClose: () => void;
}

export default function PdfPreviewModal({ open, pdfUrl, onClose, filename }: Props) {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (open) setLoading(true);
    }, [open, pdfUrl]);

    const handleDownload = useCallback(() => {
        if (!pdfUrl) return;
        const a = document.createElement("a");
        a.href = pdfUrl;
        a.download = `${filename}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }, [pdfUrl, filename]);

    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    // Close on Escape key
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") handleClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, handleClose]);

    if (!open || !pdfUrl) return null;

    return (
        <div className="fixed inset-0 z-[60] flex flex-col">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal Content */}
            <div className="relative z-10 flex flex-col w-full h-full max-w-5xl mx-auto py-4 px-3 sm:py-6 sm:px-6">
                {/* Top Bar */}
                <div className="flex items-center justify-between px-4 py-3 mb-3 bg-white dark:bg-[#18181b] rounded-xl border border-[#e5e5e5] dark:border-[#27272a] shadow-lg">
                    <div className="flex items-center gap-3 min-w-0">
                        {/* PDF icon */}
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center">
                            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13h1c.55 0 1 .45 1 1v1c0 .55-.45 1-1 1h-.5v1H8v-4h.5zm3 0h1c.55 0 1 .45 1 1v2c0 .55-.45 1-1 1h-1c-.55 0-1-.45-1-1v-2c0-.55.45-1 1-1zm3 0H16v1h-1v.5h.75v1H15V17h-1v-4h1.5zM9 14v1h.5v-1H9zm3 0v2h.5v-2H12z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-[#18181b] dark:text-[#fafafa] truncate">
                                {filename}.pdf
                            </p>
                            <p className="text-[11px] text-[#a1a1aa] dark:text-[#71717a]">
                                Invoice Preview
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Download Button */}
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium
                                bg-[#18181b] dark:bg-[#fafafa] text-white dark:text-[#09090b]
                                hover:bg-[#27272a] dark:hover:bg-[#e5e5e5]
                                active:scale-[0.97] transition-all shadow-sm"
                            id="pdf-download-btn"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                        </button>

                        {/* Close Button */}
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-lg text-[#71717a] dark:text-[#a1a1aa]
                                hover:bg-[#f5f5f5] dark:hover:bg-[#27272a]
                                hover:text-[#18181b] dark:hover:text-[#fafafa]
                                transition-colors"
                            id="pdf-preview-close-btn"
                            aria-label="Close preview"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* PDF Viewer */}
                <div className="flex-1 relative rounded-xl overflow-hidden border border-[#e5e5e5] dark:border-[#27272a] shadow-lg bg-[#525659]">
                    {loading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-[#18181b]/80 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-8 h-8 rounded-full animate-spin border-[2.5px] border-[#e5e5e5] dark:border-[#3f3f46] border-t-[#18181b] dark:border-t-[#fafafa]" />
                                <p className="text-[13px] text-[#71717a] dark:text-[#a1a1aa]">Loading preview…</p>
                            </div>
                        </div>
                    )}
                    <iframe
                        src={pdfUrl}
                        className="w-full h-full"
                        title="Invoice PDF Preview"
                        onLoad={() => setLoading(false)}
                    />
                </div>
            </div>
        </div>
    );
}
