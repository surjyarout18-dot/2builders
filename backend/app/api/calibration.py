import math
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Project
from ..schemas import CalibrationRequest, CalibrationResponse
from ..services.geometry_engine import CoordinateSystem

router = APIRouter(prefix="/api/projects", tags=["calibration"])

@router.post("/{project_id}/calibrate", response_model=CalibrationResponse)
def calibrate_scale(project_id: str, payload: CalibrationRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    p1 = payload.point1
    p2 = payload.point2
    pixel_dist = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
    if pixel_dist < 1e-4:
        raise HTTPException(status_code=400, detail="Calibration points cannot be the same position.")

    if payload.realDistance <= 0:
        raise HTTPException(status_code=400, detail="Real distance must be greater than zero.")

    # Calculate scale: real units per pixel
    scale = CoordinateSystem.calculate_scale((p1[0], p1[1]), (p2[0], p2[1]), payload.realDistance, payload.unit)

    project.scale = scale
    project.unit = payload.unit
    
    settings = dict(project.settings or {})
    settings["calibration"] = {
        "point1": p1,
        "point2": p2,
        "pixelDistance": round(pixel_dist, 2),
        "realDistance": payload.realDistance,
        "unit": payload.unit,
        "scale": scale
    }
    project.settings = settings

    db.commit()
    db.refresh(project)

    return {
        "pixelDistance": round(pixel_dist, 2),
        "realDistance": payload.realDistance,
        "unit": payload.unit,
        "scale": scale,
        "message": f"Calibrated scale: 1 pixel = {scale:.6f} {payload.unit} ({pixel_dist:.1f}px = {payload.realDistance} {payload.unit})"
    }

