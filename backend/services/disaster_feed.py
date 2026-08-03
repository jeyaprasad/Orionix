import requests
import xml.etree.ElementTree as ET
import math
from typing import Optional, Tuple
from backend.utils.logger import logger

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates the haversine distance in kilometers between two points.
    """
    R = 6371.0 # Earth radius in km
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) *
         math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    
    return R * c

def query_gdacs_flood_alerts(lat: float, lon: float, radius_km: float = 50.0) -> Tuple[bool, Optional[str]]:
    """
    Queries GDACS public RSS feed for active flood alerts near the given coordinates.
    
    Returns:
        (match_found, alert_summary)
    """
    logger.info(f"[GDACS] Checking active flood alerts near ({lat}, {lon}) with radius {radius_km}km.")
    url = "https://www.gdacs.org/xml/rss.xml"
    try:
        response = requests.get(url, timeout=5.0)
        if response.status_code != 200:
            logger.warning(f"[GDACS] Non-200 status code: {response.status_code}")
            return False, None
        
        root = ET.fromstring(response.content)
        # Namespaces mapping
        namespaces = {
            'gdacs': 'http://www.gdacs.org/xsd/1.0'
        }
        
        items = root.findall(".//item")
        logger.info(f"[GDACS] Parsing {len(items)} items from feed XML.")
        for item in items:
            # 1. Filter by disaster type (FL represents flood)
            disaster_type_el = item.find("gdacs:disastertype", namespaces)
            disaster_type = disaster_type_el.text if disaster_type_el is not None else ""
            
            # Fallback if element not found by namespace
            if not disaster_type:
                disaster_type_el = item.find("{http://www.gdacs.org/xsd/1.0}disastertype")
                disaster_type = disaster_type_el.text if disaster_type_el is not None else ""
            
            title_el = item.find("title")
            title_text = title_el.text if title_el is not None else ""
            
            # If it's not a flood, skip
            if disaster_type.upper() != "FL":
                # Try extracting from title to be safe
                if "flood" not in title_text.lower() and "inundation" not in title_text.lower():
                    continue
            
            # 2. Extract coordinates
            lat_el = item.find("gdacs:latitude", namespaces)
            lon_el = item.find("gdacs:longitude", namespaces)
            
            if lat_el is None or lon_el is None:
                lat_el = item.find("{http://www.gdacs.org/xsd/1.0}latitude")
                lon_el = item.find("{http://www.gdacs.org/xsd/1.0}longitude")
                
            if lat_el is None or lon_el is None:
                continue
                
            try:
                alert_lat = float(lat_el.text)
                alert_lon = float(lon_el.text)
            except (ValueError, TypeError):
                continue
                
            # 3. Calculate distance
            dist = haversine_distance(lat, lon, alert_lat, alert_lon)
            if dist <= radius_km:
                summary = f"GDACS Alert: {title_text} ({dist:.1f} km away)"
                logger.info(f"[GDACS] Active alert match found: {summary}")
                return True, summary
                
    except Exception as e:
        logger.error(f"[GDACS] Error querying GDACS: {e}")
        
    logger.info("[GDACS] No matching active flood advisories found.")
    return False, None
