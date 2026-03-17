export type NormalizeRequestItem = {
  raw_name: string;
  shop?: string;
};

export type NormalizeResponseItem = {
  raw_name: string;
  normalized_name: string;
  shop: string;
  is_consumable: boolean | null;
  source: "alias" | "product" | "ai" | "fallback";
};

export async function normalizePurchasedItems(params: {
  items: NormalizeRequestItem[];
  storeCandidates: string[];
}): Promise<NormalizeResponseItem[]> {
  const response = await fetch("/api/products/normalize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "商品名正規化に失敗しました");
  }

  const data = await response.json();
  return Array.isArray(data.items) ? data.items : [];
}