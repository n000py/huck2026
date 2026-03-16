import { AiSuggestionResult, Item, ReceiptMatchResponse, Store } from "@/types";
import { findStoreNameById } from "@/lib/shopMapping";

export async function suggestStoresByGemini(params: {
  items: Item[];
  stores: Store[];
}): Promise<AiSuggestionResult[]> {
  const targets = params.items.filter((item) => item.currentStoreId === null);

  if (targets.length === 0) return [];

  const response = await fetch("/api/suggest-stores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      itemNames: targets.map((item) => item.name),
      storeNames: params.stores.map((store) => store.name),
    }),
  });

  if (!response.ok) {
    const text = await response.text();

    if (response.status === 429) {
      throw new Error(
        "Gemini の利用上限に達しました。少し待って再試行するか、AI Studio の quota / billing を確認してください。"
      );
    }

    if (response.status === 404) {
      throw new Error(
        "AI振り分けAPIが見つかりません。route.ts の配置を確認してください。"
      );
    }

    throw new Error(`AI振り分けに失敗しました (${response.status})`);
  }

  return (await response.json()) as AiSuggestionResult[];
}

export async function matchReceiptByGemini(params: {
  file: File;
  items: Item[];
  stores: Store[];
}): Promise<ReceiptMatchResponse> {
  const base64 = await fileToBase64(params.file);

  const response = await fetch("/api/receipt-match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mimeType: params.file.type,
      imageBase64: base64,
      itemNames: params.items.map((item) => item.name),
      categorizedItems: params.items
        .filter((item) => item.currentStoreId !== null)
        .map((item) => ({
          name: item.name,
          category: findStoreNameById(params.stores, item.currentStoreId),
        })),
      storeNames: params.stores.map((store) => store.name),
    }),
  });

  if (!response.ok) {
    const text = await response.text();

    if (response.status === 429) {
      throw new Error(
        "Gemini の利用上限に達しました。少し待って再試行するか、AI Studio の quota / billing を確認してください。"
      );
    }

    if (response.status === 404) {
      throw new Error(
        "レシート照合APIが見つかりません。route.ts の配置を確認してください。"
      );
    }

    throw new Error(`レシート照合に失敗しました (${response.status})`);
  }

  return (await response.json()) as ReceiptMatchResponse;
}


async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}