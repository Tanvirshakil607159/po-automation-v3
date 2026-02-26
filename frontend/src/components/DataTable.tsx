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
                                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#a09888] uppercase tracking-wider bg-[#f4f1ec] border-b border-[#eee9e1]">#</th>
                                {headers.map((h: string) => (
                                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#a09888] uppercase tracking-wider bg-[#f4f1ec] border-b border-[#eee9e1] whitespace-nowrap">{h}</th>
                                ))}
                                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-[#c4956a] uppercase tracking-wider bg-[#faf3ec] border-b border-[#ead9c8] whitespace-nowrap">Cons/Unit</th>
                                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-[#c4956a] uppercase tracking-wider bg-[#faf3ec] border-b border-[#ead9c8] whitespace-nowrap">Wastage %</th>
                                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-[#6a9a7b] uppercase tracking-wider bg-[#edf5f0] border-b border-[#c8ddd0] whitespace-nowrap">Total Req.</th>
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
                                    <tr key={rowIdx} className="border-b border-[#eee9e1] hover:bg-[#f0ede8] transition-colors">
                                        <td className="px-3 py-2 text-[11px] text-[#a09888] font-medium">{rowIdx + 1}</td>
                                        {headers.map((h: string) => (
                                            <td key={h} className="px-3 py-2 text-[12px] text-[#7a7265] whitespace-nowrap">{row[h] || "—"}</td>
                                        ))}
                                        <td className="px-2 py-1.5 bg-[#faf3ec]/50">
                                            <input type="number" min="0" step="0.01" value={cons}
                                                onChange={(e) => setConsumption(activePO, consKey, rowIdx, "consumption", parseFloat(e.target.value) || 0)}
                                                className="w-16 px-2 py-1.5 rounded-md bg-[#fffefb] border border-[#e6e0d6] text-[#3b3730] text-center text-[12px] font-medium
                                                    focus:border-[#5b7a6a] focus:ring-2 focus:ring-[#5b7a6a]/10 transition-all"
                                                id={`cons-${catKey}-${subKey}-${rowIdx}`} />
                                        </td>
                                        <td className="px-2 py-1.5 bg-[#faf3ec]/50">
                                            <input type="number" min="0" max="100" step="0.5" value={wastage}
                                                onChange={(e) => setConsumption(activePO, consKey, rowIdx, "wastage", parseFloat(e.target.value) || 0)}
                                                className="w-16 px-2 py-1.5 rounded-md bg-[#fffefb] border border-[#e6e0d6] text-[#3b3730] text-center text-[12px] font-medium
                                                    focus:border-[#5b7a6a] focus:ring-2 focus:ring-[#5b7a6a]/10 transition-all"
                                                id={`waste-${catKey}-${subKey}-${rowIdx}`} />
                                        </td>
                                        <td className="px-3 py-2 text-center bg-[#edf5f0]/50">
                                            <span className="text-[12px] font-semibold text-[#6a9a7b]">{total > 0 ? total.toFixed(2) : "—"}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-[#f4f1ec] border-t border-[#e6e0d6]">
                                <td className="px-3 py-2.5 text-[11px] font-bold text-[#a09888]">Σ</td>
                                {headers.map((h: string, i: number) => (
                                    <td key={h} className="px-3 py-2.5 text-[12px] font-bold">
                                        {i === qtyColIndex ? <span className="text-[#5b7a6a]">{grandQty.toLocaleString()}</span> : ""}
                                    </td>
                                ))}
                                <td colSpan={2} className="px-3 py-2.5 text-right text-[10px] font-bold text-[#a09888] uppercase tracking-wider">Grand Total</td>
                                <td className="px-3 py-2.5 text-center text-[13px] font-bold text-[#6a9a7b]">{grandTotal > 0 ? grandTotal.toFixed(2) : "—"}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {isThread && (
                    <div className="px-4 py-3 bg-[#eef3f0] border-t border-[#d6e5dc]">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-[11px] font-semibold text-[#5b7a6a] uppercase tracking-wide">🧵 Weight</span>
                            <div className="h-4 w-px bg-[#d6e5dc]" />
                            <div className="flex items-center gap-1.5">
                                <label className="text-[10px] text-[#a09888] font-medium">Count</label>
                                <select value={ts.count} onChange={(e) => updateTS(subKey, "count", e.target.value)}
                                    className="px-2 py-1 rounded-md bg-[#fffefb] border border-[#d6e5dc] text-[#3b3730] text-[12px] font-medium cursor-pointer"
                                    id={`thread-count-${subKey}`}>
                                    <option value="50/2">50/2</option>
                                    <option value="40/2">40/2</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <label className="text-[10px] text-[#a09888] font-medium">Cone (m)</label>
                                <input type="number" min="0" step="100" value={ts.coneLength || ""} placeholder="5000"
                                    onChange={(e) => updateTS(subKey, "coneLength", parseFloat(e.target.value) || 0)}
                                    className="w-20 px-2 py-1 rounded-md bg-[#fffefb] border border-[#d6e5dc] text-[#3b3730] text-[12px] font-medium placeholder:text-[#d4cdc3]"
                                    id={`cone-length-${subKey}`} />
                            </div>
                            {threadWeight > 0 && (
                                <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#fffefb] border border-[#d6e5dc] shadow-sm">
                                    <span className="text-[12px] font-bold text-[#5b7a6a]" id={`thread-weight-${subKey}`}>{threadWeight} lbs</span>
                                    <span className="text-[10px] text-[#a09888]">({Math.ceil(threadWeight * 0.453592)} kg)</span>
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
                    <div key={catName} className="rounded-xl overflow-hidden bg-[#fffefb] border border-[#eee9e1] shadow-sm">
                        {/* Category Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#eee9e1]">
                            <h3 className="text-[13px] font-semibold text-[#3b3730] flex items-center gap-2.5">
                                <span className={`w-1.5 h-4 rounded-full ${isThread ? "bg-[#5b7a6a]" : "bg-[#c4956a]"}`} />
                                {catName}
                            </h3>
                            {hasSubGroups && (
                                <span className="text-[11px] font-medium text-[#a09888] bg-[#f4f1ec] px-2 py-0.5 rounded-full">
                                    {Object.keys(catData._sub_groups).length} groups
                                </span>
                            )}
                            {!hasSubGroups && Array.isArray(catData) && (
                                <span className="text-[11px] font-medium text-[#a09888]">{catData.length} items</span>
                            )}
                        </div>

                        {hasSubGroups ? (
                            <div>
                                {Object.entries(catData._sub_groups).map(([subName, subRows]: [string, any]) => (
                                    <div key={subName}>
                                        <div className={`flex items-center gap-2 px-4 py-2 border-b border-[#eee9e1]
                                            ${isThread ? "bg-[#eef3f0]" : "bg-[#faf3ec]"}`}>
                                            <span className={`w-1 h-1 rounded-full ${isThread ? "bg-[#5b7a6a]" : "bg-[#c4956a]"}`} />
                                            <span className={`text-[11px] font-medium ${isThread ? "text-[#5b7a6a]" : "text-[#c4956a]"}`}>{subName}</span>
                                            <span className="text-[10px] text-[#a09888]">{subRows.length}</span>
                                        </div>
                                        {renderTable(subRows, catName, subName, isThread)}
                                    </div>
                                ))}
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
