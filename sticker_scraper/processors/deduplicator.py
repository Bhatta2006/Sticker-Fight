import hashlib
import redis
from sticker_scraper import config

_local_set = set()  # Fallback


def get_fingerprint(url: str) -> str:
    # Normalize URL: strip simple query params, lowercase
    normalized = url.split("?")[0].lower()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def is_duplicate(fingerprint: str) -> bool:
    try:
        r = redis.Redis.from_url(config.REDIS_URL)
        return r.sismember("scraped_stickers", fingerprint)
    except:
        return fingerprint in _local_set


def mark_processed(fingerprint: str):
    try:
        r = redis.Redis.from_url(config.REDIS_URL)
        r.sadd("scraped_stickers", fingerprint)
    except:
        _local_set.add(fingerprint)
