"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useIngestStore } from "@/lib/ingest-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  XCircle,
  PackagePlus,
  SkipForward,
  Tag,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Field config ──────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  "bollywood",
  "cricket",
  "anime",
  "meme",
  "gaming",
  "movies",
  "TV_shows",
  "celebrity",
  "influencer",
  "politics",
  "sports",
  "regional_kannada",
  "regional_tamil",
  "regional_telugu",
  "regional_malayalam",
  "regional_hindi",
  "regional_marathi",
  "regional_bengali",
  "regional_punjabi",
  "regional_gujarati",
  "regional_urdu",
  "regional_assamese",
  "regional_odia",
  "regional_nepali",
  "regional_sinhala",
  "animals",
  "web_culture",
  "internet_culture",
  "memes_classic",
  "reaction",
  "devotional",
  "festival",
  "family",
  "friendship",
  "love",
  "breakup",
  "work",
  "college",
  "money",
  "food",
  "travel",
  "kids",
  "cartoon",
  "comic",
  "3d",
  "other",
];

const RARITY_OPTIONS = ["common", "uncommon", "rare", "legendary"];
const EMOTION_OPTIONS = [
  "angry",
  "happy",
  "sad",
  "shocked",
  "disgusted",
  "fearful",
  "neutral",
  "sarcastic",
  "confused",
  "excited",
];
const ENERGY_OPTIONS = ["low", "medium", "high", "chaotic"];
const TONE_OPTIONS = [
  "sarcastic",
  "dramatic",
  "wholesome",
  "funny",
  "cringe",
  "romantic",
  "savage",
  "motivational",
  "passive_aggressive",
  "deadpan",
  "ironic",
  "mocking",
  "hype",
  "awkward",
  "dismissive",
  "confident",
  "sympathetic",
  "melancholic",
  "celebratory",
];
const TAG_OPTIONS = [
  "relatable",
  "food",
  "friendship",
  "betrayal",
  "work",
  "college",
  "money",
  "sleep",
  "love",
  "fail",
  "victory",
  "roast",
  "facepalm",
  "agree",
  "disagree",
  "busy",
  "weekend",
  "monday",
  "late",
  "meeting",
  "party",
  "travel",
  "traffic",
  "sports",
  "family",
  "parents",
  "siblings",
  "gossip",
  "challenge",
  "flex",
];
const SCENARIO_OPTIONS = [
  "exam_failure",
  "late_friend",
  "boss_scolding",
  "group_chat",
  "power_cut",
  "monday_morning",
  "weekend_plans",
  "traffic_jam",
  "family_function",
  "unexpected_visit",
  "food_arrived",
  "work_deadline",
  "project_submitted",
  "told_you_so",
  "roast_session",
  "greeting",
  "goodnight",
  "apology",
  "celebration",
  "farewell",
];
const USE_CASE_OPTIONS = [
  "opener",
  "escalation",
  "comeback",
  "reaction",
  "acknowledgement",
  "agreement",
  "disagreement",
  "closer",
  "celebration",
  "apology",
];
const LANGUAGE_OPTIONS = [
  "english",
  "hindi",
  "kannada",
  "tamil",
  "telugu",
  "malayalam",
  "bengali",
  "marathi",
  "punjabi",
  "other",
];

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  description: string;
  category: string;
  subCategory: string;
  languages: string[];
  tags: string[];
  tone: string[];
  scenarioFit: string[];
  dominantEmotion: string;
  energyLevel: string;
  hasTextOverlay: boolean;
  ocrText: string;
  rarity: string;
  useCase: string;
  moderationNotes: string;
  isLive: boolean;
}

const defaultForm = (): FormState => ({
  title: "",
  description: "",
  category: "",
  subCategory: "",
  languages: [],
  tags: [],
  tone: [],
  scenarioFit: [],
  dominantEmotion: "",
  energyLevel: "",
  hasTextOverlay: false,
  ocrText: "",
  rarity: "common",
  useCase: "",
  moderationNotes: "",
  isLive: true,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function MultiToggle({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() =>
              onChange(
                active ? selected.filter((x) => x !== o) : [...selected, o],
              )
            }
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
              active
                ? "bg-primary/15 border-primary/30 text-primary"
                : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

function TokenInput({
  value,
  onChange,
  placeholder,
  suggestions,
  listId,
  maxTokens,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  suggestions: string[];
  listId: string;
  maxTokens?: number;
}) {
  const [draft, setDraft] = useState("");
  const canAddMore = maxTokens ? value.length < maxTokens : true;

  const addToken = (raw: string) => {
    if (!canAddMore) return;
    const token = raw.trim();
    if (!token) return;
    if (value.includes(token)) {
      setDraft("");
      return;
    }
    onChange([...value, token]);
    setDraft("");
  };

  const removeToken = (token: string) =>
    onChange(value.filter((t) => t !== token));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      addToken(draft);
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const handleBlur = () => {
    if (draft.includes(",")) {
      const parts = draft
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length > 0) {
        const next = [...value];
        for (const p of parts) {
          if (!next.includes(p) && (!maxTokens || next.length < maxTokens))
            next.push(p);
        }
        onChange(next);
        setDraft("");
        return;
      }
    }
    addToken(draft);
  };

  const filteredSuggestions = suggestions.filter((s) => !value.includes(s));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => removeToken(t)}
            className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs text-primary hover:bg-primary/15"
            title="Remove"
          >
            {t}
          </button>
        ))}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        list={listId}
        className={inputCls}
      />
      {filteredSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filteredSuggestions.slice(0, 12).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addToken(s)}
              className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}

function SuggestInput({
  value,
  onChange,
  placeholder,
  suggestions,
  listId,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suggestions: string[];
  listId: string;
}) {
  const filtered = suggestions.filter((s) => s !== value);

  return (
    <div className="space-y-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        list={listId}
        className={inputCls}
      />
      {filtered.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filtered.slice(0, 10).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const selectCls =
  "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

// ── Status types ──────────────────────────────────────────────────────────────

type ItemStatus = "pending" | "uploading" | "done" | "error" | "skipped";

interface ItemResult {
  status: ItemStatus;
  error?: string;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function IngestReviewClient() {
  const router = useRouter();
  const { queue, currentIndex, advance, reset } = useIngestStore();

  const [form, setForm] = useState<FormState>(defaultForm());
  const [results, setResults] = useState<Record<number, ItemResult>>({});
  const [submitting, setSubmitting] = useState(false);

  const current = queue[currentIndex];
  const total = queue.length;
  const done = Object.values(results).filter((r) => r.status === "done").length;
  const skipped = Object.values(results).filter(
    (r) => r.status === "skipped",
  ).length;
  const errors = Object.values(results).filter(
    (r) => r.status === "error",
  ).length;
  const finished = currentIndex >= total;

  // Redirect back if queue is empty (e.g. page reload)
  useEffect(() => {
    if (total === 0) router.push("/admin/ingest");
  }, [total, router]);

  // Pre-fill title from filename when sticker changes
  useEffect(() => {
    if (!current) return;
    setForm((f) => ({
      ...defaultForm(),
      // Keep common fields to speed up review
      category: f.category,
      languages: f.languages,
      rarity: f.rarity,
      tone: f.tone,
      energyLevel: f.energyLevel,
      tags: f.tags,
      scenarioFit: f.scenarioFit,
      useCase: f.useCase,
      // Auto-fill title from filename
      title: current.file
        .replace(/\.[^.]+$/, "")
        .replace(/[-_]/g, " ")
        .trim(),
    }));
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSkip = () => {
    setResults((r) => ({ ...r, [currentIndex]: { status: "skipped" } }));
    advance();
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.category) return;
    setSubmitting(true);
    setResults((r) => ({ ...r, [currentIndex]: { status: "uploading" } }));

    try {
      const isManual = current.sourceType === "manual";
      const endpoint = isManual ? "/api/stickers" : "/api/ingest/upload";
      const payload = isManual
        ? {
            cloudinaryUrl: current.cloudinary?.url ?? current.url,
            thumbnailUrl: current.cloudinary?.thumbnailUrl,
            type: current.cloudinary?.type ?? "image",
            widthPx: current.cloudinary?.width,
            heightPx: current.cloudinary?.height,
            fileSizeKb: current.cloudinary?.bytes
              ? Math.round(current.cloudinary.bytes / 1024)
              : undefined,
            durationMs: current.cloudinary?.duration
              ? Math.round(current.cloudinary.duration * 1000)
              : undefined,
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            category: form.category,
            subCategory: form.subCategory.trim() || undefined,
            languages: form.languages,
            tags: form.tags,
            tone: form.tone,
            scenarioFit: form.scenarioFit,
            dominantEmotion: form.dominantEmotion || undefined,
            energyLevel: form.energyLevel || undefined,
            hasTextOverlay: form.hasTextOverlay,
            ocrText: form.ocrText.trim() || undefined,
            rarity: form.rarity,
            useCase: form.useCase.trim() || undefined,
            moderationNotes: form.moderationNotes.trim() || undefined,
            isLive: form.isLive,
          }
        : {
            sourceUrl: current.url,
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            category: form.category,
            subCategory: form.subCategory.trim() || undefined,
            languages: form.languages,
            tags: form.tags,
            tone: form.tone,
            scenarioFit: form.scenarioFit,
            dominantEmotion: form.dominantEmotion || undefined,
            energyLevel: form.energyLevel || undefined,
            hasTextOverlay: form.hasTextOverlay,
            ocrText: form.ocrText.trim() || undefined,
            rarity: form.rarity,
            useCase: form.useCase.trim() || undefined,
            moderationNotes: form.moderationNotes.trim() || undefined,
            isLive: form.isLive,
            sourceName: "stickerly_scrape",
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        setResults((r) => ({
          ...r,
          [currentIndex]: {
            status: "error",
            error: "Duplicate — already in DB",
          },
        }));
      } else if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setResults((r) => ({
          ...r,
          [currentIndex]: {
            status: "error",
            error: err.error ?? "Upload failed",
          },
        }));
      } else {
        setResults((r) => ({ ...r, [currentIndex]: { status: "done" } }));
        advance();
      }
    } catch (e) {
      setResults((r) => ({
        ...r,
        [currentIndex]: { status: "error", error: String(e) },
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setResults((r) => {
      const next = { ...r };
      delete next[currentIndex];
      return next;
    });
  };

  // ── Finished screen ───────────────────────────────────────────────────────

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-5 text-center">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Ingestion complete</h2>
        <div className="flex gap-4 text-sm">
          <span className="text-emerald-400">{done} saved</span>
          <span className="text-muted-foreground">{skipped} skipped</span>
          {errors > 0 && (
            <span className="text-destructive">{errors} errors</span>
          )}
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <Button
            variant="outline"
            onClick={() => {
              reset();
              router.push("/admin/ingest");
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> New search
          </Button>
          <Button onClick={() => router.push("/admin/stickers")}>
            View stickers
          </Button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const currentResult = results[currentIndex];
  const isError = currentResult?.status === "error";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/admin/ingest")}
          className="gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-primary" />
            Step 2 — Review & Ingest
          </h1>
          <p className="text-sm text-muted-foreground">
            {currentIndex + 1} of {total} · {done} saved · {skipped} skipped
          </p>
        </div>
        {/* Progress bar */}
        <div className="w-full mt-1">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(currentIndex / total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main layout: sticker preview + form */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        {/* Left: sticker preview */}
        <div className="space-y-3">
          <Card>
            <CardContent className="pt-4">
              <div className="aspect-square rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={current.url}
                  alt={current.file}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pack info */}
          <Card>
            <CardContent className="pt-3 pb-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <p className="text-xs font-medium text-foreground truncate">
                  {current.packName}
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                by {current.authorName}
              </p>
              {current.isAnimated && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Animated
                </Badge>
              )}
              {!current.isAnimated && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Static
                </Badge>
              )}
              <p className="text-[10px] text-muted-foreground break-all mt-1">
                {current.file}
              </p>
            </CardContent>
          </Card>

          {/* Queue items panel */}
          <Card>
            <CardHeader className="py-2 px-3 border-b border-border">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Queue
              </CardTitle>
            </CardHeader>
            <div className="max-h-48 overflow-y-auto">
              {queue.map((item, idx) => {
                const res = results[idx];
                return (
                  <div
                    key={item.sha}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 border-b border-border/50 last:border-0",
                      idx === currentIndex && "bg-accent/50",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt=""
                      className="h-7 w-7 rounded object-cover shrink-0"
                    />
                    <span className="text-[10px] text-muted-foreground truncate flex-1">
                      {item.file.slice(0, 20)}…
                    </span>
                    {res?.status === "done" && (
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                    )}
                    {res?.status === "skipped" && (
                      <SkipForward className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                    {res?.status === "error" && (
                      <XCircle className="h-3 w-3 text-destructive shrink-0" />
                    )}
                    {res?.status === "uploading" && (
                      <Loader2 className="h-3 w-3 text-primary animate-spin shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right: form */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              Sticker Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              {/* Error banner */}
              {isError && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <span className="flex items-center gap-2">
                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                    {currentResult.error}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRetry}
                    className="h-6 px-2 text-xs"
                  >
                    Retry
                  </Button>
                </div>
              )}

              {/* Row 1: title + category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Title" required>
                  <input
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder="e.g. Angry Rajni"
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Category" required>
                  <select
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                    className={selectCls}
                  >
                    <option value="">— select —</option>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              {/* Row 2: subcategory + rarity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Sub-category">
                  <input
                    value={form.subCategory}
                    onChange={(e) => set("subCategory", e.target.value)}
                    placeholder="e.g. rajnikanth"
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Rarity">
                  <select
                    value={form.rarity}
                    onChange={(e) => set("rarity", e.target.value)}
                    className={selectCls}
                  >
                    {RARITY_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              {/* Row 2b: detected type */}
              <FormField label="Detected type">
                <div className="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">
                  <span className="font-medium">
                    {current.isAnimated
                      ? "Animated (gif/video)"
                      : "Static image"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Auto from Stickerly
                  </span>
                </div>
              </FormField>

              {/* Description */}
              <FormField label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="What's happening in this sticker?"
                  rows={2}
                  className={cn(inputCls, "resize-none")}
                />
              </FormField>

              <Separator />

              {/* Languages */}
              <FormField label="Languages">
                <MultiToggle
                  options={LANGUAGE_OPTIONS}
                  selected={form.languages}
                  onChange={(v) => set("languages", v)}
                />
              </FormField>

              {/* Tone */}
              <FormField label="Tone">
                <MultiToggle
                  options={TONE_OPTIONS}
                  selected={form.tone}
                  onChange={(v) => set("tone", v)}
                />
              </FormField>

              <Separator />

              {/* Row 3: emotion + energy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Dominant emotion">
                  <select
                    value={form.dominantEmotion}
                    onChange={(e) => set("dominantEmotion", e.target.value)}
                    className={selectCls}
                  >
                    <option value="">— none —</option>
                    {EMOTION_OPTIONS.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Energy level">
                  <select
                    value={form.energyLevel}
                    onChange={(e) => set("energyLevel", e.target.value)}
                    className={selectCls}
                  >
                    <option value="">— none —</option>
                    {ENERGY_OPTIONS.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              {/* Tags + scenario */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Tags">
                  <TokenInput
                    value={form.tags}
                    onChange={(v) => set("tags", v)}
                    placeholder="Add tags and press Enter"
                    suggestions={TAG_OPTIONS}
                    listId="tags-suggest"
                  />
                </FormField>
                <FormField label="Scenario fit">
                  <TokenInput
                    value={form.scenarioFit}
                    onChange={(v) => set("scenarioFit", v)}
                    placeholder="Add scenarios and press Enter"
                    suggestions={SCENARIO_OPTIONS}
                    listId="scenario-suggest"
                  />
                </FormField>
              </div>

              {/* Use case */}
              <FormField label="Use case">
                <SuggestInput
                  value={form.useCase}
                  onChange={(v) => set("useCase", v)}
                  placeholder="e.g. escalation, opener, closer"
                  suggestions={USE_CASE_OPTIONS}
                  listId="usecase-suggest"
                />
              </FormField>

              <Separator />

              {/* Text overlay */}
              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.hasTextOverlay}
                    onChange={(e) => set("hasTextOverlay", e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm">Has text overlay</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isLive}
                    onChange={(e) => set("isLive", e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm">Mark as Live immediately</span>
                </label>
              </div>

              {form.hasTextOverlay && (
                <FormField label="OCR text">
                  <input
                    value={form.ocrText}
                    onChange={(e) => set("ocrText", e.target.value)}
                    placeholder="Text visible in the sticker"
                    className={inputCls}
                  />
                </FormField>
              )}

              {/* Moderation notes */}
              <FormField label="Moderation notes">
                <input
                  value={form.moderationNotes}
                  onChange={(e) => set("moderationNotes", e.target.value)}
                  placeholder="Optional notes for review"
                  className={inputCls}
                />
              </FormField>

              {/* Actions */}
              <Separator />
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  disabled={submitting}
                  className="gap-2 text-muted-foreground"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  Skip
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {currentIndex + 1} / {total}
                  </span>
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      submitting || !form.title.trim() || !form.category
                    }
                    className="gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Save & Next
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
