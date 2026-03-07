"use client";

import { useCallback, useState } from "react";
import { useAppStore } from "@/lib/store";
import { uploadPDF, fetchHistory } from "@/lib/api";
import { GroupedData } from "@/lib/store";

/* ── helpers ─────────────────────────────────────────────────────────── */

/** Deep-merge multiple GroupedData results into one unified structure. */
function mergeGroupedData(results: GroupedData[]): GroupedData {
    if (results.length === 0) throw new Error("No results to merge");
    if (results.length === 1) return results[0];

    const merged: GroupedData = {
        po_column: results[0].po_column,
        grouping_column: results[0].grouping_column,
        po_groups: {},
        headers: results[0].headers,
        all_categories: [],
    };

    const allCatsSet = new Set<string>();

    for (const result of results) {
        for (const cat of result.all_categories) allCatsSet.add(cat);

        for (const [poKey, poData] of Object.entries(result.po_groups)) {
            if (!merged.po_groups[poKey]) {
                merged.po_groups[poKey] = { categories: {} };
            }
            const destCats = merged.po_groups[poKey].categories as Record<string, unknown>;
            const srcCats = (poData as { categories: Record<string, unknown> }).categories;

            for (const [catKey, catData] of Object.entries(srcCats)) {
                if (!destCats[catKey]) {
                    destCats[catKey] = catData;
                } else {
                    // Merge sub_groups or flat arrays
                    const dest = destCats[catKey] as Record<string, unknown>;
                    const src = catData as Record<string, unknown>;
                    if (dest._sub_groups && src._sub_groups) {
                        const destSub = dest._sub_groups as Record<string, unknown[]>;
                        const srcSub = src._sub_groups as Record<string, unknown[]>;
                        for (const [sgKey, sgRows] of Object.entries(srcSub)) {
                            if (!destSub[sgKey]) {
                                destSub[sgKey] = sgRows;
                            } else {
                                destSub[sgKey] = [...(destSub[sgKey] as unknown[]), ...sgRows];
                            }
                        }
                    } else if (Array.isArray(dest) && Array.isArray(src)) {
                        (destCats[catKey] as unknown[]).push(...(src as unknown[]));
                    }
                }
            }
        }
    }

    merged.all_categories = Array.from(allCatsSet).sort();
    return merged;
}

/* ── component ───────────────────────────────────────────────────────── */

export default function UploadZone() {
    const { setUploadResult, setIsUploading, isUploading, setHistory } = useAppStore();
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

    const handleFiles = useCallback(async (files: FileList | File[]) => {
        const arr = Array.from(files).filter(f => f.name.toLowerCase().endsWith(".pdf"));
        if (arr.length === 0) { setError("Please upload PDF files."); return; }

        const nonPdf = Array.from(files).length - arr.length;
        if (nonPdf > 0) setError(`${nonPdf} non-PDF file(s) were skipped.`);
        else setError(null);

        setIsUploading(true);
        setProgress({ done: 0, total: arr.length });

        try {
            const groupedResults: GroupedData[] = [];
            let lastId = 0;
            let totalRows = 0;
            let lastFilename = "";
            const filenames: string[] = [];

            for (let i = 0; i < arr.length; i++) {
                setProgress({ done: i, total: arr.length });
                const result = await uploadPDF(arr[i]);
                groupedResults.push(result.data as unknown as GroupedData);
                lastId = result.id;
                totalRows += result.total_rows;
                filenames.push(arr[i].name);
                lastFilename = filenames.join(" + ");
            }

            setProgress({ done: arr.length, total: arr.length });

            const merged = mergeGroupedData(groupedResults);
            setUploadResult({
                id: lastId,
                filename: lastFilename,
                total_rows: totalRows,
                categories_count: merged.all_categories.length,
                data: merged as unknown as import("@/lib/store").GroupedData,
            });

            const history = await fetchHistory();
            setHistory(history);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setIsUploading(false);
            setProgress(null);
        }
    }, [setUploadResult, setIsUploading, setHistory]);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false);
        if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

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
            {/* Hidden multi-file input */}
            <input
                id="pdf-input"
                type="file"
                accept=".pdf"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ""; }}
            />

            {isUploading ? (
                <div className="py-2">
                    <div className="inline-flex items-center justify-center w-10 h-10 mb-4">
                        <div className="w-8 h-8 rounded-full animate-spin border-2 border-[#e5e5e5] dark:border-[#3f3f46] border-t-[#18181b] dark:border-t-[#fafafa]" />
                    </div>
                    {progress ? (
                        <>
                            <p className="text-[14px] font-medium text-[#18181b] dark:text-[#fafafa]">
                                Uploading file {progress.done + 1} of {progress.total}…
                            </p>
                            {/* Progress bar */}
                            <div className="mt-3 mx-auto w-48 h-1.5 rounded-full bg-[#e5e5e5] dark:bg-[#27272a] overflow-hidden">
                                <div
                                    className="h-full bg-[#18181b] dark:bg-[#fafafa] rounded-full transition-all duration-300"
                                    style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                                />
                            </div>
                            <p className="text-[11px] text-[#a1a1aa] dark:text-[#71717a] mt-1.5">
                                {Math.round((progress.done / progress.total) * 100)}% complete
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-[14px] font-medium text-[#18181b] dark:text-[#fafafa]">Processing your PDF…</p>
                            <p className="text-[12px] text-[#a1a1aa] dark:text-[#71717a] mt-1">Extracting tables &amp; sorting items</p>
                        </>
                    )}
                </div>
            ) : (
                <div className="py-2">
                    <svg className="w-6 h-6 mx-auto mb-4 text-[#a1a1aa] dark:text-[#52525b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-[14px] font-medium text-[#18181b] dark:text-[#fafafa]">Drop your PO files here</p>
                    <p className="text-[12px] text-[#a1a1aa] dark:text-[#71717a] mt-1.5">
                        or <span className="text-[#2563eb] dark:text-[#60a5fa]">browse files</span> · PDF only · Multiple files supported
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
