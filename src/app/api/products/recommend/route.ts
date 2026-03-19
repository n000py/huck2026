import { NextResponse } from "next/server";
import db from "@/lib/db";

export const runtime = "nodejs";

type RecommendItem = {
  product: string;
  cycle: number;
  daysSince: number;
  recommended_shop: string;
};

function diffDays(later: Date, earlier: Date) {
  return Math.floor(
    (later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET() {
  try {
    const currentRows = db
      .prepare(`
        SELECT product_id
        FROM current_shopping_list
        WHERE product_id IS NOT NULL
      `)
      .all() as { product_id: number }[];

    const currentProductIds = new Set(currentRows.map((row) => row.product_id));

    const rows = db
      .prepare(`
        SELECT
          ph.product_id,
          ph.shop,
          ph.purchased_at,
          p.normalized_name
        FROM purchase_history ph
        JOIN products p ON ph.product_id = p.id
        WHERE ph.product_id IS NOT NULL
          AND p.is_consumable = 1
          AND p.recommend_enabled = 1
        ORDER BY ph.purchased_at ASC
      `)
      .all() as {
      product_id: number;
      shop: string;
      purchased_at: string;
      normalized_name: string;
    }[];

    const grouped = new Map<
      number,
      {
        product: string;
        shops: string[];
        dates: Date[];
      }
    >();

    for (const row of rows) {
      if (!grouped.has(row.product_id)) {
        grouped.set(row.product_id, {
          product: row.normalized_name,
          shops: [],
          dates: [],
        });
      }

      const entry = grouped.get(row.product_id)!;
      entry.shops.push(row.shop);
      entry.dates.push(new Date(row.purchased_at));
    }

    const now = new Date();
    const recommendations: RecommendItem[] = [];

    for (const [productId, entry] of grouped.entries()) {
      if (currentProductIds.has(productId)) continue;

      // 同じ日の複数購入は1回として扱う
      const uniqueDates = Array.from(
        new Map(entry.dates.map((date) => [dateKey(date), date])).values()
      ).sort((a, b) => a.getTime() - b.getTime());

      // 3回未満は周期が不安定なのでおすすめしない
      if (uniqueDates.length < 3) continue;

      const intervals: number[] = [];
      for (let i = 1; i < uniqueDates.length; i++) {
        const days = diffDays(uniqueDates[i], uniqueDates[i - 1]);
        if (days > 0) intervals.push(days);
      }

      if (intervals.length < 2) continue;

      const cycle = Math.round(
        intervals.reduce((sum, v) => sum + v, 0) / intervals.length
      );

      // 1日周期は表示しない
      if (cycle <= 1) continue;

      const lastDate = uniqueDates[uniqueDates.length - 1];
      const daysSince = diffDays(now, lastDate);

      // 周期に達したらおすすめする
      if (daysSince < cycle) continue;

      const shopCounts = new Map<string, number>();
      for (const shop of entry.shops) {
        shopCounts.set(shop, (shopCounts.get(shop) ?? 0) + 1);
      }

      const recommendedShop =
        [...shopCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "未分類";

      recommendations.push({
        product: entry.product,
        cycle,
        daysSince,
        recommended_shop: recommendedShop,
      });
    }

    recommendations.sort((a, b) => {
      const aUrgency = a.daysSince - a.cycle;
      const bUrgency = b.daysSince - b.cycle;
      return bUrgency - aUrgency;
    });

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error("GET /api/products/recommend failed:", error);
    return NextResponse.json(
      { error: "おすすめ取得に失敗しました" },
      { status: 500 }
    );
  }
}