import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from backend.db.database import Base

class AnalysisRecord(Base):
    __tablename__ = "analysis_records"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    mode = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    image_reference = Column(String, nullable=True)
    
    # Computed metrics
    water_coverage_percent = Column(Float, nullable=True)
    vegetation_index_score = Column(Float, nullable=True)
    urban_density_percent = Column(Float, nullable=True)
    risk_level = Column(String, nullable=True)
