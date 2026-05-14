"use client";

import { CldUploadWidget } from "next-cloudinary";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useIngestStore } from "@/lib/ingest-store";
import { useRouter } from "next/navigation";

const STICKERS_FOLDER = "sticker-fight/stickers";

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

interface StickerUploaderProps {
  onUpload: (result: UploadResult) => void;
  onReview: (results: UploadResult[]) => void;
}

export default function StickerUploader({
  onUpload,
  onReview,
}: StickerUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [reviewBeforeSave, setReviewBeforeSave] = useState(true);
  const [pending, setPending] = useState<UploadResult[]>([]);
  const router = useRouter();
  const { setQueue } = useIngestStore();

  const shouldQueue = reviewBeforeSave;

  const handleReviewQueue = (results: UploadResult[]) => {
    if (results.length === 0) return;
    onReview(results);
  };

  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={reviewBeforeSave}
          onChange={(e) => setReviewBeforeSave(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-border"
        />
        Review before save
      </label>
      <CldUploadWidget
        signatureEndpoint="/api/sign-cloudinary-params"
        options={{
          folder: STICKERS_FOLDER,
          resourceType: "auto",
          multiple: true,
          maxFiles: 20,
          clientAllowedFormats: [
            "jpg",
            "jpeg",
            "png",
            "gif",
            "webp",
            "mp4",
            "mov",
          ],
          maxFileSize: 20000000,
          sources: ["local", "url", "google_drive"],
          showAdvancedOptions: false,
          cropping: false,
          showSkipCropButton: false,
        }}
        onOpen={() => {
          setUploading(true);
          setPending([]);
        }}
        onClose={() => {
          setUploading(false);
          if (shouldQueue && pending.length > 0) handleReviewQueue(pending);
        }}
        onSuccess={(result) => {
          const info = result.info as {
            public_id: string;
            secure_url: string;
            format: string;
            width: number;
            height: number;
            bytes: number;
            duration?: number;
            resource_type: string;
          };

          const payload = {
            public_id: info.public_id,
            secure_url: info.secure_url,
            thumbnail_url: info.secure_url,
            format: info.format,
            width: info.width,
            height: info.height,
            bytes: info.bytes,
            duration: info.duration,
            resource_type: info.resource_type,
          };

          if (shouldQueue) {
            setPending((prev) => [...prev, payload]);
          } else {
            onUpload(payload);
          }
        }}
      >
        {({ open }) => (
          <Button
            onClick={() => open()}
            disabled={uploading}
            size="sm"
            className="gap-2"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload Stickers
          </Button>
        )}
      </CldUploadWidget>
    </div>
  );
}
