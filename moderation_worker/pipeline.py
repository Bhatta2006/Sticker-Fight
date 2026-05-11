import os
from datetime import datetime, timezone
from pymongo import MongoClient
import uuid

from moderation_worker import config
from moderation_worker.models import StickerMetadata, ModerationResult
from moderation_worker.checks.dedup import generate_phash
from moderation_worker.checks.nsfw import check_nsfw
from moderation_worker.checks.ocr import check_text_profanity
from moderation_worker.checks.embeddings import get_embedding_and_tags
from moderation_worker.checks.emotion import get_emotion

print("[*] Connecting to MongoDB...")
try:
    client = MongoClient(config.MONGO_URI, serverSelectionTimeoutMS=2000)
    db = client.get_default_database()
    stickers_coll = db["stickers"]
    hashes_coll = db["sticker_hashes"]
    # Ensure indexes (run once in prod usually)
    hashes_coll.create_index("phash", background=True)
except:
    print(
        "[!] MongoDB connection skipped/failed. Proceeding in dry-run mode if DB unavailable."
    )
    db = None


def run_moderation_pipeline(
    image_path: str,
    file_url: str = "",
    fingerprint: str = "",
    base_sticker_id: str = "",
) -> ModerationResult:
    """
    Executes the full Layer 1 Moderation Pipeline on a single sticker image.
    Sequence: pHash -> NSFW -> OCR -> Embeddings -> Emotion -> MongoDB
    """

    if not os.path.exists(image_path):
        return ModerationResult(success=False, error="Image file not found")

    sticker_id = base_sticker_id if base_sticker_id else str(uuid.uuid4())

    # 1. Perceptual Hashing & Dedup/Blocklist
    phash = generate_phash(image_path)

    if db is not None:
        existing = hashes_coll.find_one({"phash": phash})
        if existing:
            return ModerationResult(
                success=True,
                data=StickerMetadata(
                    sticker_id=sticker_id,
                    file_url=file_url,
                    fingerprint=fingerprint,
                    phash=phash,
                    is_duplicate=True,
                    status="rejected",
                    reason="Duplicate or Blocklisted pHash",
                ),
            )

    # 2. NSFW Check
    nsfw_raw_score = check_nsfw(image_path)
    nsfw_score_int = int(nsfw_raw_score * 10)  # Scale 0.0-1.0 to 0-10 int

    status = "approved"
    reason = "All checks passed"

    if nsfw_raw_score >= config.NSFW_THRESHOLD:
        status = "rejected"
        reason = f"NSFW Threshold exceeded ({nsfw_raw_score:.2f})"
    elif nsfw_raw_score >= config.NSFW_REVIEW_THRESHOLD:
        status = "pending_review"
        reason = f"NSFW score flags review ({nsfw_raw_score:.2f})"

    # Short circuit rejection to save compute if strictly over extreme threshold
    if status == "rejected":
        metadata = StickerMetadata(
            sticker_id=sticker_id,
            file_url=file_url,
            fingerprint=fingerprint,
            phash=phash,
            nsfw_score=nsfw_score_int,
            status=status,
            reason=reason,
        )
        _save_metadata(metadata)
        return ModerationResult(success=True, data=metadata)

    # 3. OCR and Profanity
    ocr_result = check_text_profanity(image_path)
    if ocr_result["is_profane"]:
        status = "rejected"
        reason = "Profanity detected in text"

    # 4. CLIP Embeddings and Auto-Tags
    clip_result = get_embedding_and_tags(image_path)

    # 5. Emotion Detection
    dominant_emotion = get_emotion(image_path)

    # Construct complete payload
    metadata = StickerMetadata(
        sticker_id=sticker_id,
        file_url=file_url,
        fingerprint=fingerprint,
        phash=phash,
        nsfw_score=nsfw_score_int,
        has_text=ocr_result["has_text"],
        extracted_text=ocr_result["extracted_text"],
        is_profane=ocr_result["is_profane"],
        embedding=clip_result["embedding"],
        auto_tags=clip_result["auto_tags"],
        dominant_emotion=dominant_emotion,
        status=status,
        reason=reason,
    )

    # Save to MongoDB
    _save_metadata(metadata)

    return ModerationResult(success=True, data=metadata)


def _save_metadata(metadata: StickerMetadata):
    if db is None:
        return
    try:
        # Save sticker
        stickers_coll.insert_one(metadata.model_dump())
        # Save hash
        hashes_coll.insert_one(
            {
                "sticker_id": metadata.sticker_id,
                "phash": metadata.phash,
                "status": metadata.status,
            }
        )
    except Exception as e:
        print(f"Failed saving to MongoDB: {e}")
