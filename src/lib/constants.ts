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
    reason: "食品としてスーパー購入の可能性が高い",
  },
  {
    id: "item-2",
    name: "洗剤",
    suggestedStoreId: "store-drugstore",
    currentStoreId: "store-drugstore",
    suggestionStatus: "accepted",
    purchaseStatus: "pending",
    reason: "日用品としてドラッグストア候補",
  },
  {
    id: "item-3",
    name: "乾電池",
    suggestedStoreId: "store-100yen",
    currentStoreId: "store-supermarket",
    suggestionStatus: "modified",
    purchaseStatus: "pending",
    reason: "低価格候補として100均を提案",
  },
];