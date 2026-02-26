"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { fetchHistory, fetchHistoryItem, deleteHistoryItem } from "@/lib/api";

export default function Sidebar() {
    const { history, setHistory, setUploadResult } = useAppStore();
    const [loadingId, setLoadingId] = useState<number | null>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => { loadHistory(); }, []);

    const loadHistory = async () => {
        try { const items = await fetchHistory(); setHistory(items); } catch { /* */ }
    };

    const handleLoad = async (id: number) => {
        setLoadingId(id);
        try {
            const record = await fetchHistoryItem(id);
            setUploadResult({
                id: record.id, filename: record.filename, total_rows: 0,
                categories_count: Object.keys(record.parsed_data.po_groups || record.parsed_data.categories || {}).length,
                data: record.parsed_data,
            });
            setOpen(false);
        } catch (err) { console.error("Failed to load:", err); }
        finally { setLoadingId(null); }
    };

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Delete this entry?")) return;
        try { await deleteHistoryItem(id); await loadHistory(); }
        catch (err) { console.error("Delete failed:", err); }
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
                className="lg:hidden fixed top-3.5 left-3 z-50 p-2 rounded-lg bg-[#fffefb] border border-[#e6e0d6] text-[#a09888] shadow-sm"
                id="sidebar-toggle" aria-label="Open menu"
            >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {open && (
                <div className="lg:hidden fixed inset-0 bg-black/10 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
            )}

            <aside className={`fixed lg:relative z-50 lg:z-auto w-[260px] bg-[#faf8f4] border-r border-[#eee9e1]
                flex flex-col h-full transition-transform duration-300
                ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
                id="sidebar"
            >
                {/* Brand */}
                <div className="px-5 py-5 border-b border-[#eee9e1]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-[#5b7a6a] flex items-center justify-center shadow-sm">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-[14px] font-bold text-[#3b3730] leading-none">PO Sorter</h1>
                                <p className="text-[10px] text-[#a09888] font-medium mt-0.5">v3.0 · K.A. Design</p>
                            </div>
                        </div>
                        <button onClick={() => setOpen(false)} className="lg:hidden p-1 rounded text-[#a09888]" aria-label="Close">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* History */}
                <div className="flex-1 overflow-y-auto px-3 py-3">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <h2 className="text-[10px] font-semibold text-[#a09888] uppercase tracking-[0.12em]">Recent Files</h2>
                        <button onClick={loadHistory} className="text-[#a09888] hover:text-[#5b7a6a] p-0.5 rounded" title="Refresh">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>

                    {history.length === 0 ? (
                        <div className="text-center py-10">
                            <div className="w-10 h-10 mx-auto mb-2.5 rounded-full bg-[#f4f1ec] flex items-center justify-center">
                                <svg className="w-5 h-5 text-[#a09888]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-[11px] text-[#a09888]">No uploads yet</p>
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {history.map((item) => {
                                const { date, time } = formatDate(item.upload_date);
                                return (
                                    <div key={item.id} onClick={() => handleLoad(item.id)}
                                        className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-[#f4f1ec] transition-colors"
                                        role="button" tabIndex={0} id={`history-${item.id}`}>
                                        <div className="w-7 h-7 flex-shrink-0 rounded-lg bg-[#f4f1ec] flex items-center justify-center group-hover:bg-[#eee9e1]">
                                            {loadingId === item.id ? (
                                                <div className="w-3 h-3 rounded-full animate-spin border-[1.5px] border-[#e6e0d6] border-t-[#5b7a6a]" />
                                            ) : (
                                                <svg className="w-3.5 h-3.5 text-[#a09888] group-hover:text-[#5b7a6a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] text-[#7a7265] truncate font-medium group-hover:text-[#3b3730]">{item.filename}</p>
                                            <p className="text-[10px] text-[#a09888]">{date} · {time}</p>
                                        </div>
                                        <button onClick={(e) => handleDelete(item.id, e)}
                                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#a09888] hover:text-red-500 transition-all" title="Delete">
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
                <div className="px-5 py-3 border-t border-[#eee9e1]">
                    <p className="text-[10px] text-[#a09888] text-center font-medium">Garment Accessories Automation</p>
                </div>
            </aside>
        </>
    );
}
