from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid


class StickerRecord(BaseModel):
    sticker_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    file_url: str
    thumbnail_url: str = ""
    tags: str = ""
    emotions: str = ""
    category: str = "reactions"
    language: str = "none"
    has_text: bool = False
    is_animated: bool = False
    content_type: str = "image"
    file_format: str = "png"
    source: str = "generic"
    source_page_url: str = ""
    nsfw_score: int = 0
    game_usability: int = 5
    status: str = "approved"
    scraped_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    fingerprint: str
