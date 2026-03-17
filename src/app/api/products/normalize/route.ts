import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { judgeConsumable } from "@/lib/consumable";
import { normalizeRawName, normalizeProductName } from "@/lib/productName";

export const runtime = "nodejs";

type NormalizeRequestItem = {
  raw_name: string;
  shop?: string;
};

type NormalizeRequestBody = {
  items: NormalizeRequestItem[];
  storeCandidates?: string[];
};

type NormalizeResponseItem = {
  raw_name: string;
  normalized_name: string;
  shop: string;
  is_consumable: boolean | null;
  source: "alias" | "product" | "ai" | "fallback";
};

type GeminiNormalizedItem = {
  raw_name: string;
  normalized_name: string;
  shop: string;
  is_consumable: boolean | null;
};

function sanitizeShopName(
  shop: string | undefined,
  storeCandidates: string[]
): string {
  const trimmed = (shop ?? "").trim();
  if (!trimmed) return storeCandidates[0] ?? "未分類";

  const exact = storeCandidates.find((candidate) => candidate === trimmed);
  if (exact) return exact;

  return trimmed;
}

function isNonProductLine(rawName: string): boolean {
  const text = rawName.trim();
  
  const blockedKeywords = [
    "値引",
    "会計券",
    "会員",
    "お預り",
    "お釣",
    "小計",
    "合計",
    "税込",
    "消費税",
    "税",
    "内税",
    "外税",
    "非課税",
    "ポイント",
    "現金",
    "釣銭",
    "領収",
    "レジ",
    "クーポン",
    "割引",
    "軽減",
    "標準",
    "無印",
    "対象商品",
    "軽減税率",
    "クレジット",
    "電子マネー",
    "取引",
    "担当",
    "TEL",
    ];

  if (blockedKeywords.some((keyword) => text.includes(keyword))) {
    return true;
  }

  // 記号だらけの注記行も除外
  if (/^[^\p{L}\p{N}ぁ-んァ-ヶ一-龠]+$/u.test(text)) {
    return true;
  }

  // 「軽減:※/標準:無印/標準内:内」のような注記パターン
  if (
    text.includes(":") &&
    text.includes("/") &&
    (text.includes("軽減") || text.includes("標準"))
  ) {
    return true;
  }

  return false;
}

/**
 * 商品カテゴリへ寄せるための軽い正規化
 * 注意:
 * - ここでは normalizeProductName() を先に使わない
 * - 強い正規化をかけると「ポリ袋」→「45L」のように大事な語が落ちる可能性があるため
 */

function toGeneralProductName(name: string): string {
  const text = normalizeRawName(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

  if (!text) return "";

  // 食品
  if (
    text.includes("とうふ") ||
    text.includes("豆腐")
  ) {
    return "豆腐";
  }

  if (
    text.includes("たまご") ||
    text.includes("玉子") ||
    text.includes("卵")
  ) {
    return "卵";
  }

  if (text.includes("納豆")||
    text.includes("とろっ豆") ||
    text.includes("とろつ豆")
) {
    return "納豆";
  }

  if (
    text.includes("ぶなしめじ") ||
    text.includes("しめじ") ||
    text.includes("ふなしめじ")
  ) {
    return "ぶなしめじ";
  }

  if (text.includes("もやし")) {
    return "もやし";
  }

  if (text.includes("ポリ袋")) {
    return "ポリ袋";
  }

  if (text.includes("ミルクティー")) {
    return "ミルクティー";
  }

  if (text.includes("紅茶")) {
    return "紅茶";
  }

  if (text.includes("牛乳")) {
    return "牛乳";
  }

  if (text.includes("バランスパワー")) {
    return "栄養補助食品";
  }

  // 薬・衛生用品
  if (
    text.includes("鼻炎") ||
    text.includes("コンタック") ||
    text.includes("アレジオン") ||
    text.includes("アレグラ")
  ) {
    return "鼻炎薬";
  }

  if (
    text.includes("頭痛") ||
    text.includes("鎮痛") ||
    text.includes("イブ") ||
    text.includes("バファリン") ||
    text.includes("ロキソニン")
  ) {
    return "痛み止め";
  }

  if (
    text.includes("かぜ") ||
    text.includes("風邪") ||
    text.includes("パブロン") ||
    text.includes("ルル")
  ) {
    return "風邪薬";
  }

  if (
    text.includes("胃腸") ||
    text.includes("太田胃散") ||
    text.includes("キャベジン")
  ) {
    return "胃腸薬";
  }

  if (
    text.includes("目薬") ||
    text.includes("ロート") ||
    text.includes("サンテ")
  ) {
    return "目薬";
  }

  if (
    text.includes("マスク")
  ) {
    return "マスク";
  }

  if (
    text.includes("ティッシュ")
  ) {
    return "ティッシュ";
  }

  if (
    text.includes("トイレットペーパー")
  ) {
    return "トイレットペーパー";
  }

  return "";
}

/**
 * 最終的な品名の決定ルールを一箇所に集約
 */
function resolveFinalProductName(rawName: string, candidateName?: string): string {
  const byRaw = toGeneralProductName(rawName);
  if (byRaw) return byRaw;

  const byCandidate = candidateName ? toGeneralProductName(candidateName) : "";
  if (byCandidate) return byCandidate;

  const normalizedCandidate = candidateName
    ? normalizeProductName(candidateName).trim()
    : "";
  if (normalizedCandidate) return normalizedCandidate;

  const normalizedRaw = normalizeProductName(rawName).trim();
  if (normalizedRaw) return normalizedRaw;

  return candidateName?.trim() || rawName;
}

async function normalizeWithGemini(params: {
  unresolvedItems: NormalizeRequestItem[];
  knownNormalizedNames: string[];
  storeCandidates: string[];
}): Promise<GeminiNormalizedItem[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY が未設定です");
  }

  const model = process.env.GEMINI_NORMALIZE_MODEL || "gemini-2.5-flash-lite";

  const prompt = `
あなたはレシート商品名の正規化アシスタントです。

【目的】
OCRや表記ゆれを含む商品名を、一般的で短い「正規化された品名」に変換してください。

【重要ルール】
1. 既知の正規名リストの中に意味が同じものがあれば、必ずその名前を使う
2. なければ、新しく一般的な名称を作る
3. メーカー名・ブランド名・装飾語・容量・数量は、一般名に不要なら落としてよい
4. 一般名は短く、意味が保たれる名前にする
5. 次のように寄せること
    - 新コンタック鼻炎Z 32錠 → 鼻炎薬
    - アレジオン20 → 鼻炎薬
    - ロキソニンS → 痛み止め
    - バファリンA → 痛み止め
    - パブロンゴールドA → 風邪薬
    - 太田胃散 → 胃腸薬
    - ロートZ → 目薬
   - 白い小たまご → 卵
   - まろやか絹とうふ → 豆腐
   - パキッ!とたれとろっ豆 → 納豆
   - 極小粒納豆 → 納豆
   - カットぶなしめじ → ぶなしめじ
   - カットふなしめじ → ぶなしめじ
   - 緑豆もやし → もやし
   - 半透明ポリ袋45L → ポリ袋
6. 店名は storeCandidates のいずれかに近ければその名前を使う
7. 商品ではない行は除外対象だが、入力に残っていた場合でも正規名を空にせず、無理なら raw_name に近い安全な名前を返す
8. JSON配列のみ返す。説明は禁止

【既知の正規名リスト】
${JSON.stringify(params.knownNormalizedNames, null, 2)}

【店候補リスト】
${JSON.stringify(params.storeCandidates, null, 2)}

【入力商品一覧】
${JSON.stringify(params.unresolvedItems, null, 2)}

【出力形式】
JSON配列のみ:
[
  {
    "raw_name": "...",
    "normalized_name": "...",
    "shop": "...",
    "is_consumable": true
  }
]
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Gemini正規化に失敗しました");
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text || typeof text !== "string") {
    throw new Error("Gemini正規化の応答が不正です");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini正規化のJSON解析に失敗しました");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Gemini正規化の返却形式が不正です");
  }

  return parsed.flatMap((item): GeminiNormalizedItem[] => {
    const rawName = normalizeRawName(String((item as any)?.raw_name ?? "")).trim();
    if (!rawName) return [];

    const normalizedCandidate = String(
      (item as any)?.normalized_name ?? ""
    ).trim();
    const shop = String((item as any)?.shop ?? "");
    const isConsumableRaw = (item as any)?.is_consumable;

    return [
      {
        raw_name: rawName,
        normalized_name: resolveFinalProductName(rawName, normalizedCandidate),
        shop,
        is_consumable:
          typeof isConsumableRaw === "boolean" ? isConsumableRaw : null,
      },
    ];
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as NormalizeRequestBody;
    const items = Array.isArray(body.items) ? body.items : [];
    const storeCandidates = Array.isArray(body.storeCandidates)
      ? body.storeCandidates
      : [];

    if (items.length === 0) {
      return NextResponse.json({ error: "items が空です" }, { status: 400 });
    }

    const selectAliasStmt = db.prepare(`
      SELECT
        a.raw_name,
        a.preferred_shop,
        p.normalized_name,
        p.is_consumable
      FROM aliases a
      JOIN products p ON a.product_id = p.id
      WHERE a.raw_name = ?
    `);

    const selectProductStmt = db.prepare(`
      SELECT normalized_name, is_consumable
      FROM products
      WHERE normalized_name = ?
    `);

    const selectAllKnownNamesStmt = db.prepare(`
      SELECT normalized_name
      FROM products
      ORDER BY normalized_name ASC
    `);

    const resolved: NormalizeResponseItem[] = [];
    const unresolved: NormalizeRequestItem[] = [];

    for (const item of items) {
      const rawName = normalizeRawName(item.raw_name ?? "").trim();
      if (!rawName) continue;
      if (isNonProductLine(rawName)) continue;

      const aliasMatch = selectAliasStmt.get(rawName) as
        | {
            raw_name: string;
            preferred_shop: string | null;
            normalized_name: string;
            is_consumable: number | null;
          }
        | undefined;

      if (aliasMatch) {
        const finalName = resolveFinalProductName(
          rawName,
          aliasMatch.normalized_name
        );

        resolved.push({
          raw_name: rawName,
          normalized_name: finalName,
          shop: sanitizeShopName(
            item.shop || aliasMatch.preferred_shop || "",
            storeCandidates
          ),
          is_consumable:
            aliasMatch.is_consumable === null
              ? judgeConsumable(finalName)
              : aliasMatch.is_consumable === 1,
          source: "alias",
        });
        continue;
      }

      const directProductMatch = selectProductStmt.get(rawName) as
        | { normalized_name: string; is_consumable: number | null }
        | undefined;

      if (directProductMatch) {
        const finalName = resolveFinalProductName(
          rawName,
          directProductMatch.normalized_name
        );

        resolved.push({
          raw_name: rawName,
          normalized_name: finalName,
          shop: sanitizeShopName(item.shop, storeCandidates),
          is_consumable:
            directProductMatch.is_consumable === null
              ? judgeConsumable(finalName)
              : directProductMatch.is_consumable === 1,
          source: "product",
        });
        continue;
      }

      unresolved.push({
        raw_name: rawName,
        shop: sanitizeShopName(item.shop, storeCandidates),
      });
    }

    if (unresolved.length > 0) {
      const knownNames = (
        selectAllKnownNamesStmt.all() as { normalized_name: string }[]
      ).map((row) => row.normalized_name);

      let aiResults: GeminiNormalizedItem[] = [];

      try {
        aiResults = await normalizeWithGemini({
          unresolvedItems: unresolved,
          knownNormalizedNames: knownNames,
          storeCandidates,
        });
      } catch (error) {
        console.error("Gemini normalize failed, fallback used:", error);

        aiResults = unresolved.map((item) => {
          const rawName = normalizeRawName(item.raw_name).trim();
          const fallbackName = resolveFinalProductName(rawName);

          return {
            raw_name: rawName,
            normalized_name: fallbackName,
            shop: sanitizeShopName(item.shop, storeCandidates),
            is_consumable: judgeConsumable(fallbackName),
          };
        });
      }

      const aiMap = new Map(aiResults.map((item) => [item.raw_name, item]));

      for (const item of unresolved) {
        const rawName = normalizeRawName(item.raw_name).trim();
        const found = aiMap.get(rawName);

        if (found) {
          const finalName = resolveFinalProductName(
            rawName,
            found.normalized_name
          );

          resolved.push({
            raw_name: rawName,
            normalized_name: finalName,
            shop: sanitizeShopName(found.shop || item.shop, storeCandidates),
            is_consumable: found.is_consumable ?? judgeConsumable(finalName),
            source: "ai",
          });
        } else {
          const fallbackName = resolveFinalProductName(rawName);

          resolved.push({
            raw_name: rawName,
            normalized_name: fallbackName,
            shop: sanitizeShopName(item.shop, storeCandidates),
            is_consumable: judgeConsumable(fallbackName),
            source: "fallback",
          });
        }
      }
    }

    const finalItems = resolved.map((item) => {
      const finalName = resolveFinalProductName(
        item.raw_name,
        item.normalized_name
      );

      return {
        ...item,
        normalized_name: finalName,
        is_consumable: item.is_consumable ?? judgeConsumable(finalName),
      };
    });

    console.log("[normalize route] finalItems =", finalItems);
    return NextResponse.json({ items: finalItems });
  } catch (error) {
    console.error("POST /api/products/normalize failed:", error);
    return NextResponse.json(
      { error: "商品名正規化に失敗しました" },
      { status: 500 }
    );
  }
}