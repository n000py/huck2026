import { AiSuggestionResult, Item, Store } from "@/types";

export function classifyItemNameByMockAi(itemName: string): {
  storeName: string;
  reason: string;
} {
  const name = itemName.trim();

  if (
    name.includes("洗剤") ||
    name.includes("歯ブラシ") ||
    name.includes("シャンプー") ||
    name.includes("ティッシュ") ||
    name.includes("トイレットペーパー")
  ) {
    return {
      storeName: "ドラッグストア",
      reason: "日用品カテゴリとしてドラッグストアを提案",
    };
  }

  if (
    name.includes("電池") ||
    name.includes("収納") ||
    name.includes("スポンジ") ||
    name.includes("フック") ||
    name.includes("文房具")
  ) {
    return {
      storeName: "100均",
      reason: "低価格・雑貨候補として100均を提案",
    };
  }

  if (
    name.includes("牛乳") ||
    name.includes("パン") ||
    name.includes("卵") ||
    name.includes("ヨーグルト") ||
    name.includes("野菜") ||
    name.includes("肉")
  ) {
    return {
      storeName: "スーパー",
      reason: "食品カテゴリとしてスーパーを提案",
    };
  }

  return {
    storeName: "その他",
    reason: "明確なカテゴリを特定できないためその他に仮配置",
  };
}

export async function suggestStoresByMockAi(
  items: Item[],
  stores: Store[]
): Promise<AiSuggestionResult[]> {
  const targets = items.filter((item) => item.currentStoreId === null);

  return targets.map((item) => {
    const result = classifyItemNameByMockAi(item.name);

    const hasStore = stores.some((store) => store.name === result.storeName);

    return {
      itemName: item.name,
      storeName: hasStore ? result.storeName : "その他",
      reason: result.reason,
    };
  });
}