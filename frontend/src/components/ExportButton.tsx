"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { exportPDF } from "@/lib/api";

export default function ExportButton() {
    const { groupedData, consumptionValues, uploadResult } = useAppStore();
    const [exporting, setExporting] = useState(false);

    if (!groupedData) return null;

    const handleExport = async () => {
        setExporting(true);
        try {
            const filename = uploadResult?.filename?.replace(".pdf", "") || "PO_Export";

            const threadSettingsMap: Record<string, { count: string; cone_length: number }> = {};
            const countSelects = document.querySelectorAll<HTMLSelectElement>('[id^="thread-count-"]');
            countSelects.forEach((sel) => {
                const subKey = sel.id.replace("thread-count-", "");
                const coneInput = document.getElementById(`cone-length-${subKey}`) as HTMLInputElement | null;
                const coneVal = coneInput ? parseFloat(coneInput.value) || 0 : 0;
                if (coneVal > 0) {
                    threadSettingsMap[subKey] = {
                        count: sel.value,
                        cone_length: coneVal,
                    };
                }
            });

            await exportPDF(
                groupedData as any,
                consumptionValues,
                filename,
                Object.keys(threadSettingsMap).length > 0 ? threadSettingsMap : null,
            );
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
            className="group flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold transition-premium
                bg-indigo-600 text-white shadow-sm shadow-indigo-200/60
                hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-200/80
                active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            id="export-btn"
        >
            {exporting ? (
                <>
                    <div className="w-3.5 h-3.5 border-[1.5px] border-white/40 border-t-white rounded-full animate-spin" />
                    <span className="hidden sm:inline">Exporting...</span>
                </>
            ) : (
                <>
                    <svg className="w-3.5 h-3.5 opacity-80 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="hidden sm:inline">Export PDF</span>
                    <span className="sm:hidden">PDF</span>
                </>
            )}
        </button>
    );
}
