import imagehash
from PIL import Image


def generate_phash(image_path: str) -> str:
    """
    Generates a perceptual hash for an image.
    This works reliably to detect slightly modified duplicates.
    """
    try:
        img = Image.open(image_path)
        return str(imagehash.phash(img))
    except Exception as e:
        print(f"Error generating pHash: {e}")
        return ""
