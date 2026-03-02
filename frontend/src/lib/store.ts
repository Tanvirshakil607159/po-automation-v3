import { create } from "zustand";

// ── Types ──────────────────────────────────────────────────────────────
export interface RowData {
    [key: string]: string;
}

export interface POGroup {
    categories: Record<string, RowData[]>;
}

export interface GroupedData {
    po_column: string | null;
    grouping_column: string | null;
    po_groups: Record<string, POGroup>;
    headers: string[];
    all_categories: string[];
}

export interface UploadResult {
    id: number;
    filename: string;
    total_rows: number;
    categories_count: number;
    data: GroupedData;
}

export interface HistoryItem {
    id: number;
    filename: string;
    upload_date: string;
}

export interface ConsumptionEntry {
    consumption: number;
    wastage: number;
}

// consumption_values[poName][category][rowIndex] = { consumption, wastage }
export type ConsumptionValues = Record<string, Record<string, Record<string, ConsumptionEntry>>>;

// ── Migrate old flat format to new nested format ───────────────────────
function migrateData(raw: Record<string, unknown>): GroupedData {
    // New format already has po_groups
    if (raw.po_groups && typeof raw.po_groups === "object" && Object.keys(raw.po_groups as object).length > 0) {
        return raw as unknown as GroupedData;
    }

    // Old format has flat "categories" — wrap in a single PO group
    const oldCategories = (raw.categories || {}) as Record<string, RowData[]>;
    const headers = (raw.headers || []) as string[];

    return {
        po_column: null,
        grouping_column: (raw.grouping_column as string) || null,
        po_groups: {
            "All Orders": { categories: oldCategories },
        },
        headers,
        all_categories: Object.keys(oldCategories).sort(),
    };
}

const getDefaultWastage = (groupName: string, categoryName: string): number => {
    const isLabelOrLoop = (name: string) => name.toLowerCase().includes("label") || name.toLowerCase().includes("loop");
    return (isLabelOrLoop(groupName) || isLabelOrLoop(categoryName)) ? 2 : 5;
};

// ── Store ──────────────────────────────────────────────────────────────
interface AppState {
    uploadResult: UploadResult | null;
    groupedData: GroupedData | null;
    activePO: string;
    activeTab: string;
    isUploading: boolean;
    consumptionValues: ConsumptionValues;
    history: HistoryItem[];

    setUploadResult: (result: UploadResult) => void;
    setActivePO: (po: string) => void;
    setActiveTab: (tab: string) => void;
    setIsUploading: (val: boolean) => void;
    setConsumption: (po: string, category: string, rowIndex: number, field: "consumption" | "wastage", value: number) => void;
    setHistory: (items: HistoryItem[]) => void;
    clearUpload: () => void;
    excludedCategories: string[];
    toggleCategoryExclusion: (category: string) => void;
    moveItem: (po: string, srcCat: string, srcSubCat: string | null, srcIdx: number, destCat: string, destSubCat: string | null) => void;
    addSubCategory: (po: string, cat: string, subCat: string) => void;
    editItemData: (po: string, cat: string, subCat: string | null, rowIdx: number, key: string, newValue: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
    uploadResult: null,
    groupedData: null,
    activePO: "",
    activeTab: "",
    isUploading: false,
    consumptionValues: {},
    history: [],
    excludedCategories: [],

    setUploadResult: (result) => {
        // Migrate data to ensure it's in the new po_groups format
        const migrated = migrateData(result.data as unknown as Record<string, unknown>);
        const poGroups = migrated.po_groups;
        const firstPO = Object.keys(poGroups)[0] || "";
        const firstCat = firstPO ? Object.keys(poGroups[firstPO]?.categories || {})[0] || "" : "";

        // Initialize consumption values with defaults
        const initValues: ConsumptionValues = {};
        for (const [po, poData] of Object.entries(poGroups)) {
            initValues[po] = {};
            for (const [cat, catData] of Object.entries((poData as any).categories || {})) {
                const data = catData as any;
                if (data && typeof data === "object" && "_sub_groups" in data) {
                    // All categories now use sub-groups
                    for (const [subName, subRows] of Object.entries(data._sub_groups || {})) {
                        const key = `${cat}::${subName}`;
                        const defaultWastage = getDefaultWastage(po, cat);
                        initValues[po][key] = {};
                        for (let i = 0; i < (subRows as any[]).length; i++) {
                            initValues[po][key][String(i)] = { consumption: 1, wastage: defaultWastage };
                        }
                    }
                } else if (Array.isArray(data)) {
                    // Fallback for flat arrays (legacy safety)
                    const defaultWastage = getDefaultWastage(po, cat);
                    initValues[po][cat] = {};
                    for (let i = 0; i < data.length; i++) {
                        initValues[po][cat][String(i)] = { consumption: 1, wastage: defaultWastage };
                    }
                }
            }
        }

        set({
            uploadResult: { ...result, data: migrated },
            groupedData: migrated,
            activePO: firstPO,
            activeTab: firstCat,
            consumptionValues: initValues,
            excludedCategories: [],
        });
    },

    setActivePO: (po) =>
        set((state) => {
            const firstCat = po
                ? Object.keys(state.groupedData?.po_groups?.[po]?.categories || {})[0] || ""
                : "";
            return { activePO: po, activeTab: firstCat };
        }),

    setActiveTab: (tab) => set({ activeTab: tab }),
    setIsUploading: (val) => set({ isUploading: val }),

    setConsumption: (po, category, rowIndex, field, value) =>
        set((state) => {
            const prev = state.consumptionValues;
            const poData = prev[po] ?? {};
            const catData = poData[category] ?? {};
            const baseCategoryName = category.split("::")[0] || category;
            const rowData = catData[String(rowIndex)] ?? { consumption: 1, wastage: getDefaultWastage(po, baseCategoryName) };
            return {
                consumptionValues: {
                    ...prev,
                    [po]: {
                        ...poData,
                        [category]: {
                            ...catData,
                            [String(rowIndex)]: { ...rowData, [field]: value },
                        },
                    },
                },
            };
        }),

    setHistory: (items) => set({ history: items }),

    clearUpload: () =>
        set({
            uploadResult: null,
            groupedData: null,
            activePO: "",
            activeTab: "",
            consumptionValues: {},
            excludedCategories: [],
        }),

    toggleCategoryExclusion: (category) =>
        set((state) => {
            const excluded = [...state.excludedCategories];
            const idx = excluded.indexOf(category);
            if (idx >= 0) {
                excluded.splice(idx, 1);
            } else {
                excluded.push(category);
            }
            return { excludedCategories: excluded };
        }),

    moveItem: (po, srcCat, srcSubCat, srcIdx, destCat, destSubCat) =>
        set((state) => {
            if (!state.groupedData) return state;

            // Deep copy current grouped data
            const newData = structuredClone(state.groupedData) as GroupedData;
            const poData = newData.po_groups[po];
            if (!poData || !poData.categories) return state;

            // 1. Find and Extract Source Row
            let srcArray: RowData[] = [];
            const srcCatData = poData.categories[srcCat] as any;

            if (srcSubCat && srcCatData && typeof srcCatData === "object" && "_sub_groups" in srcCatData) {
                srcArray = srcCatData._sub_groups[srcSubCat];
            } else if (Array.isArray(srcCatData)) {
                srcArray = srcCatData;
            }

            if (!srcArray || srcArray.length <= srcIdx) return state;

            // Remove the item from its original position
            const [itemToMove] = srcArray.splice(srcIdx, 1);

            // 2. Insert into Destination
            const destCatData = poData.categories[destCat] as any;
            if (!destCatData) {
                // Should theoretically not happen if only dropping on existing categories
                console.warn("Destination category does not exist:", destCat);
                return state;
            }

            let destArray: RowData[] = [];
            if (destSubCat && typeof destCatData === "object" && "_sub_groups" in destCatData) {
                if (!destCatData._sub_groups[destSubCat]) {
                    destCatData._sub_groups[destSubCat] = [];
                }
                destArray = destCatData._sub_groups[destSubCat];
            } else if (Array.isArray(destCatData)) {
                destArray = destCatData;
            } else {
                console.warn("Destination is malformed:", destCat, destSubCat);
                return state;
            }

            destArray.push(itemToMove);

            // We do not strictly migrate consumption values here because indices shift. 
            // It's safer to let the user re-enter consumption (or it defaults to 1/5) when moved to a new sub-category,
            // otherwise shifting array indices across categories gets extremely messy.

            return { groupedData: newData };
        }),

    addSubCategory: (po, cat, subCat) =>
        set((state) => {
            if (!state.groupedData) return state;
            const newData = structuredClone(state.groupedData) as GroupedData;
            const poData = newData.po_groups[po];
            if (!poData || !poData.categories || !poData.categories[cat]) return state;

            const catData = poData.categories[cat] as any;
            if (catData && typeof catData === "object" && "_sub_groups" in catData) {
                if (!catData._sub_groups[subCat]) {
                    catData._sub_groups[subCat] = [];
                }
            }
            return { groupedData: newData };
        }),

    editItemData: (po, cat, subCat, rowIdx, key, newValue) =>
        set((state) => {
            if (!state.groupedData) return state;
            const newData = structuredClone(state.groupedData) as GroupedData;
            const poData = newData.po_groups[po];
            if (!poData || !poData.categories || !poData.categories[cat]) return state;

            const catData = poData.categories[cat];

            if (subCat === null) {
                // Flat item list
                if (Array.isArray(catData)) {
                    if (rowIdx >= 0 && rowIdx < catData.length) {
                        catData[rowIdx][key] = newValue;
                    }
                }
            } else {
                // Categorized into sub-groups
                if (catData && typeof catData === "object" && "_sub_groups" in catData) {
                    const typedCat = catData as any;
                    const subArray = typedCat._sub_groups[subCat];
                    if (Array.isArray(subArray) && rowIdx >= 0 && rowIdx < subArray.length) {
                        subArray[rowIdx][key] = newValue;
                    }
                }
            }

            return { groupedData: newData };
        }),
}));
