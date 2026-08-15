import os
import numpy as np
import rasterio
from rasterio.transform import from_origin

def create_sample_geotiff(filepath, satellite, sensor, portal, lat=20.5937, lon=78.9629):
    """
    Creates a valid multispectral sample GeoTIFF file representing a dummy satellite image
    centered over the Indian subcontinent, with ISRO metadata tags.
    """
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    # 4 Bands: 1=Red, 2=Green, 3=Blue, 4=NIR (standard 4-band ordering)
    width, height = 200, 200
    
    # Generate mock band data
    # Let's create a forest scene with a river running through it
    x = np.linspace(-10, 10, width)
    y = np.linspace(-10, 10, height)
    X, Y = np.meshgrid(x, y)
    
    # River mask (blue channel high, others lower)
    river = (np.abs(X - Y) < 1.5).astype(np.uint8)
    
    # Forest vegetation background (high NIR, moderate Green, low Red)
    red = np.ones((height, width), dtype=np.uint8) * 40
    green = np.ones((height, width), dtype=np.uint8) * 110
    blue = np.ones((height, width), dtype=np.uint8) * 35
    nir = np.ones((height, width), dtype=np.uint8) * 180  # high NIR for vegetation
    
    # Apply river channel
    red[river == 1] = 20
    green[river == 1] = 70
    blue[river == 1] = 160
    nir[river == 1] = 10  # water absorbs NIR
    
    # Add random noise to simulate sensor capture
    rng = np.random.default_rng(42)
    red = np.clip(red + rng.integers(-5, 5, red.shape), 0, 255).astype(np.uint8)
    green = np.clip(green + rng.integers(-5, 5, green.shape), 0, 255).astype(np.uint8)
    blue = np.clip(blue + rng.integers(-5, 5, blue.shape), 0, 255).astype(np.uint8)
    nir = np.clip(nir + rng.integers(-5, 5, nir.shape), 0, 255).astype(np.uint8)
    
    # Create transform (0.0001 deg resolution, centered on India)
    transform = from_origin(lon - 0.01, lat + 0.01, 0.0001, 0.0001)
    
    # Write GeoTIFF
    with rasterio.open(
        filepath,
        'w',
        driver='GTiff',
        height=height,
        width=width,
        count=4,
        dtype='uint8',
        crs='EPSG:4326',
        transform=transform,
    ) as dst:
        dst.write(red, 1)
        dst.write(green, 2)
        dst.write(blue, 3)
        dst.write(nir, 4)
        
        # Set band descriptions
        dst.set_band_description(1, "Red Band")
        dst.set_band_description(2, "Green Band")
        dst.set_band_description(3, "Blue Band")
        dst.set_band_description(4, "Near-Infrared (NIR) Band")
        
        # Add metadata tags for ISRO source detection
        dst.update_tags(
            SATELLITE=satellite,
            SENSOR=sensor,
            MISSION="ISRO Earth Observation",
            PORTAL=portal,
            AGENCY="ISRO - National Remote Sensing Centre (NRSC)",
            DESCRIPTION=f"Sample scene simulated for {satellite} {sensor} sourced via {portal}"
        )
        
    print(f"Created sample GeoTIFF: {filepath} with tags SATELLITE={satellite}, SENSOR={sensor}, PORTAL={portal}")

if __name__ == "__main__":
    create_sample_geotiff("data/isro_bhuvan_liss3_sample.tif", "RESOURCESAT-2", "LISS-3", "BHUVAN", lat=13.0827, lon=80.2707) # Chennai bounds
    create_sample_geotiff("data/isro_vedas_awifs_sample.tif", "RESOURCESAT-2A", "AWIFS", "VEDAS", lat=23.0225, lon=72.5714) # Ahmedabad bounds
