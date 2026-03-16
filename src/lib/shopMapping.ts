import { Store } from "@/types";

export function findStoreIdByName(
  stores: Store[],
  storeName: string
): string | null {
  const normalized = storeName.trim();

  const exact = stores.find((store) => store.name === normalized);
  if (exact) return exact.id;

  if (normalized.includes("スーパー")) {
    return stores.find((s) => s.name === "スーパー")?.id ?? null;
  }
  if (normalized.includes("ドラッグ")) {
    return stores.find((s) => s.name === "ドラッグストア")?.id ?? null;
  }
  if (normalized.includes("100")) {
    return stores.find((s) => s.name === "100均")?.id ?? null;
  }
  if (normalized.includes("その他")) {
    return stores.find((s) => s.name === "その他")?.id ?? null;
  }

  return null;
}

export function findStoreNameById(
  stores: Store[],
  storeId: string | null
): string {
  if (!storeId) return "未分類";
  return stores.find((s) => s.id === storeId)?.name ?? "その他";
}