"use client";

import { useDroppable } from "@dnd-kit/core";
import { Item, Store } from "@/types";

type StoreSidebarProps = {
  stores: Store[];
  items: Item[];
  selectedStoreId: string;
  onSelectStore: (storeId: string) => void;
};

type StoreCardProps = {
  store: Store;
  count: number;
  isSelected: boolean;
  onClick: () => void;
};

function DroppableStoreCard({
  store,
  count,
  isSelected,
  onClick,
}: StoreCardProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: store.id,
  });

  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left transition ${
        isOver
          ? "border-black bg-neutral-100 shadow-sm"
          : isSelected
          ? "border-black bg-neutral-100"
          : "border-neutral-200 bg-white hover:bg-neutral-50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium">{store.name}</div>
        <div className="text-xs text-neutral-400">{isOver ? "ここに移動" : ""}</div>
      </div>
      <div className="text-sm text-neutral-500">{count}件</div>
    </button>
  );
}

export default function StoreSidebar({
  stores,
  items,
  selectedStoreId,
  onSelectStore,
}: StoreSidebarProps) {
  return (
    <aside className="rounded-2xl border bg-white p-4">
      <h2 className="mb-3 font-semibold">ストア一覧</h2>
      <div className="space-y-3">
        {stores.map((store) => {
          const count = items.filter(
            (item) => item.currentStoreId === store.id
          ).length;

          return (
            <DroppableStoreCard
              key={store.id}
              store={store}
              count={count}
              isSelected={selectedStoreId === store.id}
              onClick={() => onSelectStore(store.id)}
            />
          );
        })}
      </div>
    </aside>
  );
}