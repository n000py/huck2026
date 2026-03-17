import type { ReceiptResult } from "@/types";

type ReceiptPanelProps = {
  previewUrl: string | null;
  isLoading: boolean;
  result: ReceiptResult | null;
  errorMessage: string | null;
  unmatchedItems: string[];
  onSelectFile: (file: File | null) => void;
  onAnalyze: () => void;
};

export default function ReceiptPanel({
  previewUrl,
  isLoading,
  result,
  errorMessage,
  unmatchedItems,
  onSelectFile,
  onAnalyze,
}: ReceiptPanelProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">レシート画像をアップロード</h2>

        <input
        type="file"
        accept="image/*,.heic,.heif"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          onSelectFile(file);
        }}
        className="block w-full text-sm"
        />

        <p className="mt-2 text-sm text-slate-500">
          jpg / png などのレシート画像を選択してください
        </p>
      </div>

      {previewUrl && (
        <div className="rounded-2xl border bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">プレビュー</h2>
          <img
            src={previewUrl}
            alt="レシートプレビュー"
            className="max-h-[420px] rounded-xl border object-contain"
          />

          <button
            type="button"
            onClick={onAnalyze}
            disabled={isLoading}
            className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isLoading ? "照合中..." : "照合する"}
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-white p-4">
            <h2 className="mb-3 text-lg font-semibold">照合結果</h2>

            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">店名：</span>
                {result.shopFull}
              </p>
              <p>
                <span className="font-medium">カテゴリ：</span>
                {result.category}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <h3 className="mb-3 font-semibold">一致した商品</h3>
            {result.matches.length === 0 ? (
              <p className="text-sm text-slate-500">一致した商品はありません</p>
            ) : (
              <div className="space-y-2">
                {result.matches.map((match, index) => (
                  <div
                    key={`${match.normalizedName}-${index}`}
                    className="rounded-xl border p-3 text-sm"
                  >
                    <p>
                      <span className="font-medium">商品名：</span>
                      {match.normalizedName}
                    </p>
                    {match.rawName && (
                      <p className="text-slate-600">
                        <span className="font-medium">レシート表記：</span>
                        {match.rawName}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <h3 className="mb-3 font-semibold">今回買わなかった商品</h3>
            {unmatchedItems.length === 0 ? (
              <p className="text-sm text-slate-500">すべて購入できました</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {unmatchedItems.map((name, index) => (
                  <span
                    key={`${name}-${index}`}
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-800"
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <h3 className="mb-3 font-semibold">リスト外の商品</h3>
            {result.extras.length === 0 ? (
              <p className="text-sm text-slate-500">リスト外の商品はありません</p>
            ) : (
              <div className="space-y-2">
                {result.extras.map((extra, index) => (
                  <div
                    key={`${extra.normalizedName}-${index}`}
                    className="rounded-xl border px-3 py-2 text-sm"
                  >
                    <p>
                      <span className="font-medium">商品名：</span>
                      {extra.normalizedName}
                    </p>
                    {extra.rawName && (
                      <p className="text-slate-500">
                        <span className="font-medium">レシート表記：</span>
                        {extra.rawName}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}