export type ReceiptHistoryMatch = {
  listName: string;
  receiptName?: string;
};

export type ReceiptHistoryItem = {
  id: string;
  shopFull: string;
  category: string;
  matches: ReceiptHistoryMatch[];
  extras: string[];
  createdAt: string;
};

export type ReceiptHistoryResponse = {
  histories: ReceiptHistoryItem[];
};

export async function fetchReceiptHistory(): Promise<ReceiptHistoryResponse> {
  const response = await fetch("/api/receipt-history", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("レシート履歴の読み込みに失敗しました");
  }

  return response.json();
}

export async function appendReceiptHistory(payload: {
  shopFull: string;
  category: string;
  matches: ReceiptHistoryMatch[];
  extras: string[];
}): Promise<ReceiptHistoryItem> {
  const response = await fetch("/api/receipt-history", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("レシート履歴の保存に失敗しました");
  }

  return response.json();
}