"use client";

import { Item, Store } from "@/types";
import ItemCard from "./ItemCard";

type EditPanelProps = {
  selectedStore: Store | undefined;
  selectedStoreId: string;
  items: Item[];
  stores: Store[];
  onMoveItem: (itemId: string, newStoreId: string) => void;
};

export default function EditPanel({
  selectedStore,
  selectedStoreId,
  items,
  stores,
  onMoveItem,
}: EditPanelProps) {
  const visibleItems = items.filter(
    (item) => item.currentStoreId === selectedStoreId
  );

  return (
    <section className="rounded-2xl border bg-white p-4">
      <h2 className="mb-4 font-semibold">
        選択中ストア: {selectedStore?.name ?? "未選択"}
      </h2>

      <div className="space-y-3">
        {visibleItems.length > 0 ? (
          visibleItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              stores={stores}
              onMove={onMoveItem}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center text-neutral-400">
            このストアに割り当てられたアイテムはありません
          </div>
        )}
      </div>
    </section>
  );
}