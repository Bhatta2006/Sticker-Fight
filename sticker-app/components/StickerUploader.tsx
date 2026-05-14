"use client";

import { CldUploadWidget } from "next-cloudinary";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

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
}

export default function StickerUploader({ onUpload }: StickerUploaderProps) {
  const [uploading, setUploading] = useState(false);

  return (
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
      onOpen={() => setUploading(true)}
      onClose={() => setUploading(false)}
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

        onUpload({
          public_id: info.public_id,
          secure_url: info.secure_url,
          thumbnail_url: info.secure_url,
          format: info.format,
          width: info.width,
          height: info.height,
          bytes: info.bytes,
          duration: info.duration,
          resource_type: info.resource_type,
        });
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
  );
}
