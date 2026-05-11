# StickerFight Scraper

A robust, production-grade sticker scraping pipeline for the StickerFight game. This tool uses [Firecrawl](https://www.firecrawl.dev/) to crawl and extract stickers (PNG, WebP, GIF) from publicly available sources, deduplicates them using SHA-256 fingerprinting, and outputs a structured CSV ready for bulk import into the game's MongoDB sticker collection.

## Features

- **Headless Scraping**: Uses Firecrawl to scrape client-side rendered HTML and lazy-loaded images.
- **Deduplication**: SHA-256 fingerprinting for image URLs to prevent duplicate indexing across runs.
- **CSV Output**: Append-safe `utf-8-sig` CSV generation for Microsoft Excel compatibility.
- **Models & Validation**: Pydantic models for strict sticker record schemas.

## Requirements

- Python 3.10+
- A [Firecrawl](https://www.firecrawl.dev/) API Key

## Setup

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Environment Variables**:
   Copy `.env.example` to `.env` and configure your API keys:
   ```env
   FIRECRAWL_API_KEY=fc-your-api-key-here
   ```

## Usage

Run the module via CLI and target a specific URL:

```bash
python -m sticker_scraper.main --url "https://target-sticker-site.com/pack" --output ./data/my_stickers.csv
```