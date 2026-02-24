"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";

// Thread count divisors for weight calculation
const THREAD_DIVISORS: Record<string, number> = {
    "50/2": 19202.4,
    "40/2": 15362,
};

function isThreadCategory(categoryName: string): boolean {
    const low = categoryName.toLowerCase();
    return low.includes("thread") || low.includes("sewing");
}

export default function DataTable() {
    const { groupedData, activePO, activeTab, consumptionValues, setConsumption } = useAppStore();
    const [threadCount, setThreadCount] = useState<string>("50/2");
    const [coneLength, setConeLength] = useState<number>(0);

    if (!groupedData || !activePO || !activeTab || !groupedData.po_groups[activePO]?.categories[activeTab]) {
        return null;
    }

    const rows = groupedData.po_groups[activePO].categories[activeTab];
    const headers = groupedData.headers;
    const isThread = isThreadCategory(activeTab);

    const qtyColIndex = headers.findIndex((h) => {
        const low = h.toLowerCase();
        return low.includes("qty") || low.includes("quantity");
    });

    const getQty = (row: Record<string, string>): number => {
        if (qtyColIndex < 0) return 0;
        const val = row[headers[qtyColIndex]] || "0";
        return parseFloat(val.replace(/,/g, "")) || 0;
    };

    const getCons = (rowIdx: number) =>
        consumptionValues[activePO]?.[activeTab]?.[String(rowIdx)]?.consumption ?? 0;
    const getWastage = (rowIdx: number) =>
        consumptionValues[activePO]?.[activeTab]?.[String(rowIdx)]?.wastage ?? 5;

    const calcTotal = (rowIdx: number, qtyVal: number) => {
        const c = getCons(rowIdx);
        const w = getWastage(rowIdx);
        return (qtyVal * c) * (1 + w / 100);
    };

    // Calculate grand totals
    let grandTotal = 0;
    let grandQty = 0;
    rows.forEach((row, rowIdx) => {
        const qty = getQty(row);
        grandQty += qty;
        grandTotal += calcTotal(rowIdx, qty);
    });

    // Thread weight calculation
    const divisor = THREAD_DIVISORS[threadCount] || 19202.4;
    const threadWeight = coneLength > 0 && grandTotal > 0
        ? grandTotal * (coneLength / divisor)
        : 0;

    return (
        <div className="space-y-3" id="data-table-wrapper">
            {/* Data Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-700/50 -mx-1 sm:mx-0" id="data-table">
                <table className="w-full text-xs sm:text-sm min-w-[600px]">
                    <thead>
                        <tr className="bg-gray-800/80">
                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">#</th>
                            {headers.map((h) => (
                                <th key={h} className="px-2 sm:px-3 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                    {h}
                                </th>
                            ))}
                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-semibold text-amber-400 uppercase tracking-wider bg-amber-500/10 whitespace-nowrap">
                                Cons/Unit
                            </th>
                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-semibold text-amber-400 uppercase tracking-wider bg-amber-500/10 whitespace-nowrap">
                                Wastage %
                            </th>
                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-semibold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 whitespace-nowrap">
                                Total Req.
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {rows.map((row, rowIdx) => {
                            const qty = getQty(row);
                            const total = calcTotal(rowIdx, qty);

                            return (
                                <tr key={rowIdx} className="hover:bg-gray-800/50 transition-colors">
                                    <td className="px-2 sm:px-3 py-2 text-gray-500 font-mono text-[10px] sm:text-xs">{rowIdx + 1}</td>
                                    {headers.map((h) => (
                                        <td key={h} className="px-2 sm:px-3 py-2 text-gray-300 whitespace-nowrap">{row[h] || "—"}</td>
                                    ))}

                                    <td className="px-1.5 sm:px-2 py-1 sm:py-1.5 bg-amber-500/5">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={getCons(rowIdx)}
                                            onChange={(e) => setConsumption(activePO, activeTab, rowIdx, "consumption", parseFloat(e.target.value) || 0)}
                                            className="w-16 sm:w-20 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-center text-xs sm:text-sm
                      focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 transition-all"
                                            id={`cons-${rowIdx}`}
                                        />
                                    </td>

                                    <td className="px-1.5 sm:px-2 py-1 sm:py-1.5 bg-amber-500/5">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.5"
                                            value={getWastage(rowIdx)}
                                            onChange={(e) => setConsumption(activePO, activeTab, rowIdx, "wastage", parseFloat(e.target.value) || 0)}
                                            className="w-16 sm:w-20 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-center text-xs sm:text-sm
                      focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 transition-all"
                                            id={`waste-${rowIdx}`}
                                        />
                                    </td>

                                    <td className="px-2 sm:px-3 py-2 text-center font-semibold text-emerald-300 bg-emerald-500/5 whitespace-nowrap">
                                        {total > 0 ? total.toFixed(2) : "—"}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>

                    {/* Grand Total Footer */}
                    <tfoot>
                        <tr className="bg-gradient-to-r from-gray-800 to-emerald-900/30 border-t-2 border-emerald-500/30">
                            <td className="px-2 sm:px-3 py-2 sm:py-3 font-bold text-emerald-400 text-xs sm:text-sm">
                                Σ
                            </td>
                            {headers.map((h, i) => (
                                <td key={h} className="px-2 sm:px-3 py-2 sm:py-3 font-bold text-gray-300 text-xs sm:text-sm">
                                    {i === qtyColIndex ? (
                                        <span className="text-blue-400">{grandQty.toLocaleString()}</span>
                                    ) : i === headers.length - 1 ? (
                                        ""
                                    ) : ""}
                                </td>
                            ))}
                            <td colSpan={2} className="px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-gray-300 uppercase tracking-wider text-xs sm:text-sm">
                                Grand Total
                            </td>
                            <td className="px-2 sm:px-3 py-2 sm:py-3 text-center font-bold text-base sm:text-lg text-emerald-400" id="grand-total">
                                {grandTotal > 0 ? grandTotal.toFixed(2) : "—"}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Thread Weight Calculator — shown only for sewing thread categories */}
            {isThread && (
                <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-gray-900/80 p-4 sm:p-5" id="thread-weight-calc">
                    <h3 className="text-sm sm:text-base font-bold text-purple-300 mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs">🧵</span>
                        Sewing Thread Weight Calculator
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                        {/* Thread Count Selector */}
                        <div>
                            <label className="block text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                Thread Count
                            </label>
                            <select
                                value={threadCount}
                                onChange={(e) => setThreadCount(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-200 text-sm
                                    focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400 transition-all
                                    appearance-none cursor-pointer"
                                id="thread-count-select"
                            >
                                <option value="50/2" className="bg-gray-900">50/2</option>
                                <option value="40/2" className="bg-gray-900">40/2</option>
                            </select>
                        </div>

                        {/* Cone Length Input */}
                        <div>
                            <label className="block text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                Cone Length (meters)
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="100"
                                value={coneLength || ""}
                                onChange={(e) => setConeLength(parseFloat(e.target.value) || 0)}
                                placeholder="e.g. 5000"
                                className="w-full px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-200 text-sm
                                    focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400 transition-all
                                    placeholder:text-gray-600"
                                id="cone-length-input"
                            />
                        </div>

                        {/* Grand Total Display */}
                        <div>
                            <label className="block text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                Grand Total (Cones)
                            </label>
                            <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-bold">
                                {grandTotal > 0 ? grandTotal.toFixed(2) : "—"}
                            </div>
                        </div>
                    </div>

                    {/* Formula Display */}
                    <div className="text-[10px] sm:text-xs text-gray-500 mb-3 p-2 rounded-lg bg-gray-800/50 font-mono">
                        Formula: Grand Total × (Cone Length ÷ {divisor.toLocaleString()}) = Weight in Pounds
                    </div>

                    {/* Result */}
                    <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                        <span className="text-sm sm:text-base font-semibold text-gray-300">
                            Total Weight ({threadCount} count)
                        </span>
                        <span className={`text-xl sm:text-2xl font-bold ${threadWeight > 0 ? "text-purple-300" : "text-gray-600"}`} id="thread-weight-result">
                            {threadWeight > 0 ? (
                                <>
                                    {threadWeight.toFixed(4)} <span className="text-sm font-normal text-purple-400">lbs</span>
                                    <span className="text-xs sm:text-sm font-normal text-gray-500 ml-2">
                                        ({(threadWeight * 0.453592).toFixed(4)} kg)
                                    </span>
                                </>
                            ) : "—"}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
