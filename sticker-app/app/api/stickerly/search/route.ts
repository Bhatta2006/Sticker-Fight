import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import crypto from "crypto";

// Rotate device IDs to avoid rate limiting
const DEVICE_IDS = [
  "15e99bb22a8ea7b4",
  "a3f72c1b9e4d8056",
  "7c2e5a9f1b3d6e08",
  "4b8f0e2d7c5a3912",
  "9d1c6b4e2f8a0735",
  "2e7a4f9c1b5d8306",
  "6f3b8e0d4c2a9175",
  "0d5e2f7b9c4a1638",
];

function getDeviceId(): string {
  // Pick a random device ID each request
  return DEVICE_IDS[Math.floor(Math.random() * DEVICE_IDS.length)];
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const {
    keyword,
    limit = 30,
    sortBy = "RECOMMENDED",
    stickerType = "ALL",
    languages = ["ALL"],
    minStickerCount = 5,
    extendSearch = false,
    searchBy = "ALL",
  } = body;

  if (!keyword?.trim()) {
    return NextResponse.json({ error: "keyword is required" }, { status: 400 });
  }

  const deviceId = getDeviceId();

  const payload = {
    keyword: keyword.trim(),
    limit,
    enabledKeywordSearch: true,
    filter: {
      extendSearchResult: extendSearch,
      sortBy,
      languages,
      minStickerCount,
      searchBy,
      stickerType,
    },
  };

  try {
    const upstream = await fetch("https://api.sticker.ly/v4/stickerPack/smartSearch", {
      method: "POST",
      headers: {
        "x-duid": deviceId,
        "User-Agent": "androidapp.stickerly/3.30.1 (sdk_gphone64_x86_64; U; Android 31; en-US; us;)",
        "Content-Type": "application/json",
        "Accept-Encoding": "identity",
        "Host": "api.sticker.ly",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream error ${upstream.status}` },
        { status: 502 }
      );
    }

    const data = await upstream.json();
    const packs: StickerlyPack[] = data?.result?.stickerPacks ?? [];

    // Build per-sticker URLs and sha so we can do duplicate pre-check
    const enriched = packs.map((pack) => ({
      packId: pack.packId,
      name: pack.name,
      authorName: pack.authorName,
      shareUrl: pack.shareUrl,
      isAnimated: pack.isAnimated ?? pack.animated ?? false,
      viewCount: pack.viewCount ?? 0,
      exportCount: pack.exportCount ?? 0,
      resourceUrlPrefix: pack.resourceUrlPrefix,
      stickers: (pack.resourceFiles ?? []).map((file: string) => {
        const url = `${pack.resourceUrlPrefix}${file}`;
        const sha = crypto.createHash("sha256").update(url).digest("hex");
        return { file, url, sha };
      }),
      user: pack.user ?? null,
    }));

    return NextResponse.json({ packs: enriched });
  } catch (err) {
    console.error("[stickerly/search]", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

interface StickerlyPack {
  packId: string;
  name: string;
  authorName: string;
  shareUrl: string;
  isAnimated?: boolean;
  animated?: boolean;
  viewCount?: number;
  exportCount?: number;
  resourceUrlPrefix: string;
  resourceFiles?: string[];
  user?: Record<string, unknown>;
}
