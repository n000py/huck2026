import { Item } from "@/types";

export type ShoppingStateResponse = {
  items: Item[];
  selectedStoreId: string;
  updatedAt: string;
};

export async function fetchShoppingState(): Promise<ShoppingStateResponse> {
  const response = await fetch("/api/shopping-state", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("買い物リストの読み込みに失敗しました");
  }

  return response.json();
}

export async function saveShoppingState(payload: {
  items: Item[];
  selectedStoreId: string;
}): Promise<ShoppingStateResponse> {
  const response = await fetch("/api/shopping-state", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("買い物リストの保存に失敗しました");
  }

  return response.json();
}