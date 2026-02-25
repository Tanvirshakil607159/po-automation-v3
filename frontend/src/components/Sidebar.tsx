"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { fetchHistory, fetchHistoryItem, deleteHistoryItem } from "@/lib/api";

export default function Sidebar() {
    const { history, setHistory, setUploadResult } = useAppStore();
    const [loadingId, setLoadingId] = useState<number | null>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const items = await fetchHistory();
            setHistory(items);
        } catch {
            // API not reachable yet
        }
    };

    const handleLoad = async (id: number) => {
        setLoadingId(id);
        try {
            const record = await fetchHistoryItem(id);
            setUploadResult({
                id: record.id,
                filename: record.filename,
                total_rows: 0,
                categories_count: Object.keys(record.parsed_data.po_groups || record.parsed_data.categories || {}).length,
                data: record.parsed_data,
            });
            setOpen(false); // Close sidebar on mobile after selection
        } catch (err) {
            console.error("Failed to load history item:", err);
        } finally {
            setLoadingId(null);
        }
    };

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Delete this entry?")) return;
        try {
            await deleteHistoryItem(id);
            await loadHistory();
        } catch (err) {
            console.error("Failed to delete:", err);
        }
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return {
            date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }),
            time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        };
    };

    return (
        <>
            {/* Mobile hamburger button */}
            <button
                onClick={() => setOpen(true)}
                className="lg:hidden fixed top-3.5 left-3 z-50 p-2 rounded-xl bg-gray-800/90 backdrop-blur border border-gray-700 text-gray-300 hover:text-white transition-colors"
                id="sidebar-toggle"
                aria-label="Open menu"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Overlay for mobile */}
            {open && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Sidebar panel */}
            <aside
                className={`
          fixed lg:relative z-50 lg:z-auto
          w-72 bg-gray-900/95 lg:bg-gray-900/70 backdrop-blur-xl border-r border-gray-800
          flex flex-col h-full
          transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
                id="sidebar"
            >
                {/* Header */}
                <div className="p-5 border-b border-gray-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-base font-bold text-white tracking-tight">PO Sorter</h1>
                                <p className="text-[11px] text-gray-500 font-medium">v3.0 • K.A. Design</p>
                            </div>
                        </div>
                        {/* Close button for mobile */}
                        <button
                            onClick={() => setOpen(false)}
                            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
                            aria-label="Close menu"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* History List */}
                <div className="flex-1 overflow-y-auto p-3">
                    <div className="flex items-center justify-between px-2 mb-3">
                        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">History</h2>
                        <button
                            onClick={loadHistory}
                            className="text-gray-500 hover:text-amber-400 transition-colors p-1 rounded"
                            title="Refresh"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>

                    {history.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-800 flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-xs text-gray-600">No uploads yet</p>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {history.map((item) => {
                                const { date, time } = formatDate(item.upload_date);
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => handleLoad(item.id)}
                                        className="w-full group flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer
                      hover:bg-gray-800/80 active:scale-[0.98]"
                                        role="button"
                                        tabIndex={0}
                                        id={`history-${item.id}`}
                                    >
                                        <div className="mt-0.5 w-8 h-8 flex-shrink-0 rounded-lg bg-gray-800 flex items-center justify-center
                      group-hover:bg-amber-500/10 transition-colors">
                                            <svg className="w-4 h-4 text-gray-500 group-hover:text-amber-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-300 truncate group-hover:text-white transition-colors">
                                                {loadingId === item.id ? "Loading..." : item.filename}
                                            </p>
                                            <p className="text-[11px] text-gray-600 mt-0.5">
                                                {date} • {time}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(item.id, e)}
                                            className="opacity-0 group-hover:opacity-100 mt-1 p-1 rounded text-gray-600 hover:text-red-400 transition-all"
                                            title="Delete"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-800">
                    <p className="text-[10px] text-gray-600 text-center">Garment Accessories Automation</p>
                </div>
            </aside>
        </>
    );
}
