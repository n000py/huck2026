import { Item, ReceiptMatchResponse } from "@/types";

export function applyReceiptResultToItems(
  items: Item[],
  receipt: ReceiptMatchResponse
): Item[] {
  const matchedNames = new Set(receipt.matches.map((m) => m.listName));

  return items.map((item) => {
    if (matchedNames.has(item.name)) {
      return {
        ...item,
        purchaseStatus: "bought" as const,
      };
    }

    return {
      ...item,
      purchaseStatus: "not_bought" as const,
    };
  });
}