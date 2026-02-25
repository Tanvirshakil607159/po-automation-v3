"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";

const THREAD_DIVISORS: Record<string, number> = {
    "50/2": 19202.4,
    "40/2": 15362,
};

function isThreadCategory(name: string): boolean {
    const low = name.toLowerCase();
    return low.includes("thread") || low.includes("sewing");
}

interface ThreadSetting {
    count: string;
    coneLength: number;
}

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

    const getThreadSetting = (subKey: string): ThreadSetting =>
        threadSettings[subKey] || { count: "50/2", coneLength: 0 };

    const updateThreadSetting = (subKey: string, field: keyof ThreadSetting, value: string | number) => {
        setThreadSettings((prev) => ({
            ...prev,
            [subKey]: { ...getThreadSetting(subKey), [field]: value },
        }));
    };

    const renderTable = (
        rows: Record<string, string>[],
        catKey: string,
        subKey: string,
        isThread: boolean,
    ) => {
        let grandTotal = 0;
        let grandQty = 0;
        const isFlat = subKey === "_flat";

        rows.forEach((row, idx) => {
            const qty = getQty(row);
            grandQty += qty;
            grandTotal += isFlat
                ? calcTotalFlat(activePO, catKey, idx, qty)
                : calcTotal(activePO, catKey, subKey, idx, qty);
        });

        const ts = getThreadSetting(subKey);
        const divisor = THREAD_DIVISORS[ts.count] || 19202.4;
        const rawWeight = isThread && ts.coneLength > 0 && grandTotal > 0
            ? grandTotal * (ts.coneLength / divisor) : 0;
        const threadWeight = Math.ceil(rawWeight);

        return (
            <div key={subKey}>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                        <thead>
                            <tr>
                                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-[0.08em] bg-slate-50/80 border-b border-slate-100">#</th>
                                {headers.map((h: string) => (
                                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-[0.08em] bg-slate-50/80 border-b border-slate-100 whitespace-nowrap">{h}</th>
                                ))}
                                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-amber-600 uppercase tracking-[0.08em] bg-amber-50/60 border-b border-amber-100/60 whitespace-nowrap">Cons/Unit</th>
                                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-amber-600 uppercase tracking-[0.08em] bg-amber-50/60 border-b border-amber-100/60 whitespace-nowrap">Wastage %</th>
                                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-emerald-600 uppercase tracking-[0.08em] bg-emerald-50/60 border-b border-emerald-100/60 whitespace-nowrap">Total Req.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, rowIdx) => {
                                const qty = getQty(row);
                                const total = isFlat
                                    ? calcTotalFlat(activePO, catKey, rowIdx, qty)
                                    : calcTotal(activePO, catKey, subKey, rowIdx, qty);
                                const cons = isFlat
                                    ? getConsFlat(activePO, catKey, rowIdx)
                                    : getCons(activePO, catKey, subKey, rowIdx);
                                const wastage = isFlat
                                    ? getWastageFlat(activePO, catKey, rowIdx)
                                    : getWastage(activePO, catKey, subKey, rowIdx);
                                const consKey = isFlat ? catKey : `${catKey}::${subKey}`;

                                return (
                                    <tr key={rowIdx} className="border-b border-slate-50 hover:bg-indigo-50/30 transition-colors duration-150 group">
                                        <td className="px-3 py-2 text-[11px] text-slate-300 font-medium tabular-nums">{rowIdx + 1}</td>
                                        {headers.map((h: string) => (
                                            <td key={h} className="px-3 py-2 text-[12px] text-slate-600 whitespace-nowrap">{row[h] || "—"}</td>
                                        ))}
                                        <td className="px-2 py-1.5 bg-amber-50/30">
                                            <input
                                                type="number" min="0" step="0.01"
                                                value={cons}
                                                onChange={(e) => setConsumption(activePO, consKey, rowIdx, "consumption", parseFloat(e.target.value) || 0)}
                                                className="w-16 px-2 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 text-center text-[12px] font-medium
                                                    focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
                                                id={`cons-${catKey}-${subKey}-${rowIdx}`}
                                            />
                                        </td>
                                        <td className="px-2 py-1.5 bg-amber-50/30">
                                            <input
                                                type="number" min="0" max="100" step="0.5"
                                                value={wastage}
                                                onChange={(e) => setConsumption(activePO, consKey, rowIdx, "wastage", parseFloat(e.target.value) || 0)}
                                                className="w-16 px-2 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 text-center text-[12px] font-medium
                                                    focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
                                                id={`waste-${catKey}-${subKey}-${rowIdx}`}
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-center bg-emerald-50/30">
                                            <span className="text-[12px] font-semibold text-emerald-600 tabular-nums">
                                                {total > 0 ? total.toFixed(2) : "—"}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-50/80 border-t border-slate-200/60">
                                <td className="px-3 py-2.5 text-[11px] font-bold text-slate-400">Σ</td>
                                {headers.map((h: string, i: number) => (
                                    <td key={h} className="px-3 py-2.5 text-[12px] font-bold">
                                        {i === qtyColIndex ? (
                                            <span className="text-indigo-600 tabular-nums">{grandQty.toLocaleString()}</span>
                                        ) : ""}
                                    </td>
                                ))}
                                <td colSpan={2} className="px-3 py-2.5 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grand Total</td>
                                <td className="px-3 py-2.5 text-center">
                                    <span className="text-[13px] font-bold text-emerald-600 tabular-nums">
                                        {grandTotal > 0 ? grandTotal.toFixed(2) : "—"}
                                    </span>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Thread Weight Calculator */}
                {isThread && (
                    <div className="px-4 py-3 bg-gradient-to-r from-indigo-50/60 to-violet-50/40 border-t border-indigo-100/60">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[12px] font-semibold text-indigo-600">🧵</span>
                                <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wide">Weight</span>
                            </div>
                            <div className="h-4 w-px bg-indigo-200/60" />
                            <div className="flex items-center gap-1.5">
                                <label className="text-[10px] text-slate-400 font-medium">Count</label>
                                <select
                                    value={ts.count}
                                    onChange={(e) => updateThreadSetting(subKey, "count", e.target.value)}
                                    className="px-2 py-1 rounded-md bg-white border border-indigo-200/80 text-indigo-700 text-[12px] font-medium
                                        focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
                                    id={`thread-count-${subKey}`}
                                >
                                    <option value="50/2">50/2</option>
                                    <option value="40/2">40/2</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <label className="text-[10px] text-slate-400 font-medium">Cone (m)</label>
                                <input
                                    type="number" min="0" step="100"
                                    value={ts.coneLength || ""}
                                    onChange={(e) => updateThreadSetting(subKey, "coneLength", parseFloat(e.target.value) || 0)}
                                    placeholder="5000"
                                    className="w-20 px-2 py-1 rounded-md bg-white border border-indigo-200/80 text-indigo-700 text-[12px] font-medium
                                        focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300"
                                    id={`cone-length-${subKey}`}
                                />
                            </div>
                            {threadWeight > 0 && (
                                <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-indigo-200/60 card-shadow">
                                    <span className="text-[12px] font-bold text-indigo-600 tabular-nums" id={`thread-weight-${subKey}`}>
                                        {threadWeight} lbs
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        ({Math.ceil(threadWeight * 0.453592)} kg)
                                    </span>
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
                    <div key={catName} className="rounded-xl overflow-hidden bg-white card-shadow hover:card-shadow-hover transition-premium">
                        {/* Category Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                            <h3 className="text-[13px] font-semibold text-slate-800 flex items-center gap-2.5">
                                <span className={`w-1.5 h-4 rounded-full ${isThread ? "bg-indigo-400" : "bg-slate-300"}`} />
                                {catName}
                            </h3>
                            {hasSubGroups && (
                                <span className="text-[11px] text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-full">
                                    {Object.keys(catData._sub_groups).length} groups
                                </span>
                            )}
                            {!hasSubGroups && Array.isArray(catData) && (
                                <span className="text-[11px] text-slate-400 font-medium">{catData.length} items</span>
                            )}
                        </div>

                        {hasSubGroups ? (
                            <div className="divide-y divide-slate-50">
                                {Object.entries(catData._sub_groups).map(([subName, subRows]: [string, any]) => (
                                    <div key={subName}>
                                        <div className={`flex items-center gap-2 px-4 py-2 border-b border-slate-50
                                            ${isThread ? "bg-indigo-50/30" : "bg-slate-50/40"}`}>
                                            <span className={`w-1 h-1 rounded-full ${isThread ? "bg-indigo-300" : "bg-slate-300"}`} />
                                            <span className={`text-[11px] font-medium ${isThread ? "text-indigo-600" : "text-slate-500"}`}>{subName}</span>
                                            <span className="text-[10px] text-slate-400">{subRows.length}</span>
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
