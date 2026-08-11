import numpy as np
import cv2
from PIL import Image
from backend.utils.logger import logger

def compute_urban_density(image: Image.Image) -> float:
    """
    Estimates built-up/impervious surface coverage using edge density and grayscale 
    texture variance computed directly on the uploaded image.
    
    Algorithm:
      1. Convert PIL image to grayscale.
      2. Apply Gaussian Blur to filter noise.
      3. Use OpenCV Canny edge detection.
      4. Divide the image into a grid of blocks (e.g. 16x16 pixels).
      5. Classify a block as "built-up" if edge density > 4% and local variance > 80.0.
      
    Returns:
      urban_density_percent: Built-up block percentage as a float (0.0 to 100.0).
    """
    logger.info("Computing built-up urban density using Canny edge and texture variance analysis.")
    try:
        # Convert image to RGB, then to NumPy array
        rgb_image = image.convert("RGB")
        img_np = np.array(rgb_image)
        
        # 1. Convert to grayscale
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        
        # 2. Filter noise
        blurred = cv2.GaussianBlur(gray, (3, 3), 0)
        
        # 3. OpenCV Canny edge detection
        edges = cv2.Canny(blurred, threshold1=50, threshold2=150)
        
        h, w = gray.shape
        block_size = 16
        built_up_blocks = 0
        total_blocks = 0
        
        # 4. Sliding grid / Block analysis
        for y in range(0, h - block_size + 1, block_size):
            for x in range(0, w - block_size + 1, block_size):
                total_blocks += 1
                
                # Extract block slices
                block_gray = gray[y:y+block_size, x:x+block_size]
                block_edges = edges[y:y+block_size, x:x+block_size]
                
                # Calculate edge density: fraction of edge pixels in block
                edge_density = np.count_nonzero(block_edges) / block_edges.size
                
                # Calculate grayscale variance of pixels inside the block
                variance = np.var(block_gray)
                
                # Built-up classification check
                if edge_density > 0.04 and variance > 80.0:
                    built_up_blocks += 1
                    
        if total_blocks > 0:
            urban_density_percent = (built_up_blocks / total_blocks) * 100.0
        else:
            urban_density_percent = 0.0
            
        logger.info(f"Urban density computation complete. Score: {urban_density_percent:.2f}%")
        return round(urban_density_percent, 2)
        
    except Exception as e:
        logger.error(f"Error computing urban density: {e}")
        return 0.0
