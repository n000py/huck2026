type CountItem = {
  name: string;
  count: number;
};

type ReceiptInsightsPanelProps = {
  frequentMatchedItems: CountItem[];
  frequentExtraItems: CountItem[];
  notRecentlyBoughtItems: string[];
  existingItemNames: string[];
  onAddExtraItem: (name: string) => void;
};

function EmptyMessage({ text }: { text: string }) {
  return <p className="text-sm text-slate-500">{text}</p>;
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

export default function ReceiptInsightsPanel({
  frequentMatchedItems,
  frequentExtraItems,
  notRecentlyBoughtItems,
  existingItemNames,
  onAddExtraItem,
}: ReceiptInsightsPanelProps) {
  const existingNameSet = new Set(existingItemNames.map(normalizeName));

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-3">
        <h2 className="text-lg font-semibold">買い物インサイト</h2>
        <p className="mt-1 text-sm text-slate-500">
          レシート履歴から傾向を簡単に集計しています
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border p-4">
          <h3 className="mb-3 font-semibold">よく買っている商品</h3>
          {frequentMatchedItems.length === 0 ? (
            <EmptyMessage text="まだ十分な履歴がありません" />
          ) : (
            <div className="space-y-2">
              {frequentMatchedItems.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span>{item.name}</span>
                  <span className="font-medium">{item.count}回</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border p-4">
          <h3 className="mb-3 font-semibold">よくリスト外で買う商品</h3>
          {frequentExtraItems.length === 0 ? (
            <EmptyMessage text="リスト外購入の履歴はまだ少ないです" />
          ) : (
            <div className="space-y-2">
              {frequentExtraItems.map((item) => {
                const isAlreadyAdded = existingNameSet.has(
                  normalizeName(item.name)
                );

                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                  >
                    <div>
                      <div>{item.name}</div>
                      <div className="text-xs text-slate-500">{item.count}回</div>
                    </div>

                    {isAlreadyAdded ? (
                      <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
                        追加済み
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAddExtraItem(item.name)}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                      >
                        リストに追加
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border p-4">
          <h3 className="mb-3 font-semibold">最近買っていない候補</h3>
          {notRecentlyBoughtItems.length === 0 ? (
            <EmptyMessage text="最近買っていない候補はありません" />
          ) : (
            <div className="space-y-2">
              {notRecentlyBoughtItems.map((name) => (
                <div
                  key={name}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}