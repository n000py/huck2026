type ReceiptHistoryMatch = {
  listName: string;
  receiptName?: string;
};

type ReceiptHistoryItem = {
  id: string;
  shopFull: string;
  category: string;
  matches: ReceiptHistoryMatch[];
  extras: string[];
  createdAt: string;
};

type ReceiptHistoryPanelProps = {
  histories: ReceiptHistoryItem[];
  isLoading: boolean;
  errorMessage: string | null;
};

function formatDateTime(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function ReceiptHistoryPanel({
  histories,
  isLoading,
  errorMessage,
}: ReceiptHistoryPanelProps) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-3">
        <h2 className="text-lg font-semibold">レシート履歴</h2>
        <p className="mt-1 text-sm text-slate-500">
          過去の照合結果を確認できます
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-slate-500">履歴を読み込み中...</p>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {!isLoading && !errorMessage && histories.length === 0 && (
        <p className="text-sm text-slate-500">まだレシート履歴はありません</p>
      )}

      {!isLoading && !errorMessage && histories.length > 0 && (
        <div className="space-y-3">
          {histories.map((history) => (
            <details
              key={history.id}
              className="rounded-xl border p-4"
            >
              <summary className="cursor-pointer list-none">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">{history.shopFull}</p>
                    <p className="text-sm text-slate-500">
                      {formatDateTime(history.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="rounded-full border px-3 py-1">
                      カテゴリ: {history.category}
                    </span>
                    <span className="rounded-full border px-3 py-1">
                      一致: {history.matches.length}件
                    </span>
                    <span className="rounded-full border px-3 py-1">
                      リスト外: {history.extras.length}件
                    </span>
                  </div>
                </div>
              </summary>

              <div className="mt-4 space-y-4 border-t pt-4">
                <div>
                  <h3 className="mb-2 font-semibold">一致した商品</h3>
                  {history.matches.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      一致した商品はありません
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {history.matches.map((match, index) => (
                        <div
                          key={`${history.id}-match-${index}`}
                          className="rounded-lg border p-3 text-sm"
                        >
                          <p>
                            <span className="font-medium">リスト名：</span>
                            {match.listName}
                          </p>
                          {match.receiptName && (
                            <p>
                              <span className="font-medium">レシート表記：</span>
                              {match.receiptName}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 font-semibold">リスト外の商品</h3>
                  {history.extras.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      リスト外の商品はありません
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {history.extras.map((extra, index) => (
                        <span
                          key={`${history.id}-extra-${index}`}
                          className="rounded-full border px-3 py-1 text-sm"
                        >
                          {extra}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}