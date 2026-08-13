import os
import numpy as np
from PIL import Image
import rasterio
from rasterio.io import MemoryFile
from backend.utils.logger import logger

def load_geotiff(file_bytes: bytes, filename: str) -> dict:
    """
    Parses a GeoTIFF (.tif/.tiff) file using rasterio.
    
    Reads available bands, applies 2%-98% contrast stretching to raw channel arrays,
    and stacks them into an 8-bit RGB PIL Image. Extracts geospatial metadata 
    (CRS, bounding box, resolution, number of bands).
    
    If multispectral bands (NIR and Red) are found or detected, calculates True NDVI:
    (NIR - Red) / (NIR + Red) and returns the average mapped to a 0-100 score.
    
    Returns:
        A dict containing:
        - pil_image:   The stacked PIL.Image in RGB mode.
        - true_ndvi:   Computed NDVI average scaled [0-100], or None if multispectral unavailable.
        - geo_metadata: Geospatial metadata dict.
        - index_type:   String tag indicating quality level ("true NDVI (multispectral)" or "RGB proxy index").
        Or None if the file is not a GeoTIFF.
    """
    ext = os.path.splitext(filename.lower())[1]
    if ext not in {".tif", ".tiff"}:
        return None

    logger.info(f"[load_geotiff] Reading GeoTIFF dataset '{filename}'. Size: {len(file_bytes)} bytes.")

    try:
        with MemoryFile(file_bytes) as memfile:
            with memfile.open() as src:
                count = src.count
                if count == 0:
                    raise ValueError("GeoTIFF dataset contains no bands.")

                # 1. Read / Stack bands for RGB PIL Image
                # We need 3 channels for standard RemoteCLIP/inference pipeline.
                if count >= 3:
                    # Default: Band 1=Red, Band 2=Green, Band 3=Blue
                    r = src.read(1)
                    g = src.read(2)
                    b = src.read(3)
                elif count == 2:
                    # Replicate Band 1 to construct 3 channels
                    r = src.read(1)
                    g = src.read(2)
                    b = src.read(1)
                else:
                    # Single band grayscale
                    gray = src.read(1)
                    r = gray
                    g = gray
                    b = gray

                # Simple contrast stretching to convert any bit-depth (e.g. 16-bit) to uint8 safely
                def stretch_band(band_data):
                    band_data = np.nan_to_num(band_data)
                    p2, p98 = np.percentile(band_data, (2, 98))
                    if p98 > p2:
                        stretched = (band_data - p2) / (p98 - p2) * 255.0
                    else:
                        stretched = band_data
                    return np.clip(stretched, 0, 255).astype(np.uint8)

                r_stretched = stretch_band(r)
                g_stretched = stretch_band(g)
                b_stretched = stretch_band(b)

                rgb_array = np.dstack((r_stretched, g_stretched, b_stretched))
                pil_image = Image.fromarray(rgb_array)

                # 2. Extract Geospatial Metadata
                crs_str = str(src.crs) if src.crs else "Unknown"
                bounds = src.bounds
                # bbox format: [minLat, minLng, maxLat, maxLng]
                bbox = [bounds.bottom, bounds.left, bounds.top, bounds.right] if bounds else None
                resolution = (src.res[0], src.res[1]) if src.res else None

                geo_metadata = {
                    "crs": crs_str,
                    "bounds": {
                        "left": bounds.left,
                        "bottom": bounds.bottom,
                        "right": bounds.right,
                        "top": bounds.top
                    } if bounds else None,
                    "resolution": resolution,
                    "bands_count": count
                }

                # 3. Detect Red and NIR bands for True NDVI
                red_idx = None
                nir_idx = None

                # Search by band names/descriptions
                if src.descriptions:
                    for idx, desc in enumerate(src.descriptions, start=1):
                        desc_str = str(desc or "").lower()
                        if any(k in desc_str for k in ["red", "r", "b4", "band 4", "band4"]):
                            red_idx = idx
                        elif any(k in desc_str for k in ["nir", "near-infrared", "near infrared", "n", "b8", "band 8", "band8", "b5", "band 5", "band5"]):
                            nir_idx = idx

                # Fallback to standard index conventions if tags are missing
                if red_idx is None or nir_idx is None:
                    if count >= 8:
                        # Sentinel-2 standard: B4 is Red, B8 is NIR
                        red_idx = 4
                        nir_idx = 8
                    elif count >= 5:
                        # Landsat 8 standard: B4 is Red, B5 is NIR
                        red_idx = 4
                        nir_idx = 5
                    elif count == 4:
                        # Standard 4-band order: 1=Red, 2=Green, 3=Blue, 4=NIR
                        red_idx = 1
                        nir_idx = 4

                true_ndvi = None
                index_type = "RGB proxy index"

                if red_idx is not None and nir_idx is not None:
                    try:
                        logger.info(f"[load_geotiff] Computing True NDVI using Red (Band {red_idx}) and NIR (Band {nir_idx}).")
                        red_band = src.read(red_idx).astype(float)
                        nir_band = src.read(nir_idx).astype(float)

                        # Suppress divide-by-zero warnings
                        denominator = nir_band + red_band
                        ndvi_array = np.zeros_like(denominator)
                        valid_mask = denominator > 0
                        ndvi_array[valid_mask] = (nir_band[valid_mask] - red_band[valid_mask]) / denominator[valid_mask]

                        # Ignore NaN values in average
                        average_ndvi = float(np.nanmean(ndvi_array))
                        
                        # Map average NDVI [-1.0, 1.0] to [0.0, 100.0] scale
                        # Scale positive NDVI [0.0, 1.0] to [0.0, 100.0] (vegetated surface indicator)
                        if average_ndvi < 0:
                            true_ndvi = 0.0
                        else:
                            true_ndvi = min(average_ndvi * 100.0, 100.0)

                        index_type = "true NDVI (multispectral)"
                        logger.info(f"[load_geotiff] NDVI computed. Average: {average_ndvi:.4f}, Scaled Score: {true_ndvi:.2f}")

                    except Exception as e:
                        logger.error(f"[load_geotiff] True NDVI calculation failure: {e}")

                return {
                    "pil_image": pil_image,
                    "true_ndvi": true_ndvi,
                    "geo_metadata": geo_metadata,
                    "index_type": index_type
                }

    except Exception as e:
        logger.error(f"[load_geotiff] Failed to load GeoTIFF file: {e}")
        raise ValueError(f"Failed to load GeoTIFF: {str(e)}")
