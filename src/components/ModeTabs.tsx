import { Mode } from "@/types";

type ModeTabsProps = {
  mode: Mode;
  onChangeMode: (mode: Mode) => void;
};

const tabs: { key: Mode; label: string }[] = [
  { key: "edit", label: "編集" },
  { key: "shopping", label: "買い物" },
  { key: "receipt", label: "レシート確認" },
];

export default function ModeTabs({ mode, onChangeMode }: ModeTabsProps) {
  return (
    <div className="mb-6 flex gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChangeMode(tab.key)}
          className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
            mode === tab.key
              ? "border-black bg-black text-white"
              : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}