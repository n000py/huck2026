import { RecommendItem } from "@/lib/recommendClient";

type RecommendationPanelProps = {
  recommendations: RecommendItem[];
  onAddRecommendation: (name: string) => void;
};

export default function RecommendationPanel({
  recommendations,
  onAddRecommendation,
}: RecommendationPanelProps) {
  if (recommendations.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-4">
        <h2 className="font-semibold text-neutral-900">補充おすすめ</h2>
        <p className="mt-2 text-sm text-neutral-500">
          まだおすすめはありません。購入履歴が2回以上たまると表示されます。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-3">
        <h2 className="font-semibold text-neutral-900">補充おすすめ</h2>
        <p className="text-sm text-neutral-500">
          消耗品の購入履歴から、そろそろ必要そうなものを表示しています
        </p>
      </div>

      <div className="space-y-2">
        {recommendations.map((item) => (
          <div
            key={`${item.product}-${item.recommended_shop}`}
            className="flex items-center justify-between rounded-xl border p-3"
          >
            <div>
              <div className="font-medium">{item.product}</div>
              <div className="text-sm text-neutral-500">
                よく買う店: {item.recommended_shop} / 周期目安: {item.cycle}日
              </div>
            </div>

            <button
              onClick={() => onAddRecommendation(item.product)}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
            >
              リストに追加
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}