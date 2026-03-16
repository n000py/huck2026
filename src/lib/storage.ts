import { Item, ReceiptMatchResponse } from "@/types";

const ITEMS_KEY = "smart-shopping-items";
const SELECTED_STORE_KEY = "smart-shopping-selected-store";
const RECEIPT_HISTORY_KEY = "smart-shopping-receipt-history";

export type PurchaseHistoryEntry = {
  date: string;
  shopFull: string;
  category: string;
  itemName: string;
};

export function loadItems(): Item[] | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Item[];
  } catch {
    return null;
  }
}

export function saveItems(items: Item[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}

export function loadSelectedStoreId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SELECTED_STORE_KEY);
}

export function saveSelectedStoreId(storeId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SELECTED_STORE_KEY, storeId);
}

export function loadPurchaseHistory(): PurchaseHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECEIPT_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PurchaseHistoryEntry[];
  } catch {
    return [];
  }
}

export function appendPurchaseHistoryFromReceipt(
  receipt: ReceiptMatchResponse
) {
  if (typeof window === "undefined") return;

  const prev = loadPurchaseHistory();
  const now = new Date().toISOString();

  const next = [
    ...prev,
    ...receipt.matches.map((match) => ({
      date: now,
      shopFull: receipt.shopFull,
      category: receipt.category,
      itemName: match.listName,
    })),
  ];

  localStorage.setItem(RECEIPT_HISTORY_KEY, JSON.stringify(next));
}
export function clearShoppingData() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("smart-shopping-items");
  localStorage.removeItem("smart-shopping-selected-store");
  localStorage.removeItem("smart-shopping-receipt-history");
}