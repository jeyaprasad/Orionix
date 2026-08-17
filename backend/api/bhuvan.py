from fastapi import APIRouter, HTTPException, Form
from backend.services.bhuvan_service import bhuvan_service
from backend.services.analysis_service import analysis_service
from backend.models.analysis import AnalysisResponse
from typing import Optional

router = APIRouter(prefix="/api/bhuvan", tags=["ISRO Bhuvan Integration"])

@router.get("/scenes")
def get_scenes(satellite: Optional[str] = None):
    """
    Query the metadata catalog from ISRO's MOSDAC/Bhuvan database.
    """
    return bhuvan_service.get_scenes(satellite=satellite)

@router.post("/ingest", response_model=AnalysisResponse)
async def ingest_and_analyze(scene_id: str = Form(...)):
    """
    Ingest a satellite scene directly from Bhuvan and pass the band array to the EO analysis pipeline.
    """
    try:
        # Pull scene from Bhuvan data stream
        ingested = await bhuvan_service.ingest_scene(scene_id)
        
        # Inject downloaded bytes straight into the EO Analysis engine
        result = await analysis_service.analyze_image(
            image_bytes=ingested["image_bytes"],
            filename=ingested["filename"],
            latitude=ingested["latitude"],
            longitude=ingested["longitude"]
        )
        
        # Override response scene details to mark it as representative imagery sourced from Bhuvan
        result.vegetation_health_disclaimer = (
            f"ISRO Bhuvan Representative Imagery ({ingested['satellite']} - {ingested['sensor']}). "
            f"Bands processed: {', '.join(ingested['bands_downloaded'])}."
        )
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Bhuvan ingestion or analysis failed: {str(e)}"
        )
