import type { Item, ReceiptMatchResponse } from "@/types";

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

export function applyReceiptResultToItems(
  items: Item[],
  receipt: ReceiptMatchResponse
): Item[] {
  const matchedKeys = new Set(
    receipt.matches
      .map((match) => normalizeKey(match.listName))
      .filter((name) => name !== "")
  );

  return items.map((item) => {
    const itemKey = normalizeKey(item.name);

    if (matchedKeys.has(itemKey)) {
      return {
        ...item,
        purchaseStatus: "bought" as const,
      };
    }

    return {
      ...item,
      purchaseStatus:
        item.purchaseStatus === "bought" ? "bought" : "pending",
    };
  });
}