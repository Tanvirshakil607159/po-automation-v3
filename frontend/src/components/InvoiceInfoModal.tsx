"use client";

import { useState, useEffect, useRef } from "react";

export interface InvoiceInfo {
    bill: string;
    performaInvoiceNo: string;
    bankDetails: string;
    buyer: string;
    netWeight: string;
    grossWeight: string;
    date: string;
    currency: "BDT" | "USD";
}

interface Props {
    open: boolean;
    title?: string;
    onClose: () => void;
    onExport: (info: InvoiceInfo, type: "bill" | "pi") => void;
    exportingBill: boolean;
    exportingPI: boolean;
}

function getTodayDate(): string {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

export default function InvoiceInfoModal({ open, title = "Invoice Sheet Information", onClose, onExport, exportingBill, exportingPI }: Props) {
    const [info, setInfo] = useState<InvoiceInfo>({
        bill: "",
        performaInvoiceNo: "",
        bankDetails: "",
        buyer: "",
        netWeight: "",
        grossWeight: "",
        date: getTodayDate(),
        currency: "BDT",
    });
    const firstInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setInfo((prev) => ({ ...prev, date: getTodayDate() }));
            setTimeout(() => firstInputRef.current?.focus(), 100);
        }
    }, [open]);

    if (!open) return null;

    const set = (key: keyof InvoiceInfo, val: string) =>
        setInfo((prev) => ({ ...prev, [key]: val }));

    const inputClass =
        "w-full px-3 py-2 rounded-lg text-[13px] bg-[#f5f5f5] dark:bg-[#27272a] border border-[#e5e5e5] dark:border-[#3f3f46] text-[#18181b] dark:text-[#fafafa] placeholder-[#a1a1aa] dark:placeholder-[#71717a] focus:outline-none focus:ring-2 focus:ring-[#18181b] dark:focus:ring-[#fafafa] focus:border-transparent transition-shadow";

    const labelClass = "block text-[12px] font-medium text-[#71717a] dark:text-[#a1a1aa] mb-1";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            {/* Modal */}
            <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-[#18181b] rounded-2xl shadow-2xl border border-[#e5e5e5] dark:border-[#27272a] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 pt-5 pb-3 border-b border-[#e5e5e5] dark:border-[#27272a]">
                    <h2 className="text-[16px] font-semibold text-[#18181b] dark:text-[#fafafa]">
                        {title}
                    </h2>
                    <p className="text-[12px] text-[#a1a1aa] dark:text-[#71717a] mt-0.5">
                        Fill in the details for the PDF invoice sheet header.
                    </p>
                </div>

                {/* Body */}
                <div className="px-6 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
                    {/* Date and Currency */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Date</label>
                            <input
                                type="text"
                                value={info.date}
                                readOnly
                                className={`${inputClass} cursor-default opacity-70`}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Currency</label>
                            <select
                                value={info.currency}
                                onChange={(e) => set("currency", e.target.value as "BDT" | "USD")}
                                className={inputClass}
                            >
                                <option value="BDT">BDT (Taka)</option>
                                <option value="USD">USD ($)</option>
                            </select>
                        </div>
                    </div>

                    {/* Row: Bill + Performa Invoice No */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Bill</label>
                            <input
                                ref={firstInputRef}
                                type="text"
                                value={info.bill}
                                onChange={(e) => set("bill", e.target.value)}
                                placeholder="Bill to..."
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Performa Invoice No.</label>
                            <input
                                type="text"
                                value={info.performaInvoiceNo}
                                onChange={(e) => set("performaInvoiceNo", e.target.value)}
                                placeholder="Invoice No."
                                className={inputClass}
                            />
                        </div>
                    </div>


                    {/* Buyer */}
                    <div>
                        <label className={labelClass}>Buyer</label>
                        <input
                            type="text"
                            value={info.buyer}
                            onChange={(e) => set("buyer", e.target.value)}
                            placeholder="Buyer name"
                            className={inputClass}
                        />
                    </div>

                    {/* Row: Net Weight + Gross Weight */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Net Weight</label>
                            <input
                                type="text"
                                value={info.netWeight}
                                onChange={(e) => set("netWeight", e.target.value)}
                                placeholder="e.g. 50 kg"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Gross Weight</label>
                            <input
                                type="text"
                                value={info.grossWeight}
                                onChange={(e) => set("grossWeight", e.target.value)}
                                placeholder="e.g. 55 kg"
                                className={inputClass}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[#e5e5e5] dark:border-[#27272a] flex items-center justify-end gap-2">
                    <button
                        onClick={onClose}
                        disabled={exportingBill || exportingPI}
                        className="px-4 py-2 rounded-lg text-[13px] font-medium bg-[#f5f5f5] dark:bg-[#27272a] text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#e5e5e5] dark:hover:bg-[#3f3f46] transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    
                    <button
                        onClick={() => onExport(info, "bill")}
                        disabled={exportingBill || exportingPI}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium bg-[#18181b] dark:bg-[#fafafa] text-white dark:text-[#09090b] hover:bg-[#27272a] dark:hover:bg-[#e5e5e5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {exportingBill ? (
                            <>
                                <div className="w-3.5 h-3.5 rounded-full animate-spin border-[1.5px] border-white/30 dark:border-black/20 border-t-white dark:border-t-black" />
                                Exporting Bill...
                            </>
                        ) : (
                            <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Export Bill
                            </>
                        )}
                    </button>
                    
                    <button
                        onClick={() => onExport(info, "pi")}
                        disabled={exportingBill || exportingPI}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium bg-[#8b5cf6] dark:bg-[#a78bfa] text-white dark:text-[#18181b] hover:bg-[#7c3aed] dark:hover:bg-[#c4b5fd] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {exportingPI ? (
                            <>
                                <div className="w-3.5 h-3.5 rounded-full animate-spin border-[1.5px] border-white/30 dark:border-black/20 border-t-white dark:border-t-black" />
                                Exporting PI...
                            </>
                        ) : (
                            <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Export PI
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
