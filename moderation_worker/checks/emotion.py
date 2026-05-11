from deepface import DeepFace
import cv2


def get_emotion(image_path: str) -> str:
    """
    Detects the dominant emotion from the sticker using DeepFace.
    Returns 'none' if no face is aggressively found.
    """
    try:
        # Load image via cv2 so it doesn't fail on weird formats DeepFace might stumble on
        img = cv2.imread(image_path)
        if img is None:
            return "none"

        results = DeepFace.analyze(
            img_path=img,
            actions=["emotion"],
            enforce_detection=False,  # Don't error out if no face is found
            silent=True,
        )

        # DeepFace returns a list if multiple faces are present
        if isinstance(results, list) and len(results) > 0:
            return results[0].get("dominant_emotion", "none")
        elif isinstance(results, dict):
            return results.get("dominant_emotion", "none")

        return "none"
    except Exception as e:
        # DeepFace throws an exception if no face is found even with enforce_detection optionally failing inside
        return "none"
