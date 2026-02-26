"use client";

import { useAppStore } from "@/lib/store";

export default function ItemTabs() {
    const { groupedData, activePO, activeTab, setActiveTab } = useAppStore();

    if (!groupedData || !activePO || !groupedData.po_groups[activePO]) {
        return null;
    }

    const categories = Object.keys(groupedData.po_groups[activePO].categories);

    if (categories.length === 0) return null;

    return (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" id="item-tabs">
            {categories.map((cat, idx) => {
                const isActive = cat === activeTab;
                const count = groupedData.po_groups[activePO].categories[cat].length;

                return (
                    <button
                        key={cat}
                        onClick={() => setActiveTab(cat)}
                        className={`group flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-[13px] font-medium whitespace-nowrap transition-colors
                          ${isActive
                                ? "bg-[#18181b] dark:bg-[#fafafa] text-white dark:text-[#09090b]"
                                : "bg-[#f5f5f5] dark:bg-[#27272a] text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#e5e5e5] dark:hover:bg-[#3f3f46] hover:text-[#18181b] dark:hover:text-[#fafafa]"
                            }`}
                        id={`tab-${idx}`}
                    >
                        <span>{cat}</span>
                        <span
                            className={`inline-flex items-center justify-center text-[10px] px-1.5 py-0.5 rounded-full
                              ${isActive
                                    ? "bg-white/15 dark:bg-black/10 text-white/80 dark:text-[#09090b]/70"
                                    : "bg-[#e5e5e5] dark:bg-[#3f3f46] text-[#a1a1aa] dark:text-[#71717a]"
                                }`}
                        >
                            {count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
