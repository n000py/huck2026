import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";

export const runtime = "nodejs";

const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  suggestedStoreId: z.string().nullable(),
  currentStoreId: z.string().nullable(),
  suggestionStatus: z.union([
    z.literal("accepted"),
    z.literal("modified"),
    z.literal("manual"),
  ]),
  purchaseStatus: z.union([
    z.literal("pending"),
    z.literal("bought"),
  ]),
  reason: z.string(),
});

const shoppingStateSchema = z.object({
  items: z.array(itemSchema),
  selectedStoreId: z.string(),
  updatedAt: z.string(),
});

const requestSchema = z.object({
  items: z.array(itemSchema),
  selectedStoreId: z.string(),
});

const dataDir = path.join(process.cwd(), "data");
const filePath = path.join(dataDir, "shopping-state.json");

async function ensureDataFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    const initialData = {
      items: [],
      selectedStoreId: "",
      updatedAt: "",
    };
    await fs.writeFile(filePath, JSON.stringify(initialData, null, 2), "utf-8");
  }
}

export async function GET() {
  try {
    await ensureDataFile();

    const raw = await fs.readFile(filePath, "utf-8");
    const json = JSON.parse(raw);

    const parsed = shoppingStateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          items: [],
          selectedStoreId: "",
          updatedAt: "",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(parsed.data);
  } catch (error) {
    console.error("shopping-state GET error:", error);
    return new NextResponse("Failed to load shopping state", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDataFile();

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const payload = {
      items: parsed.data.items,
      selectedStoreId: parsed.data.selectedStoreId,
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");

    return NextResponse.json(payload);
  } catch (error) {
    console.error("shopping-state POST error:", error);
    return new NextResponse("Failed to save shopping state", { status: 500 });
  }
}