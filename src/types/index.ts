export type Mode = "edit" | "shopping" | "receipt";

export type SuggestionStatus = "accepted" | "modified" | "rejected";

export type PurchaseStatus = "pending" | "bought" | "not_bought";

export type Store = {
  id: string;
  name: string;
};

export type Item = {
  id: string;
  name: string;
  suggestedStoreId: string | null;
  currentStoreId: string | null;
  suggestionStatus: "accepted" | "modified" | "manual";
  purchaseStatus: "pending" | "bought";
  reason: string;
};

export type ReceiptResult = {
  itemName: string;
  result: "matched" | "missing" | "extra";
};

export type AiSuggestionResult = {
  itemName: string;
  storeName: string;
  reason?: string;
};

export type ReceiptMatchResponse = {
  shopFull: string;
  category: string;
  matches: {
    listName: string;
    receiptName?: string;
  }[];
  extras: string[];
};