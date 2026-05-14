import { create } from "zustand";

export interface StickerItem {
  packId: string;
  packName: string;
  authorName: string;
  file: string;
  url: string;
  sha: string;
  isAnimated: boolean;
  isDuplicate: boolean;
  sourceType: "stickerly" | "manual";
  cloudinary?: {
    url: string;
    thumbnailUrl?: string;
    type: "image" | "gif" | "video";
    width?: number;
    height?: number;
    bytes?: number;
    duration?: number;
  };
}

interface IngestState {
  queue: StickerItem[];
  currentIndex: number;
  setQueue: (items: StickerItem[]) => void;
  advance: () => void;
  reset: () => void;
}

export const useIngestStore = create<IngestState>((set) => ({
  queue: [],
  currentIndex: 0,
  setQueue: (items) => set({ queue: items, currentIndex: 0 }),
  advance: () => set((s) => ({ currentIndex: s.currentIndex + 1 })),
  reset: () => set({ queue: [], currentIndex: 0 }),
}));
