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
                                <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em]"
                                    style={{ color: "var(--text-muted)", background: "var(--bg-base)", borderBottom: "1px solid var(--border-light)" }}>#</th>
                                {headers.map((h: string) => (
                                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap"
                                        style={{ color: "var(--text-muted)", background: "var(--bg-base)", borderBottom: "1px solid var(--border-light)" }}>{h}</th>
                                ))}
                                <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap"
                                    style={{ color: "var(--warm-amber)", background: "var(--warm-amber-light)", borderBottom: "1px solid #ead9c8" }}>Cons/Unit</th>
                                <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap"
                                    style={{ color: "var(--warm-amber)", background: "var(--warm-amber-light)", borderBottom: "1px solid #ead9c8" }}>Wastage %</th>
                                <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap"
                                    style={{ color: "var(--success)", background: "var(--success-light)", borderBottom: "1px solid #c8ddd0" }}>Total Req.</th>
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
                                    <tr key={rowIdx} className="transition-colors duration-150 group"
                                        style={{ borderBottom: "1px solid var(--border-light)" }}
                                        onMouseEnter={e => e.currentTarget.style.background = "#f0ede8"}
                                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                    >
                                        <td className="px-3 py-2 text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>{rowIdx + 1}</td>
                                        {headers.map((h: string) => (
                                            <td key={h} className="px-3 py-2 text-[12px] whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{row[h] || "—"}</td>
                                        ))}
                                        <td className="px-2 py-1.5" style={{ background: "rgba(250,243,236,0.5)" }}>
                                            <input
                                                type="number" min="0" step="0.01"
                                                value={cons}
                                                onChange={(e) => setConsumption(activePO, consKey, rowIdx, "consumption", parseFloat(e.target.value) || 0)}
                                                className="w-16 px-2 py-1.5 rounded-md text-center text-[12px] font-medium transition-all"
                                                style={{
                                                    background: "var(--bg-card)", border: "1px solid var(--border)",
                                                    color: "var(--text-primary)"
                                                }}
                                                onFocus={e => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(91,122,106,0.1)"; }}
                                                onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                                                id={`cons-${catKey}-${subKey}-${rowIdx}`}
                                            />
                                        </td>
                                        <td className="px-2 py-1.5" style={{ background: "rgba(250,243,236,0.5)" }}>
                                            <input
                                                type="number" min="0" max="100" step="0.5"
                                                value={wastage}
                                                onChange={(e) => setConsumption(activePO, consKey, rowIdx, "wastage", parseFloat(e.target.value) || 0)}
                                                className="w-16 px-2 py-1.5 rounded-md text-center text-[12px] font-medium transition-all"
                                                style={{
                                                    background: "var(--bg-card)", border: "1px solid var(--border)",
                                                    color: "var(--text-primary)"
                                                }}
                                                onFocus={e => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(91,122,106,0.1)"; }}
                                                onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                                                id={`waste-${catKey}-${subKey}-${rowIdx}`}
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-center" style={{ background: "rgba(237,245,240,0.5)" }}>
                                            <span className="text-[12px] font-semibold" style={{ color: "var(--success)" }}>
                                                {total > 0 ? total.toFixed(2) : "—"}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: "var(--bg-base)", borderTop: "1px solid var(--border)" }}>
                                <td className="px-3 py-2.5 text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>Σ</td>
                                {headers.map((h: string, i: number) => (
                                    <td key={h} className="px-3 py-2.5 text-[12px] font-bold">
                                        {i === qtyColIndex ? (
                                            <span style={{ color: "var(--accent)" }}>{grandQty.toLocaleString()}</span>
                                        ) : ""}
                                    </td>
                                ))}
                                <td colSpan={2} className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider"
                                    style={{ color: "var(--text-muted)" }}>Grand Total</td>
                                <td className="px-3 py-2.5 text-center">
                                    <span className="text-[13px] font-bold" style={{ color: "var(--success)" }}>
                                        {grandTotal > 0 ? grandTotal.toFixed(2) : "—"}
                                    </span>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Thread Weight Calculator */}
                {isThread && (
                    <div className="px-4 py-3"
                        style={{ background: "linear-gradient(135deg, var(--accent-light), #f0ede8)", borderTop: "1px solid var(--border-light)" }}>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[12px]">🧵</span>
                                <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>Weight</span>
                            </div>
                            <div className="h-4 w-px" style={{ background: "var(--border)" }} />
                            <div className="flex items-center gap-1.5">
                                <label className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Count</label>
                                <select
                                    value={ts.count}
                                    onChange={(e) => updateThreadSetting(subKey, "count", e.target.value)}
                                    className="px-2 py-1 rounded-md text-[12px] font-medium cursor-pointer transition-all"
                                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                                    id={`thread-count-${subKey}`}
                                >
                                    <option value="50/2">50/2</option>
                                    <option value="40/2">40/2</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <label className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Cone (m)</label>
                                <input
                                    type="number" min="0" step="100"
                                    value={ts.coneLength || ""}
                                    onChange={(e) => updateThreadSetting(subKey, "coneLength", parseFloat(e.target.value) || 0)}
                                    placeholder="5000"
                                    className="w-20 px-2 py-1 rounded-md text-[12px] font-medium transition-all"
                                    style={{
                                        background: "var(--bg-card)", border: "1px solid var(--border)",
                                        color: "var(--text-primary)"
                                    }}
                                    id={`cone-length-${subKey}`}
                                />
                            </div>
                            {threadWeight > 0 && (
                                <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg"
                                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(60,50,40,0.04)" }}>
                                    <span className="text-[12px] font-bold" style={{ color: "var(--accent)" }} id={`thread-weight-${subKey}`}>
                                        {threadWeight} lbs
                                    </span>
                                    <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
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
                    <div key={catName} className="card overflow-hidden transition-all duration-200">
                        {/* Category Header */}
                        <div className="flex items-center justify-between px-4 py-3"
                            style={{ borderBottom: "1px solid var(--border-light)" }}>
                            <h3 className="text-[13px] font-semibold flex items-center gap-2.5" style={{ color: "var(--text-primary)" }}>
                                <span className="w-1.5 h-4 rounded-full" style={{ background: isThread ? "var(--accent)" : "var(--warm-amber)" }} />
                                {catName}
                            </h3>
                            {hasSubGroups && (
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                                    style={{ background: "var(--bg-base)", color: "var(--text-muted)" }}>
                                    {Object.keys(catData._sub_groups).length} groups
                                </span>
                            )}
                            {!hasSubGroups && Array.isArray(catData) && (
                                <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>{catData.length} items</span>
                            )}
                        </div>

                        {hasSubGroups ? (
                            <div>
                                {Object.entries(catData._sub_groups).map(([subName, subRows]: [string, any]) => (
                                    <div key={subName}>
                                        <div className="flex items-center gap-2 px-4 py-2"
                                            style={{
                                                background: isThread ? "var(--accent-light)" : "var(--warm-amber-light)",
                                                borderBottom: "1px solid var(--border-light)"
                                            }}>
                                            <span className="w-1 h-1 rounded-full" style={{ background: isThread ? "var(--accent)" : "var(--warm-amber)" }} />
                                            <span className="text-[11px] font-medium" style={{ color: isThread ? "var(--accent)" : "var(--warm-amber)" }}>{subName}</span>
                                            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{subRows.length}</span>
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
