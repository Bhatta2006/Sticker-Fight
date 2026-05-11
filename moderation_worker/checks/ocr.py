import easyocr
from better_profanity import profanity
import warnings

warnings.filterwarnings("ignore")

print("[*] Loading EasyOCR models (en, hi)...")
# Initialize reader once
reader = easyocr.Reader(["en", "hi"], gpu=False)  # Fallback to CPU if GPU not available

# Load custom censor list if needed
# profanity.load_censor_words(custom_words=["custom_bad_word"])


def check_text_profanity(image_path: str) -> dict:
    """
    Extracts text and checks for profanity.
    """
    result = {"extracted_text": "", "has_text": False, "is_profane": False}
    try:
        ocr_results = reader.readtext(image_path)
        if not ocr_results:
            return result

        texts = [res[1] for res in ocr_results]
        extracted_text = " ".join(texts)

        result["has_text"] = True
        result["extracted_text"] = extracted_text
        result["is_profane"] = profanity.contains_profanity(extracted_text)

        return result
    except Exception as e:
        print(f"Error in OCR: {e}")
        return result
