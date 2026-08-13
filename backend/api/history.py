from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.db.database import get_db
from backend.db.models import AnalysisRecord
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api", tags=["History"])

class HistoryRecordSchema(BaseModel):
    id: int
    timestamp: datetime
    mode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_reference: Optional[str] = None
    
    # Computed metrics
    water_coverage_percent: Optional[float] = None
    vegetation_index_score: Optional[float] = None
    urban_density_percent: Optional[float] = None
    risk_level: Optional[str] = None

    class Config:
        from_attributes = True

@router.get("/history", response_model=List[HistoryRecordSchema])
def get_history(db: Session = Depends(get_db)):
    """
    GET /api/history
    Returns the last 20 analysis records from the database.
    """
    records = db.query(AnalysisRecord).order_by(AnalysisRecord.id.desc()).limit(20).all()
    return records
