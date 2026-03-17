import { normalizeProductName } from "@/lib/productName";

const consumableKeywords = [
  // 飲料
  "水",
  "お茶",
  "紅茶",
  "コーヒー",
  "ジュース",
  "牛乳",
  "豆乳",
  "炭酸水",
  "飲料",

  // 食品
  "卵",
  "パン",
  "米",
  "納豆",
  "豆腐",
  "ヨーグルト",
  "チーズ",
  "ハム",
  "生ハム",
  "ソーセージ",
  "ウインナー",
  "肉",
  "魚",
  "野菜",
  "果物",
  "バナナ",
  "りんご",
  "キャベツ",
  "もやし",
  "麺",
  "うどん",
  "そば",
  "パスタ",
  "冷凍食品",
  "惣菜",
  "弁当",
  "おにぎり",
  "カップ麺",
  "レトルト",
  "調味料",
  "味噌",
  "醤油",
  "マヨネーズ",
  "ケチャップ",
  "ドレッシング",

  // 日用品
  "ティッシュ",
  "トイレットペーパー",
  "キッチンペーパー",
  "洗剤",
  "柔軟剤",
  "シャンプー",
  "コンディショナー",
  "ボディソープ",
  "ハンドソープ",
  "歯磨き粉",
  "歯ブラシ",
  "スポンジ",
  "ゴミ袋",
  "ラップ",
  "アルミホイル",
  "生理用品",
  "電池",
  "豆腐",
  "とうふ",
  "たまご",
  "卵",
  "納豆",
  "しめじ",
  "もやし",
  "ポリ袋",
];

const nonConsumableKeywords = [
  "炊飯器",
  "電子レンジ",
  "冷蔵庫",
  "洗濯機",
  "テレビ",
  "イヤホン",
  "充電器",
  "フライパン",
  "鍋",
  "包丁",
  "まな板",
  "皿",
  "コップ",
  "収納",
  "家具",
  "家電",
  "文房具",
  "ノート",
  "ペン",
  "ハサミ",
];

const maybeNonRecommendKeywords = [
  // 初版では補充おすすめ対象から外したいもの
  "サワー",
  "ビール",
  "ワイン",
  "日本酒",
  "焼酎",
  "ウメッシュ",
  "檸檬堂",
  "氷彩",
  "ライチ",
  "レモン",
];

export function judgeConsumable(
  inputName: string
): boolean | null {
  const name = normalizeProductName(inputName).toLowerCase();

  if (
    nonConsumableKeywords.some((keyword) =>
      name.includes(keyword.toLowerCase())
    )
  ) {
    return false;
  }

  if (
    maybeNonRecommendKeywords.some((keyword) =>
      name.includes(keyword.toLowerCase())
    )
  ) {
    return false;
  }

  if (
    consumableKeywords.some((keyword) =>
      name.includes(keyword.toLowerCase())
    )
  ) {
    return true;
  }

  return null;
}