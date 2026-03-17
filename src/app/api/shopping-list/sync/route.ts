import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { normalizeRawName } from "@/lib/productName";

export const runtime = "nodejs";

type ShoppingListItem = {
  raw_name: string;
};

export async function POST(req: NextRequest) {
  try {
    const items = (await req.json()) as ShoppingListItem[];

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "配列形式で送ってください" },
        { status: 400 }
      );
    }

    const deleteStmt = db.prepare(`DELETE FROM current_shopping_list`);

    const findAliasStmt = db.prepare(`
      SELECT product_id
      FROM aliases
      WHERE raw_name = ?
    `);

    const findProductStmt = db.prepare(`
      SELECT id
      FROM products
      WHERE normalized_name = ?
    `);

    const insertStmt = db.prepare(`
      INSERT INTO current_shopping_list (product_id, raw_name)
      VALUES (?, ?)
    `);

    const transaction = db.transaction((list: ShoppingListItem[]) => {
      deleteStmt.run();

      for (const item of list) {
        const rawName = normalizeRawName(item.raw_name ?? "");
        if (!rawName) continue;

        const aliasRow = findAliasStmt.get(rawName) as
          | { product_id: number }
          | undefined;

        let productId: number | null = aliasRow?.product_id ?? null;

        if (productId === null) {
          const productRow = findProductStmt.get(rawName) as
            | { id: number }
            | undefined;
          if (productRow) {
            productId = productRow.id;
          }
        }

        insertStmt.run(productId, rawName);
      }
    });

    transaction(items);

    return NextResponse.json({ status: "synced" });
  } catch (error) {
    console.error("POST /api/shopping-list/sync failed:", error);
    return NextResponse.json(
      { error: "買い物リスト同期に失敗しました" },
      { status: 500 }
    );
  }
}