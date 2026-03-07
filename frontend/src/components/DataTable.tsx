"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { useAppStore } from "@/lib/store";
import ExportButton from "./ExportButton";

const THREAD_DIVISORS: Record<string, number> = { "50/2": 19202.4, "40/2": 15362 };

function isThreadCategory(name: string): boolean {
    const low = name.toLowerCase();
    return low.includes("thread") || low.includes("sewing");
}



interface EditingCell { po: string; cat: string; subCat: string | null; row: number; col: string; }

/* eslint-disable @typescript-eslint/no-explicit-any */
// Memoized table row component to prevent unnecessary re-renders
const TableRow = memo(function TableRow({
    row, rowIdx, headers, catKey, subKey, isThread, isFlat,
    activePO, qtyColIndex, isEditingRow, editingCol,
    setEditingCell, editItemData, dragPayload,
    unitPriceIdx, amountIdx
}: {
    row: Record<string, string>;
    rowIdx: number;
    headers: string[];
    catKey: string;
    subKey: string;
    isThread: boolean;
    isFlat: boolean;
    activePO: string;
    qtyColIndex: number;
    isEditingRow: boolean;
    editingCol: string | null;
    setEditingCell: (cell: EditingCell | null) => void;
    editItemData: (po: string, cat: string, subCat: string | null, rowIdx: number, key: string, newValue: string) => void;
    dragPayload: string;
    unitPriceIdx: number;
    amountIdx: number;
}) {
    const qty = useMemo(() => {
        if (qtyColIndex < 0) return 0;
        const val = row[headers[qtyColIndex]] || "0";
        return parseFloat(val.replace(/,/g, "")) || 0;
    }, [row, qtyColIndex, headers]);

    const consKey = isFlat ? catKey : `${catKey}::${subKey}`;

    const cons = useAppStore(s => s.consumptionValues[activePO]?.[consKey]?.[String(rowIdx)]?.consumption ?? 1);

    const isLabelOrLoop = activePO.toLowerCase().includes("label") || catKey.toLowerCase().includes("label") || activePO.toLowerCase().includes("loop") || catKey.toLowerCase().includes("loop");
    const defaultWastage = isLabelOrLoop ? 2 : 5;
    const wastage = useAppStore(s => s.consumptionValues[activePO]?.[consKey]?.[String(rowIdx)]?.wastage ?? defaultWastage);
    const setConsumption = useAppStore(s => s.setConsumption);

    let totalReq = isThread ? qty * cons : qty * cons * (1 + wastage / 100);
    if (isThread) {
        const fraction = totalReq - Math.floor(totalReq);
        totalReq = fraction >= 0.5 ? Math.ceil(totalReq) : Math.floor(totalReq);
    }

    const unitPrice = useMemo(() => {
        if (unitPriceIdx < 0) return 0;
        const val = row[headers[unitPriceIdx]] || "0";
        return parseFloat(val) || 0;
    }, [row, unitPriceIdx, headers]);

    const amount = useMemo(() => {
        return unitPrice * qty;
    }, [unitPrice, qty]);

    const handleConsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setConsumption(activePO, consKey, rowIdx, "consumption", parseFloat(e.target.value) || 0);
    }, [activePO, consKey, rowIdx, setConsumption]);

    const handleWastageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setConsumption(activePO, consKey, rowIdx, "wastage", parseFloat(e.target.value) || 0);
    }, [activePO, consKey, rowIdx, setConsumption]);

    const handleDragStart = useCallback((e: React.DragEvent) => {
        e.dataTransfer.setData("application/json", dragPayload);
        e.dataTransfer.effectAllowed = "move";
    }, [dragPayload]);

    return (
        <tr className="border-b border-[#f5f5f5] dark:border-[#1a1a1e] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1e] transition-colors group">
            <td className="px-3 py-2 text-center text-[#d4d4d8] dark:text-[#3f3f46] hover:text-[#52525b] dark:hover:text-[#a1a1aa] transition-colors cursor-grab active:cursor-grabbing"
                draggable
                onDragStart={handleDragStart}
            >
                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
            </td>
            <td className="px-3 py-2 text-[11px] text-[#a1a1aa] dark:text-[#52525b]">{rowIdx + 1}</td>
            {headers.map((h: string, idx: number) => {
                const cellValue = String(row[h] || "");
                const isEditing = isEditingRow && editingCol === h;

                // SPECIAL HANDLING for Unit Price (Editable Input)
                if (idx === unitPriceIdx) {
                    return (
                        <td key={h} className="px-2 py-1.5">
                            <input
                                type="number"
                                step="0.0001"
                                min="0"
                                value={row[h] || ""}
                                onChange={(e) => editItemData(activePO, catKey, isFlat ? null : subKey, rowIdx, h, e.target.value)}
                                className="w-20 px-2 py-1 rounded border border-[#e5e5e5] dark:border-[#27272a] bg-white dark:bg-[#09090b] text-[12px] text-center focus:border-blue-500 outline-none"
                                placeholder="0.00"
                            />
                        </td>
                    );
                }

                // SPECIAL HANDLING for Amount (Calculated Display)
                if (idx === amountIdx) {
                    return (
                        <td key={h} className="px-3 py-2 text-[12px] font-medium text-blue-600 dark:text-blue-400 text-right whitespace-nowrap">
                            {amount > 0 ? amount.toFixed(2) : "—"}
                        </td>
                    );
                }

                return (
                    <td key={h} className="px-3 py-2 text-[12px] text-[#52525b] dark:text-[#a1a1aa] whitespace-nowrap"
                        onDoubleClick={() => setEditingCell({ po: activePO, cat: catKey, subCat: isFlat ? null : subKey, row: rowIdx, col: h })}
                    >
                        {isEditing ? (
                            <input
                                autoFocus
                                className="w-full bg-white dark:bg-[#09090b] border border-[#2563eb] text-[#18181b] dark:text-[#fafafa] px-1 py-0.5 rounded outline-none"
                                defaultValue={cellValue}
                                onBlur={(e) => {
                                    if (e.target.value !== cellValue) {
                                        editItemData(activePO, catKey, isFlat ? null : subKey, rowIdx, h, e.target.value);
                                    }
                                    setEditingCell(null);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") e.currentTarget.blur();
                                    if (e.key === "Escape") setEditingCell(null);
                                }}
                            />
                        ) : (
                            cellValue || "—"
                        )}
                    </td>
                );
            })}
            <td className="px-2 py-1.5">
                <input type="number" min="0" step="0.01" value={cons}
                    onChange={handleConsChange}
                    className="w-16 px-2 py-1.5 rounded-md bg-white dark:bg-[#09090b] border border-[#e5e5e5] dark:border-[#27272a] text-[#18181b] dark:text-[#fafafa] text-center text-[12px]
                        focus:border-[#2563eb] dark:focus:border-[#60a5fa] focus:ring-2 focus:ring-[#2563eb]/10 dark:focus:ring-[#60a5fa]/10 transition-all"
                    id={`cons-${catKey}-${subKey}-${rowIdx}`} />
            </td>
            {!isThread && (
                <td className="px-2 py-1.5">
                    <input type="number" min="0" max="100" step="0.5" value={wastage}
                        onChange={handleWastageChange}
                        className="w-16 px-2 py-1.5 rounded-md bg-white dark:bg-[#09090b] border border-[#e5e5e5] dark:border-[#27272a] text-[#18181b] dark:text-[#fafafa] text-center text-[12px]
                            focus:border-[#2563eb] dark:focus:border-[#60a5fa] focus:ring-2 focus:ring-[#2563eb]/10 dark:focus:ring-[#60a5fa]/10 transition-all"
                        id={`waste-${catKey}-${subKey}-${rowIdx}`} />
                </td>
            )}
            <td className="px-3 py-2 text-center">
                <span className="text-[12px] font-semibold text-[#16a34a] dark:text-[#4ade80]">{totalReq > 0 ? totalReq.toFixed(2) : "—"}</span>
            </td>
        </tr>
    );
});

export default function DataTable() {
    const groupedData = useAppStore(s => s.groupedData);
    const activePO = useAppStore(s => s.activePO);
    const consumptionValues = useAppStore(s => s.consumptionValues);
    const setConsumption = useAppStore(s => s.setConsumption);
    const excludedCategories = useAppStore(s => s.excludedCategories);
    const toggleCategoryExclusion = useAppStore(s => s.toggleCategoryExclusion);
    const moveItem = useAppStore(s => s.moveItem);
    const addSubCategory = useAppStore(s => s.addSubCategory);
    const editItemData = useAppStore(s => s.editItemData);
    const threadSettings = useAppStore(s => s.threadSettings);
    const setThreadSetting = useAppStore(s => s.setThreadSetting);
    const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
    const [dragOverCat, setDragOverCat] = useState<string | null>(null);
    const [dragOverSubCat, setDragOverSubCat] = useState<string | null>(null);

    // Memoize heavy derived data
    const categories = useMemo(() =>
        groupedData?.po_groups?.[activePO]?.categories ?? null,
        [groupedData, activePO]
    );

    const headers = useMemo(() => groupedData?.headers ?? [], [groupedData]);

    const qtyColIndex = useMemo(() =>
        headers.findIndex((h: string) => {
            const low = h.toLowerCase();
            return low.includes("qty") || low.includes("quantity");
        }),
        [headers]
    );

    if (!categories || !activePO) return null;

    const unitPriceIdx = useMemo(() =>
        headers.findIndex((h: string) => {
            const low = h.toLowerCase().trim();
            return low.includes("unit price") || low.includes("u.price") || low.includes("price") || low.includes("rate");
        }),
        [headers]
    );

    const amountIdx = useMemo(() =>
        headers.findIndex((h: string) => {
            const low = h.toLowerCase().trim();
            return low === "amount" || low.includes("total amount") || low.includes("total price") || low.includes("amt");
        }),
        [headers]
    );

    if (!categories || !activePO) return null;

    const getQty = (row: Record<string, string>): number => {
        if (qtyColIndex < 0) return 0;
        const val = row[headers[qtyColIndex]] || "0";
        return parseFloat(val.replace(/,/g, "")) || 0;
    };

    const getUnitPrice = (row: Record<string, string>): number => {
        if (unitPriceIdx < 0) return 0;
        const val = row[headers[unitPriceIdx]] || "0";
        return parseFloat(val) || 0;
    };

    const getCons = (po: string, cat: string, subKey: string, rowIdx: number) =>
        consumptionValues[po]?.[`${cat}::${subKey}`]?.[String(rowIdx)]?.consumption ?? 1;
    const getWastage = (po: string, cat: string, subKey: string, rowIdx: number) => {
        const isLabelOrLoop = po.toLowerCase().includes("label") || cat.toLowerCase().includes("label") || po.toLowerCase().includes("loop") || cat.toLowerCase().includes("loop");
        const defaultWastage = isLabelOrLoop ? 2 : 5;
        return consumptionValues[po]?.[`${cat}::${subKey}`]?.[String(rowIdx)]?.wastage ?? defaultWastage;
    };
    const calcTotal = (po: string, cat: string, subKey: string, rowIdx: number, qty: number, isThread: boolean = false) => {
        const c = getCons(po, cat, subKey, rowIdx);
        if (isThread) return qty * c;
        const w = getWastage(po, cat, subKey, rowIdx);
        return qty * c * (1 + w / 100);
    };

    const getConsFlat = (po: string, cat: string, rowIdx: number) =>
        consumptionValues[po]?.[cat]?.[String(rowIdx)]?.consumption ?? 1;
    const getWastageFlat = (po: string, cat: string, rowIdx: number) => {
        const isLabelOrLoop = po.toLowerCase().includes("label") || cat.toLowerCase().includes("label") || po.toLowerCase().includes("loop") || cat.toLowerCase().includes("loop");
        const defaultWastage = isLabelOrLoop ? 2 : 5;
        return consumptionValues[po]?.[cat]?.[String(rowIdx)]?.wastage ?? defaultWastage;
    };
    const calcTotalFlat = (po: string, cat: string, rowIdx: number, qty: number, isThread: boolean = false) => {
        const c = getConsFlat(po, cat, rowIdx);
        if (isThread) return qty * c;
        const w = getWastageFlat(po, cat, rowIdx);
        return qty * c * (1 + w / 100);
    };

    const getTS = (k: string) => threadSettings[`${activePO}::${k}`] || { count: "50/2", coneLength: 4000, wastage: 5 };
    const updateTS = (k: string, field: "count" | "coneLength" | "wastage", val: string | number) => {
        setThreadSetting(activePO, k, field, val);
    };

    const renderTable = (rows: Record<string, string>[], catKey: string, subKey: string, isThread: boolean) => {
        let grandTotal = 0, grandQty = 0, grandAmount = 0;
        const isFlat = subKey === "_flat";
        rows.forEach((row, idx) => {
            const qty = getQty(row);
            grandQty += qty;
            let rawTotal = isFlat ? calcTotalFlat(activePO, catKey, idx, qty, isThread) : calcTotal(activePO, catKey, subKey, idx, qty, isThread);
            if (isThread) {
                const fraction = rawTotal - Math.floor(rawTotal);
                rawTotal = fraction >= 0.5 ? Math.ceil(rawTotal) : Math.floor(rawTotal);
            }
            grandTotal += rawTotal;

            const price = getUnitPrice(row);
            grandAmount += (price * qty);
        });

        const ts = getTS(subKey);
        const divisor = THREAD_DIVISORS[ts.count] || 19202.4;
        let rawWeight = isThread && ts.coneLength > 0 && grandTotal > 0 ? grandTotal * (ts.coneLength / divisor) : 0;
        if (isThread && rawWeight > 0) {
            rawWeight = rawWeight * (1 + (ts.wastage || 0) / 100);
        }
        const threadWeight = Math.ceil(rawWeight);

        return (
            <div key={subKey}>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                        <thead>
                            <tr>
                                <th className="px-3 py-2.5 w-10 text-center text-[10px] font-medium text-[#a1a1aa] dark:text-[#52525b] uppercase tracking-wider bg-[#fafafa] dark:bg-[#09090b] border-b border-[#e5e5e5] dark:border-[#27272a]"></th>
                                <th className="px-3 py-2.5 text-left text-[10px] font-medium text-[#a1a1aa] dark:text-[#52525b] uppercase tracking-wider bg-[#fafafa] dark:bg-[#09090b] border-b border-[#e5e5e5] dark:border-[#27272a]">#</th>
                                {headers.map((h: string) => (
                                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-medium text-[#a1a1aa] dark:text-[#52525b] uppercase tracking-wider bg-[#fafafa] dark:bg-[#09090b] border-b border-[#e5e5e5] dark:border-[#27272a] whitespace-nowrap">{h}</th>
                                ))}
                                <th className="px-3 py-2.5 text-center text-[10px] font-medium text-[#d97706] dark:text-[#fbbf24] uppercase tracking-wider bg-[#fafafa] dark:bg-[#09090b] border-b border-[#e5e5e5] dark:border-[#27272a] whitespace-nowrap">Cons/Unit</th>
                                {!isThread && (
                                    <th className="px-3 py-2.5 text-center text-[10px] font-medium text-[#d97706] dark:text-[#fbbf24] uppercase tracking-wider bg-[#fafafa] dark:bg-[#09090b] border-b border-[#e5e5e5] dark:border-[#27272a] whitespace-nowrap">Wastage %</th>
                                )}
                                <th className="px-3 py-2.5 text-center text-[10px] font-medium text-[#16a34a] dark:text-[#4ade80] uppercase tracking-wider bg-[#fafafa] dark:bg-[#09090b] border-b border-[#e5e5e5] dark:border-[#27272a] whitespace-nowrap">Total Req.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, rowIdx) => (
                                <TableRow
                                    key={rowIdx}
                                    row={row}
                                    rowIdx={rowIdx}
                                    headers={headers}
                                    catKey={catKey}
                                    subKey={subKey}
                                    isThread={isThread}
                                    isFlat={isFlat}
                                    activePO={activePO}
                                    qtyColIndex={qtyColIndex}
                                    isEditingRow={editingCell?.po === activePO && editingCell?.cat === catKey && editingCell?.subCat === (isFlat ? null : subKey) && editingCell?.row === rowIdx}
                                    editingCol={editingCell?.col || null}
                                    setEditingCell={setEditingCell}
                                    editItemData={editItemData}
                                    dragPayload={JSON.stringify({ po: activePO, cat: catKey, subCat: isFlat ? null : subKey, index: rowIdx })}
                                    unitPriceIdx={unitPriceIdx}
                                    amountIdx={amountIdx}
                                />
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-[#fafafa] dark:bg-[#09090b] border-t border-[#e5e5e5] dark:border-[#27272a]">
                                <td className="px-3 py-2.5 text-[11px] font-bold text-[#a1a1aa] dark:text-[#52525b]"></td>
                                <td className="px-3 py-2.5 text-[11px] font-bold text-[#a1a1aa] dark:text-[#52525b]">Σ</td>
                                {headers.map((h: string, i: number) => (
                                    <td key={h} className="px-3 py-2.5 text-[12px] font-bold">
                                        {i === qtyColIndex ? <span className="text-[#18181b] dark:text-[#fafafa]">{grandQty.toLocaleString()}</span> : ""}
                                        {i === amountIdx ? <span className="text-blue-600 dark:text-blue-400 font-bold">{grandAmount > 0 ? grandAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}</span> : ""}
                                    </td>
                                ))}
                                <td colSpan={isThread ? 1 : 2} className="px-3 py-2.5 text-right text-[10px] font-bold text-[#a1a1aa] dark:text-[#52525b] uppercase tracking-wider">Grand Total</td>
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
                                <select value={ts.coneLength} onChange={(e) => updateTS(subKey, "coneLength", parseInt(e.target.value) || 4000)}
                                    className="px-2 py-1 rounded-md bg-white dark:bg-[#09090b] border border-[#e5e5e5] dark:border-[#27272a] text-[#18181b] dark:text-[#fafafa] text-[12px] cursor-pointer"
                                    id={`cone-length-${subKey}`}>
                                    <option value={4000}>4000</option>
                                    <option value={2000}>2000</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-1.5 ml-2">
                                <label className="text-[10px] text-[#a1a1aa] dark:text-[#52525b]">Wastage %</label>
                                <input type="number" min="0" step="0.5" value={ts.wastage ?? 5}
                                    onChange={(e) => updateTS(subKey, "wastage", parseFloat(e.target.value) || 0)}
                                    className="w-16 px-2 py-1 rounded-md bg-white dark:bg-[#09090b] border border-[#e5e5e5] dark:border-[#27272a] text-[#18181b] dark:text-[#fafafa] text-[12px] placeholder:text-[#d4d4d8] dark:placeholder:text-[#3f3f46]"
                                    id={`wastage-${subKey}`} />
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

    const poTotalAmount = useMemo(() => {
        let total = 0;
        if (!categories || !activePO) return total;

        const isThreadCategoryFunc = (name: string) => name.toLowerCase().includes("thread") || name.toLowerCase().includes("sewing");

        Object.entries(categories).forEach(([catName, catData]: [string, any]) => {
            if (excludedCategories.includes(`${activePO}::${catName}`)) return;

            const isThread = isThreadCategoryFunc(activePO) || isThreadCategoryFunc(catName);
            const hasSubGroups = catData && typeof catData === "object" && "_sub_groups" in catData;

            const processRows = (rows: any[], subKey: string) => {
                rows.forEach((row, idx) => {
                    const qty = getQty(row);
                    const unitPrice = getUnitPrice(row);

                    total += (unitPrice * qty);
                });
            };

            if (hasSubGroups) {
                Object.entries(catData._sub_groups).forEach(([subName, subRows]: [string, any]) => {
                    processRows(subRows, subName);
                });
            } else if (Array.isArray(catData)) {
                processRows(catData, "_flat");
            }
        });

        return total;
    }, [categories, activePO, excludedCategories, headers, unitPriceIdx, qtyColIndex, consumptionValues]);

    return (
        <div className="space-y-4 relative pb-20" id="data-table-wrapper">
            {Object.entries(categories).map(([catName, catData]: [string, any]) => {
                const isThread = isThreadCategory(activePO) || isThreadCategory(catName);
                const hasSubGroups = catData && typeof catData === "object" && "_sub_groups" in catData;

                return (
                    <div
                        key={catName}
                        onDragOver={(e) => {
                            e.preventDefault();
                            if (!hasSubGroups) {
                                setDragOverCat(catName);
                                setDragOverSubCat(null);
                            }
                        }}
                        onDragLeave={() => {
                            if (!hasSubGroups) setDragOverCat(null);
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            if (!hasSubGroups) {
                                setDragOverCat(null);
                                try {
                                    const data = JSON.parse(e.dataTransfer.getData("application/json"));
                                    if (data.cat === catName && data.subCat !== null) {
                                        moveItem(data.po, data.cat, data.subCat, data.index, catName, null);
                                    }
                                } catch (err) { }
                            }
                        }}
                        className={`rounded-lg overflow-hidden bg-white dark:bg-[#18181b] border transition-colors ${dragOverCat === catName && !dragOverSubCat ? "border-[#3b82f6] border-2 border-dashed bg-[#eff6ff] dark:bg-[#1e3a8a]/20" : "border-[#e5e5e5] dark:border-[#27272a]"}`}>
                        {/* Category Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e5] dark:border-[#27272a]">
                            <h3 className="text-[13px] font-semibold text-[#18181b] dark:text-[#fafafa] flex items-center gap-2.5">
                                <span className={`w-1 h-4 rounded-full ${isThread ? "bg-[#16a34a] dark:bg-[#4ade80]" : "bg-[#2563eb] dark:bg-[#60a5fa]"}`} />
                                {catName}
                                {excludedCategories.includes(`${activePO}::${catName}`) && (
                                    <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#fee2e2] text-[#ef4444] dark:bg-[#7f1d1d] dark:text-[#f87171] uppercase tracking-wider">
                                        Excluded
                                    </span>
                                )}
                            </h3>
                            {hasSubGroups && (
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            const name = window.prompt("Enter new sub-category name:");
                                            if (name && name.trim()) {
                                                addSubCategory(activePO, catName, name.trim());
                                            }
                                        }}
                                        title="Add new sub-category"
                                        className="text-[11px] font-medium text-[#2563eb] hover:text-[#1d4ed8] dark:text-[#60a5fa] dark:hover:text-[#3b82f6] flex items-center gap-1 bg-[#eff6ff] hover:bg-[#dbeafe] dark:bg-[#1e3a8a]/30 dark:hover:bg-[#1e3a8a]/50 px-2 py-1 rounded transition-colors"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        Add Sub-category
                                    </button>
                                    <span className="text-[11px] font-medium text-[#a1a1aa] dark:text-[#52525b]">
                                        {Object.keys(catData._sub_groups).length} groups
                                    </span>
                                </div>
                            )}
                            {!hasSubGroups && Array.isArray(catData) && (
                                <span className="text-[11px] text-[#a1a1aa] dark:text-[#52525b]">{catData.length} items</span>
                            )}
                            <button onClick={() => toggleCategoryExclusion(activePO, catName)}
                                title={excludedCategories.includes(`${activePO}::${catName}`) ? "Include category" : "Exclude category"}
                                className={`p-1 rounded transition-colors ${excludedCategories.includes(`${activePO}::${catName}`) ? "text-[#10b981] hover:bg-[#d1fae5] dark:hover:bg-[#064e3b]" : "text-[#a1a1aa] hover:bg-[#fee2e2] dark:hover:bg-[#7f1d1d] hover:text-[#ef4444]"}`}>
                                {excludedCategories.includes(`${activePO}::${catName}`) ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                )}
                            </button>
                        </div>

                        {!excludedCategories.includes(`${activePO}::${catName}`) && (
                            hasSubGroups ? (
                                <div>
                                    {Object.entries(catData._sub_groups).map(([subName, subRows]: [string, any]) => (
                                        <div
                                            key={subName}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                setDragOverCat(catName);
                                                setDragOverSubCat(subName);
                                            }}
                                            onDragLeave={() => {
                                                setDragOverSubCat(null);
                                                setDragOverCat(null);
                                            }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                setDragOverSubCat(null);
                                                setDragOverCat(null);
                                                try {
                                                    const data = JSON.parse(e.dataTransfer.getData("application/json"));
                                                    if (data.cat === catName && data.subCat !== subName) {
                                                        moveItem(data.po, data.cat, data.subCat, data.index, catName, subName);
                                                    }
                                                } catch (err) { }
                                            }}
                                            className={`transition-colors ${dragOverCat === catName && dragOverSubCat === subName ? "bg-[#eff6ff] dark:bg-[#1e3a8a]/20 outline-dashed outline-2 outline-[#3b82f6] outline-offset-[-2px]" : ""}`}
                                        >
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
                                                let rawTotal = calcTotal(activePO, catName, subName, idx, qty, isThread);
                                                const fraction = rawTotal - Math.floor(rawTotal);
                                                subTotal += fraction >= 0.5 ? Math.ceil(rawTotal) : Math.floor(rawTotal);
                                            });
                                            allThreadTotal += subTotal;

                                            const ts = getTS(subName);
                                            const divisor = THREAD_DIVISORS[ts.count] || 19202.4;
                                            if (ts.coneLength > 0 && subTotal > 0) {
                                                allConeLengthSum += ts.coneLength;
                                                let subWeight = subTotal * (ts.coneLength / divisor);
                                                subWeight = subWeight * (1 + (ts.wastage || 0) / 100);
                                                allThreadWeightLbs += Math.ceil(subWeight);
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
                            )
                        )}
                    </div>
                );
            })}

            {/* Grand Total Amount Floating Bar */}
            {poTotalAmount > 0 && (
                <div className="fixed sm:absolute bottom-0 left-0 right-0 sm:left-auto sm:right-auto sm:bottom-0 sm:w-full mt-8 p-4 bg-white dark:bg-[#18181b] border-t border-[#e5e5e5] dark:border-[#27272a] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] sm:shadow-none sm:rounded-b-xl z-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-[#a1a1aa] dark:text-[#71717a] uppercase tracking-wider">Total Amount ({activePO})</p>
                            <p className="text-[18px] sm:text-xl font-bold text-[#18181b] dark:text-[#fafafa]">
                                ৳ {poTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
