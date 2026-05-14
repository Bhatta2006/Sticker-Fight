import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getThumbnailUrl } from "@/lib/cloudinary";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as { role?: string } | undefined;

    if (!session || user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { cloudinaryUrl, thumbnailUrl, type, widthPx, heightPx, fileSizeKb, durationMs } = body as {
      cloudinaryUrl: string;
      thumbnailUrl: string;
      type: "image" | "gif" | "video";
      widthPx?: number;
      heightPx?: number;
      fileSizeKb?: number;
      durationMs?: number;
    };

    if (!cloudinaryUrl || !type) {
      return NextResponse.json({ error: "cloudinaryUrl and type are required" }, { status: 400 });
    }

    const publicId = cloudinaryUrl.split("/").pop()?.split(".")[0] ?? "";
    const slug = `sticker-${publicId.slice(-8)}-${Date.now().toString(36)}`;

    const generatedThumbnail = getThumbnailUrl(
      cloudinaryUrl
        .replace(/^https:\/\/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\/upload\//, "")
        .replace(/\.[^.]+$/, "")
    );

    const sticker = await prisma.sticker.create({
      data: {
        slug,
        cloudinaryUrl,
        thumbnailUrl: thumbnailUrl || generatedThumbnail,
        type,
        title: slug,
        category: "uncategorised",
        widthPx: widthPx ?? null,
        heightPx: heightPx ?? null,
        fileSizeKb: fileSizeKb ?? null,
        durationMs: durationMs ?? null,
      },
    });

    return NextResponse.json(sticker, { status: 201 });
  } catch (error) {
    console.error("Error creating sticker:", error);
    return NextResponse.json({ error: "Failed to create sticker" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const category = searchParams.get("category");
    const isLive = searchParams.get("live");

    const stickers = await prisma.sticker.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(isLive !== null ? { isLive: isLive === "true" } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    });

    return NextResponse.json(stickers);
  } catch (error) {
    console.error("Error fetching stickers:", error);
    return NextResponse.json({ error: "Failed to fetch stickers" }, { status: 500 });
  }
}
