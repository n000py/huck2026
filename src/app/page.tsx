"use client";

import { useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import Header from "@/components/Header";
import ModeTabs from "@/components/ModeTabs";
import ItemInput from "@/components/ItemInput";
import StoreSidebar from "@/components/StoreSidebar";
import EditPanel from "@/components/EditPanel";
import ShoppingPanel from "@/components/ShoppingPanel";
import ReceiptPanel from "@/components/ReceiptPanel";
import { STORES } from "@/lib/constants";
import { clearShoppingData } from "@/lib/storage";
import { fetchShoppingState, saveShoppingState } from "@/lib/shoppingStateClient";
import ReceiptHistoryPanel from "@/components/ReceiptHistoryPanel";
import {
  appendReceiptHistory,
  fetchReceiptHistory,
  type ReceiptHistoryItem,
} from "@/lib/receiptHistoryClient";
import { findStoreIdByName } from "@/lib/shopMapping";
import { suggestStoresByGemini } from "@/lib/gemini";
import { applyReceiptResultToItems } from "@/lib/receipt";
import type { Item, Mode, ReceiptResult } from "@/types";
import ReceiptInsightsPanel from "@/components/ReceiptInsightsPanel";
import { buildReceiptInsights } from "@/lib/receiptInsights";
import { savePurchasedItems } from "@/lib/purchaseClient";
import RecommendationPanel from "@/components/RecommendationPanel";
import {
  fetchRecommendations,
  syncShoppingList,
  type RecommendItem,
} from "@/lib/recommendClient";
import { normalizePurchasedItems } from "@/lib/normalizeClient";


function createItemId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isHeicFile(file: File) {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  return (
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    type === "image/heic" ||
    type === "image/heif"
  );
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const heic2any = (await import("heic2any")).default;

  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.9,
  });

  const blob = Array.isArray(converted) ? converted[0] : converted;

  return new File(
    [blob as Blob],
    file.name.replace(/\.(heic|heif)$/i, ".jpg"),
    { type: "image/jpeg" }
  );
}

type ApiReceiptMatch = {
  listName: string;
  receiptName?: string;
};

type ApiReceiptResult = {
  shopFull: string;
  category: string;
  matches: ApiReceiptMatch[];
  extras: string[];
};

type NormalizedPurchasedItem = {
  raw_name: string;
  normalized_name: string;
  shop: string;
  is_consumable: boolean | null;
};

function buildNormalizeItemsFromApiReceiptResult(result: ApiReceiptResult) {
  const shopName = result.shopFull?.trim() || result.category?.trim() || "不明";

  const matchedItems = result.matches.map((match) => ({
    raw_name: match.receiptName?.trim() || match.listName.trim(),
    shop: shopName,
  }));

  const extraItems = result.extras
    .map((extra) => extra.trim())
    .filter((name) => name !== "")
    .map((name) => ({
      raw_name: name,
      shop: shopName,
    }));

  return [...matchedItems, ...extraItems];
}

function buildDisplayReceiptResult(
  apiResult: ApiReceiptResult,
  normalizedItems: NormalizedPurchasedItem[]
): ReceiptResult {
  const normalizedMap = new Map(
    normalizedItems.map((item) => [
      item.raw_name.trim(),
      item.normalized_name.trim() || item.raw_name.trim(),
    ])
  );

  return {
    shopFull: apiResult.shopFull,
    category: apiResult.category,
    matches: apiResult.matches
      .map((match) => {
        const rawName = match.receiptName?.trim() || match.listName.trim();
        if (!rawName) return null;

        const normalizedName =
          normalizedMap.get(rawName) || match.listName.trim() || rawName;

        return {
          normalizedName,
          rawName: normalizedName === rawName ? undefined : rawName,
        };
      })
      .filter((match): match is NonNullable<typeof match> => match !== null),

    extras: apiResult.extras
      .map((extra) => extra.trim())
      .filter((rawName) => rawName !== "")
      .map((rawName) => {
        const normalizedName = normalizedMap.get(rawName) || rawName;

        return {
          normalizedName,
          rawName: normalizedName === rawName ? undefined : rawName,
        };
      }),
  };
}

// function reconcileReceiptResultWithNormalizedItems(
//   apiResult: ApiReceiptResult,
//   normalizedItems: NormalizedPurchasedItem[],
//   items: Item[]
// ): ApiReceiptResult {
//   const normalizedNameByRawName = new Map(
//     normalizedItems.map((item) => [
//       normalizeKey(item.raw_name),
//       item.normalized_name.trim() || item.raw_name.trim(),
//     ])
//   );

//   const pendingListNameMap = new Map(
//     items
//       .filter((item) => item.purchaseStatus !== "bought")
//       .map((item) => [normalizeKey(item.name), item.name.trim()])
//   );

//   const matchedListNameSet = new Set(
//     apiResult.matches.map((match) => normalizeKey(match.listName))
//   );

//   const nextMatches: ApiReceiptMatch[] = [...apiResult.matches];
//   const nextExtras: string[] = [];

//   for (const extra of apiResult.extras) {
//     const rawName = extra.trim();
//     if (!rawName) continue;

//     const normalizedName =
//       normalizedNameByRawName.get(normalizeKey(rawName)) ?? rawName;

//     const matchedListName = pendingListNameMap.get(normalizeKey(normalizedName));

//     if (matchedListName && !matchedListNameSet.has(normalizeKey(matchedListName))) {
//       nextMatches.push({
//         listName: matchedListName,
//         receiptName: rawName !== matchedListName ? rawName : undefined,
//       });
//       matchedListNameSet.add(normalizeKey(matchedListName));
//     } else {
//       nextExtras.push(rawName);
//     }
//   }

//   return {
//     ...apiResult,
//     matches: nextMatches,
//     extras: nextExtras,
//   };
// }

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function reconcileReceiptResultWithNormalizedItems(
  apiResult: ApiReceiptResult,
  normalizedItems: NormalizedPurchasedItem[],
  itemNames: string[]
): ApiReceiptResult {
  const normalizedNameByRawName = new Map(
    normalizedItems.map((item) => [
      normalizeKey(item.raw_name),
      item.normalized_name.trim() || item.raw_name.trim(),
    ])
  );

  const listNameMap = new Map(
    itemNames
      .map((name) => name.trim())
      .filter((name) => name !== "")
      .map((name) => [normalizeKey(name), name] as const)
  );

  const matchedListNameSet = new Set(
    apiResult.matches.map((match) => normalizeKey(match.listName))
  );

  const nextMatches: ApiReceiptMatch[] = [...apiResult.matches];
  const nextExtras: string[] = [];

  for (const extra of apiResult.extras) {
    const rawName = extra.trim();
    if (!rawName) continue;

    const normalizedName =
      normalizedNameByRawName.get(normalizeKey(rawName)) ?? rawName;

    const matchedListName =
      listNameMap.get(normalizeKey(rawName)) ??
      listNameMap.get(normalizeKey(normalizedName));

    if (matchedListName && !matchedListNameSet.has(normalizeKey(matchedListName))) {
      nextMatches.push({
        listName: matchedListName,
        receiptName: rawName !== matchedListName ? rawName : undefined,
      });
      matchedListNameSet.add(normalizeKey(matchedListName));
    } else {
      nextExtras.push(rawName);
    }
  }

  return {
    ...apiResult,
    matches: nextMatches,
    extras: nextExtras,
  };
}


export default function Home() {
  const [mode, setMode] = useState<Mode>("edit");
  // const [items, setItems] = useState<Item[]>(INITIAL_ITEMS);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(STORES[0].id);
  const [inputValue, setInputValue] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("待機中");

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [receiptResult, setReceiptResult] = useState<ReceiptResult | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
//   const [debugReceiptData, setDebugReceiptData] = useState<{
//   apiData: ApiReceiptResult | null;
//   normalizedItems: NormalizedPurchasedItem[];
//   reconciledApiData: ApiReceiptResult | null;
// } | null>(null);

  const selectedStore = useMemo(
    () => STORES.find((store) => store.id === selectedStoreId),
    [selectedStoreId]
  );
  const unclassifiedItems = items.filter((item) => item.currentStoreId === null);
  const [receiptHistories, setReceiptHistories] = useState<ReceiptHistoryItem[]>([]);
  const [receiptHistoryLoading, setReceiptHistoryLoading] = useState(false);
  const [receiptHistoryError, setReceiptHistoryError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendItem[]>([]);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendError, setRecommendError] = useState<string | null>(null);
  

  const receiptInsights = useMemo(() => {
    return buildReceiptInsights(receiptHistories, items);
  }, [receiptHistories, items]);
  
  const unmatchedItems = useMemo(() => {
    return items
    .filter((item) => item.purchaseStatus !== "bought")
    .map((item) => item.name.trim())
    .filter((name) => name !== "");
  }, [items]);

  const existingItemNames = useMemo(() => {
    return items.map((item) => item.name);
  }, [items]);
  
  const handleAddExtraItemToList = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const alreadyExists = items.some(
      (item) => item.name.trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (alreadyExists) {
     setStatusMessage(`「${trimmed}」はすでにリストに入っています`);
     return;
    }

   const newItem: Item = {
      id: createItemId(),
      name: trimmed,
      suggestedStoreId: null,
      currentStoreId: null,
      suggestionStatus: "manual",
      purchaseStatus: "pending",
      reason: "レシート履歴のリスト外購入から追加",
    };

   setItems((prev) => [...prev, newItem]);
    setStatusMessage(`「${trimmed}」をリストに追加しました`);
  };

  // useEffect(() => {
  //   const storedItems = loadItems();
  //   const storedSelectedStoreId = loadSelectedStoreId();

  //   if (storedItems && storedItems.length > 0) {
  //     setItems(storedItems);
  //   }

  //   if (storedSelectedStoreId) {
  //     setSelectedStoreId(storedSelectedStoreId);
  //   }

  //   setIsHydrated(true);

  // }, []);

  useEffect(() => {
    const loadServerState = async () => {
      try {
        const data = await fetchShoppingState();

        if (data.items && data.items.length > 0) {
          setItems(data.items);
        } else {
          setItems([]);
        }

        if (data.selectedStoreId) {
          setSelectedStoreId(data.selectedStoreId);
        }

        setStatusMessage("買い物リストを読み込みました");
      } catch (error) {
        console.error(error);
        setStatusMessage("サーバー保存データの読み込みに失敗しました");
        setItems([]);
      } finally {
        setIsHydrated(true);
      }
    };
    loadServerState();
  }, []);

  useEffect(() => {
    loadReceiptHistories();
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const timer = setTimeout(() => {
      saveShoppingState({
        items,
        selectedStoreId,
      }).catch((error) => {
        console.error(error);
        setStatusMessage("買い物リストの保存に失敗しました");
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [items, selectedStoreId, isHydrated]);


  useEffect(() => {
    return () => {
      if (receiptPreviewUrl) {
        URL.revokeObjectURL(receiptPreviewUrl);
      }
    };
  }, [receiptPreviewUrl]);

  useEffect(() => {
    const savedMode = sessionStorage.getItem("smart-shopping-mode");

    if (
      savedMode === "edit" ||
      savedMode === "shopping" ||
      savedMode === "receipt"
    ) {
      setMode(savedMode);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem("smart-shopping-mode", mode);
  }, [mode]);
  
  useEffect(() => {
    if (!isHydrated) return;

    const run = async () => {
      try {
        setRecommendLoading(true);
        setRecommendError(null);

        await syncShoppingList(items.map((item) => item.name));
        const data = await fetchRecommendations();
        setRecommendations(data);
      } catch (error) {
        console.error(error);
        setRecommendError("補充おすすめの取得に失敗しました");
      } finally {
        setRecommendLoading(false);
      }
    };

    run();
  }, [items, isHydrated]);

  const handleAddItem = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const newItem: Item = {
      id: createItemId(),
      name: trimmed,
      suggestedStoreId: null,
      currentStoreId: null,
      suggestionStatus: "accepted",
      purchaseStatus: "pending",
      reason: "",
    };

    setItems((prev) => [...prev, newItem]);
    setInputValue("");
    setStatusMessage(`「${trimmed}」を追加しました`);
  };

  const handleAddRecommendation = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const alreadyExists = items.some(
      (item) => item.name.trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (alreadyExists) {
      setStatusMessage(`「${trimmed}」はすでにリストに入っています`);
      return;
    }

    const newItem: Item = {
      id: createItemId(),
      name: trimmed,
      suggestedStoreId: null,
     currentStoreId: null,
     suggestionStatus: "manual",
     purchaseStatus: "pending",
     reason: "補充おすすめから追加",
   };

   setItems((prev) => [...prev, newItem]);
   setStatusMessage(`「${trimmed}」を補充おすすめから追加しました`);
  };

  const handleResetList = () => {
    const ok = window.confirm("現在の買い物リストをリセットしますか？");
    if (!ok) return;

    clearShoppingData();
    setItems([]);
    setSelectedStoreId(STORES[0].id);
    setInputValue("");
    setReceiptFile(null);

    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
    }

    setReceiptPreviewUrl(null);
    setReceiptResult(null);
    setReceiptError(null);
    setStatusMessage("買い物リストをリセットしました");
  };

  const handleAutoSuggest = async () => {
    const targets = items.filter((item) => item.currentStoreId === null);

    if (targets.length === 0) {
      setStatusMessage("未分類のアイテムはありません");
      return;
    }

    setIsAiLoading(true);
    setStatusMessage("AIで振り分け中...");

    try {
      const suggestions = await suggestStoresByGemini({
        items,
        stores: STORES,
      });

      setItems((prev) =>
        prev.map((item) => {
          const suggestion = suggestions.find((s) => s.itemName === item.name);
          if (!suggestion) return item;

          const storeId = findStoreIdByName(STORES, suggestion.storeName);
          if (!storeId) return item;

          return {
            ...item,
            suggestedStoreId: storeId,
            currentStoreId: storeId,
            suggestionStatus: "accepted",
            reason: suggestion.reason ?? "",
          };
        })
      );

      setStatusMessage("AI振り分けが完了しました");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI振り分けに失敗しました";
      setStatusMessage(message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleMoveItem = (itemId: string, newStoreId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        const isChangedFromSuggestion =
          item.suggestedStoreId !== null && item.suggestedStoreId !== newStoreId;

        return {
          ...item,
          currentStoreId: newStoreId,
          suggestionStatus: isChangedFromSuggestion ? "modified" : "accepted",
        };
      })
    );

    const movedItem = items.find((item) => item.id === itemId);
    const store = STORES.find((store) => store.id === newStoreId);

    if (movedItem && store) {
      setStatusMessage(`「${movedItem.name}」を${store.name}へ移動しました`);
    }
  };

  const handleToggleBought = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              purchaseStatus:
                item.purchaseStatus === "bought" ? "pending" : "bought",
            }
          : item
      )
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;

    if (!overId) return;
    if (activeId === overId) return;

    const targetStore = STORES.find((store) => store.id === overId);
    if (!targetStore) return;

    handleMoveItem(activeId, targetStore.id);
    setSelectedStoreId(targetStore.id);
  };

  const handleSelectReceiptFile = async (file: File | null) => {
  if (receiptPreviewUrl) {
    URL.revokeObjectURL(receiptPreviewUrl);
  }

  setReceiptResult(null);
  setReceiptError(null);

  if (!file) {
    setReceiptFile(null);
    setReceiptPreviewUrl(null);
    return;
  }

  try {
    let workingFile = file;

    if (isHeicFile(file)) {
      setStatusMessage("HEIC画像をJPEGに変換中...");
      workingFile = await convertHeicToJpeg(file);
    }

    setReceiptFile(workingFile);

    const previewUrl = URL.createObjectURL(workingFile);
    setReceiptPreviewUrl(previewUrl);

    setStatusMessage(`レシート画像「${workingFile.name}」を選択しました`);
  } catch (error) {
    console.error(error);
    setReceiptFile(null);
    setReceiptPreviewUrl(null);
    setReceiptError("HEIC画像の変換に失敗しました");
    setStatusMessage("HEIC画像の変換に失敗しました");
  }
};

  const loadReceiptHistories = async () => {
    try {
      setReceiptHistoryLoading(true);
      setReceiptHistoryError(null);

      const data = await fetchReceiptHistory();
      setReceiptHistories(data.histories);
    } catch (error) {
      console.error(error);
      setReceiptHistoryError("レシート履歴の読み込みに失敗しました");
    } finally {
      setReceiptHistoryLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("ファイルの読み込みに失敗しました"));
          return;
        }

        const base64 = result.split(",")[1];
        if (!base64) {
          reject(new Error("base64変換に失敗しました"));
          return;
        }

        resolve(base64);
      };

      reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
      reader.readAsDataURL(file);
    });
  };

const handleAnalyzeReceipt = async () => {
  if (!receiptFile) {
    setReceiptError("先にレシート画像を選択してください");
    setStatusMessage("レシート画像を選択してください");
    return;
  }

  try {
    setReceiptLoading(true);
    setReceiptError(null);
    setReceiptResult(null);
    setStatusMessage("レシートを照合中...");

    const imageBase64 = await fileToBase64(receiptFile);
    
    const targetItems = items.filter((item) => item.name.trim() !== "");
    
    const itemNames = targetItems.map((item) => item.name.trim());

    const categorizedItems = targetItems
      .filter((item) => item.currentStoreId)
      .map((item) => {
        const matchedStore = STORES.find(
          (store) => store.id === item.currentStoreId
        );

        return {
          name: item.name.trim(),
          category: matchedStore?.name ?? "その他",
        };
      });

    const storeNames = STORES.map((store) => store.name);

    //デバッグ用
    console.log("items", items);
    console.log("itemNames", itemNames);

    const response = await fetch("/api/receipt-match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mimeType: receiptFile.type || "image/jpeg",
        imageBase64,
        itemNames,
        categorizedItems,
        storeNames,
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "レシート照合に失敗しました");
    }

    const apiData: ApiReceiptResult = await response.json();
    console.log("apiData", apiData);
    const normalizeItems = buildNormalizeItemsFromApiReceiptResult(apiData);

    let normalizedItems: NormalizedPurchasedItem[] = normalizeItems.map((item) => ({
      raw_name: item.raw_name,
      normalized_name: item.raw_name,
      shop: item.shop,
      is_consumable: null,
    }));

    if (normalizeItems.length > 0) {
      const apiNormalizedItems = await normalizePurchasedItems({
        items: normalizeItems,
        storeCandidates: STORES.map((store) => store.name),
      });

      normalizedItems = apiNormalizedItems.map((item) => ({
        raw_name: item.raw_name,
        normalized_name: item.normalized_name,
        shop: item.shop,
        is_consumable: item.is_consumable,
      }));

      console.log("normalizedItems", apiNormalizedItems);

      const purchasePayload = normalizedItems.map((item) => ({
        raw_name: item.raw_name,
        normalized_name: item.normalized_name,
        shop: item.shop,
        is_consumable: item.is_consumable,
      }));

      await savePurchasedItems(purchasePayload);
    }

    // const reconciledApiData = reconcileReceiptResultWithNormalizedItems(
    //   apiData,
    //   normalizedItems,
    //   items
    // );
    const reconciledApiData = reconcileReceiptResultWithNormalizedItems(
      apiData,
      normalizedItems,
      itemNames
    );
    // setDebugReceiptData({
    //   apiData,
    //   normalizedItems,
    //   reconciledApiData,
    // });

    console.log("reconciledApiData", reconciledApiData);

    setItems((prev) => applyReceiptResultToItems(prev, reconciledApiData));

    await appendReceiptHistory({
      shopFull: reconciledApiData.shopFull,
      category: reconciledApiData.category,
      matches: reconciledApiData.matches,
      extras: reconciledApiData.extras,
    });

    const displayResult = buildDisplayReceiptResult(
      reconciledApiData,
      normalizedItems
    );
    setReceiptResult(displayResult);

    await loadReceiptHistories();

    setStatusMessage("レシート照合と購入履歴の保存が完了しました");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "レシート照合に失敗しました";
    setReceiptError(message);
    setStatusMessage(message);
  } finally {
    setReceiptLoading(false);
  }
};

  const handleDeleteItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
    setStatusMessage("未分類アイテムを削除しました");
  };

  return (
    <main className="min-h-screen bg-neutral-50 p-6 text-neutral-900">
      <div className="mx-auto max-w-6xl">
        <Header title="Smart Shopping List" />
        <ModeTabs mode={mode} onChangeMode={setMode} />

        <div className="mb-4 flex justify-end">
          <button
            onClick={handleResetList}
            className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm text-red-600 transition hover:bg-red-50"
          >
            リストをリセット
          </button>
        </div>

        <div className="mb-4 rounded-2xl border bg-white p-4 text-sm text-neutral-600">
          <div className="font-medium">システム状態</div>
          <div className="mt-1">
            {isAiLoading || receiptLoading ? "⏳ " : ""}
            {statusMessage}
          </div>
        </div>

        {/* {mode === "edit" && (
          <>
            <ItemInput
              value={inputValue}
              onChange={setInputValue}
              onAdd={handleAddItem}
              onAutoSuggest={handleAutoSuggest}
              isAiLoading={isAiLoading}
            />

            {unclassifiedItems.length > 0 && (
              <div className="mb-4 rounded-2xl border bg-white p-4">
                <h2 className="mb-3 font-semibold">振り分け前のアイテム</h2>
                <div className="space-y-2">
                  {unclassifiedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border p-3"
                    >
                      <span>{item.name}</span>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="rounded-lg border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            
            {isMounted ? (
              <DndContext onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
                  <StoreSidebar
                    stores={STORES}
                    items={items}
                    selectedStoreId={selectedStoreId}
                    onSelectStore={setSelectedStoreId}
                  />
                  <EditPanel
                    selectedStore={selectedStore}
                    selectedStoreId={selectedStoreId}
                    items={items}
                    stores={STORES}
                    onMoveItem={handleMoveItem}
                  />
                </div>
              </DndContext>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
                <StoreSidebar
                  stores={STORES}
                  items={items}
                  selectedStoreId={selectedStoreId}
                  onSelectStore={setSelectedStoreId}
                />
                <EditPanel
                  selectedStore={selectedStore}
                  selectedStoreId={selectedStoreId}
                  items={items}
                  stores={STORES}
                  onMoveItem={handleMoveItem}
                />
              </div>
            )}
          </>
        )} */}
        {/* {mode === "edit" && (
          <>
            <ItemInput
              value={inputValue}
              onChange={setInputValue}
              onAdd={handleAddItem}
              onAutoSuggest={handleAutoSuggest}
              isAiLoading={isAiLoading}
            />

            {unclassifiedItems.length > 0 && (
              <div className="mb-4 rounded-2xl border bg-white p-4">
                <h2 className="mb-3 font-semibold">振り分け前のアイテム</h2>
                <div className="space-y-2">
                  {unclassifiedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border p-3"
                    >
                      <span>{item.name}</span>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="rounded-lg border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <ReceiptInsightsPanel
              frequentMatchedItems={receiptInsights.frequentMatchedItems}
              frequentExtraItems={receiptInsights.frequentExtraItems}
              notRecentlyBoughtItems={receiptInsights.notRecentlyBoughtItems}
              existingItemNames={existingItemNames}
              onAddExtraItem={handleAddExtraItemToList}
            />

            {isMounted ? (
              <DndContext onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
                  <StoreSidebar
                    stores={STORES}
                    items={items}
                    selectedStoreId={selectedStoreId}
                    onSelectStore={setSelectedStoreId}
                  />
                  <EditPanel
                    selectedStore={selectedStore}
                    selectedStoreId={selectedStoreId}
                    items={items}
                    stores={STORES}
                   onMoveItem={handleMoveItem}
                  />
                </div>
              </DndContext>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
                <StoreSidebar
                  stores={STORES}
                  items={items}
                  selectedStoreId={selectedStoreId}
                  onSelectStore={setSelectedStoreId}
                />
                <EditPanel
                  selectedStore={selectedStore}
                  selectedStoreId={selectedStoreId}
                  items={items}
                  stores={STORES}
                  onMoveItem={handleMoveItem}
                />
              </div>
            )}
          </>
        )} */}
        {mode === "edit" && (
  <>
    <ItemInput
      value={inputValue}
      onChange={setInputValue}
      onAdd={handleAddItem}
      onAutoSuggest={handleAutoSuggest}
      isAiLoading={isAiLoading}
    />

    <div className="mb-4">
  <RecommendationPanel
    recommendations={recommendations}
    onAddRecommendation={handleAddRecommendation}
  />
  {recommendLoading && (
    <div className="mt-2 text-sm text-neutral-500">補充おすすめを更新中...</div>
  )}
  {recommendError && (
    <div className="mt-2 text-sm text-red-600">{recommendError}</div>
  )}
</div>

    {unclassifiedItems.length > 0 && (
      <div className="mb-4 rounded-2xl border bg-white p-4">
        <h2 className="mb-3 font-semibold">振り分け前のアイテム</h2>
        <div className="space-y-2">
          {unclassifiedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border p-3"
            >
              <span>{item.name}</span>
              <button
                onClick={() => handleDeleteItem(item.id)}
                className="rounded-lg border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      </div>
    )}

    <div className="mb-8 rounded-2xl border bg-white">
      <button
        type="button"
        onClick={() => setIsInsightsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-neutral-50"
      >
        <div>
          <div className="font-semibold text-neutral-900">買い物インサイト</div>
          <div className="text-sm text-neutral-500">
            よく買うもの・リスト外購入・最近買っていないものを表示
          </div>
        </div>
        <span className="text-sm text-neutral-500">
          {isInsightsOpen ? "閉じる ▲" : "開く ▼"}
        </span>
      </button>

      {isInsightsOpen && (
        <div className="border-t px-4 py-4">
          <ReceiptInsightsPanel
            frequentMatchedItems={receiptInsights.frequentMatchedItems}
            frequentExtraItems={receiptInsights.frequentExtraItems}
            notRecentlyBoughtItems={receiptInsights.notRecentlyBoughtItems}
            existingItemNames={existingItemNames}
            onAddExtraItem={handleAddExtraItemToList}
          />
        </div>
      )}
    </div>

    {isMounted ? (
      <DndContext onDragEnd={handleDragEnd}>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
          <StoreSidebar
            stores={STORES}
            items={items}
            selectedStoreId={selectedStoreId}
            onSelectStore={setSelectedStoreId}
          />
          <EditPanel
            selectedStore={selectedStore}
            selectedStoreId={selectedStoreId}
            items={items}
            stores={STORES}
            onMoveItem={handleMoveItem}
          />
        </div>
      </DndContext>
    ) : (
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
        <StoreSidebar
          stores={STORES}
          items={items}
          selectedStoreId={selectedStoreId}
          onSelectStore={setSelectedStoreId}
        />
        <EditPanel
          selectedStore={selectedStore}
          selectedStoreId={selectedStoreId}
          items={items}
          stores={STORES}
          onMoveItem={handleMoveItem}
        />
      </div>
    )}
  </>
)}

        {mode === "shopping" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
            <StoreSidebar
              stores={STORES}
              items={items}
              selectedStoreId={selectedStoreId}
              onSelectStore={setSelectedStoreId}
            />
            <ShoppingPanel
              selectedStore={selectedStore}
              selectedStoreId={selectedStoreId}
              items={items}
              onToggleBought={handleToggleBought}
            />
          </div>
        )}

        {/* {mode === "receipt" && (
          <div className="space-y-4">
            <ReceiptPanel
              previewUrl={receiptPreviewUrl}
              isLoading={receiptLoading}
              result={receiptResult}
              errorMessage={receiptError}
              onSelectFile={handleSelectReceiptFile}
              onAnalyze={handleAnalyzeReceipt}
            />

            <ReceiptHistoryPanel
              histories={receiptHistories}
              isLoading={receiptHistoryLoading}
              errorMessage={receiptHistoryError}
            />
          </div>
        )} */}

        {/* {mode === "receipt" && (
          <div className="space-y-4">
            <ReceiptPanel
              previewUrl={receiptPreviewUrl}
              isLoading={receiptLoading}
              result={receiptResult}
              errorMessage={receiptError}
              unmatchedItems={unmatchedItems}
              onSelectFile={handleSelectReceiptFile}
              onAnalyze={handleAnalyzeReceipt}
            />

            <ReceiptInsightsPanel
              frequentMatchedItems={receiptInsights.frequentMatchedItems}
             frequentExtraItems={receiptInsights.frequentExtraItems}
             notRecentlyBoughtItems={receiptInsights.notRecentlyBoughtItems}
              existingItemNames={existingItemNames}
              onAddExtraItem={handleAddExtraItemToList}
            />

            <ReceiptHistoryPanel
              histories={receiptHistories}
              isLoading={receiptHistoryLoading}
              errorMessage={receiptHistoryError}
            />
          </div>
        )} */}
        {mode === "receipt" && (
          
          <div className="space-y-4">
          <ReceiptPanel
            previewUrl={receiptPreviewUrl}
            isLoading={receiptLoading}
            result={receiptResult}
            errorMessage={receiptError}
            unmatchedItems={unmatchedItems}
            onSelectFile={handleSelectReceiptFile}
            onAnalyze={handleAnalyzeReceipt}
          />
          {/* {debugReceiptData && (
  <div className="rounded-2xl border bg-white p-4">
    <h2 className="mb-3 font-semibold">デバッグ情報</h2>

    <div className="mb-4">
      <div className="mb-1 font-medium">apiData</div>
      <pre className="overflow-x-auto rounded-lg bg-neutral-100 p-3 text-xs">
        {JSON.stringify(debugReceiptData.apiData, null, 2)}
      </pre>
    </div>

    <div className="mb-4">
      <div className="mb-1 font-medium">normalizedItems</div>
      <pre className="overflow-x-auto rounded-lg bg-neutral-100 p-3 text-xs">
        {JSON.stringify(debugReceiptData.normalizedItems, null, 2)}
      </pre>
    </div>

    <div>
      <div className="mb-1 font-medium">reconciledApiData</div>
      <pre className="overflow-x-auto rounded-lg bg-neutral-100 p-3 text-xs">
        {JSON.stringify(debugReceiptData.reconciledApiData, null, 2)}
      </pre>
    </div>
  </div>
)} */}
           <ReceiptHistoryPanel
            histories={receiptHistories}
            isLoading={receiptHistoryLoading}
            errorMessage={receiptHistoryError}
          />
  </div>
)}


      </div>
    </main>
  );
}