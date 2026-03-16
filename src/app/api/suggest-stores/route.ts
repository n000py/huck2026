import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export const runtime = "nodejs";

const requestSchema = z.object({
  itemNames: z.array(z.string().min(1)),
  storeNames: z.array(z.string().min(1)),
});

const responseSchema = z.array(
  z.object({
    itemName: z.string(),
    storeName: z.string(),
    reason: z.string(),
  })
);

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return new NextResponse("GEMINI_API_KEY is not set", { status: 500 });
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
あなたは買い物リスト分類アシスタントです。
以下の商品を、指定された店リストのいずれか1つへ分類してください。
分類できない場合のみ「その他」を使ってください。
理由は1文で短く書いてください。

店リスト:
${parsed.data.storeNames.join(", ")}

商品リスト:
${parsed.data.itemNames.join(", ")}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(responseSchema),
    },
  });

    const text = response.text ?? "[]";
    const json = JSON.parse(text);
    const validated = responseSchema.parse(json);

    const normalized = validated.map((row) => {
      const isKnownStore =
        parsed.data.storeNames.includes(row.storeName) ||
        row.storeName === "その他";

      return {
        itemName: row.itemName,
        storeName: isKnownStore ? row.storeName : "その他",
        reason: row.reason,
      };
    });

    return NextResponse.json(normalized);
  }
  catch (error: unknown) {
    console.error("suggest-stores error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to suggest stores";

    if (
      typeof message === "string" &&
      (message.includes("429") ||
        message.includes("RESOURCE_EXHAUSTED") ||
        message.includes("Quota exceeded"))
    ) {
    return new NextResponse(message, { status: 429 });
    }
    return new NextResponse(message, { status: 500 });
}
}