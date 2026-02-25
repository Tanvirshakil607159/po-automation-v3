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
}

export const useAppStore = create<AppState>((set) => ({
    uploadResult: null,
    groupedData: null,
    activePO: "",
    activeTab: "",
    isUploading: false,
    consumptionValues: {},
    history: [],

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
                        initValues[po][key] = {};
                        for (let i = 0; i < (subRows as any[]).length; i++) {
                            initValues[po][key][String(i)] = { consumption: 1, wastage: 5 };
                        }
                    }
                } else if (Array.isArray(data)) {
                    // Fallback for flat arrays (legacy safety)
                    initValues[po][cat] = {};
                    for (let i = 0; i < data.length; i++) {
                        initValues[po][cat][String(i)] = { consumption: 1, wastage: 5 };
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
            const updated = { ...state.consumptionValues };
            if (!updated[po]) updated[po] = {};
            if (!updated[po][category]) updated[po][category] = {};
            if (!updated[po][category][String(rowIndex)]) {
                updated[po][category][String(rowIndex)] = { consumption: 1, wastage: 5 };
            }
            updated[po][category][String(rowIndex)][field] = value;
            return { consumptionValues: updated };
        }),

    setHistory: (items) => set({ history: items }),

    clearUpload: () =>
        set({
            uploadResult: null,
            groupedData: null,
            activePO: "",
            activeTab: "",
            consumptionValues: {},
        }),
}));
