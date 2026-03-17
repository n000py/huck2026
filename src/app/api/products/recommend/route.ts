import { NextResponse } from "next/server";
import db from "@/lib/db";

export const runtime = "nodejs";

type RecommendItem = {
  product: string;
  cycle: number;
  daysSince: number;
  recommended_shop: string;
};

function diffDays(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
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
      if (entry.dates.length < 2) continue;

      const intervals: number[] = [];
      for (let i = 1; i < entry.dates.length; i++) {
        const days = diffDays(entry.dates[i], entry.dates[i - 1]);
        if (days >= 0) intervals.push(days);
      }

      if (intervals.length === 0) continue;

      const cycle = Math.max(
        1,
        Math.round(intervals.reduce((sum, v) => sum + v, 0) / intervals.length)
      );

      const lastDate = entry.dates[entry.dates.length - 1];
      const daysSince = diffDays(now, lastDate);

      if (daysSince < cycle - 1) continue;

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