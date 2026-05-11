import warnings

# Suppress huggingface warnings
warnings.filterwarnings("ignore")

from transformers import pipeline
from PIL import Image

print("[*] Loading Falconsai NSFW model...")
nsfw_classifier = pipeline(
    "image-classification", model="Falconsai/nsfw_image_detection"
)


def check_nsfw(image_path: str) -> float:
    """
    Returns the NSFW probability score between 0.0 and 1.0.
    """
    try:
        img = Image.open(image_path).convert("RGB")
        results = nsfw_classifier(img)
        # Results format: [{'label': 'nsfw', 'score': 0.98}, ...]
        for res in results:
            if res["label"].lower() == "nsfw":
                return float(res["score"])
        return 0.0
    except Exception as e:
        print(f"Error in NSFW detection: {e}")
        return 1.0  # Fail secure
