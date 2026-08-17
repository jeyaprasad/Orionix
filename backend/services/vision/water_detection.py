import numpy as np
import cv2
import base64
from PIL import Image
from backend.utils.logger import logger

def detect_water_extent(image: Image.Image) -> tuple[float, str]:
    """
    Detects water bodies in a PIL image using HSV color thresholding in OpenCV.
    
    Returns:
        water_coverage_percent: Percentage (0-100) of water pixels.
        water_mask_base64: Base64-encoded PNG of the semi-transparent blue mask (or empty string).
    """
    logger.info("Detecting water extent using OpenCV HSV thresholding.")
    try:
        rgb_image = image.convert("RGB")
        img_np = np.array(rgb_image)
        
        # Convert RGB to BGR for OpenCV
        bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        # Convert BGR to HSV
        hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
        
        # Define blue/cyan water HSV threshold range
        lower_blue = np.array([85, 30, 30])
        upper_blue = np.array([135, 255, 255])
        
        # Create binary mask
        mask = cv2.inRange(hsv, lower_blue, upper_blue)
        
        total_pixels = mask.size
        water_pixels = int(cv2.countNonZero(mask))
        water_coverage_percent = round((water_pixels / total_pixels) * 100.0, 2)
        
        # Create transparent BGRA overlay
        h, w = mask.shape
        rgba = np.zeros((h, w, 4), dtype=np.uint8)
        
        # Set water pixels to vibrant semi-transparent blue (BGRA: Blue=255, Green=120, Red=0, Alpha=140)
        rgba[mask > 0] = [255, 120, 0, 140]
        
        # Encode overlay to PNG bytes
        success, buffer = cv2.imencode('.png', rgba)
        if not success:
            raise RuntimeError("Failed to encode BGRA water mask to PNG.")
            
        water_mask_base64 = base64.b64encode(buffer).decode('utf-8')
        
        logger.info(f"Water detection completed. Coverage: {water_coverage_percent}%")
        return water_coverage_percent, water_mask_base64
        
    except Exception as e:
        logger.error(f"Error during water detection: {e}")
        return 0.0, ""
