"use client";

import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { exportPDFBlob } from "@/lib/api";
import BookingInfoModal, { BookingInfo } from "./BookingInfoModal";
import InvoiceInfoModal, { InvoiceInfo } from "./InvoiceInfoModal";
import PdfPreviewModal from "./PdfPreviewModal";

export default function ExportButton() {
    const { groupedData, consumptionValues, threadSettings, uploadResult, excludedCategories, activePO, fixedUnitPrices } = useAppStore();

    const [workOrderExporting, setWorkOrderExporting] = useState(false);
    const [workOrderModalOpen, setWorkOrderModalOpen] = useState(false);

    const [invoiceExporting, setInvoiceExporting] = useState(false);
    const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

    // PDF Preview state for invoice
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewFilename, setPreviewFilename] = useState("");
    const [previewOpen, setPreviewOpen] = useState(false);

    if (!groupedData) return null;

    const runExport = async (
        info: BookingInfo | InvoiceInfo,
        exportType: "work_order" | "invoice",
        setExporting: (v: boolean) => void,
        setModalOpen: (v: boolean) => void
    ) => {
        setExporting(true);
        try {
            const filename = uploadResult?.filename?.replace(".pdf", "") || "PO_Export";
            const cleanData = JSON.parse(JSON.stringify(groupedData));

            // ── Only export the currently selected group for Work Orders ──────────────
            if (exportType === "work_order" && activePO && cleanData.po_groups) {
                const selectedGroup = cleanData.po_groups[activePO];
                if (selectedGroup) {
                    cleanData.po_groups = { [activePO]: selectedGroup };
                }
            }

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

            const _getPriceColIndexFunc = (hdrs: string[]) => {
                return hdrs.findIndex(h => {
                    const low = h.toLowerCase().trim();
                    return low.includes("unit price") || low.includes("u.price") || low.includes("price") || low.includes("rate");
                });
            };

            if (cleanData.po_groups) {
                for (const po in cleanData.po_groups) {
                        const cats = cleanData.po_groups[po].categories;
                        const priceColIdx = _getPriceColIndexFunc(filteredHeaders);

                        for (const catName in cats) {
                            if (excludedCategories.includes(`${po}::${catName}`)) {
                                delete cats[catName];
                                continue;
                            }

                            const catData = cats[catName];
                            const isThread = po.toLowerCase().includes("thread") || po.toLowerCase().includes("sewing") || catName.toLowerCase().includes("thread") || catName.toLowerCase().includes("sewing");

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

                                // Respect Fixed Unit Price if set
                                const fixedPrice = fixedUnitPrices[po] || 0;
                                if (fixedPrice > 0 && priceColIdx >= 0) {
                                    row[filteredHeaders[priceColIdx]] = String(fixedPrice);
                                    const amountH = filteredHeaders.find(h => {
                                        const l = h.toLowerCase().trim();
                                        return l === "amount" || l.includes("total amount") || l.includes("total price") || l.includes("amt");
                                    });
                                    if (amountH) {
                                        row[amountH] = (fixedPrice * qty).toString();
                                    }
                                }

                                subTotal += rowTotal;
                            });

                            catData._computed_sub_groups = catData._computed_sub_groups || {};

                            if (isThread) {
                                allThreadTotal += subTotal;
                                const tsInfo = threadSettings[`${po}::${subName}`] || { count: "50/2", coneLength: 4000, wastage: 5 };
                                const divisor = THREAD_DIVISORS[tsInfo.count] || 19202.4;
                                let rawWeight = tsInfo.coneLength > 0 && subTotal > 0 ? subTotal * (tsInfo.coneLength / divisor) : 0;
                                if (rawWeight > 0) {
                                    rawWeight = rawWeight * (1 + tsInfo.wastage / 100);
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

                    // Calculate PO Grand Total Amount
                    let poTotalAmount = 0;

                    for (const catName in cats) {
                        const catData = cats[catName];
                        const isThread = po.toLowerCase().includes("thread") || po.toLowerCase().includes("sewing") || catName.toLowerCase().includes("thread") || catName.toLowerCase().includes("sewing");

                        const processRowsForAmount = (rows: any[], subKey: string) => {
                            rows.forEach((row, idx) => {
                                const qty = getQty(row);

                                let unitPrice = 0;
                                const fixedPrice = fixedUnitPrices[po] || 0;
                                if (fixedPrice > 0) {
                                    unitPrice = fixedPrice;
                                } else if (priceColIdx >= 0) {
                                    const v = String(row[filteredHeaders[priceColIdx]] || "0").replace(/,/g, "");
                                    unitPrice = parseFloat(v) || 0;
                                }

                                poTotalAmount += (unitPrice * qty);
                            });
                        };

                        if (catData && typeof catData === "object" && "_sub_groups" in catData) {
                            for (const subName in catData._sub_groups) {
                                processRowsForAmount(catData._sub_groups[subName], subName);
                            }
                        } else if (Array.isArray(catData)) {
                            processRowsForAmount(catData, "_flat");
                        }
                    }
                    cleanData.po_groups[po]._computed_po_total_amount = poTotalAmount;

                    if (Object.keys(cats).length === 0) {
                        delete cleanData.po_groups[po];
                    }
                }
            }

            // Convert Info to the format expected by the backend
            let bookingInfoPayload: Record<string, string> | null = null;
            let invoiceInfoPayload: Record<string, string> | null = null;

            if (exportType === "work_order") {
                const bi = info as BookingInfo;
                bookingInfoPayload = {
                    date: bi.date,
                    supplier_name: bi.supplierName,
                    address: bi.address,
                    attention: bi.attention,
                    from_field: bi.from,
                    order_no: bi.orderNo,
                    ref_no: bi.refNo,
                    currency: bi.currency,
                };
            } else if (exportType === "invoice") {
                const iv = info as InvoiceInfo;
                invoiceInfoPayload = {
                    bill: iv.bill,
                    performa_invoice_no: iv.performaInvoiceNo,
                    bank_details: iv.bankDetails,
                    buyer: iv.buyer,
                    net_weight: iv.netWeight,
                    gross_weight: iv.grossWeight,
                    date: iv.date,
                    currency: iv.currency,
                };
            }
            const mappedThreadSettings: Record<string, any> = {};
            for (const [k, v] of Object.entries(threadSettings || {})) {
                mappedThreadSettings[k] = {
                    count: v.count,
                    cone_length: v.coneLength,
                    wastage: v.wastage
                };
            }

            // Open preview for both work order and invoice
            const blobUrl = await exportPDFBlob(
                cleanData,
                consumptionValues,
                filename,
                Object.keys(mappedThreadSettings).length > 0 ? mappedThreadSettings : null,
                bookingInfoPayload,
                exportType,
                invoiceInfoPayload
            );
            setPreviewUrl(blobUrl);
            setPreviewFilename(filename);
            setPreviewOpen(true);

            setModalOpen(false);
        } catch (err) {
            console.error("Export failed:", err);
            alert("Export failed. Please try again.");
        } finally { setExporting(false); }
    };

    const buttonClass = "group flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors " +
        "bg-[#18181b] dark:bg-[#fafafa] text-white dark:text-[#09090b] hover:bg-[#27272a] dark:hover:bg-[#e5e5e5] " +
        "active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed";

    const DownloadIcon = () => (
        <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    );

    return (
        <>
            {/* Work Order Button */}
            <button
                onClick={() => setWorkOrderModalOpen(true)}
                disabled={workOrderExporting}
                className={buttonClass}
                id="work-order-btn"
            >
                <DownloadIcon />
                <span className="hidden sm:inline">Work Order</span>
                <span className="sm:hidden">WO</span>
            </button>

            <BookingInfoModal
                open={workOrderModalOpen}
                title="Work Order Sheet Information"
                onClose={() => setWorkOrderModalOpen(false)}
                onExport={(info) => runExport(info, "work_order", setWorkOrderExporting, setWorkOrderModalOpen)}
                exporting={workOrderExporting}
            />

            {/* Invoice Button */}
            <button
                onClick={() => setInvoiceModalOpen(true)}
                disabled={invoiceExporting}
                className={buttonClass}
                id="invoice-btn"
            >
                <DownloadIcon />
                <span className="hidden sm:inline">Invoice</span>
                <span className="sm:hidden">INV</span>
            </button>

            <InvoiceInfoModal
                open={invoiceModalOpen}
                title="Invoice Sheet Information"
                onClose={() => setInvoiceModalOpen(false)}
                onExport={(info) => runExport(info, "invoice", setInvoiceExporting, setInvoiceModalOpen)}
                exporting={invoiceExporting}
            />

            {/* PDF Preview Modal for Invoice */}
            <PdfPreviewModal
                open={previewOpen}
                pdfUrl={previewUrl}
                filename={previewFilename}
                onClose={() => {
                    setPreviewOpen(false);
                    // Revoke the blob URL to free memory
                    if (previewUrl) {
                        window.URL.revokeObjectURL(previewUrl);
                        setPreviewUrl(null);
                    }
                }}
            />
        </>
    );
}
