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
        <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin scrollbar-thumb-gray-600" id="item-tabs">
            {categories.map((cat, idx) => {
                const isActive = cat === activeTab;
                const count = groupedData.po_groups[activePO].categories[cat].length;

                return (
                    <button
                        key={cat}
                        onClick={() => setActiveTab(cat)}
                        className={`group relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200
              ${isActive
                                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900 shadow-lg shadow-amber-500/20"
                                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                            }`}
                        id={`tab-${idx}`}
                    >
                        <span>{cat}</span>
                        <span
                            className={`inline-flex items-center justify-center text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded-full
                ${isActive
                                    ? "bg-gray-900/20 text-gray-900"
                                    : "bg-gray-700 text-gray-400 group-hover:bg-gray-600"
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
