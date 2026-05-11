import torch
import warnings
from PIL import Image
from transformers import CLIPProcessor, CLIPModel
from moderation_worker import config

warnings.filterwarnings("ignore")

print("[*] Loading CLIP model for Embeddings and Zero-Shot Classification...")
model_name = "openai/clip-vit-base-patch32"
model = CLIPModel.from_pretrained(model_name)
processor = CLIPProcessor.from_pretrained(model_name)


def get_embedding_and_tags(image_path: str) -> dict:
    """
    Returns a 512-d CLIP embedding and heavily weighted zero-shot tags.
    """
    result = {"embedding": [], "auto_tags": []}

    try:
        image = Image.open(image_path).convert("RGB")

        # 1. Get raw embedding for game-time vector math
        inputs = processor(images=image, return_tensors="pt")
        with torch.no_grad():
            image_features = model.get_image_features(**inputs)

        embedding = image_features.cpu().numpy().tolist()[0]
        result["embedding"] = embedding

        # 2. Get zero-shot tags
        candidate_tags = config.CANDIDATE_TAGS
        inputs_tags = processor(
            text=candidate_tags, images=image, return_tensors="pt", padding=True
        )
        with torch.no_grad():
            outputs = model(**inputs_tags)

        logits_per_image = outputs.logits_per_image
        probs = logits_per_image.softmax(dim=1).cpu().numpy()[0]

        # Filter top tags with > 10% probability
        tag_scores = {tag: float(probs[i]) for i, tag in enumerate(candidate_tags)}
        top_tags = [
            tag
            for tag, score in sorted(
                tag_scores.items(), key=lambda x: x[1], reverse=True
            )
            if score > 0.05
        ]

        result["auto_tags"] = top_tags[:5]  # Max 5 tags
        return result

    except Exception as e:
        print(f"Error in CLIP operations: {e}")
        return result
