"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useIngestStore, StickerItem } from "@/lib/ingest-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  SlidersHorizontal,
  PackagePlus,
  CheckSquare,
  Square,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface StickerlySticker {
  file: string;
  url: string;
  sha: string;
}

interface StickerlyPack {
  packId: string;
  name: string;
  authorName: string;
  shareUrl: string;
  isAnimated: boolean;
  viewCount: number;
  exportCount: number;
  resourceUrlPrefix: string;
  stickers: StickerlySticker[];
  user: { userName?: string; profileUrl?: string } | null;
}

// ── Search Params Form ───────────────────────────────────────────────────────

const SORT_OPTIONS = ["RECOMMENDED", "POPULAR", "NEWEST"] as const;
const TYPE_OPTIONS = ["ALL", "STATIC", "ANIMATED"] as const;
const SEARCH_BY_OPTIONS = ["ALL", "NAME", "AUTHOR", "TAG"] as const;

export default function IngestSearchClient() {
  const router = useRouter();
  const { setQueue } = useIngestStore();

  // Search params
  const [keyword, setKeyword] = useState("");
  const [limit, setLimit] = useState(30);
  const [sortBy, setSortBy] = useState<string>("RECOMMENDED");
  const [stickerType, setStickerType] = useState<string>("ALL");
  const [searchBy, setSearchBy] = useState<string>("ALL");
  const [minCount, setMinCount] = useState(5);
  const [extendSearch, setExtendSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Results
  const [packs, setPacks] = useState<StickerlyPack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Set<string>>(new Set());

  // Selection: packId -> Set of shas
  const [selected, setSelected] = useState<Map<string, Set<string>>>(new Map());
  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set());

  // ── Search ──────────────────────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError(null);
    setPacks([]);
    setSelected(new Map());
    setDuplicates(new Set());

    try {
      const res = await fetch("/api/stickerly/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          limit,
          sortBy,
          stickerType,
          searchBy,
          minStickerCount: minCount,
          extendSearch,
        }),
      });
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const data = await res.json();
      const fetchedPacks: StickerlyPack[] = data.packs ?? [];
      setPacks(fetchedPacks);

      // Auto-expand first pack
      if (fetchedPacks.length > 0) {
        setExpandedPacks(new Set([fetchedPacks[0].packId]));
      }

      // Check duplicates
      const allShas = fetchedPacks.flatMap((p) => p.stickers.map((s) => s.sha));
      if (allShas.length > 0) {
        const dupRes = await fetch("/api/stickerly/check-duplicates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shas: allShas }),
        });
        if (dupRes.ok) {
          const dupData = await dupRes.json();
          setDuplicates(new Set(dupData.duplicates ?? []));
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [keyword, limit, sortBy, stickerType, searchBy, minCount, extendSearch]);

  // ── Selection helpers ────────────────────────────────────────────────────────

  const toggleSticker = (pack: StickerlyPack, sha: string) => {
    if (duplicates.has(sha)) return; // can't select duplicates
    setSelected((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(pack.packId) ?? []);
      if (set.has(sha)) set.delete(sha);
      else set.add(sha);
      next.set(pack.packId, set);
      return next;
    });
  };

  const togglePack = (pack: StickerlyPack) => {
    setSelected((prev) => {
      const next = new Map(prev);
      const nonDup = pack.stickers.filter((s) => !duplicates.has(s.sha));
      const current = next.get(pack.packId);
      const allSelected = nonDup.every((s) => current?.has(s.sha));
      if (allSelected) {
        next.delete(pack.packId);
      } else {
        next.set(pack.packId, new Set(nonDup.map((s) => s.sha)));
      }
      return next;
    });
  };

  const totalSelected = Array.from(selected.values()).reduce(
    (sum, s) => sum + s.size,
    0,
  );

  // ── Proceed to review ──────────────────────────────────────────────────────

  const handleProceed = () => {
    const queue: StickerItem[] = [];
    for (const pack of packs) {
      const shaSet = selected.get(pack.packId);
      if (!shaSet || shaSet.size === 0) continue;
      for (const sticker of pack.stickers) {
        if (!shaSet.has(sticker.sha)) continue;
        queue.push({
          packId: pack.packId,
          packName: pack.name,
          authorName: pack.authorName,
          file: sticker.file,
          url: sticker.url,
          sha: sticker.sha,
          isAnimated: pack.isAnimated,
          isDuplicate: duplicates.has(sticker.sha),
          sourceType: "stickerly",
        });
      }
    }
    setQueue(queue);
    router.push("/admin/ingest/review");
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-primary" />
            Sticker Ingest — Step 1
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Search Stickerly, select stickers to ingest
          </p>
        </div>
        {totalSelected > 0 && (
          <Button onClick={handleProceed} className="gap-2 shrink-0">
            Review {totalSelected} sticker{totalSelected !== 1 ? "s" : ""}
            <ChevronUp className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search bar */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search stickers… e.g. kannada, anime, meme"
                className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading || !keyword.trim()}
              className="gap-2 shrink-0"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters((v) => !v)}
              className={showFilters ? "bg-accent text-accent-foreground" : ""}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 pt-1">
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Sort by</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Type</span>
                <select
                  value={stickerType}
                  onChange={(e) => setStickerType(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Search by</span>
                <select
                  value={searchBy}
                  onChange={(e) => setSearchBy(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {SEARCH_BY_OPTIONS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">
                  Max results
                </span>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">
                  Min stickers/pack
                </span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={minCount}
                  onChange={(e) => setMinCount(Number(e.target.value))}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="flex items-end gap-2 pb-1">
                <input
                  type="checkbox"
                  checked={extendSearch}
                  onChange={(e) => setExtendSearch(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-sm text-muted-foreground">
                  Extend search
                </span>
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-48 rounded bg-muted animate-pulse" />
                <div className="h-3 w-32 rounded bg-muted animate-pulse mt-1" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <div
                      key={j}
                      className="aspect-square rounded-lg bg-muted animate-pulse"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && packs.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {packs.length} pack{packs.length !== 1 ? "s" : ""} found
            {totalSelected > 0 && (
              <span className="ml-2 text-primary font-medium">
                · {totalSelected} selected
              </span>
            )}
          </p>

          {packs.map((pack) => {
            const packSelected = selected.get(pack.packId);
            const nonDupStickers = pack.stickers.filter(
              (s) => !duplicates.has(s.sha),
            );
            const allPackSelected =
              nonDupStickers.length > 0 &&
              nonDupStickers.every((s) => packSelected?.has(s.sha));
            const somePackSelected = nonDupStickers.some((s) =>
              packSelected?.has(s.sha),
            );
            const packExpanded = expandedPacks.has(pack.packId);
            const dupCount = pack.stickers.filter((s) =>
              duplicates.has(s.sha),
            ).length;

            return (
              <Card
                key={pack.packId}
                className={cn(
                  "transition-colors",
                  somePackSelected && "border-primary/40",
                )}
              >
                {/* Pack header */}
                <CardHeader className="pb-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Pack select toggle */}
                    <button
                      onClick={() => togglePack(pack)}
                      disabled={nonDupStickers.length === 0}
                      className="shrink-0 text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                      title="Select entire pack"
                    >
                      {allPackSelected ? (
                        <CheckSquare className="h-5 w-5 text-primary" />
                      ) : somePackSelected ? (
                        <CheckSquare className="h-5 w-5 text-primary/50" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>

                    {/* Pack info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-sm font-semibold truncate">
                          {pack.name}
                        </CardTitle>
                        {pack.isAnimated && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0"
                          >
                            Animated
                          </Badge>
                        )}
                        {dupCount > 0 && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/15 text-amber-400 border-amber-500/30">
                            {dupCount} duplicate{dupCount !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        {somePackSelected && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary border-primary/30">
                            {packSelected?.size} selected
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        by {pack.authorName} · {pack.stickers.length} stickers ·{" "}
                        {pack.viewCount.toLocaleString()} views ·{" "}
                        {pack.exportCount.toLocaleString()} exports
                      </p>
                    </div>

                    {/* Expand toggle */}
                    <button
                      onClick={() =>
                        setExpandedPacks((prev) => {
                          const next = new Set(prev);
                          if (next.has(pack.packId)) next.delete(pack.packId);
                          else next.add(pack.packId);
                          return next;
                        })
                      }
                      className="ml-auto shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {packExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </CardHeader>

                {/* Sticker grid */}
                {packExpanded && (
                  <>
                    <Separator className="mt-3" />
                    <CardContent className="pt-3">
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
                        {pack.stickers.map((sticker) => {
                          const isDup = duplicates.has(sticker.sha);
                          const isSel = packSelected?.has(sticker.sha) ?? false;
                          return (
                            <button
                              key={sticker.sha}
                              onClick={() => toggleSticker(pack, sticker.sha)}
                              disabled={isDup}
                              title={
                                isDup ? "Already in database" : sticker.file
                              }
                              className={cn(
                                "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                                isDup
                                  ? "opacity-40 cursor-not-allowed border-amber-500/50"
                                  : isSel
                                    ? "border-primary ring-2 ring-primary/30"
                                    : "border-border hover:border-primary/50",
                              )}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={sticker.url}
                                alt={sticker.file}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              {isDup && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                  <AlertCircle className="h-4 w-4 text-amber-400" />
                                </div>
                              )}
                              {isSel && !isDup && (
                                <div className="absolute top-0.5 right-0.5">
                                  <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                                    <CheckSquare className="h-2.5 w-2.5 text-primary-foreground" />
                                  </div>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Quick select actions */}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <button
                          onClick={() => togglePack(pack)}
                          disabled={nonDupStickers.length === 0}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                        >
                          <Layers className="h-3.5 w-3.5" />
                          {allPackSelected
                            ? "Deselect all"
                            : `Select all ${nonDupStickers.length} available`}
                        </button>
                        <a
                          href={pack.shareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors ml-auto"
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                          View pack
                        </a>
                      </div>
                    </CardContent>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty state after search */}
      {!loading && packs.length === 0 && keyword && !error && (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center space-y-2">
          <Search className="h-8 w-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">
            No packs found for &ldquo;{keyword}&rdquo;
          </p>
          <p className="text-xs text-muted-foreground/60">
            Try different keywords or filters
          </p>
        </div>
      )}

      {/* Sticky bottom bar when items selected */}
      {totalSelected > 0 && (
        <div className="sticky bottom-4 flex justify-center pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur px-5 py-3 shadow-xl">
            <span className="text-sm font-medium text-foreground">
              {totalSelected} sticker{totalSelected !== 1 ? "s" : ""} selected
            </span>
            <Button onClick={handleProceed} size="sm" className="gap-2">
              Proceed to review
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
