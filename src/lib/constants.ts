import { Item, Store } from "@/types";

export const STORES: Store[] = [
  { id: "store-supermarket", name: "スーパー" },
  { id: "store-drugstore", name: "ドラッグストア" },
  { id: "store-100yen", name: "100均" },
  { id: "store-other", name: "その他" },
];

export const INITIAL_ITEMS: Item[] = [
  {
    id: "item-1",
    name: "牛乳",
    suggestedStoreId: "store-supermarket",
    currentStoreId: "store-supermarket",
    suggestionStatus: "accepted",
    purchaseStatus: "pending",
    shoppingChecked: false,
    reason: "",
  },
  {
    id: "item-2",
    name: "卵",
    suggestedStoreId: "store-supermarket",
    currentStoreId: "store-supermarket",
    suggestionStatus: "accepted",
    purchaseStatus: "pending",
    shoppingChecked: false,
    reason: "",
  },
];