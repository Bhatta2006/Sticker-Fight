# StickerFight — Enhanced Firecrawl Sticker Scraper Prompt

--- 

## 🎯 Project Context

You are building the **Sticker Scraping & Ingestion Pipeline** for **StickerFight** — a real-time multiplayer sticker battle game. The scraper must collect **tens of thousands of stickers** (PNG, WebP, GIF, short MP4/WebM) from publicly available sources, tag them intelligently, deduplicate them, and output a **structured CSV** ready for bulk import into the game's MongoDB sticker collection.

---

## 🛠️ Tech Stack to Use

| Layer | Technology |
|---|---|
| **Primary Scraper** | [Firecrawl](https://www.firecrawl.dev/) (`firecrawl-py` or `@mendable/firecrawl-js`) |
| **Orchestration** | Python 3.12 with `asyncio` + `aiohttp` for concurrency |
| **Job Queue** | BullMQ (Redis-backed) for distributed scrape jobs |
| **Deduplication** | Redis `SET` storing URL fingerprints (SHA-256 of image URL) |
| **AI Tagging** | OpenAI GPT-4o Vision API — auto-generate tags, emotion labels, NSFW check |
| **Image Processing** | `Pillow` + `imageio` for format detection; `ffmpeg-python` for TGS/GIF conversion |
| **Output** | CSV via Python `csv` module (append-safe, UTF-8 with BOM for Excel compatibility) |
| **Rate Limiting** | Exponential back-off + `tenacity` retry decorator |
| **Proxy Rotation** | Firecrawl's built-in proxy pool (or BrightData fallback) |

---

## 📋 Full Implementation Prompt

### Paste this verbatim into your AI coding assistant (Cursor, Claude Code, GPT-4, etc.):

---

```
Build a production-grade, asynchronous sticker scraping pipeline for the StickerFight game using Firecrawl as the primary crawling engine. The system must:

─────────────────────────────────────────
 SECTION 1 — ARCHITECTURE & ENTRY POINT
─────────────────────────────────────────

Create a Python package called `sticker_scraper/` with the following module structure:

sticker_scraper/
├── main.py                  # CLI entry point — accepts source list and output CSV path
├── config.py                # All env vars: FIRECRAWL_API_KEY, OPENAI_API_KEY, REDIS_URL, OUTPUT_CSV
├── sources.py               # Source registry — one dataclass per scraping target
├── scrapers/
│   ├── base.py              # Abstract BaseScraper with shared retry/dedup logic
│   ├── giphy_scraper.py     # Scrapes GIPHY using Firecrawl + GIPHY API fallback
│   ├── tenor_scraper.py     # Scrapes Tenor GIF pages via Firecrawl
│   ├── sticker_sites.py     # Generic HTML sticker page scraper (Firecrawl crawlUrl)
│   └── reddit_scraper.py    # Reddit meme boards scraper (public JSON API + Firecrawl)
├── processors/
│   ├── deduplicator.py      # Redis SHA-256 fingerprint deduplication
│   ├── tagger.py            # GPT-4o Vision tagging — generates tags[], emotion, language, nsfw_flag
│   ├── image_validator.py   # Validates image URL is reachable, gets dimensions & format
│   └── csv_writer.py        # Thread-safe CSV writer with append + header management
├── models.py                # Pydantic models: StickerRecord, TagResult, ScrapeJob
└── utils.py                 # Logging, fingerprint hashing, retry decorator

─────────────────────────────────────────
 SECTION 2 — FIRECRAWL INTEGRATION
─────────────────────────────────────────

Use the official Firecrawl Python SDK (`pip install firecrawl-py`).

Implement TWO Firecrawl usage modes:

MODE A — crawlUrl (for sticker gallery sites):
```python
from firecrawl import FirecrawlApp

app = FirecrawlApp(api_key=config.FIRECRAWL_API_KEY)

result = app.crawl_url(
    url="https://target-sticker-site.com/stickers",
    params={
        "crawlerOptions": {
            "includes": ["/sticker", "/pack", "/category"],  # path filters
            "excludes": ["/login", "/signup", "/api"],
            "maxDepth": 4,
            "limit": 2000,                 # max pages per crawl job
            "generateImgAltText": True,    # extract alt text for initial tagging
        },
        "pageOptions": {
            "onlyMainContent": False,      # capture full DOM for image extraction
            "includeHtml": True,
            "screenshot": False,
        }
    }
)
```

Parse all `<img>`, `<source>`, `<video>` tags from returned HTML. Extract:
- `src` / `srcset` / `data-src` attributes (handle lazy-load patterns)
- `alt` text (seed for tags)
- Parent `<a href>` (source page URL)
- Any `data-tags`, `data-category`, `data-emotion` custom attributes

MODE B — scrapeUrl (for single sticker pack pages):
```python
result = app.scrape_url(
    url="https://target-sticker-site.com/pack/funny-reactions",
    params={
        "pageOptions": {
            "includeHtml": True,
            "onlyMainContent": False,
            "waitFor": 2000,  # wait 2s for JS-rendered content
        }
    }
)
```

Use BeautifulSoup4 to parse `result["content"]` HTML and extract all image/GIF URLs.

─────────────────────────────────────────
 SECTION 3 — TARGET SOURCES
─────────────────────────────────────────

Implement scrapers for these source categories. Each source must declare:
- `name`: identifier used in CSV `source` column
- `base_url`: starting URL(s) to crawl
- `scrape_mode`: "crawl" | "api" | "scrape"
- `default_tags`: list of seed tags applied to every sticker from this source
- `content_type`: "image" | "gif" | "video" | "mixed"

Sources to implement:

1. GIPHY Public GIF Pages
   - Endpoint: https://giphy.com/stickers/{category}
   - Categories: reactions, memes, animals, sports, bollywood, food, love, sad, funny, wow
   - Method: Firecrawl crawlUrl + GIPHY REST API (api.giphy.com/v1/gifs/search) as fallback
   - Extract: GIF CDN URL, GIPHY ID, title, tags from GIPHY API response
   - Rate limit: 42 requests/hour on free tier — implement sleep(85) between API pages

2. Tenor GIF Pages
   - Endpoint: https://tenor.com/search/{keyword}-stickers
   - Keywords: same 30 emotion/theme keywords used in the game's prompt bank
   - Method: Firecrawl scrapeUrl with waitFor:3000 (Tenor is React-rendered)
   - Extract: `.GifListItem img` src attributes, data-share-url

3. Sticker.ly Public Packs (if robots.txt permits)
   - Endpoint: https://sticker.ly/s/stickers/{pack-id}
   - Method: Firecrawl crawlUrl, depth 2, limit 500
   - Extract: WebP image URLs, pack name → default tag

4. Gfycat/Imgur Reaction GIFs
   - Endpoint: https://gfycat.com/gifs/search/{keyword}
   - Method: Firecrawl scrapeUrl + Imgur API for Reddit-linked GIFs

5. Public Reddit Meme Subreddits (via JSON API, no auth required)
   - Subreddits: r/memes, r/IndianMemeTemplates, r/bollywoodmemes, r/reactiongifs
   - Endpoint: https://www.reddit.com/r/{subreddit}/top.json?t=month&limit=100
   - Method: Direct aiohttp GET (no Firecrawl needed — JSON API)
   - Filter: only posts where `url` ends in .jpg/.png/.gif AND score > 500
   - Extract: image URL, title (→ seed tags), subreddit (→ source tag)

6. Generic Sticker Sites (configurable list)
   - Accept a YAML file `sources.yaml` listing additional URLs to crawl
   - Each entry: {url, tags, depth, limit}
   - Method: Firecrawl crawlUrl with site-specific depth/limit settings

─────────────────────────────────────────
 SECTION 4 — DEDUPLICATION
─────────────────────────────────────────

Before any sticker is tagged or written to CSV, run deduplication:

1. Normalize image URL:
   - Strip query parameters that are CDN cache-busters (?v=, ?w=, ?t=)
   - Resolve relative URLs to absolute
   - Lowercase the URL
   
2. SHA-256 hash the normalized URL
   fingerprint = hashlib.sha256(normalized_url.encode()).hexdigest()

3. Check Redis:
   ```python
   if redis_client.sismember("scraped_stickers", fingerprint):
       skip  # already processed
   else:
       redis_client.sadd("scraped_stickers", fingerprint)
       proceed_to_tag()
   ```

4. Persist the dedup set: dump Redis SET to disk every 1000 entries as a JSON backup
   so the process can resume from checkpoints after crashes.

─────────────────────────────────────────
 SECTION 5 — AI TAGGING WITH GPT-4o VISION
─────────────────────────────────────────

For every deduplicated sticker URL, call GPT-4o Vision to generate structured tags.

System prompt for the tagger:
```
You are a sticker metadata specialist for a competitive sticker battle game called StickerFight.
Your job: analyse the sticker image and return ONLY a JSON object. No markdown, no explanation.

Return exactly this structure:
{
  "tags": ["tag1", "tag2", ...],         // 3–8 lowercase tags, specific and searchable
  "emotions": ["happy", "shocked", ...], // 1–3 from: happy, sad, angry, shocked, laughing, crying, disgusted, proud, scared, confused, love, cringe, fire, cool, awkward
  "category": "reactions",               // ONE of: reactions | memes | bollywood | sports | animals | food | love | cringe | relatable | regional | absurd | wholesome
  "language": "english",                 // primary text language in sticker: english | hindi | kannada | tamil | telugu | none
  "has_text": true,                      // does the sticker contain visible text?
  "is_animated": false,                  // is this a GIF or video sticker?
  "nsfw_score": 0,                       // 0–10: 0=safe, 10=explicit. REJECT if >= 4.
  "game_usability": 8                    // 1–10: how useful is this in a sticker battle?
}

Be specific. "happy dog" is better than "animal". "cringe boss meeting" beats "office".
```

Implementation rules:
- Download the image to memory (do NOT save to disk at tagging stage)
- Resize to max 512x512 before sending to Vision API (saves tokens)
- For GIFs: extract frame 0 only for tagging
- If GPT-4o returns nsfw_score >= 4, mark sticker as `status=pending_review`, do NOT discard
- Batch tag in groups of 10 using asyncio.gather() with a semaphore of 5 concurrent calls
- Retry on rate limit with exponential backoff (1s, 2s, 4s, max 3 retries)
- Cache tag results in Redis with key `tags:{fingerprint}` TTL 7 days (avoid re-tagging)
- If tagging fails after all retries, set tags=[], game_usability=0, status=untagged

─────────────────────────────────────────
 SECTION 6 — CSV OUTPUT SCHEMA
─────────────────────────────────────────

Output a UTF-8 CSV (with BOM for Excel) at the path specified in config.OUTPUT_CSV.
The CSV must be append-safe: if the file already exists, do NOT re-write the header.

CSV Columns (in this exact order):

| Column | Type | Description |
|---|---|---|
| sticker_id | string | UUID4 generated at scrape time |
| title | string | Alt text / Reddit title / GIPHY title (cleaned) |
| file_url | string | Direct URL to the sticker image/GIF/video |
| thumbnail_url | string | Same as file_url for images; first-frame URL for GIFs |
| tags | string | Pipe-separated list: "reaction|shocked|bollywood|funny" |
| emotions | string | Pipe-separated: "shocked|laughing" |
| category | string | Single category from the taxonomy above |
| language | string | Detected language |
| has_text | bool | true/false |
| is_animated | bool | true/false |
| content_type | string | "image" | "gif" | "video" |
| file_format | string | png, webp, gif, jpg, mp4, webm |
| source | string | Source identifier: "giphy", "tenor", "reddit/memes", etc. |
| source_page_url | string | The page URL where this sticker was found |
| nsfw_score | int | 0–10 |
| game_usability | int | 1–10 |
| status | string | "approved" | "pending_review" | "untagged" |
| scraped_at | string | ISO 8601 UTC timestamp |
| fingerprint | string | SHA-256 of normalized file_url (for dedup) |

Write rows using Python's csv.DictWriter. Flush after every 100 rows.

─────────────────────────────────────────
 SECTION 7 — JOB QUEUE & CONCURRENCY
─────────────────────────────────────────

Implement a BullMQ-compatible job queue using Python's `bullmq` package (or `rq` as fallback).

Job types:
1. `crawl_job` — crawl a source URL, extract all sticker URLs, enqueue tag_jobs
2. `tag_job` — tag a single sticker URL, write result to CSV
3. `retry_job` — retry previously failed tag_jobs

Worker concurrency:
- Max 5 concurrent Firecrawl requests (respect API rate limits)
- Max 10 concurrent GPT-4o Vision calls
- Max 50 concurrent image URL validation checks (aiohttp HEAD requests)

Progress tracking:
- Log to stdout: total enqueued / processed / failed / skipped (dedup) counts
- Print a progress bar using `tqdm`
- Write a `scraper_state.json` checkpoint every 500 stickers:
  {
    "total_scraped": 12400,
    "total_tagged": 11982,
    "total_failed": 56,
    "total_deduped": 2310,
    "sources_completed": ["giphy", "tenor"],
    "sources_pending": ["reddit/memes"],
    "last_updated": "2026-05-10T14:32:00Z"
  }

─────────────────────────────────────────
 SECTION 8 — CLI INTERFACE
─────────────────────────────────────────

Build a CLI using `click` or `argparse`:

python -m sticker_scraper.main \
  --sources giphy,tenor,reddit \
  --output ./stickers.csv \
  --limit 50000 \
  --concurrency 5 \
  --resume                    # resume from scraper_state.json checkpoint
  --dry-run                   # scrape URLs but skip AI tagging (for testing)
  --sources-file sources.yaml # load custom source list from YAML

─────────────────────────────────────────
 SECTION 9 — LEGAL & ETHICAL SAFEGUARDS
─────────────────────────────────────────

Implement these mandatory safeguards:

1. robots.txt check — before crawling any domain, fetch and parse /robots.txt.
   Respect Disallow rules for the scraper user agent. Skip domains that disallow *.
   
2. Rate limiting — add configurable delays between requests per domain.
   Default: 1.5s between requests to the same domain.
   
3. User-Agent — use a descriptive, honest UA string:
   "StickerFight-Scraper/1.0 (+https://stickerfight.gg/scraper-info)"

4. Attribution — always populate `source` and `source_page_url` columns.

5. NSFW gate — any sticker with nsfw_score >= 4 is automatically set to
   status="pending_review" and must be manually approved before going live.

6. ToS blocklist — maintain a hardcoded list of domains that prohibit scraping:
   ["whatsapp.com", "instagram.com", "facebook.com", "tiktok.com", "snapchat.com"]
   Raise an error if any source URL matches this list.

─────────────────────────────────────────
 SECTION 10 — TESTING & VALIDATION
─────────────────────────────────────────

Write pytest tests covering:

1. Unit tests:
   - deduplicator.py: same URL produces same fingerprint, second insert is skipped
   - tagger.py: mocked GPT-4o response is correctly parsed into StickerRecord
   - csv_writer.py: concurrent writes don't corrupt the CSV

2. Integration test (dry run):
   - Run scraper against a live test URL (https://giphy.com/stickers/reactions) with limit=10
   - Assert output CSV has >= 5 rows, all required columns present, no duplicate fingerprints

3. Load test:
   - Mock Firecrawl and GPT-4o responses
   - Simulate ingestion of 10,000 sticker records
   - Assert CSV is written correctly, dedup Redis set is populated, checkpoint JSON is valid

─────────────────────────────────────────
 SECTION 11 — ENVIRONMENT VARIABLES
─────────────────────────────────────────

.env file template:
FIRECRAWL_API_KEY=fc-xxxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx
REDIS_URL=redis://localhost:6379/0
OUTPUT_CSV=./data/stickers.csv
MAX_STICKERS=100000
CONCURRENCY_FIRECRAWL=5
CONCURRENCY_TAGGER=10
REQUEST_DELAY_SECONDS=1.5
NSFW_REVIEW_THRESHOLD=4
LOG_LEVEL=INFO

─────────────────────────────────────────
 DELIVERABLES
─────────────────────────────────────────

Produce:
1. Full Python package source code with all modules above
2. requirements.txt pinning all dependencies
3. README.md with setup, env vars, usage examples, and CSV schema docs
4. sources.yaml sample with 10 pre-configured sticker sources
5. A sample output CSV with 5 rows showing realistic data for StickerFight import
6. Dockerfile for containerised deployment (Python 3.12-slim base)
```

---

## 🔑 Key Design Decisions Explained

| Decision | Rationale |
|---|---|
| Firecrawl for JS-heavy sites | Tenor, Sticker.ly and most modern sticker galleries are React/Next.js apps. Regular `requests` sees empty HTML. Firecrawl handles headless rendering + proxy rotation out of the box. |
| GPT-4o Vision for tagging | StickerFight's scoring engine uses tag matching and category fit. Garbage tags = wrong stickers in wrong rounds. Vision-based tagging is 10× more accurate than alt-text scraping. |
| Redis dedup set | At 50,000+ stickers across multiple sources, the same GIF appears on GIPHY, Tenor, and Reddit simultaneously. SHA-256 fingerprinting prevents triple-importing the same asset. |
| BullMQ job queue | Scraping, tagging, and writing are different I/O bottlenecks. Decoupling them into a queue allows independent scaling and clean retry semantics — critical for a 100k-sticker target. |
| CSV output (not direct DB insert) | CSV lets you inspect, filter, and bulk-review before a `mongoimport`. Never pipe raw scraped data directly into production MongoDB. |
| nsfw_score threshold + pending_review | StickerFight is played by broad audiences. Any auto-inserted explicit sticker is a ToS violation risk. The `pending_review` status creates a human gate without blocking the scraping throughput. |

---

## 📂 Expected CSV Sample Output

```csv
sticker_id,title,file_url,thumbnail_url,tags,emotions,category,language,has_text,is_animated,content_type,file_format,source,source_page_url,nsfw_score,game_usability,status,scraped_at,fingerprint
a1b2c3d4-...,Shocked Pikachu,https://media.giphy.com/media/xyz/giphy.gif,https://media.giphy.com/media/xyz/giphy_s.gif,shocked|meme|pikachu|reaction|pokemon,shocked|surprised,reactions,none,false,true,gif,gif,giphy,https://giphy.com/stickers/reactions,0,9,approved,2026-05-10T10:00:00Z,8f14e45f...
b2c3d4e5-...,Amma asking marks,https://i.reddit.com/r/IndianMemeTemplates/abc.jpg,same,indian|relatable|mom|marks|cringe,cringe|laughing,relatable,english,true,false,image,jpg,reddit/IndianMemeTemplates,https://reddit.com/r/IndianMemeTemplates/comments/xyz,0,10,approved,2026-05-10T10:01:00Z,7d9c1b3a...
```

---

## ⚡ Scaling to 100,000 Stickers

Run multiple workers in parallel against different source groups:

```bash
# Terminal 1 — GIPHY + Tenor
python -m sticker_scraper.main --sources giphy,tenor --limit 30000 --output ./data/stickers_giphy.csv

# Terminal 2 — Reddit boards
python -m sticker_scraper.main --sources reddit --limit 20000 --output ./data/stickers_reddit.csv

# Terminal 3 — Custom sticker sites
python -m sticker_scraper.main --sources-file sources.yaml --limit 50000 --output ./data/stickers_sites.csv

# Merge all CSVs into one (dedup fingerprints across files)
python -m sticker_scraper.merge ./data/stickers_*.csv --output ./data/stickers_master.csv

# Import into MongoDB
mongoimport --uri "$MONGO_URI" --collection stickers --type csv --headerline --file ./data/stickers_master.csv
```

---

*Built for StickerFight Production Architecture v1.0 — Sticker Ecosystem Section 5.2*
