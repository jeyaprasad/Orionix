from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any
from backend.services.weather_service import weather_service
from backend.interpreter.eo_rules import compute_flood_risk_score
from backend.utils.logger import logger

router = APIRouter(prefix="/api/alert", tags=["Early Warning Alerts"])

# In-memory subscription store for demo purposes
subscriptions = []

class AlertSubscriptionRequest(BaseModel):
    latitude: float = Field(..., description="Target latitude to monitor.")
    longitude: float = Field(..., description="Target longitude to monitor.")
    contact: str = Field(..., description="Phone number or Email address for alerts.")
    alert_type: str = Field(default="flood", description="Type of hazard to monitor: flood | land_cover.")

@router.post("/subscribe")
async def subscribe(req: AlertSubscriptionRequest):
    sub = {
        "id": len(subscriptions) + 1,
        "latitude": req.latitude,
        "longitude": req.longitude,
        "contact": req.contact,
        "alert_type": req.alert_type,
        "active": True
    }
    subscriptions.append(sub)
    logger.info(f"[AlertDispatcher] Registered early-warning subscription for {req.contact} at ({req.latitude}, {req.longitude}).")
    return {
        "status": "success",
        "message": f"Successfully subscribed contact '{req.contact}' for location ({req.latitude}, {req.longitude})",
        "subscription": sub
    }

@router.get("/subscriptions")
async def get_subscriptions():
    return subscriptions

@router.post("/simulate-check")
async def simulate_check():
    triggered = []
    logger.info(f"[AlertDispatcher] Simulating scheduled hazard checks on {len(subscriptions)} subscriptions...")
    
    for sub in subscriptions:
        lat = sub["latitude"]
        lng = sub["longitude"]
        contact = sub["contact"]
        
        # Pull live weather rainfall correlation
        recent_rain, forecast_rain = weather_service.get_rainfall_data(lat, lng)
        
        # For check simulation, we assume elevated surface water to see if high-risk alerts trigger
        simulated_water_coverage = 12.0  # mock 12% water coverage for test triggers
        
        flood_risk = compute_flood_risk_score(
            water_coverage_percent=simulated_water_coverage,
            urban_density="High",
            agricultural_presence="High",
            recent_rainfall=recent_rain,
            forecast_rainfall=forecast_rain
        )
        
        risk_label = flood_risk["risk_label"]
        score = flood_risk["risk_score"]
        reasoning = flood_risk["reasoning"]
        
        alert_sent = False
        # If risk is elevated due to rain + surface water, trigger alert
        if risk_label in ["High", "Severe"]:
            alert_sent = True
            logger.warning(
                f"[AlertDispatcher] ALERT TRIGGERED for {contact} at ({lat}, {lng}). "
                f"Risk: {risk_label} ({score}/100) | Reason: {reasoning}. "
                f"(Alert delivery not wired to a real SMS/email provider in this demo — SES/Twilio integration ready)."
            )
            
        triggered.append({
            "subscription_id": sub["id"],
            "contact": contact,
            "location": {"lat": lat, "lng": lng},
            "risk_label": risk_label,
            "risk_score": score,
            "reasoning": reasoning,
            "alert_sent": alert_sent
        })
        
    return {
        "status": "success",
        "checked_count": len(subscriptions),
        "alerts_triggered": [t for t in triggered if t["alert_sent"]],
        "results": triggered
    }
