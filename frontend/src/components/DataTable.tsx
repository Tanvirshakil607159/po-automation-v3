"use client";

import { useAppStore } from "@/lib/store";

export default function DataTable() {
    const { groupedData, activePO, activeTab, consumptionValues, setConsumption } = useAppStore();

    if (!groupedData || !activePO || !activeTab || !groupedData.po_groups[activePO]?.categories[activeTab]) {
        return null;
    }

    const rows = groupedData.po_groups[activePO].categories[activeTab];
    const headers = groupedData.headers;

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

    let grandTotal = 0;

    return (
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
                        grandTotal += total;

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

                <tfoot>
                    <tr className="bg-gradient-to-r from-gray-800 to-emerald-900/30 border-t-2 border-emerald-500/30">
                        <td colSpan={headers.length + 3} className="px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-gray-300 uppercase tracking-wider text-xs sm:text-sm">
                            Grand Total
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-3 text-center font-bold text-base sm:text-lg text-emerald-400" id="grand-total">
                            {grandTotal > 0 ? grandTotal.toFixed(2) : "—"}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
