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

    // For flat (non-thread) categories, use "_flat" as subKey
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

    // Render a table for a given set of rows
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
                    <table className="w-full text-xs sm:text-sm min-w-[600px]">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-2 sm:px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">#</th>
                                {headers.map((h: string) => (
                                    <th key={h} className="px-2 sm:px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                ))}
                                <th className="px-2 sm:px-3 py-2 text-center text-[10px] font-semibold text-amber-600 uppercase tracking-wider bg-amber-50 whitespace-nowrap">Cons/Unit</th>
                                <th className="px-2 sm:px-3 py-2 text-center text-[10px] font-semibold text-amber-600 uppercase tracking-wider bg-amber-50 whitespace-nowrap">Wastage %</th>
                                <th className="px-2 sm:px-3 py-2 text-center text-[10px] font-semibold text-emerald-600 uppercase tracking-wider bg-emerald-50 whitespace-nowrap">Total Req.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
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
                                    <tr key={rowIdx} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="px-2 sm:px-3 py-1.5 text-gray-400 font-mono text-[10px]">{rowIdx + 1}</td>
                                        {headers.map((h: string) => (
                                            <td key={h} className="px-2 sm:px-3 py-1.5 text-gray-700 whitespace-nowrap">{row[h] || "—"}</td>
                                        ))}
                                        <td className="px-1.5 py-1 bg-amber-50/50">
                                            <input
                                                type="number" min="0" step="0.01"
                                                value={cons}
                                                onChange={(e) => setConsumption(activePO, consKey, rowIdx, "consumption", parseFloat(e.target.value) || 0)}
                                                className="w-16 sm:w-20 px-1.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-700 text-center text-xs focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all"
                                                id={`cons-${catKey}-${subKey}-${rowIdx}`}
                                            />
                                        </td>
                                        <td className="px-1.5 py-1 bg-amber-50/50">
                                            <input
                                                type="number" min="0" max="100" step="0.5"
                                                value={wastage}
                                                onChange={(e) => setConsumption(activePO, consKey, rowIdx, "wastage", parseFloat(e.target.value) || 0)}
                                                className="w-16 sm:w-20 px-1.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-700 text-center text-xs focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all"
                                                id={`waste-${catKey}-${subKey}-${rowIdx}`}
                                            />
                                        </td>
                                        <td className="px-2 sm:px-3 py-1.5 text-center font-semibold text-emerald-600 bg-emerald-50/50 whitespace-nowrap">
                                            {total > 0 ? total.toFixed(2) : "—"}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-50 border-t border-gray-200">
                                <td className="px-2 sm:px-3 py-2 font-bold text-gray-400 text-xs">Σ</td>
                                {headers.map((h: string, i: number) => (
                                    <td key={h} className="px-2 sm:px-3 py-2 font-bold text-xs">
                                        {i === qtyColIndex ? (
                                            <span className="text-blue-600">{grandQty.toLocaleString()}</span>
                                        ) : ""}
                                    </td>
                                ))}
                                <td colSpan={2} className="px-2 sm:px-3 py-2 text-right font-bold text-gray-400 uppercase tracking-wider text-xs">Total</td>
                                <td className="px-2 sm:px-3 py-2 text-center font-bold text-emerald-600">
                                    {grandTotal > 0 ? grandTotal.toFixed(2) : "—"}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Thread Weight — per sub-group */}
                {isThread && (
                    <div className="px-4 py-2.5 border-t border-indigo-100 bg-indigo-50/50">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-xs font-semibold text-indigo-600">🧵 Weight</span>
                            <div className="flex items-center gap-1.5">
                                <label className="text-[10px] text-gray-400">Count</label>
                                <select
                                    value={ts.count}
                                    onChange={(e) => updateThreadSetting(subKey, "count", e.target.value)}
                                    className="px-2 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-700 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                                    id={`thread-count-${subKey}`}
                                >
                                    <option value="50/2">50/2</option>
                                    <option value="40/2">40/2</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <label className="text-[10px] text-gray-400">Cone (m)</label>
                                <input
                                    type="number" min="0" step="100"
                                    value={ts.coneLength || ""}
                                    onChange={(e) => updateThreadSetting(subKey, "coneLength", parseFloat(e.target.value) || 0)}
                                    placeholder="5000"
                                    className="w-24 px-2 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-700 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300 placeholder:text-gray-300"
                                    id={`cone-length-${subKey}`}
                                />
                            </div>
                            {threadWeight > 0 && (
                                <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200">
                                    <span className="text-xs font-bold text-indigo-600" id={`thread-weight-${subKey}`}>
                                        {threadWeight} lbs
                                    </span>
                                    <span className="text-[10px] text-gray-400">
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
        <div className="space-y-6" id="data-table-wrapper">
            {Object.entries(categories).map(([catName, catData]: [string, any]) => {
                const isThread = isThreadCategory(catName);
                const hasSubGroups = catData && typeof catData === "object" && "_sub_groups" in catData;

                return (
                    <div key={catName} className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                        {/* Main Category Header */}
                        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isThread ? "bg-indigo-400" : "bg-blue-400"}`} />
                                {catName}
                            </h3>
                            {hasSubGroups && (
                                <span className="text-xs text-gray-400">
                                    {Object.keys(catData._sub_groups).length} sub-groups
                                </span>
                            )}
                            {!hasSubGroups && Array.isArray(catData) && (
                                <span className="text-xs text-gray-400">{catData.length} items</span>
                            )}
                        </div>

                        {hasSubGroups ? (
                            /* Render sub-groups by Pantone for ALL categories */
                            <div className="divide-y divide-gray-100">
                                {Object.entries(catData._sub_groups).map(([subName, subRows]: [string, any]) => (
                                    <div key={subName}>
                                        {/* Sub-group header */}
                                        <div className={`flex items-center gap-2 px-4 py-2 border-b border-gray-100 ${isThread ? "bg-indigo-50/50" : "bg-blue-50/30"}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${isThread ? "bg-indigo-300" : "bg-blue-300"}`} />
                                            <span className={`text-xs font-medium ${isThread ? "text-indigo-600" : "text-blue-600"}`}>{subName}</span>
                                            <span className="text-[10px] text-gray-400">{subRows.length} items</span>
                                        </div>
                                        {renderTable(subRows, catName, subName, isThread)}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* Fallback for flat data (shouldn't happen now, safety) */
                            Array.isArray(catData) && renderTable(catData, catName, "_flat", false)
                        )}
                    </div>
                );
            })}
        </div>
    );
}
