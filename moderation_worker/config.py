import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/stickerfight")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Thresholds
NSFW_THRESHOLD = float(os.getenv("NSFW_THRESHOLD", "0.85"))
NSFW_REVIEW_THRESHOLD = float(os.getenv("NSFW_REVIEW_THRESHOLD", "0.50"))

# Candidate tags for Zero-Shot Classification
CANDIDATE_TAGS = [
    "happy",
    "sad",
    "angry",
    "shocked",
    "laughing",
    "crying",
    "disgusted",
    "proud",
    "scared",
    "confused",
    "love",
    "cringe",
    "fire",
    "cool",
    "awkward",
    "bollywood",
    "meme",
    "reaction",
    "sports",
    "animal",
    "food",
]
