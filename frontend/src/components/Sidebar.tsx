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
                className="lg:hidden fixed top-3.5 left-3 z-50 p-2 rounded-lg bg-white dark:bg-[#18181b] border border-[#e5e5e5] dark:border-[#27272a] text-[#71717a] dark:text-[#a1a1aa]"
                id="sidebar-toggle" aria-label="Open menu"
            >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {open && (
                <div className="lg:hidden fixed inset-0 bg-black/5 dark:bg-black/40 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
            )}

            <aside className={`fixed lg:relative z-50 lg:z-auto w-[240px] bg-white dark:bg-[#18181b] border-r border-[#e5e5e5] dark:border-[#27272a]
                flex flex-col h-full transition-transform duration-300
                ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
                id="sidebar"
            >
                {/* Brand */}
                <div className="px-5 py-5 border-b border-[#e5e5e5] dark:border-[#27272a]">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-[14px] font-bold text-[#18181b] dark:text-[#fafafa] leading-none">PO Sorter</h1>
                            <p className="text-[10px] text-[#a1a1aa] dark:text-[#52525b] font-medium mt-1">v3.0 · K.A. Design</p>
                        </div>
                        <button onClick={() => setOpen(false)} className="lg:hidden p-1 rounded text-[#a1a1aa] dark:text-[#52525b] hover:text-[#18181b] dark:hover:text-[#fafafa]" aria-label="Close">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* History */}
                <div className="flex-1 overflow-y-auto px-3 py-3">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <h2 className="text-[10px] font-semibold text-[#a1a1aa] dark:text-[#52525b] uppercase tracking-[0.1em]">Recent Files</h2>
                        <button onClick={loadHistory} className="text-[#a1a1aa] dark:text-[#52525b] hover:text-[#18181b] dark:hover:text-[#fafafa] p-0.5 rounded transition-colors" title="Refresh">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>

                    {history.length === 0 ? (
                        <div className="text-center py-10">
                            <svg className="w-5 h-5 mx-auto mb-2 text-[#d4d4d8] dark:text-[#3f3f46]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-[11px] text-[#a1a1aa] dark:text-[#52525b]">No uploads yet</p>
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {history.map((item) => {
                                const { date, time } = formatDate(item.upload_date);
                                return (
                                    <div key={item.id} onClick={() => handleLoad(item.id)}
                                        className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#27272a] transition-colors"
                                        role="button" tabIndex={0} id={`history-${item.id}`}>
                                        <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                                            {loadingId === item.id ? (
                                                <div className="w-3 h-3 rounded-full animate-spin border-[1.5px] border-[#e5e5e5] dark:border-[#3f3f46] border-t-[#18181b] dark:border-t-[#fafafa]" />
                                            ) : (
                                                <svg className="w-3.5 h-3.5 text-[#d4d4d8] dark:text-[#3f3f46] group-hover:text-[#71717a] dark:group-hover:text-[#a1a1aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] text-[#71717a] dark:text-[#a1a1aa] truncate font-medium group-hover:text-[#18181b] dark:group-hover:text-[#fafafa]">{item.filename}</p>
                                            <p className="text-[10px] text-[#a1a1aa] dark:text-[#52525b]">{date} · {time}</p>
                                        </div>
                                        <button onClick={(e) => handleDelete(item.id, e)}
                                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#a1a1aa] hover:text-red-500 dark:text-[#52525b] dark:hover:text-red-400 transition-all" title="Delete">
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
                <div className="px-5 py-3 border-t border-[#e5e5e5] dark:border-[#27272a]">
                    <p className="text-[10px] text-[#a1a1aa] dark:text-[#3f3f46] text-center">Garment Accessories Automation</p>
                </div>
            </aside>
        </>
    );
}
