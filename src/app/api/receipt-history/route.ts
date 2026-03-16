import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";

export const runtime = "nodejs";

const receiptMatchSchema = z.object({
  listName: z.string(),
  receiptName: z.string().optional(),
});

const receiptHistoryItemSchema = z.object({
  id: z.string(),
  shopFull: z.string(),
  category: z.string(),
  matches: z.array(receiptMatchSchema),
  extras: z.array(z.string()),
  createdAt: z.string(),
});

const receiptHistoryFileSchema = z.object({
  histories: z.array(receiptHistoryItemSchema),
});

const appendRequestSchema = z.object({
  shopFull: z.string(),
  category: z.string(),
  matches: z.array(receiptMatchSchema),
  extras: z.array(z.string()),
});

const dataDir = path.join(process.cwd(), "data");
const filePath = path.join(dataDir, "receipt-history.json");

async function ensureHistoryFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(
      filePath,
      JSON.stringify({ histories: [] }, null, 2),
      "utf-8"
    );
  }
}

function createHistoryId() {
  return `receipt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function GET() {
  try {
    await ensureHistoryFile();

    const raw = await fs.readFile(filePath, "utf-8");
    const json = JSON.parse(raw);
    const parsed = receiptHistoryFileSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ histories: [] });
    }

    return NextResponse.json(parsed.data);
  } catch (error) {
    console.error("receipt-history GET error:", error);
    return new NextResponse("Failed to load receipt history", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureHistoryFile();

    const body = await request.json();
    const parsed = appendRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const raw = await fs.readFile(filePath, "utf-8");
    const json = JSON.parse(raw);
    const current = receiptHistoryFileSchema.safeParse(json);

    const histories = current.success ? current.data.histories : [];

    const newHistory = {
      id: createHistoryId(),
      shopFull: parsed.data.shopFull,
      category: parsed.data.category,
      matches: parsed.data.matches,
      extras: parsed.data.extras,
      createdAt: new Date().toISOString(),
    };

    const nextData = {
      histories: [newHistory, ...histories],
    };

    await fs.writeFile(filePath, JSON.stringify(nextData, null, 2), "utf-8");

    return NextResponse.json(newHistory, { status: 201 });
  } catch (error) {
    console.error("receipt-history POST error:", error);
    return new NextResponse("Failed to save receipt history", { status: 500 });
  }
}