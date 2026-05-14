import "server-only";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const STICKERS_FOLDER = "sticker-fight/stickers";

/**
 * Generates a Cloudinary thumbnail URL for a given public_id.
 * Returns a 300×300 cropped, auto-formatted, auto-quality version.
 */
export function getThumbnailUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    width: 300,
    height: 300,
    crop: "fill",
    fetch_format: "auto",
    quality: "auto",
    secure: true,
  });
}

export default cloudinary;
