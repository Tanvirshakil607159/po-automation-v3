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
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-base)" }}>
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* ─── Header ─── */}
        <header className="flex items-center justify-between px-5 sm:px-8 py-4"
          style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-light)" }}>
          <div className="pl-10 lg:pl-0 min-w-0">
            {hasData ? (
              <div className="animate-fade-up">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full animate-soft-pulse" style={{ background: "var(--success)" }} />
                  <h1 className="text-[15px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                    {uploadResult?.filename}
                  </h1>
                </div>
                <p className="text-[12px] mt-0.5 font-medium" style={{ color: "var(--text-muted)" }}>
                  {poNames.length} PO{poNames.length > 1 ? "s" : ""} · {uploadResult?.total_rows} rows
                </p>
              </div>
            ) : (
              <h1 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
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
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200"
                  style={{ background: "var(--bg-base)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--border-light)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-base)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                  id="new-upload-btn"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New
                </button>
                <button
                  onClick={clearUpload}
                  className="sm:hidden p-2 rounded-lg transition-all"
                  style={{ background: "var(--bg-base)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
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
            <div className="max-w-xl mx-auto mt-16 sm:mt-24 px-4 animate-fade-up">
              <div className="text-center mb-10">
                {/* Logo */}
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5 shadow-sm"
                  style={{ background: "linear-gradient(135deg, var(--accent), #4a6e5e)" }}>
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: "var(--accent)" }}>
                  K.A. Design Accessories Ltd.
                </p>
                <h2 className="text-2xl sm:text-[28px] font-bold tracking-tight leading-tight mb-3" style={{ color: "var(--text-primary)" }}>
                  PO to Item-Wise Sheets
                </h2>
                <p className="text-[14px] leading-relaxed max-w-sm mx-auto" style={{ color: "var(--text-muted)" }}>
                  Upload your Purchase Order PDF — we&apos;ll group by PO, sort by item, and calculate consumption automatically.
                </p>
              </div>

              <UploadZone />

              <div className="grid grid-cols-3 gap-3 mt-8">
                {[
                  { icon: "📄", title: "Smart Parsing", desc: "Auto-detect tables" },
                  { icon: "🔀", title: "PO Sorting", desc: "Group & categorize" },
                  { icon: "🧮", title: "Calculator", desc: "Cons + Wastage" },
                ].map((f) => (
                  <div key={f.title} className="card text-center p-4 transition-all duration-200 group cursor-default">
                    <span className="text-xl inline-block group-hover:scale-110 transition-transform duration-200">{f.icon}</span>
                    <p className="text-[12px] font-semibold mt-2" style={{ color: "var(--text-primary)" }}>{f.title}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6 space-y-4 animate-fade-up">
              {/* ─── PO Tabs ─── */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2 px-0.5" style={{ color: "var(--text-muted)" }}>
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
                        className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all duration-200"
                        style={isActive ? {
                          background: "var(--accent)", color: "#fff",
                          boxShadow: "0 2px 8px rgba(91,122,106,0.3)"
                        } : {
                          background: "var(--bg-card)", color: "var(--text-secondary)",
                          border: "1px solid var(--border-light)",
                          boxShadow: "0 1px 3px rgba(60,50,40,0.04)"
                        }}
                        id={`po-tab-${idx}`}
                      >
                        <svg className="w-3.5 h-3.5 hidden sm:block opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {po}
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                          style={isActive ? { background: "rgba(255,255,255,0.2)" } : { background: "var(--bg-base)", color: "var(--text-muted)" }}>
                          {catCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ─── Info ─── */}
              {activePO && (
                <div className="flex items-center justify-between px-1">
                  <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                    <span className="font-semibold" style={{ color: "var(--accent)" }}>{activePO}</span>
                    <span className="mx-1.5" style={{ color: "var(--border)" }}>·</span>
                    {Object.keys(groupedData.po_groups[activePO]?.categories || {}).length} categories
                  </p>
                  <div className="hidden sm:flex items-center gap-4 text-[11px]" style={{ color: "var(--text-muted)" }}>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-sm" style={{ background: "var(--warm-amber-light)", border: "1px solid var(--warm-amber)" }} />
                      Editable
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-sm" style={{ background: "var(--success-light)", border: "1px solid var(--success)" }} />
                      Auto-Calc
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
