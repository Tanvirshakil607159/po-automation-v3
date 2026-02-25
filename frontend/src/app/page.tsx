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
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* ─── Top bar ─── */}
        <header className="flex items-center justify-between px-5 sm:px-8 py-4 bg-white border-b border-slate-100">
          <div className="pl-10 lg:pl-0 min-w-0">
            {hasData ? (
              <div className="animate-fade-in">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot" />
                  <h1 className="text-[15px] font-semibold text-slate-900 truncate tracking-tight">
                    {uploadResult?.filename}
                  </h1>
                </div>
                <p className="text-[12px] text-slate-400 mt-0.5 font-medium">
                  {poNames.length} PO{poNames.length > 1 ? "s" : ""} · {uploadResult?.total_rows} rows
                </p>
              </div>
            ) : (
              <h1 className="text-[15px] font-semibold text-slate-900 tracking-tight">
                Purchase Order Processor
              </h1>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {hasData && (
              <>
                <ExportButton />
                <button
                  onClick={clearUpload}
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium text-slate-500
                    bg-slate-50 hover:bg-slate-100 hover:text-slate-700 transition-premium border border-slate-200/80"
                  id="new-upload-btn"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New
                </button>
                <button
                  onClick={clearUpload}
                  className="sm:hidden p-2 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-premium border border-slate-200/80"
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

        {/* ─── Content ─── */}
        <div className="flex-1 overflow-y-auto">
          {!hasData ? (
            <div className="max-w-xl mx-auto mt-16 sm:mt-24 px-4 animate-fade-in">
              <div className="text-center mb-10">
                {/* Logo mark */}
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200/50 mb-5">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-[0.15em] mb-3">
                  K.A. Design Accessories Ltd.
                </p>
                <h2 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight leading-tight mb-3">
                  PO to Item-Wise Sheets
                </h2>
                <p className="text-[14px] text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Upload your Purchase Order PDF—we&apos;ll group by PO, sort by item, and calculate consumption automatically.
                </p>
              </div>

              <UploadZone />

              <div className="grid grid-cols-3 gap-3 mt-8">
                {[
                  { icon: "📄", title: "Smart Parsing", desc: "Auto-detect tables" },
                  { icon: "🔀", title: "PO Sorting", desc: "Group & categorize" },
                  { icon: "🧮", title: "Calculator", desc: "Cons + Wastage" },
                ].map((f) => (
                  <div key={f.title}
                    className="text-center p-4 rounded-xl bg-white border border-slate-100 card-shadow hover:card-shadow-hover transition-premium group"
                  >
                    <span className="text-xl group-hover:scale-110 inline-block transition-transform duration-200">{f.icon}</span>
                    <p className="text-[12px] font-semibold text-slate-700 mt-2">{f.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6 space-y-4 animate-fade-in">
              {/* ─── PO Tabs ─── */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.12em] mb-2 px-0.5">
                  Purchase Orders
                </p>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" id="po-tabs">
                  {poNames.map((po, idx) => {
                    const isActive = po === activePO;
                    const catCount = Object.keys(groupedData.po_groups[po]?.categories || {}).length;
                    return (
                      <button
                        key={po}
                        onClick={() => setActivePO(po)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-premium
                          ${isActive
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-200/60"
                            : "bg-white text-slate-500 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-700 card-shadow"
                          }`}
                        id={`po-tab-${idx}`}
                      >
                        <svg className="w-3.5 h-3.5 hidden sm:block opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {po}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold
                          ${isActive ? "bg-white/20" : "bg-slate-100 text-slate-400"}`}>
                          {catCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ─── Info strip ─── */}
              {activePO && (
                <div className="flex items-center justify-between px-1">
                  <p className="text-[12px] text-slate-400">
                    <span className="font-semibold text-indigo-600">{activePO}</span>
                    <span className="mx-1.5 text-slate-300">·</span>
                    {Object.keys(groupedData.po_groups[activePO]?.categories || {}).length} categories
                  </p>
                  <div className="hidden sm:flex items-center gap-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-sm bg-amber-100 border border-amber-300/60" />
                      Editable
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-sm bg-emerald-100 border border-emerald-300/60" />
                      Auto-Calculated
                    </span>
                  </div>
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
