"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";

const THREAD_DIVISORS: Record<string, number> = { "50/2": 19202.4, "40/2": 15362 };

function isThreadCategory(name: string): boolean {
    const low = name.toLowerCase();
    return low.includes("thread") || low.includes("sewing");
}

interface ThreadSetting { count: string; coneLength: number; }

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function DataTable() {
    const { groupedData, activePO, consumptionValues, setConsumption } = useAppStore();
    const [threadSettings, setThreadSettings] = useState<Record<string, ThreadSetting>>({});

    if (!groupedData || !activePO || !groupedData.po_groups[activePO]) return null;

    const categories = groupedData.po_groups[activePO].categories;
    const headers = groupedData.headers;

    const qtyColIndex = headers.findIndex((h: string) => {
        const low = h.toLowerCase();
        return low.includes("qty") || low.includes("quantity");
    });

    const getQty = (row: Record<string, string>): number => {
        if (qtyColIndex < 0) return 0;
        const val = row[headers[qtyColIndex]] || "0";
        return parseFloat(val.replace(/,/g, "")) || 0;
    };

    const getCons = (po: string, cat: string, subKey: string, rowIdx: number) =>
        consumptionValues[po]?.[`${cat}::${subKey}`]?.[String(rowIdx)]?.consumption ?? 1;
    const getWastage = (po: string, cat: string, subKey: string, rowIdx: number) =>
        consumptionValues[po]?.[`${cat}::${subKey}`]?.[String(rowIdx)]?.wastage ?? 5;
    const calcTotal = (po: string, cat: string, subKey: string, rowIdx: number, qty: number) => {
        const c = getCons(po, cat, subKey, rowIdx);
        const w = getWastage(po, cat, subKey, rowIdx);
        return qty * c * (1 + w / 100);
    };

    const getConsFlat = (po: string, cat: string, rowIdx: number) =>
        consumptionValues[po]?.[cat]?.[String(rowIdx)]?.consumption ?? 1;
    const getWastageFlat = (po: string, cat: string, rowIdx: number) =>
        consumptionValues[po]?.[cat]?.[String(rowIdx)]?.wastage ?? 5;
    const calcTotalFlat = (po: string, cat: string, rowIdx: number, qty: number) => {
        const c = getConsFlat(po, cat, rowIdx);
        const w = getWastageFlat(po, cat, rowIdx);
        return qty * c * (1 + w / 100);
    };

    const getTS = (k: string): ThreadSetting => threadSettings[k] || { count: "50/2", coneLength: 0 };
    const updateTS = (k: string, f: keyof ThreadSetting, v: string | number) => {
        setThreadSettings(p => ({ ...p, [k]: { ...getTS(k), [f]: v } }));
    };

    const renderTable = (rows: Record<string, string>[], catKey: string, subKey: string, isThread: boolean) => {
        let grandTotal = 0, grandQty = 0;
        const isFlat = subKey === "_flat";
        rows.forEach((row, idx) => {
            const qty = getQty(row);
            grandQty += qty;
            grandTotal += isFlat ? calcTotalFlat(activePO, catKey, idx, qty) : calcTotal(activePO, catKey, subKey, idx, qty);
        });

        const ts = getTS(subKey);
        const divisor = THREAD_DIVISORS[ts.count] || 19202.4;
        const rawWeight = isThread && ts.coneLength > 0 && grandTotal > 0 ? grandTotal * (ts.coneLength / divisor) : 0;
        const threadWeight = Math.ceil(rawWeight);

        return (
            <div key={subKey}>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                        <thead>
                            <tr>
                                <th className="px-3 py-2.5 text-left text-[10px] font-medium text-[#a1a1aa] dark:text-[#52525b] uppercase tracking-wider bg-[#fafafa] dark:bg-[#09090b] border-b border-[#e5e5e5] dark:border-[#27272a]">#</th>
                                {headers.map((h: string) => (
                                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-medium text-[#a1a1aa] dark:text-[#52525b] uppercase tracking-wider bg-[#fafafa] dark:bg-[#09090b] border-b border-[#e5e5e5] dark:border-[#27272a] whitespace-nowrap">{h}</th>
                                ))}
                                <th className="px-3 py-2.5 text-center text-[10px] font-medium text-[#d97706] dark:text-[#fbbf24] uppercase tracking-wider bg-[#fafafa] dark:bg-[#09090b] border-b border-[#e5e5e5] dark:border-[#27272a] whitespace-nowrap">Cons/Unit</th>
                                <th className="px-3 py-2.5 text-center text-[10px] font-medium text-[#d97706] dark:text-[#fbbf24] uppercase tracking-wider bg-[#fafafa] dark:bg-[#09090b] border-b border-[#e5e5e5] dark:border-[#27272a] whitespace-nowrap">Wastage %</th>
                                <th className="px-3 py-2.5 text-center text-[10px] font-medium text-[#16a34a] dark:text-[#4ade80] uppercase tracking-wider bg-[#fafafa] dark:bg-[#09090b] border-b border-[#e5e5e5] dark:border-[#27272a] whitespace-nowrap">Total Req.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, rowIdx) => {
                                const qty = getQty(row);
                                const total = isFlat ? calcTotalFlat(activePO, catKey, rowIdx, qty) : calcTotal(activePO, catKey, subKey, rowIdx, qty);
                                const cons = isFlat ? getConsFlat(activePO, catKey, rowIdx) : getCons(activePO, catKey, subKey, rowIdx);
                                const wastage = isFlat ? getWastageFlat(activePO, catKey, rowIdx) : getWastage(activePO, catKey, subKey, rowIdx);
                                const consKey = isFlat ? catKey : `${catKey}::${subKey}`;

                                return (
                                    <tr key={rowIdx} className="border-b border-[#f5f5f5] dark:border-[#1a1a1e] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1e] transition-colors">
                                        <td className="px-3 py-2 text-[11px] text-[#a1a1aa] dark:text-[#52525b]">{rowIdx + 1}</td>
                                        {headers.map((h: string) => (
                                            <td key={h} className="px-3 py-2 text-[12px] text-[#52525b] dark:text-[#a1a1aa] whitespace-nowrap">{row[h] || "—"}</td>
                                        ))}
                                        <td className="px-2 py-1.5">
                                            <input type="number" min="0" step="0.01" value={cons}
                                                onChange={(e) => setConsumption(activePO, consKey, rowIdx, "consumption", parseFloat(e.target.value) || 0)}
                                                className="w-16 px-2 py-1.5 rounded-md bg-white dark:bg-[#09090b] border border-[#e5e5e5] dark:border-[#27272a] text-[#18181b] dark:text-[#fafafa] text-center text-[12px]
                                                    focus:border-[#2563eb] dark:focus:border-[#60a5fa] focus:ring-2 focus:ring-[#2563eb]/10 dark:focus:ring-[#60a5fa]/10 transition-all"
                                                id={`cons-${catKey}-${subKey}-${rowIdx}`} />
                                        </td>
                                        <td className="px-2 py-1.5">
                                            <input type="number" min="0" max="100" step="0.5" value={wastage}
                                                onChange={(e) => setConsumption(activePO, consKey, rowIdx, "wastage", parseFloat(e.target.value) || 0)}
                                                className="w-16 px-2 py-1.5 rounded-md bg-white dark:bg-[#09090b] border border-[#e5e5e5] dark:border-[#27272a] text-[#18181b] dark:text-[#fafafa] text-center text-[12px]
                                                    focus:border-[#2563eb] dark:focus:border-[#60a5fa] focus:ring-2 focus:ring-[#2563eb]/10 dark:focus:ring-[#60a5fa]/10 transition-all"
                                                id={`waste-${catKey}-${subKey}-${rowIdx}`} />
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <span className="text-[12px] font-semibold text-[#16a34a] dark:text-[#4ade80]">{total > 0 ? total.toFixed(2) : "—"}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-[#fafafa] dark:bg-[#09090b] border-t border-[#e5e5e5] dark:border-[#27272a]">
                                <td className="px-3 py-2.5 text-[11px] font-bold text-[#a1a1aa] dark:text-[#52525b]">Σ</td>
                                {headers.map((h: string, i: number) => (
                                    <td key={h} className="px-3 py-2.5 text-[12px] font-bold">
                                        {i === qtyColIndex ? <span className="text-[#18181b] dark:text-[#fafafa]">{grandQty.toLocaleString()}</span> : ""}
                                    </td>
                                ))}
                                <td colSpan={2} className="px-3 py-2.5 text-right text-[10px] font-bold text-[#a1a1aa] dark:text-[#52525b] uppercase tracking-wider">Grand Total</td>
                                <td className="px-3 py-2.5 text-center text-[13px] font-bold text-[#16a34a] dark:text-[#4ade80]">{grandTotal > 0 ? grandTotal.toFixed(2) : "—"}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {isThread && (
                    <div className="px-4 py-3 bg-[#f0fdf4] dark:bg-[#052e16] border-t border-[#e5e5e5] dark:border-[#27272a]">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-[11px] font-semibold text-[#16a34a] dark:text-[#4ade80] uppercase tracking-wide">🧵 Weight</span>
                            <div className="h-4 w-px bg-[#e5e5e5] dark:bg-[#27272a]" />
                            <div className="flex items-center gap-1.5">
                                <label className="text-[10px] text-[#a1a1aa] dark:text-[#52525b]">Count</label>
                                <select value={ts.count} onChange={(e) => updateTS(subKey, "count", e.target.value)}
                                    className="px-2 py-1 rounded-md bg-white dark:bg-[#09090b] border border-[#e5e5e5] dark:border-[#27272a] text-[#18181b] dark:text-[#fafafa] text-[12px] cursor-pointer"
                                    id={`thread-count-${subKey}`}>
                                    <option value="50/2">50/2</option>
                                    <option value="40/2">40/2</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <label className="text-[10px] text-[#a1a1aa] dark:text-[#52525b]">Cone (m)</label>
                                <input type="number" min="0" step="100" value={ts.coneLength || ""} placeholder="5000"
                                    onChange={(e) => updateTS(subKey, "coneLength", parseFloat(e.target.value) || 0)}
                                    className="w-20 px-2 py-1 rounded-md bg-white dark:bg-[#09090b] border border-[#e5e5e5] dark:border-[#27272a] text-[#18181b] dark:text-[#fafafa] text-[12px] placeholder:text-[#d4d4d8] dark:placeholder:text-[#3f3f46]"
                                    id={`cone-length-${subKey}`} />
                            </div>
                            {threadWeight > 0 && (
                                <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-[#09090b] border border-[#e5e5e5] dark:border-[#27272a]">
                                    <span className="text-[12px] font-bold text-[#16a34a] dark:text-[#4ade80]" id={`thread-weight-${subKey}`}>{threadWeight} lbs</span>
                                    <span className="text-[10px] text-[#a1a1aa] dark:text-[#52525b]">({Math.ceil(threadWeight * 0.453592)} kg)</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-4" id="data-table-wrapper">
            {Object.entries(categories).map(([catName, catData]: [string, any]) => {
                const isThread = isThreadCategory(catName);
                const hasSubGroups = catData && typeof catData === "object" && "_sub_groups" in catData;

                return (
                    <div key={catName} className="rounded-lg overflow-hidden bg-white dark:bg-[#18181b] border border-[#e5e5e5] dark:border-[#27272a]">
                        {/* Category Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e5] dark:border-[#27272a]">
                            <h3 className="text-[13px] font-semibold text-[#18181b] dark:text-[#fafafa] flex items-center gap-2.5">
                                <span className={`w-1 h-4 rounded-full ${isThread ? "bg-[#16a34a] dark:bg-[#4ade80]" : "bg-[#2563eb] dark:bg-[#60a5fa]"}`} />
                                {catName}
                            </h3>
                            {hasSubGroups && (
                                <span className="text-[11px] font-medium text-[#a1a1aa] dark:text-[#52525b]">
                                    {Object.keys(catData._sub_groups).length} groups
                                </span>
                            )}
                            {!hasSubGroups && Array.isArray(catData) && (
                                <span className="text-[11px] text-[#a1a1aa] dark:text-[#52525b]">{catData.length} items</span>
                            )}
                        </div>

                        {hasSubGroups ? (
                            <div>
                                {Object.entries(catData._sub_groups).map(([subName, subRows]: [string, any]) => (
                                    <div key={subName}>
                                        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#f5f5f5] dark:border-[#1a1a1e] bg-[#fafafa] dark:bg-[#09090b]">
                                            <span className={`w-1 h-1 rounded-full ${isThread ? "bg-[#16a34a] dark:bg-[#4ade80]" : "bg-[#2563eb] dark:bg-[#60a5fa]"}`} />
                                            <span className="text-[11px] font-medium text-[#71717a] dark:text-[#a1a1aa]">{subName}</span>
                                            <span className="text-[10px] text-[#a1a1aa] dark:text-[#52525b]">{subRows.length}</span>
                                        </div>
                                        {renderTable(subRows, catName, subName, isThread)}
                                    </div>
                                ))}

                                {/* Grand Total for all thread sub-groups */}
                                {isThread && (() => {
                                    let allThreadTotal = 0;
                                    let allThreadWeightLbs = 0;
                                    let allConeLengthSum = 0;
                                    const subEntries = Object.entries(catData._sub_groups) as [string, any[]][];

                                    subEntries.forEach(([subName, subRows]) => {
                                        let subTotal = 0;
                                        subRows.forEach((row: any, idx: number) => {
                                            const qty = getQty(row);
                                            subTotal += calcTotal(activePO, catName, subName, idx, qty);
                                        });
                                        allThreadTotal += subTotal;

                                        const ts = getTS(subName);
                                        const divisor = THREAD_DIVISORS[ts.count] || 19202.4;
                                        if (ts.coneLength > 0 && subTotal > 0) {
                                            allConeLengthSum += ts.coneLength;
                                            allThreadWeightLbs += Math.ceil(subTotal * (ts.coneLength / divisor));
                                        }
                                    });

                                    if (allThreadTotal <= 0) return null;

                                    return (
                                        <div className="px-4 py-3 bg-[#ecfdf5] dark:bg-[#022c22] border-t-2 border-[#16a34a]/30 dark:border-[#4ade80]/20">
                                            <div className="flex flex-wrap items-center gap-4">
                                                <span className="text-[11px] font-bold text-[#16a34a] dark:text-[#4ade80] uppercase tracking-wide">
                                                    🧵 All Threads Summary
                                                </span>
                                                <div className="h-4 w-px bg-[#16a34a]/20 dark:bg-[#4ade80]/20" />
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] text-[#a1a1aa] dark:text-[#52525b]">Total Req.</span>
                                                    <span className="text-[12px] font-bold text-[#18181b] dark:text-[#fafafa]">{allThreadTotal.toFixed(2)}</span>
                                                </div>
                                                {allThreadWeightLbs > 0 && (
                                                    <>
                                                        <div className="h-4 w-px bg-[#16a34a]/20 dark:bg-[#4ade80]/20" />
                                                        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-[#09090b] border border-[#16a34a]/20 dark:border-[#4ade80]/20">
                                                            <span className="text-[10px] text-[#a1a1aa] dark:text-[#52525b]">Total Weight</span>
                                                            <span className="text-[13px] font-bold text-[#16a34a] dark:text-[#4ade80]">{allThreadWeightLbs} lbs</span>
                                                            <span className="text-[10px] text-[#a1a1aa] dark:text-[#52525b]">({Math.ceil(allThreadWeightLbs * 0.453592)} kg)</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : (
                            Array.isArray(catData) && renderTable(catData, catName, "_flat", false)
                        )}
                    </div>
                );
            })}
        </div>
    );
}
