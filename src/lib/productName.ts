export function normalizeRawName(rawName: string): string {
  return rawName
    .normalize("NFKC")
    .replace(/[＊*<>＜＞]/g, " ")
    .replace(/[|｜]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeProductName(name: string): string {
  let normalized = normalizeRawName(name);

  normalized = normalized
    .replace(/^\W+/, "")
    .replace(/\s+/g, " ")
    .trim();

  normalized = normalized
    .replace(/氷彩1$/g, "氷彩")
    .replace(/こだわり酒場のレモ$/g, "こだわり酒場のレモン")
    .replace(/甘くない檸檬堂無糖にご$/g, "甘くない檸檬堂無糖にごり");

  return normalized;
}

function isTooGenericName(name: string): boolean {
  const trimmed = name.trim();

  if (!trimmed) return true;

  // 長さが短すぎる
  if (trimmed.length <= 3) return true;

  // 数字＋単位だけに近い
  if (/^\d+\s?(l|L|ml|ML|kg|g|個|枚|錠|袋)$/.test(trimmed)) return true;

  // 英数字少量 + 単位
  if (/^[A-Za-z]?\s?\d+\s?(錠|袋|個|枚)$/.test(trimmed)) return true;

  // 単位や容量っぽい語だけ
  if (/^(45L|30L|20L|32錠|12錠|6袋)$/.test(trimmed)) return true;

  return false;
}

export function chooseCanonicalProductName(
  rawName: string,
  normalizedCandidate?: string | null
): string {
  const raw = normalizeRawName(rawName);
  const candidate = normalizeProductName(normalizedCandidate || raw);

  if (!candidate) return raw;
  if (isTooGenericName(candidate)) return raw;

  // rawの後半だけを切り出したような候補なら raw を優先
  if (raw.length >= candidate.length + 4 && raw.endsWith(candidate)) {
    return raw;
  }

  // 情報量が raw よりかなり少ないなら raw を優先
  if (candidate.length <= Math.floor(raw.length * 0.5)) {
    return raw;
  }

  return candidate;
}