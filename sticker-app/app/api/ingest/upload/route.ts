import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const STICKERS_FOLDER = "sticker-fight/stickers";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string; name?: string; id?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const {
    sourceUrl,          // original stickerly URL
    title,
    description,
    category,
    subCategory,
    languages,
    tags,
    tone,
    scenarioFit,
    dominantEmotion,
    energyLevel,
    hasTextOverlay,
    ocrText,
    rarity,
    useCase,
    moderationNotes,
    isLive,
    sourceName = "stickerly_scrape",
  } = body;

  if (!sourceUrl || !title || !category) {
    return NextResponse.json({ error: "sourceUrl, title, category are required" }, { status: 400 });
  }

  // Compute SHA256 of the source URL as our phash (dedup key for scraped stickers)
  const sha = crypto.createHash("sha256").update(sourceUrl).digest("hex");

  // Check duplicate
  const existing = await prisma.sticker.findUnique({ where: { phash: sha } });
  if (existing) {
    return NextResponse.json({ error: "duplicate", existingId: existing.id }, { status: 409 });
  }

  // Upload to Cloudinary by URL (no download needed — Cloudinary fetches it)
  let cloudResult;
  try {
    cloudResult = await cloudinary.uploader.upload(sourceUrl, {
      folder: STICKERS_FOLDER,
      resource_type: "auto",
      transformation: [{ quality: "auto", fetch_format: "auto" }],
    });
  } catch (err) {
    console.error("[ingest/upload] Cloudinary error", err);
    return NextResponse.json({ error: "Cloudinary upload failed" }, { status: 500 });
  }

  const isAnimated =
    cloudResult.resource_type === "video" ||
    cloudResult.format === "gif";

  const type = cloudResult.resource_type === "video"
    ? "video"
    : cloudResult.format === "gif"
    ? "gif"
    : "image";

  // Generate thumbnail URL via Cloudinary transform
  const thumbnailUrl = cloudinary.url(cloudResult.public_id, {
    width: 200,
    height: 200,
    crop: "fill",
    gravity: "auto",
    fetch_format: "auto",
    quality: "auto",
  });

  // Build a slug from title
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 50);

  const suffix = crypto.randomBytes(3).toString("hex");
  const slug = `${baseSlug}-${suffix}`;

  const sticker = await prisma.sticker.create({
    data: {
      slug,
      cloudinaryUrl: cloudResult.secure_url,
      thumbnailUrl,
      type,
      fileSizeKb: Math.round((cloudResult.bytes ?? 0) / 1024),
      widthPx: cloudResult.width ?? null,
      heightPx: cloudResult.height ?? null,
      durationMs: isAnimated && cloudResult.duration
        ? Math.round(cloudResult.duration * 1000)
        : null,
      title,
      description: description ?? null,
      ocrText: ocrText ?? null,
      languages: languages ?? [],
      hasTextOverlay: hasTextOverlay ?? false,
      category,
      subCategory: subCategory ?? null,
      sourceName,
      originalUrl: sourceUrl,
      dominantEmotion: dominantEmotion ?? null,
      emotionScores: {},
      energyLevel: energyLevel ?? null,
      tone: tone ?? [],
      tags: tags ?? [],
      scenarioFit: scenarioFit ?? [],
      useCase: useCase ?? null,
      phash: sha,
      isLive: isLive ?? false,
      isNsfw: false,
      nsfwScore: 0,
      moderationNotes: moderationNotes ?? null,
      verifiedBy: user.name ?? user.id ?? "admin",
      verifiedAt: isLive ? new Date() : null,
      rarity: rarity ?? "common",
      baseScoreWeight: rarity === "legendary" ? 2.0 : rarity === "rare" ? 1.5 : rarity === "uncommon" ? 1.2 : 1.0,
    },
  });

  return NextResponse.json({ sticker }, { status: 201 });
}
