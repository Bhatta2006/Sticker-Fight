from firecrawl import FirecrawlApp
from bs4 import BeautifulSoup
from typing import List
from sticker_scraper import config
from sticker_scraper.models import StickerRecord
from sticker_scraper.processors.deduplicator import (
    get_fingerprint,
    is_duplicate,
    mark_processed,
)


class GenericStickerScraper:
    def __init__(self):
        self.app = FirecrawlApp(api_key=config.FIRECRAWL_API_KEY)

    def scrape_url(self, target_url: str) -> List[StickerRecord]:
        print(f"[*] Scraping {target_url} using Firecrawl...")
        result = self.app.scrape(
            url=target_url,
            formats=["html"],
            wait_for=3000,
        )

        html = (
            result.html
            if hasattr(result, "html")
            else (result.get("html", "") if isinstance(result, dict) else "")
        )
        if not html and hasattr(result, "content"):
            html = result.content
        elif not html and isinstance(result, dict):
            html = result.get("content", "")

        soup = BeautifulSoup(html, "html.parser")

        imgs = soup.find_all("img")
        records = []

        for img in imgs:
            src = img.get("src") or img.get("data-src") or img.get("srcset")
            if not src:
                continue

            # Basic validation
            if not src.startswith("http"):
                continue

            fingerprint = get_fingerprint(src)
            if is_duplicate(fingerprint):
                continue

            alt_text = img.get("alt", "").strip()

            record = StickerRecord(
                title=alt_text,
                file_url=src,
                thumbnail_url=src,
                tags=alt_text.replace(" ", "|").lower(),
                source_page_url=target_url,
                fingerprint=fingerprint,
                file_format=src.split(".")[-1][:4].replace("?", "")
                if "." in src
                else "png",
            )
            records.append(record)
            mark_processed(fingerprint)

        print(f"[+] Found {len(records)} unique stickers!")
        return records
