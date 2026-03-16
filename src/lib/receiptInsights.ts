import { Item } from "@/types";
import { ReceiptHistoryItem } from "@/lib/receiptHistoryClient";

type CountItem = {
  name: string;
  count: number;
};

export type ReceiptInsights = {
  frequentMatchedItems: CountItem[];
  frequentExtraItems: CountItem[];
  notRecentlyBoughtItems: string[];
};

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function sortCountEntries(map: Map<string, number>): CountItem[] {
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name, "ja");
    });
}

export function buildReceiptInsights(
  histories: ReceiptHistoryItem[],
  items: Item[],
  options?: {
    topMatchedLimit?: number;
    topExtraLimit?: number;
    recentHistoryCount?: number;
  }
): ReceiptInsights {
  const topMatchedLimit = options?.topMatchedLimit ?? 5;
  const topExtraLimit = options?.topExtraLimit ?? 5;
  const recentHistoryCount = options?.recentHistoryCount ?? 3;

  const matchedCountMap = new Map<string, number>();
  const extraCountMap = new Map<string, number>();

  for (const history of histories) {
    for (const match of history.matches) {
      const key = match.listName.trim();
      if (!key) continue;
      matchedCountMap.set(key, (matchedCountMap.get(key) ?? 0) + 1);
    }

    for (const extra of history.extras) {
      const key = extra.trim();
      if (!key) continue;
      extraCountMap.set(key, (extraCountMap.get(key) ?? 0) + 1);
    }
  }

  const frequentMatchedItems = sortCountEntries(matchedCountMap).slice(
    0,
    topMatchedLimit
  );

  const frequentExtraItems = sortCountEntries(extraCountMap).slice(
    0,
    topExtraLimit
  );

  const recentHistories = histories.slice(0, recentHistoryCount);
  const recentMatchedSet = new Set<string>();

  for (const history of recentHistories) {
    for (const match of history.matches) {
      recentMatchedSet.add(normalizeName(match.listName));
    }
  }

  const notRecentlyBoughtItems = items
    .filter((item) => item.purchaseStatus !== "bought")
    .map((item) => item.name)
    .filter((name) => !recentMatchedSet.has(normalizeName(name)))
    .slice(0, 5);

  return {
    frequentMatchedItems,
    frequentExtraItems,
    notRecentlyBoughtItems,
  };
}