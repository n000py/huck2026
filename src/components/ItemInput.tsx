"use client";

import { useState } from "react";

type ItemInputProps = {
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  onAutoSuggest: () => void;
  isAiLoading?: boolean;
};

export default function ItemInput({
  value,
  onChange,
  onAdd,
  onAutoSuggest,
  isAiLoading = false,
}: ItemInputProps) {
  const [isComposing, setIsComposing] = useState(false);

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-2xl border bg-white p-4 md:flex-row">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isComposing) {
            onAdd();
          }
        }}
        placeholder="例: 牛乳、洗剤、乾電池"
        className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
      />
      <button
        onClick={onAdd}
        className="rounded-xl bg-black px-4 py-3 text-white transition hover:opacity-90"
      >
        追加
      </button>
      <button
        onClick={onAutoSuggest}
        disabled={isAiLoading}
        className="rounded-xl border border-neutral-300 bg-white px-4 py-3 transition hover:bg-neutral-50 disabled:opacity-50"
      >
        {isAiLoading ? "AI振り分け中..." : "AIで自動振り分け"}
      </button>
    </div>
  );
}