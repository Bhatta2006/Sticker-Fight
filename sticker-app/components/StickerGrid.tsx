"use client";

import { CldImage } from "next-cloudinary";
import StickerUploader from "./StickerUploader";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Images } from "lucide-react";
import { useIngestStore } from "@/lib/ingest-store";

interface Sticker {
  id: string;
  slug: string;
  title: string;
  category: string;
  subCategory: string | null;
  rarity: string;
  isLive: boolean;
  cloudinaryUrl: string;
  thumbnailUrl: string;
  type: string;
  verifiedBy?: string | null;
}

interface UploadResult {
  public_id: string;
  secure_url: string;
  thumbnail_url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  duration?: number;
  resource_type: string;
}

interface StickerGridProps {
  stickers: Sticker[];
}

const rarityClass = (r: string) => {
  if (r === "legendary")
    return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  if (r === "rare")
    return "bg-purple-500/15 text-purple-400 border-purple-500/30";
  if (r === "uncommon")
    return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  return "";
};

export default function StickerGrid({ stickers: initial }: StickerGridProps) {
  const [stickers] = useState(initial);
  const router = useRouter();
  const { setQueue } = useIngestStore();

  async function handleUpload(result: UploadResult) {
    const type =
      result.resource_type === "video"
        ? "video"
        : result.format === "gif"
          ? "gif"
          : "image";

    const res = await fetch("/api/stickers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cloudinaryUrl: result.secure_url,
        thumbnailUrl: result.thumbnail_url,
        type,
        widthPx: result.width,
        heightPx: result.height,
        fileSizeKb: Math.round(result.bytes / 1024),
        durationMs: result.duration ? Math.round(result.duration * 1000) : null,
      }),
    });

    if (res.ok) router.refresh();
  }

  function handleReview(results: UploadResult[]) {
    if (results.length === 0) return;
    const now = Date.now();
    const queue = results.map((r, idx) => {
      const isAnimated = r.resource_type === "video" || r.format === "gif";
      const fileName = r.public_id.split("/").pop() ?? r.public_id;
      const cloudType: "image" | "gif" | "video" =
        r.resource_type === "video"
          ? "video"
          : r.format === "gif"
            ? "gif"
            : "image";
      return {
        packId: `manual-${now}`,
        packName: "Manual Upload",
        authorName: "Admin",
        file: fileName,
        url: r.secure_url,
        sha: r.public_id,
        isAnimated,
        isDuplicate: false,
        sourceType: "manual" as const,
        cloudinary: {
          url: r.secure_url,
          thumbnailUrl: r.thumbnail_url,
          type: cloudType,
          width: r.width,
          height: r.height,
          bytes: r.bytes,
          duration: r.duration,
        },
      };
    });
    setQueue(queue);
    router.push("/admin/ingest/review");
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Images className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">Stickers</h1>
            <p className="text-sm text-muted-foreground">
              {stickers.length} stickers
            </p>
          </div>
        </div>
        <StickerUploader onUpload={handleUpload} onReview={handleReview} />
      </div>

      {stickers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-20 text-center space-y-2">
          <p className="text-4xl">🎴</p>
          <p className="text-sm text-muted-foreground">No stickers yet.</p>
          <p className="text-xs text-muted-foreground/60">
            Click &ldquo;Upload Stickers&rdquo; to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {stickers.map((s) => (
            <div
              key={s.id}
              className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors"
            >
              {/* Thumbnail */}
              <div className="relative aspect-square bg-muted">
                <CldImage
                  src={s.cloudinaryUrl}
                  alt={s.title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                  className="object-cover transition-transform group-hover:scale-105"
                  crop="fill"
                  gravity="auto"
                />
              </div>

              {/* Info */}
              <div className="p-2.5 space-y-1.5">
                <p className="truncate text-xs font-medium text-foreground">
                  {s.title}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {s.category}
                  {s.subCategory ? ` / ${s.subCategory}` : ""}
                </p>
                <div className="flex items-center gap-1 flex-wrap">
                  <span
                    className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${rarityClass(s.rarity)}`}
                  >
                    {s.rarity}
                  </span>
                  <Badge
                    variant={s.isLive ? "default" : "secondary"}
                    className="text-[9px] px-1.5 py-0 h-auto rounded-full"
                  >
                    {s.isLive ? "Live" : "Draft"}
                  </Badge>
                  {s.verifiedBy && (
                    <span className="inline-flex items-center rounded-full border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground">
                      {s.verifiedBy}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
