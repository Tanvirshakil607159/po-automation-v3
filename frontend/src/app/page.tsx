"use client";

import { useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import UploadZone from "@/components/UploadZone";
import DataTable from "@/components/DataTable";
import ExportButton from "@/components/ExportButton";
import ThemeToggle from "@/components/ThemeToggle";
import { useAppStore } from "@/lib/store";

export default function Home() {
  const { groupedData, uploadResult, activePO, setActivePO, clearUpload } = useAppStore();
  const hasData = useMemo(() => !!(groupedData && Object.keys(groupedData.po_groups || {}).length > 0), [groupedData]);
  const poNames = useMemo(() => hasData ? Object.keys(groupedData!.po_groups || {}) : [], [hasData, groupedData]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#fafafa] dark:bg-[#09090b]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-5 sm:px-8 py-4 bg-white dark:bg-[#18181b] border-b border-[#e5e5e5] dark:border-[#27272a]">
          <div className="pl-10 lg:pl-0 min-w-0">
            {hasData ? (
              <div>
                <h1 className="text-[15px] font-semibold text-[#18181b] dark:text-[#fafafa] truncate">{uploadResult?.filename}</h1>
                <p className="text-[12px] text-[#a1a1aa] dark:text-[#71717a] mt-0.5">
                  {poNames.length} PO{poNames.length > 1 ? "s" : ""} · {uploadResult?.total_rows} rows
                </p>
              </div>
            ) : (
              <h1 className="text-[15px] font-semibold text-[#18181b] dark:text-[#fafafa]">Purchase Order Processor</h1>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />
            {hasData && (
              <>
                <ExportButton />
                <button
                  onClick={clearUpload}
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium
                    bg-[#f5f5f5] dark:bg-[#27272a] text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#e5e5e5] dark:hover:bg-[#3f3f46] hover:text-[#18181b] dark:hover:text-[#fafafa] transition-colors"
                  id="new-upload-btn"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New
                </button>
                <button
                  onClick={clearUpload}
                  className="sm:hidden p-2 rounded-lg bg-[#f5f5f5] dark:bg-[#27272a] text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#e5e5e5] dark:hover:bg-[#3f3f46] transition-colors"
                  id="new-upload-btn-mobile"
                  aria-label="New Upload"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!hasData ? (
            <div className="max-w-md mx-auto mt-20 sm:mt-32 px-4">
              <div className="text-center mb-10">
                <p className="text-[11px] font-semibold text-[#a1a1aa] dark:text-[#71717a] uppercase tracking-[0.15em] mb-4">
                  K.A. Design Accessories Ltd.
                </p>
                <h2 className="text-2xl sm:text-[28px] font-bold text-[#18181b] dark:text-[#fafafa] leading-tight mb-3">
                  PO to Item-Wise Sheets
                </h2>
                <p className="text-[14px] text-[#71717a] dark:text-[#a1a1aa] leading-relaxed max-w-sm mx-auto">
                  Upload your Purchase Order PDF — we&apos;ll group by PO, sort by item, and calculate consumption.
                </p>
              </div>
              <UploadZone />
              <p className="text-center text-[11px] text-[#a1a1aa] dark:text-[#52525b] mt-6">
                Smart Parsing · PO Sorting · Consumption Calculator
              </p>
            </div>
          ) : (
            <div className="p-4 sm:p-6 space-y-4">
              {/* PO Tabs */}
              <div>
                <p className="text-[11px] font-medium text-[#a1a1aa] dark:text-[#71717a] uppercase tracking-[0.1em] mb-2">Purchase Orders</p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-x-auto pb-0.5" id="po-tabs">
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {poNames.map((po, idx) => {
                      const isActive = po === activePO;
                      const catCount = Object.keys(groupedData!.po_groups[po]?.categories || {}).length;
                      return (
                        <button
                          key={po}
                          onClick={() => setActivePO(po)}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors
                            ${isActive
                              ? "bg-[#18181b] dark:bg-[#fafafa] text-white dark:text-[#09090b]"
                              : "bg-[#f5f5f5] dark:bg-[#27272a] text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#e5e5e5] dark:hover:bg-[#3f3f46] hover:text-[#18181b] dark:hover:text-[#fafafa]"
                            }`}
                          id={`po-tab-${idx}`}
                        >
                          {po}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium
                            ${isActive ? "bg-white/15 dark:bg-black/10 text-white/80 dark:text-[#09090b]/70" : "bg-[#e5e5e5] dark:bg-[#3f3f46] text-[#a1a1aa]"}`}>
                            {catCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Fixed Unit Price at the PO level (Main Category Tab) */}
                  {activePO && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 ml-auto flex-shrink-0">
                      <label className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tight whitespace-nowrap">Fixed Unit Price for {activePO}:</label>
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={useAppStore.getState().fixedUnitPrices[activePO] || ""}
                        onChange={(e) => useAppStore.getState().setFixedUnitPrice(activePO, parseFloat(e.target.value) || 0)}
                        className="w-28 px-3 py-1 rounded-md bg-white dark:bg-[#09090b] border border-blue-200 dark:border-blue-800 text-[13px] font-semibold text-blue-600 dark:text-blue-400 text-center focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                        placeholder="Set price..."
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              {activePO && (
                <div className="flex items-center justify-between px-0.5">
                  <p className="text-[12px] text-[#a1a1aa] dark:text-[#71717a]">
                    <span className="font-semibold text-[#18181b] dark:text-[#fafafa]">{activePO}</span>
                    <span className="mx-1.5 text-[#d4d4d8] dark:text-[#3f3f46]">·</span>
                    {Object.keys(groupedData!.po_groups[activePO]?.categories || {}).length} categories
                  </p>
                </div>
              )}

              <DataTable />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
