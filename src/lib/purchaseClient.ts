export type PurchasePayloadItem = {
  raw_name: string;
  normalized_name: string;
  shop: string;
  is_consumable?: boolean | null;
};

export async function savePurchasedItems(items: PurchasePayloadItem[]) {
  const response = await fetch("/api/products/purchase", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "購入履歴の保存に失敗しました");
  }

  return response.json();
}