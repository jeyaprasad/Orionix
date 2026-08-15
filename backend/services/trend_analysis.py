from typing import Dict, Any

class TrendAnalysisService:
    """
    Classifies trend direction and calculates an overall trend risk score
    based on observed changes in vegetation, water coverage, and urban density.
    
    Critically, all reports describe strictly observed changes between two real
    measurements, never future events or predictions.
    """
    
    def analyze_trends(
        self, 
        vegetation_delta: float, 
        water_coverage_delta: float, 
        urban_density_delta: float
    ) -> Dict[str, Any]:
        # 1. Vegetation Trend (measures drop in vegetation: baseline - current)
        # Positive delta means vegetation decreased (deforestation)
        # Negative delta means vegetation increased (growth)
        if vegetation_delta > 5.0:
            veg_trend = "Deteriorating"
            veg_desc = "Significant loss of forest canopy or vegetation cover."
        elif vegetation_delta < -5.0:
            veg_trend = "Improving"
            veg_desc = "Increase in vegetation density or canopy expansion."
        else:
            veg_trend = "Stable"
            veg_desc = "Vegetation levels remain relatively constant."

        # 2. Urban Density Trend (measures growth: current - baseline)
        if urban_density_delta > 5.0:
            urban_trend = "Deteriorating"
            urban_desc = "Rapid urban built-up expansion, reducing natural ground absorption."
        elif urban_density_delta < -2.0:
            urban_trend = "Improving"
            urban_desc = "Reduction in built-up density / increase in open permeable space."
        else:
            urban_trend = "Stable"
            urban_desc = "Urban density remains stable with controlled development."

        # 3. Water Coverage Trend (measures change: current - baseline)
        # Large absolute change in water coverage indicates risk (flooding or drying up)
        if water_coverage_delta > 5.0:
            water_trend = "Deteriorating"
            water_desc = "Abnormal water surface expansion, indicating potential flooding or waterlogging."
        elif water_coverage_delta < -5.0:
            water_trend = "Deteriorating"
            water_desc = "Significant water surface contraction, indicating reservoir drying or drought conditions."
        else:
            water_trend = "Stable"
            water_desc = "Surface water extent remains within normal seasonal baseline."

        # 4. Calculate Combined Overall Trend Risk Score (0-100)
        # Base risk is 10 (neutral/baseline)
        risk_score = 10.0
        
        # Apply penalties/gains based on observed trends
        if veg_trend == "Deteriorating":
            risk_score += abs(vegetation_delta) * 2.0
            risk_score += 15.0
        elif veg_trend == "Improving":
            risk_score -= abs(vegetation_delta) * 1.0
            risk_score -= 10.0
            
        if urban_trend == "Deteriorating":
            risk_score += abs(urban_density_delta) * 1.5
            risk_score += 10.0
            
        if water_trend == "Deteriorating":
            risk_score += abs(water_coverage_delta) * 2.5
            risk_score += 20.0
            
        # Clamp score between 0.0 and 100.0
        risk_score = max(0.0, min(100.0, risk_score))
        
        # Categorize risk label
        if risk_score < 30.0:
            risk_label = "Low"
        elif risk_score < 60.0:
            risk_label = "Moderate"
        else:
            risk_label = "High"

        return {
            "vegetation": {
                "trend": veg_trend,
                "delta": vegetation_delta,
                "description": veg_desc
            },
            "urban_density": {
                "trend": urban_trend,
                "delta": urban_density_delta,
                "description": urban_desc
            },
            "water_coverage": {
                "trend": water_trend,
                "delta": water_coverage_delta,
                "description": water_desc
            },
            "overall_trend_risk": round(risk_score, 1),
            "overall_risk_label": risk_label,
            "statement": (
                "Describe only observed change between the two measurements provided. "
                "Never claim to predict future events — describe historical trend and current risk trajectory only."
            )
        }

trend_analysis_service = TrendAnalysisService()
