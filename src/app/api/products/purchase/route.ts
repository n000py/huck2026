// 正規商品を products に登録
// 表記ゆれを aliases に登録
// 購入履歴を purchase_history に保存
// is_consumable を商品マスターに保存

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { judgeConsumable } from "@/lib/consumable";
import { normalizeRawName } from "@/lib/productName";

export const runtime = "nodejs";

type PurchaseItem = {
  raw_name: string;
  normalized_name: string;
  shop: string;
  is_consumable?: boolean | null;
};

type PurchaseRequestBody = {
  items: PurchaseItem[];
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PurchaseRequestBody;

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "items が空です" },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    const selectProductStmt = db.prepare(`
      SELECT id, normalized_name, is_consumable
      FROM products
      WHERE normalized_name = ?
    `);

    const insertProductStmt = db.prepare(`
      INSERT INTO products (normalized_name, is_consumable, updated_at)
      VALUES (?, ?, ?)
    `);

    const updateProductConsumableStmt = db.prepare(`
      UPDATE products
      SET is_consumable = ?, updated_at = ?
      WHERE id = ?
    `);

    const upsertAliasStmt = db.prepare(`
      INSERT INTO aliases (raw_name, product_id, preferred_shop, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(raw_name) DO UPDATE SET
        product_id = excluded.product_id,
        preferred_shop = excluded.preferred_shop,
        updated_at = excluded.updated_at
    `);

    const insertHistoryStmt = db.prepare(`
      INSERT INTO purchase_history (
        product_id,
        raw_name,
        normalized_name,
        shop,
        purchased_at
      )
      VALUES (?, ?, ?, ?, ?)
    `);

    const deleteCurrentListStmt = db.prepare(`
      DELETE FROM current_shopping_list
      WHERE raw_name = ?
    `);

    const transaction = db.transaction((items: PurchaseItem[]) => {
      const saved: {
        raw_name: string;
        normalized_name: string;
        shop: string;
        is_consumable: boolean | null;
      }[] = [];

      for (const item of items) {
        const rawName = normalizeRawName(item.raw_name ?? "");
        const normalizedName = String(item.normalized_name ?? "").trim() || rawName;
        const shop = item.shop?.trim();

        if (!rawName || !normalizedName || !shop) {
          continue;
        }

        const consumable =
          item.is_consumable !== undefined
            ? item.is_consumable
            : judgeConsumable(normalizedName);

        const existingProduct = selectProductStmt.get(normalizedName) as
          | { id: number; normalized_name: string; is_consumable: number | null }
          | undefined;

        let productId: number;

        if (existingProduct) {
          productId = existingProduct.id;

          if (consumable !== null) {
            updateProductConsumableStmt.run(
              consumable ? 1 : 0,
              nowIso,
              productId
            );
          }
        } else {
          const result = insertProductStmt.run(
            normalizedName,
            consumable === null ? null : consumable ? 1 : 0,
            nowIso
          );
          productId = Number(result.lastInsertRowid);
        }

        upsertAliasStmt.run(rawName, productId, shop, nowIso);

        insertHistoryStmt.run(
          productId,
          rawName,
          normalizedName,
          shop,
          nowIso
        );

        deleteCurrentListStmt.run(rawName);

        saved.push({
          raw_name: rawName,
          normalized_name: normalizedName,
          shop,
          is_consumable: consumable,
        });
      }

      return saved;
    });

    const savedItems = transaction(body.items);

    return NextResponse.json({
      status: "ok",
      savedCount: savedItems.length,
      items: savedItems,
    });
  } catch (error) {
    console.error("POST /api/products/purchase failed:", error);
    return NextResponse.json(
      { error: "購入履歴の保存に失敗しました" },
      { status: 500 }
    );
  }
}