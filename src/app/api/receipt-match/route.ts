import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export const runtime = "nodejs";

const requestSchema = z.object({
  mimeType: z.string().min(1),
  imageBase64: z.string().min(1),
  itemNames: z.array(z.string()),
  categorizedItems: z.array(
    z.object({
      name: z.string(),
      category: z.string(),
    })
  ),
  storeNames: z.array(z.string()),
});

const responseSchema = z.object({
  shopFull: z.string(),
  category: z.string(),
  matches: z.array(
    z.object({
      listName: z.string(),
      receiptName: z.string().optional(),
    })
  ),
  extras: z.array(z.string()),
});

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
あなたは買い物レシート照合アシスタントです。
レシート画像を見て、以下の買い物リストと照合してください。
必ずJSONだけを返してください。

買い物リスト:
${parsed.data.itemNames.join(", ")}

分類済みリスト:
${parsed.data.categorizedItems
  .map((item) => `${item.name}:${item.category}`)
  .join(", ")}

カテゴリ候補:
${parsed.data.storeNames.join(", ")} | その他

ルール:
- shopFull: レシート上の店名
- category: 上のカテゴリ候補から1つ選ぶ
- matches: リストと一致した商品
- extras: リスト外だがレシートにある商品
- listName は買い物リスト側の名前を入れる
- receiptName はレシート上の表記が異なる場合のみ入れる
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: parsed.data.mimeType,
            data: parsed.data.imageBase64,
          },
        },
        { text: prompt },
      ],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(responseSchema),
      },
    });

    const text = response.text ?? "{}";
    const json = JSON.parse(text);
    const validated = responseSchema.parse(json);

    const category = parsed.data.storeNames.includes(validated.category)
      ? validated.category
      : "その他";

    return NextResponse.json({
      ...validated,
      category,
    });
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