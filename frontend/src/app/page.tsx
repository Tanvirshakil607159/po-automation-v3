"use client";

import Sidebar from "@/components/Sidebar";
import UploadZone from "@/components/UploadZone";
import DataTable from "@/components/DataTable";
import ExportButton from "@/components/ExportButton";
import { useAppStore } from "@/lib/store";

export default function Home() {
  const { groupedData, uploadResult, activePO, setActivePO, clearUpload } = useAppStore();
  const hasData = groupedData && Object.keys(groupedData.po_groups || {}).length > 0;
  const poNames = hasData ? Object.keys(groupedData.po_groups || {}) : [];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-800/60">
          <div className="pl-10 lg:pl-0 min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-white tracking-tight truncate">
              {hasData ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                  <span className="truncate">{uploadResult?.filename}</span>
                </span>
              ) : (
                "Purchase Order Processor"
              )}
            </h1>
            {hasData && (
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                {poNames.length} PO{poNames.length > 1 ? "s" : ""} • {uploadResult?.total_rows} rows extracted
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {hasData && (
              <>
                <ExportButton />
                <button
                  onClick={clearUpload}
                  className="hidden sm:block px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-800 text-gray-400
                    hover:bg-gray-700 hover:text-white transition-all"
                  id="new-upload-btn"
                >
                  New Upload
                </button>
                <button
                  onClick={clearUpload}
                  className="sm:hidden p-2 rounded-xl bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-all"
                  id="new-upload-btn-mobile"
                  aria-label="New Upload"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {!hasData ? (
            /* Upload State */
            <div className="max-w-2xl mx-auto mt-6 sm:mt-16 px-1">
              <div className="text-center mb-6 sm:mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">K.A. Design Accessories Ltd.</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3">
                  PO to Item-Wise Sheets
                </h2>
                <p className="text-sm sm:text-base text-gray-500 max-w-md mx-auto">
                  Upload your Purchase Order PDF. We&apos;ll group by PO number first, then sort by item category
                  with integrated consumption calculation.
                </p>
              </div>

              <UploadZone />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8">
                {[
                  { icon: "📄", title: "PDF Parsing", desc: "Auto-detect tables & headers" },
                  { icon: "🔀", title: "PO → Item Sort", desc: "Group by PO, then by item" },
                  { icon: "🧮", title: "Calculator", desc: "Consumption + Wastage" },
                ].map((f) => (
                  <div key={f.title} className="p-4 rounded-xl bg-gray-800/40 border border-gray-800 text-center">
                    <span className="text-2xl">{f.icon}</span>
                    <p className="text-sm font-semibold text-gray-300 mt-2">{f.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Data View */
            <div className="space-y-3 sm:space-y-4">
              {/* PO Number Tabs — Top Level */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest px-1">Purchase Orders</p>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" id="po-tabs">
                  {poNames.map((po, idx) => {
                    const isActive = po === activePO;
                    const catCount = Object.keys(groupedData.po_groups[po]?.categories || {}).length;
                    return (
                      <button
                        key={po}
                        onClick={() => setActivePO(po)}
                        className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200
                          ${isActive
                            ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/20"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                          }`}
                        id={`po-tab-${idx}`}
                      >
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {po}
                        <span className={`text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded-full
                          ${isActive ? "bg-white/20 text-white" : "bg-gray-700 text-gray-500"}`}>
                          {catCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-800/60" />

              {/* Info bar */}
              {activePO && (
                <div className="flex items-center gap-3 px-1">
                  <p className="text-xs text-gray-400">
                    <span className="text-blue-400 font-semibold">{activePO}</span>
                    {" • "}
                    <span className="text-gray-500">{Object.keys(groupedData.po_groups[activePO]?.categories || {}).length} categories</span>
                  </p>
                  <div className="flex-1" />
                  <div className="flex items-center gap-3 text-[10px] text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-500/40" />
                      Editable
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/40" />
                      Auto-Calc
                    </span>
                  </div>
                </div>
              )}

              {/* Data Table */}
              <DataTable />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
