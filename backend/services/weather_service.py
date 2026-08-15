import requests
from backend.utils.logger import logger
from typing import Tuple

class WeatherService:
    """
    Fetches recent and forecast rainfall data from the free Open-Meteo API.
    Does not require an API key.
    """
    
    def get_rainfall_data(self, latitude: float, longitude: float) -> Tuple[float, float]:
        """
        Retrieves:
          - Recent rainfall total (last 7 days, in mm)
          - Forecast rainfall total (next 3 days, including today, in mm)
        
        Returns:
            A tuple of (recent_rainfall_mm, forecast_rainfall_mm).
            Returns (0.0, 0.0) on failure or network error.
        """
        url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={latitude}&longitude={longitude}"
            f"&daily=rain_sum&past_days=7&forecast_days=3&timezone=auto"
        )
        
        logger.info(f"[WeatherService] Requesting rainfall data for location ({latitude}, {longitude}).")
        try:
            response = requests.get(url, timeout=10.0)
            if response.status_code != 200:
                logger.warning(f"[WeatherService] Open-Meteo returned HTTP {response.status_code}. Using 0.0 fallback.")
                return 0.0, 0.0
                
            data = response.json()
            daily = data.get("daily", {})
            rain_sums = daily.get("rain_sum", [])
            
            # Open-Meteo returns past_days + forecast_days count of elements.
            # With past_days=7, elements 0-6 are the past 7 days.
            # Element 7 is today, and elements 8-9 are the subsequent 2 forecast days.
            if not rain_sums or len(rain_sums) < 10:
                logger.warning(f"[WeatherService] Open-Meteo returned incomplete rain_sum data: {rain_sums}. Using 0.0 fallback.")
                return 0.0, 0.0
            
            recent_rain = sum(rain_sums[0:7])
            forecast_rain = sum(rain_sums[7:10])
            
            logger.info(f"[WeatherService] Rainfall retrieved. Recent (7d): {recent_rain:.1f}mm, Forecast (3d): {forecast_rain:.1f}mm.")
            return float(round(recent_rain, 2)), float(round(forecast_rain, 2))
            
        except Exception as e:
            logger.error(f"[WeatherService] Failed to query Open-Meteo: {e}. Using 0.0 fallback.")
            return 0.0, 0.0

weather_service = WeatherService()
