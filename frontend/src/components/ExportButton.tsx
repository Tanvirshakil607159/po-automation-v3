"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { exportPDF } from "@/lib/api";
import BookingInfoModal, { BookingInfo } from "./BookingInfoModal";

export default function ExportButton() {
    const { groupedData, consumptionValues, uploadResult, excludedCategories } = useAppStore();
    const [exporting, setExporting] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);

    if (!groupedData) return null;

    const handleExport = async (bookingInfo: BookingInfo) => {
        setExporting(true);
        try {
            const filename = uploadResult?.filename?.replace(".pdf", "") || "PO_Export";
            const threadSettingsMap: Record<string, { count: string; cone_length: number; wastage: number }> = {};
            const countSelects = document.querySelectorAll<HTMLSelectElement>('[id^="thread-count-"]');
            countSelects.forEach((sel) => {
                const subKey = sel.id.replace("thread-count-", "");
                const coneInput = document.getElementById(`cone-length-${subKey}`) as HTMLSelectElement | null;
                const coneVal = coneInput ? parseInt(coneInput.value) || 4000 : 4000;
                const wastageInput = document.getElementById(`wastage-${subKey}`) as HTMLInputElement | null;
                const wastageVal = wastageInput ? parseFloat(wastageInput.value) || 0 : 5;
                if (coneVal > 0) {
                    threadSettingsMap[subKey] = { count: sel.value, cone_length: coneVal, wastage: wastageVal };
                }
            });

            const cleanData = JSON.parse(JSON.stringify(groupedData));

            const excludedCols = ["item category", "item description", "material name", "material", "description", "item", "accessories", "accessory", "trims", "trim"];
            const filteredHeaders = (groupedData.headers || []).filter((h: string) => {
                return !excludedCols.some(ex => h.toLowerCase().includes(ex));
            });
            cleanData.headers = filteredHeaders;

            const THREAD_DIVISORS: Record<string, number> = {
                "50/2": 19202.4, "40/2": 15362, "60/2": 23042.88, "20/2": 7680.96, "20/3": 5120.64
            };

            const getQty = (row: any) => {
                const h = filteredHeaders.find((h: string) => h.toLowerCase().includes("qty") || h.toLowerCase().includes("quantity"));
                if (!h) return 0;
                const v = String(row[h]).replace(/,/g, "");
                return parseFloat(v) || 0;
            };

            const getCons = (po: string, catKey: string, subKey: string, rowIdx: number) => {
                const ck = subKey === "_flat" ? catKey : `${catKey}::${subKey}`;
                return consumptionValues[po]?.[ck]?.[String(rowIdx)]?.consumption ?? 1;
            };

            const getWastage = (po: string, catKey: string, subKey: string, rowIdx: number) => {
                const isLabelOrLoop = po.toLowerCase().includes("label") || catKey.toLowerCase().includes("label") || po.toLowerCase().includes("loop") || catKey.toLowerCase().includes("loop");
                const defaultWastage = isLabelOrLoop ? 2 : 5;
                const ck = subKey === "_flat" ? catKey : `${catKey}::${subKey}`;
                return consumptionValues[po]?.[ck]?.[String(rowIdx)]?.wastage ?? defaultWastage;
            };

            if (cleanData.po_groups) {
                for (const po in cleanData.po_groups) {
                    const cats = cleanData.po_groups[po].categories;
                    for (const catName in cats) {
                        if (excludedCategories.includes(catName)) {
                            delete cats[catName];
                            continue;
                        }

                        const catData = cats[catName];
                        const isThread = catName.toLowerCase().includes("thread") || catName.toLowerCase().includes("sewing");

                        let allThreadTotal = 0;
                        let allThreadWeightLbs = 0;

                        const processSubGroup = (subName: string, rows: any[]) => {
                            let subTotal = 0;
                            let subQty = 0;

                            rows.forEach((row: any, idx: number) => {
                                const qty = getQty(row);
                                subQty += qty;
                                const cons = getCons(po, catName, subName, idx);
                                const was = getWastage(po, catName, subName, idx);

                                let rowTotal = qty * cons;
                                if (!isThread) {
                                    rowTotal = rowTotal * (1 + was / 100);
                                } else {
                                    const fraction = rowTotal - Math.floor(rowTotal);
                                    rowTotal = fraction >= 0.5 ? Math.ceil(rowTotal) : Math.floor(rowTotal);
                                }

                                row._computed_qty = qty;
                                row._computed_total_req = rowTotal;
                                row._computed_cons = cons;
                                row._computed_was = was;
                                subTotal += rowTotal;
                            });

                            catData._computed_sub_groups = catData._computed_sub_groups || {};

                            if (isThread) {
                                allThreadTotal += subTotal;
                                const ts = threadSettingsMap[subName] || { count: "50/2", cone_length: 4000, wastage: 5 };
                                const divisor = THREAD_DIVISORS[ts.count] || 19202.4;
                                let rawWeight = ts.cone_length > 0 && subTotal > 0 ? subTotal * (ts.cone_length / divisor) : 0;
                                if (rawWeight > 0) {
                                    rawWeight = rawWeight * (1 + ts.wastage / 100);
                                }
                                const tw = Math.ceil(rawWeight);
                                allThreadWeightLbs += tw;
                                catData._computed_sub_groups[subName] = {
                                    grand_total: subTotal,
                                    grand_qty: subQty,
                                    thread_weight_lbs: tw
                                };
                            } else {
                                catData._computed_sub_groups[subName] = { grand_total: subTotal, grand_qty: subQty };
                            }
                        };

                        if (catData && typeof catData === "object" && "_sub_groups" in catData) {
                            let emptySubGroupsCount = 0;
                            const totalSubGroups = Object.keys(catData._sub_groups).length;
                            for (const subName in catData._sub_groups) {
                                if (!catData._sub_groups[subName] || catData._sub_groups[subName].length === 0) {
                                    delete catData._sub_groups[subName];
                                    emptySubGroupsCount++;
                                } else {
                                    processSubGroup(subName, catData._sub_groups[subName]);
                                }
                            }
                            if (totalSubGroups > 0 && emptySubGroupsCount === totalSubGroups) {
                                delete cats[catName];
                            } else if (isThread) {
                                catData._computed_all_thread_total = allThreadTotal;
                                catData._computed_all_thread_weight_lbs = allThreadWeightLbs;
                            }
                        } else if (Array.isArray(catData)) {
                            if (catData.length === 0) {
                                delete cats[catName];
                            } else {
                                processSubGroup("_flat", catData);
                            }
                        }
                    }
                }
            }

            // Convert BookingInfo to the format expected by the backend
            const bookingInfoPayload = {
                date: bookingInfo.date,
                supplier_name: bookingInfo.supplierName,
                address: bookingInfo.address,
                attention: bookingInfo.attention,
                from_field: bookingInfo.from,
                order_no: bookingInfo.orderNo,
                ref_no: bookingInfo.refNo,
            };

            await exportPDF(cleanData, consumptionValues, filename,
                Object.keys(threadSettingsMap).length > 0 ? threadSettingsMap : null,
                bookingInfoPayload);

            setModalOpen(false);
        } catch (err) {
            console.error("Export failed:", err);
            alert("Export failed. Please try again.");
        } finally { setExporting(false); }
    };

    return (
        <>
            <button onClick={() => setModalOpen(true)}
                className="group flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors
                    bg-[#18181b] dark:bg-[#fafafa] text-white dark:text-[#09090b] hover:bg-[#27272a] dark:hover:bg-[#e5e5e5]
                    active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                id="export-btn"
            >
                <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">Export PDF</span>
                <span className="sm:hidden">PDF</span>
            </button>

            <BookingInfoModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onExport={handleExport}
                exporting={exporting}
            />
        </>
    );
}
