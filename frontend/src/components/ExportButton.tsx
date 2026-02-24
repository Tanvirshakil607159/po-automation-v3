"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { exportExcel } from "@/lib/api";

export default function ExportButton() {
    const { groupedData, consumptionValues, uploadResult } = useAppStore();
    const [exporting, setExporting] = useState(false);

    if (!groupedData) return null;

    const handleExport = async () => {
        setExporting(true);
        try {
            const filename = uploadResult?.filename?.replace(".pdf", "") || "PO_Export";
            await exportExcel(groupedData, consumptionValues, filename);
        } catch (err) {
            console.error("Export failed:", err);
            alert("Export failed. Please try again.");
        } finally {
            setExporting(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200
        bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20
        hover:shadow-emerald-500/40 hover:scale-[1.02]
        active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            id="export-btn"
        >
            {exporting ? (
                <>
                    <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Exporting...</span>
                </>
            ) : (
                <>
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="hidden sm:inline">Export Excel</span>
                    <span className="sm:hidden">Export</span>
                </>
            )}
        </button>
    );
}
