import { Item, Store } from "@/types";

type ShoppingPanelProps = {
  selectedStore: Store | undefined;
  selectedStoreId: string;
  items: Item[];
  onToggleBought: (itemId: string) => void;
};

export default function ShoppingPanel({
  selectedStore,
  selectedStoreId,
  items,
  onToggleBought,
}: ShoppingPanelProps) {
  const visibleItems = items.filter(
    (item) =>
      item.currentStoreId === selectedStoreId &&
      item.purchaseStatus !== "bought"
  );

  const checkedCount = visibleItems.filter(
    (item) => item.shoppingChecked
  ).length;

  return (
    <section className="rounded-2xl border bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">
          {selectedStore?.name ?? "未選択"}で買うもの
        </h2>
        <div className="text-sm text-neutral-500">
          {checkedCount} / {visibleItems.length} チェック済み
        </div>
      </div>

      <div className="space-y-3">
        {visibleItems.length > 0 ? (
          visibleItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onToggleBought(item.id)}
              className="flex w-full items-center justify-between rounded-xl border p-4 text-left transition hover:bg-neutral-50"
            >
              <span
                className={
                  item.shoppingChecked
                    ? "text-neutral-400 line-through"
                    : ""
                }
              >
                {item.name}
              </span>
              <span className="text-sm text-neutral-400">
                {item.shoppingChecked ? "チェック済み" : "未チェック"}
              </span>
            </button>
          ))
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center text-neutral-400">
            このストアに買い物アイテムはありません
          </div>
        )}
      </div>
    </section>
  );
}