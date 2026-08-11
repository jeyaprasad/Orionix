import numpy as np
from PIL import Image
from backend.utils.logger import logger

def compute_vegetation_index(image: Image.Image) -> float:
    """
    Computes a visible-light vegetation index proxy (Excess Green Index: ExG)
    from the actual uploaded image's RGB data.
    
    Formula:
      ExG = 2 * G - R - B
      
    This is mapped to a 0-100 scale by clipping to [0, 510] (the maximum possible
    positive value for 2G-R-B) and normalizing.
    
    Returns:
      vegetation_index_score: A real per-image float (0.0 to 100.0).
    """
    logger.info("Computing visible-light Excess Green Index (ExG) score.")
    try:
        # Convert image to RGB mode
        rgb_image = image.convert("RGB")
        img_np = np.array(rgb_image, dtype=np.float32)

        r = img_np[:, :, 0]
        g = img_np[:, :, 1]
        b = img_np[:, :, 2]

        # Calculate Excess Green Index (2G - R - B)
        exg = 2.0 * g - r - b

        # Keep only positive green dominance (values above 0 represent vegetation)
        # Maximum possible value for 2G - R - B is 510.0 (G=255, R=0, B=0)
        exg_clipped = np.clip(exg, 0.0, 510.0)

        # Normalize positive ExG values to [0.0, 100.0]
        exg_normalized = (exg_clipped / 510.0) * 100.0

        # Average across all pixels to get the final score
        score = float(np.mean(exg_normalized))

        logger.info(f"Excess Green Index computed: {score:.2f}")
        return round(score, 2)

    except Exception as e:
        logger.error(f"Error computing Excess Green Index: {e}")
        return 0.0
