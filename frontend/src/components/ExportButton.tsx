"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { exportPDF } from "@/lib/api";

export default function ExportButton() {
    const { groupedData, consumptionValues, uploadResult, excludedCategories } = useAppStore();
    const [exporting, setExporting] = useState(false);

    if (!groupedData) return null;

    const handleExport = async () => {
        setExporting(true);
        try {
            const filename = uploadResult?.filename?.replace(".pdf", "") || "PO_Export";
            const threadSettingsMap: Record<string, { count: string; cone_length: number; wastage: number }> = {};
            const countSelects = document.querySelectorAll<HTMLSelectElement>('[id^="thread-count-"]');
            countSelects.forEach((sel) => {
                const subKey = sel.id.replace("thread-count-", "");
                const coneInput = document.getElementById(`cone-length-${subKey}`) as HTMLSelectElement | null;
                const coneVal = coneInput ? parseInt(coneInput.value) || 4000 : 4000;
                const wastageInput = document.getElementById(`wastage-${subKey}`) as HTMLInputElement | null;
                const wastageVal = wastageInput ? parseFloat(wastageInput.value) || 0 : 5;
                if (coneVal > 0) {
                    threadSettingsMap[subKey] = { count: sel.value, cone_length: coneVal, wastage: wastageVal };
                }
            });

            // Filter out excluded categories from the deep groupedData copy
            const cleanData = JSON.parse(JSON.stringify(groupedData));
            if (cleanData.po_groups) {
                for (const po in cleanData.po_groups) {
                    const cats = cleanData.po_groups[po].categories;
                    for (const excluded of excludedCategories) {
                        if (cats[excluded]) {
                            delete cats[excluded];
                        }
                    }
                }
            }

            await exportPDF(cleanData, consumptionValues, filename,
                Object.keys(threadSettingsMap).length > 0 ? threadSettingsMap : null);
        } catch (err) {
            console.error("Export failed:", err);
            alert("Export failed. Please try again.");
        } finally { setExporting(false); }
    };

    return (
        <button onClick={handleExport} disabled={exporting}
            className="group flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors
                bg-[#18181b] dark:bg-[#fafafa] text-white dark:text-[#09090b] hover:bg-[#27272a] dark:hover:bg-[#e5e5e5]
                active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            id="export-btn"
        >
            {exporting ? (
                <>
                    <div className="w-3.5 h-3.5 rounded-full animate-spin border-[1.5px] border-white/30 dark:border-black/20 border-t-white dark:border-t-black" />
                    <span className="hidden sm:inline">Exporting...</span>
                </>
            ) : (
                <>
                    <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
