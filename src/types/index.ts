export type Mode = "edit" | "shopping" | "receipt";

export type SuggestionStatus = "accepted" | "modified" | "manual";
export type PurchaseStatus = "pending" | "bought";

export type Store = {
  id: string;
  name: string;
};

export type Item = {
  id: string;
  name: string;
  suggestedStoreId: string | null;
  currentStoreId: string | null;
  suggestionStatus: SuggestionStatus;
  purchaseStatus: PurchaseStatus;
  shoppingChecked: boolean;
  reason: string;
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

export type ReceiptMatch = {
  normalizedName: string;
  rawName?: string;
};

export type ReceiptExtra = {
  normalizedName: string;
  rawName?: string;
};

export type ReceiptResult = {
  shopFull: string;
  category: string;
  matches: ReceiptMatch[];
  extras: ReceiptExtra[];
};

export type ReceiptPreview = {
  fileName: string;
  previewUrl: string;
};

export type ReceiptAnalyzeResult = {
  fileName: string;
  result: ReceiptResult;
};