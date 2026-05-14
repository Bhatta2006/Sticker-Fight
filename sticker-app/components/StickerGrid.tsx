"use client";

import { CldImage } from "next-cloudinary";
import StickerUploader from "./StickerUploader";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Images } from "lucide-react";
import { useIngestStore } from "@/lib/ingest-store";
import { Button } from "@/components/ui/button";

interface Sticker {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  category: string;
  subCategory: string | null;
  rarity: string;
  isLive: boolean;
  cloudinaryUrl: string;
  thumbnailUrl: string;
  type: string;
  fileSizeKb?: number | null;
  widthPx?: number | null;
  heightPx?: number | null;
  durationMs?: number | null;
  ocrText?: string | null;
  languages?: string[];
  hasTextOverlay?: boolean | null;
  sourceName?: string | null;
  originalUrl?: string | null;
  dominantEmotion?: string | null;
  emotionScores?: unknown;
  energyLevel?: string | null;
  tone?: string[];
  tags?: string[];
  scenarioFit?: string[];
  useCase?: string | null;
  phash?: string | null;
  isNsfw?: boolean | null;
  nsfwScore?: number | null;
  moderationNotes?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | Date | null;
  baseScoreWeight?: number | null;
  playCount?: number | null;
  winCount?: number | null;
  voteCount?: number | null;
  avgClipScore?: number | null;
  avgVoteScore?: number | null;
  hypeCount?: number | null;
  timesFavourited?: number | null;
  reportCount?: number | null;
  isFlagged?: boolean | null;
  clipTags?: string[];
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
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
  const [active, setActive] = useState<Sticker | null>(null);
  const [filterAdmin, setFilterAdmin] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterLive, setFilterLive] = useState("all");
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [active]);
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

  const formatValue = (value: unknown) => {
    if (value === null || value === undefined || value === "") return "—";
    if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    if (typeof value === "boolean") return value ? "true" : "false";
    return String(value);
  };

  const detailRows = (s: Sticker) =>
    [
      ["ID", s.id],
      ["Slug", s.slug],
      ["Title", s.title],
      ["Description", s.description],
      ["Category", s.category],
      ["Sub-category", s.subCategory],
      ["Type", s.type],
      ["Rarity", s.rarity],
      ["Is live", s.isLive],
      ["Cloudinary URL", s.cloudinaryUrl],
      ["Thumbnail URL", s.thumbnailUrl],
      ["Width (px)", s.widthPx],
      ["Height (px)", s.heightPx],
      ["File size (KB)", s.fileSizeKb],
      ["Duration (ms)", s.durationMs],
      ["OCR text", s.ocrText],
      ["Has text overlay", s.hasTextOverlay],
      ["Languages", s.languages],
      ["Tone", s.tone],
      ["Tags", s.tags],
      ["Scenario fit", s.scenarioFit],
      ["Use case", s.useCase],
      ["Dominant emotion", s.dominantEmotion],
      ["Emotion scores", s.emotionScores],
      ["Energy level", s.energyLevel],
      ["Source name", s.sourceName],
      ["Original URL", s.originalUrl],
      ["pHash", s.phash],
      ["NSFW", s.isNsfw],
      ["NSFW score", s.nsfwScore],
      ["Moderation notes", s.moderationNotes],
      ["Verified by", s.verifiedBy],
      ["Verified at", s.verifiedAt],
      ["Base score weight", s.baseScoreWeight],
      ["Play count", s.playCount],
      ["Win count", s.winCount],
      ["Vote count", s.voteCount],
      ["Avg clip score", s.avgClipScore],
      ["Avg vote score", s.avgVoteScore],
      ["Hype count", s.hypeCount],
      ["Times favourited", s.timesFavourited],
      ["Report count", s.reportCount],
      ["Is flagged", s.isFlagged],
      ["Clip tags", s.clipTags],
      ["Created at", s.createdAt],
      ["Updated at", s.updatedAt],
    ] as const;

  const adminOptions = Array.from(
    new Set(stickers.map((s) => s.verifiedBy).filter(Boolean) as string[]),
  ).sort();
  const categoryOptions = Array.from(
    new Set(stickers.map((s) => s.category).filter(Boolean)),
  ).sort();
  const typeOptions = Array.from(
    new Set(stickers.map((s) => s.type).filter(Boolean)),
  ).sort();

  const filteredStickers = stickers.filter((s) => {
    if (filterAdmin !== "all" && s.verifiedBy !== filterAdmin) return false;
    if (filterCategory !== "all" && s.category !== filterCategory) return false;
    if (filterType !== "all" && s.type !== filterType) return false;
    if (filterLive !== "all") {
      const liveFlag = filterLive === "live";
      if (s.isLive !== liveFlag) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Images className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">Stickers</h1>
            <p className="text-sm text-muted-foreground">
              {filteredStickers.length} of {stickers.length} stickers
            </p>
          </div>
        </div>
        <StickerUploader onUpload={handleUpload} onReview={handleReview} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Admin</span>
          <select
            value={filterAdmin}
            onChange={(e) => setFilterAdmin(e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All</option>
            {adminOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Category</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Type</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All</option>
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Live status</span>
          <select
            value={filterLive}
            onChange={(e) => setFilterLive(e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All</option>
            <option value="live">Live</option>
            <option value="draft">Draft</option>
          </select>
        </label>
      </div>

      {filteredStickers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-20 text-center space-y-2">
          <p className="text-4xl">🎴</p>
          <p className="text-sm text-muted-foreground">No stickers found.</p>
          <p className="text-xs text-muted-foreground/60">
            Click &ldquo;Upload Stickers&rdquo; to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredStickers.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(s)}
              className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors text-left"
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
            </button>
          ))}
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-50 bg-black/50">
          <div
            className="h-full w-full overflow-hidden bg-background sm:mx-auto sm:my-6 sm:h-auto sm:max-w-4xl sm:rounded-xl sm:border sm:border-border sm:shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {active.title || "Sticker details"}
                </h2>
                <p className="text-xs text-muted-foreground">{active.slug}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActive(null)}
              >
                Close
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-4 sm:max-h-[80vh] sm:grid-cols-[260px_1fr] sm:overflow-hidden">
              <div className="space-y-2 sm:pr-2">
                <div className="aspect-square rounded-lg border border-border bg-muted overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={active.thumbnailUrl || active.cloudinaryUrl}
                    alt={active.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="text-[11px] text-muted-foreground break-all">
                  {active.cloudinaryUrl}
                </div>
              </div>

              <div className="max-h-[50vh] overflow-auto rounded-lg border border-border sm:max-h-[70vh]">
                <div className="divide-y divide-border">
                  {detailRows(active).map(([label, value]) => (
                    <div
                      key={label}
                      className="grid grid-cols-1 gap-1 px-3 py-2 sm:grid-cols-[180px_1fr]"
                    >
                      <div className="text-xs font-medium text-muted-foreground">
                        {label}
                      </div>
                      <div className="text-xs text-foreground whitespace-pre-wrap break-words">
                        {formatValue(value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
