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
            setOpen(false);
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
            date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
            time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        };
    };

    return (
        <>
            {/* Mobile toggle */}
            <button
                onClick={() => setOpen(true)}
                className="lg:hidden fixed top-3.5 left-3 z-50 p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-600 transition-premium shadow-sm"
                id="sidebar-toggle"
                aria-label="Open menu"
            >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Mobile overlay */}
            {open && (
                <div
                    className="lg:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed lg:relative z-50 lg:z-auto
                    w-[260px] bg-white border-r border-slate-100
                    flex flex-col h-full select-none
                    transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                    ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
                `}
                id="sidebar"
            >
                {/* Brand */}
                <div className="px-5 py-5 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-[14px] font-bold text-slate-900 tracking-tight leading-none">PO Sorter</h1>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">v3.0 · K.A. Design</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="lg:hidden p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-premium"
                            aria-label="Close menu"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* History */}
                <div className="flex-1 overflow-y-auto px-3 py-3">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <h2 className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.12em]">Recent Files</h2>
                        <button
                            onClick={loadHistory}
                            className="text-slate-300 hover:text-indigo-500 transition-premium p-0.5 rounded"
                            title="Refresh"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>

                    {history.length === 0 ? (
                        <div className="text-center py-10">
                            <div className="w-10 h-10 mx-auto mb-2.5 rounded-full bg-slate-50 flex items-center justify-center">
                                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-[11px] text-slate-400">No uploads yet</p>
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {history.map((item) => {
                                const { date, time } = formatDate(item.upload_date);
                                const isLoading = loadingId === item.id;
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => handleLoad(item.id)}
                                        className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-premium
                                            ${isLoading ? "bg-indigo-50" : "hover:bg-slate-50 active:bg-slate-100"}`}
                                        role="button"
                                        tabIndex={0}
                                        id={`history-${item.id}`}
                                    >
                                        <div className={`w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center transition-premium
                                            ${isLoading ? "bg-indigo-100" : "bg-slate-50 group-hover:bg-white"}`}>
                                            {isLoading ? (
                                                <div className="w-3 h-3 border-[1.5px] border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-premium" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] text-slate-600 truncate font-medium group-hover:text-slate-900 transition-premium">
                                                {item.filename}
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-0">
                                                {date} · {time}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(item.id, e)}
                                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-300 hover:text-red-500 transition-all"
                                            title="Delete"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="px-5 py-3 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 text-center font-medium">Garment Accessories Automation</p>
                </div>
            </aside>
        </>
    );
}
