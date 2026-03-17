export type RecommendItem = {
  product: string;
  cycle: number;
  daysSince: number;
  recommended_shop: string;
};

export async function fetchRecommendations(): Promise<RecommendItem[]> {
  const response = await fetch("/api/products/recommend", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "おすすめ取得に失敗しました");
  }

  return response.json();
}

export async function syncShoppingList(rawNames: string[]) {
  const response = await fetch("/api/shopping-list/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(rawNames.map((name) => ({ raw_name: name }))),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "買い物リスト同期に失敗しました");
  }

  return response.json();
}