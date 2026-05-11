import sys
import os
import argparse
import urllib.request
import tempfile
from moderation_worker.pipeline import run_moderation_pipeline


def process_image(image_path: str, url: str = ""):
    print(f"\nProcessing: {image_path}")
    result = run_moderation_pipeline(image_path, url)
    if result.success:
        print("\n=== MODERATION RESULT ===")
        print(f"Status: {result.data.status}")
        print(f"Reason: {result.data.reason}")
        print(f"pHash: {result.data.phash}")
        print(f"NSFW Score: {result.data.nsfw_score:.4f}")
        if result.data.has_text:
            print(f"Extracted Text: {result.data.extracted_text}")
            print(f"Profane: {result.data.is_profane}")
        print(f"Auto Tags: {result.data.auto_tags}")
        print(f"Emotion: {result.data.dominant_emotion}")
        print("======================\n")
    else:
        print(f"Error: {result.error}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="StickerFight Moderation Layer 1 Worker"
    )
    parser.add_argument("--image", type=str, help="Local image path to moderate")
    parser.add_argument("--url", type=str, help="Image URL to download and moderate")

    args = parser.parse_args()

    if args.url:
        print(f"Downloading {args.url}...")
        try:
            temp_path = tempfile.mktemp(suffix=".png")
            urllib.request.urlretrieve(args.url, temp_path)
            process_image(temp_path, args.url)
            os.remove(temp_path)
        except Exception as e:
            print(f"Failed to download image: {e}")
    elif args.image:
        process_image(args.image, args.image)
    else:
        print("Please provide --image or --url")
        sys.exit(1)
