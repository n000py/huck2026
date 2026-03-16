"use client";

import { Item, Store, SuggestionStatus } from "@/types";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

type ItemCardProps = {
  item: Item;
  stores: Store[];
  onMove: (itemId: string, newStoreId: string) => void;
};

function getBadge(status: SuggestionStatus) {
  switch (status) {
    case "accepted":
      return (
        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
          AI提案
        </span>
      );
    case "modified":
      return (
        <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-700">
          手動変更
        </span>
      );
    case "rejected":
      return (
        <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">
          提案拒否
        </span>
      );
    default:
      return null;
  }
}

export default function ItemCard({ item, stores, onMove }: ItemCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: item.id,
      data: {
        itemId: item.id,
        itemName: item.name,
      },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border p-4 transition ${
        isDragging
          ? "scale-[1.02] opacity-60 shadow-lg ring-2 ring-neutral-300"
          : "bg-white"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">{item.name}</div>
          {item.reason && (
            <div className="mt-1 text-sm text-neutral-500">
              理由: {item.reason}
            </div>
          )}
          {item.suggestedStoreId &&
            item.currentStoreId !== item.suggestedStoreId && (
              <div className="mt-1 text-xs text-neutral-500">
                AI提案と異なるストアへ変更済み
              </div>
            )}
        </div>
        {getBadge(item.suggestionStatus)}
      </div>

      <div className="mb-3">
        <button
          {...listeners}
          {...attributes}
          className="rounded-lg border border-dashed border-neutral-400 px-3 py-1 text-sm text-neutral-600 hover:bg-neutral-50"
        >
          ドラッグして移動
        </button>
      </div>
    </div>
  );
}