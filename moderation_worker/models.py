from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid


class StickerMetadata(BaseModel):
    # Core reference from scraper
    sticker_id: str
    file_url: str
    fingerprint: str = ""  # URL hash from scraper

    # Image processing metadata
    phash: str = ""  # Visual hash from moderation layer
    is_duplicate: bool = False

    # NSFW (Scaled to 0-10 to match game schema)
    nsfw_score: int = 0

    # OCR & Profanity
    extracted_text: str = ""
    has_text: bool = False
    is_profane: bool = False

    # Embeddings & AI Tags
    embedding: List[float] = Field(default_factory=list)
    auto_tags: List[str] = Field(default_factory=list)

    # Emotions
    dominant_emotion: str = "none"

    # Final Decision
    status: str = "pending"  # target: 'approved', 'rejected', 'pending_review'
    reason: str = ""
    processed_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class ModerationResult(BaseModel):
    success: bool
    data: Optional[StickerMetadata] = None
    error: str = ""
