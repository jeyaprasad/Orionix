import torch
import numpy as np
from PIL import Image
from typing import Any
from backend.utils.logger import logger
from backend.services.vision.water_detection import detect_water_extent

def preprocess_image(image: Image.Image, transform: Any) -> torch.Tensor:
    """
    Applies RemoteCLIP's configured open_clip preprocessor to a PIL image.
    Adds a batch dimension, converting PIL.Image to Shape: (1, 3, 224, 224).
    """
    logger.info("Applying RemoteCLIP preprocessing pipeline to PIL image.")
    try:
        tensor = transform(image)
        # Add batch dimension: (3, 224, 224) -> (1, 3, 224, 224)
        tensor = tensor.unsqueeze(0)
        return tensor
    except Exception as e:
        logger.error(f"Error during preprocessing: {str(e)}")
        raise ValueError(f"Preprocessing transform failed: {str(e)}")


def compute_vegetation_health_score(image: Image.Image) -> float:
    """
    Computes a 0-100 vegetation health score from pixel-level green dominance
    using the Visible-band Difference Vegetation Index (VDVI) as a visible-light proxy.

    Formula:
      VDVI = (2 * G - R - B) / (2 * G + R + B)
      Clipped to [0, 1] and averaged to produce a percentage score.
    """
    logger.info("Computing visible-light proxy vegetation health score.")
    try:
        # Convert image to RGB mode if not already
        rgb_image = image.convert("RGB")
        img_np = np.array(rgb_image, dtype=np.float32)

        r = img_np[:, :, 0]
        g = img_np[:, :, 1]
        b = img_np[:, :, 2]

        # Calculate VDVI
        # VDVI = (2 * G - R - B) / (2 * G + R + B)
        numerator = 2.0 * g - r - b
        denominator = 2.0 * g + r + b

        # Avoid division by zero
        mask = denominator == 0
        denominator[mask] = 1.0

        vdvi = numerator / denominator
        # If denominator was 0, it means all pixels were black (0,0,0), so set VDVI to 0.0
        vdvi[mask] = 0.0

        # Keep only positive green dominance (values above 0.0 represent greenness)
        vdvi_clipped = np.clip(vdvi, 0.0, 1.0)

        # Take the mean across all pixels and convert to percentage (0 - 100)
        score = float(np.mean(vdvi_clipped) * 100.0)

        logger.info(f"Vegetation health score computed: {score:.2f}")
        return round(score, 2)
    except Exception as e:
        logger.error(f"Error computing vegetation health score: {str(e)}")
        # Fallback to a default score of 0.0 on any failure
        return 0.0




