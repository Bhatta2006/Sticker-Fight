import os
from dotenv import load_dotenv

load_dotenv()

FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
OUTPUT_CSV = os.getenv("OUTPUT_CSV", "./stickers.csv")
NSFW_REVIEW_THRESHOLD = int(os.getenv("NSFW_REVIEW_THRESHOLD", "4"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
