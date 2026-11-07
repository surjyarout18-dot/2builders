import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Project, SourceFile, Floor, Wall, Room
from ..schemas import ExtractionOptions
from ..services.geometry_engine import DXFProcessor, RasterProcessor

router = APIRouter(prefix="/api/projects", tags=["extraction"])

class ExtractRequest(BaseModel):
    fileId: Optional[str] = None
    applyToFloorId: Optional[str] = None
    options: Optional[ExtractionOptions] = None

@router.post("/{project_id}/extract")
def extract_drawing_data(project_id: str, payload: ExtractRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Select file
    if payload.fileId:
        source_file = db.query(SourceFile).filter(SourceFile.id == payload.fileId, SourceFile.project_id == project_id).first()
    else:
        source_file = db.query(SourceFile).filter(SourceFile.project_id == project_id).order_by(SourceFile.created_at.desc()).first()

    if not source_file:
        raise HTTPException(status_code=400, detail="No source file found for this project. Please upload a file first.")

    if not os.path.exists(source_file.file_path):
        raise HTTPException(status_code=404, detail="Source file missing from disk.")

    fmt = source_file.format.lower()
    scale = project.scale if project.scale > 0 else 0.01

    extracted_data = {}
    if fmt == "dxf":
        try:
            extracted_data = DXFProcessor.parse_dxf(source_file.file_path, scale=scale)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"DXF Extraction failed: {str(e)}")
    elif fmt in ("png", "jpg", "jpeg"):
        try:
            opts = payload.options.model_dump() if payload.options else {}
            extracted_data = RasterProcessor.process_image(source_file.file_path, scale=scale, options=opts)
            if "scale" in extracted_data:
                project.scale = extracted_data["scale"]
                db.commit()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Raster Extraction failed: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail=f"Format '{fmt}' extraction directly on server not implemented yet. Supported: DXF, JPG, PNG.")

    # If user provided applyToFloorId, optionally insert the candidate walls into the floor
    if payload.applyToFloorId:
        target_floor = db.query(Floor).filter(Floor.id == payload.applyToFloorId, Floor.project_id == project_id).first()
        if target_floor:
            # Clear old walls if overwriting or append
            for w in extracted_data.get("walls", []):
                wall_model = Wall(
                    id=w.get("id"),
                    floor_id=target_floor.id,
                    start_x=w["start"][0],
                    start_y=w["start"][1],
                    end_x=w["end"][0],
                    end_y=w["end"][1],
                    thickness=w.get("thickness", 0.20),
                    height=w.get("height", 3.0),
                    wall_type=w.get("type", "external"),
                    layer=w.get("layer", "EXTRACTED")
                )
                db.add(wall_model)

            for r in extracted_data.get("rooms", []):
                room_model = Room(
                    id=r.get("id"),
                    floor_id=target_floor.id,
                    name=r.get("name", "Room"),
                    boundary=r.get("boundary", []),
                    area=r.get("area", 0.0)
                )
                db.add(room_model)

            db.commit()
            db.refresh(project)

    return {
        "sourceFileId": source_file.id,
        "format": fmt,
        "scale": scale,
        "wallsExtracted": len(extracted_data.get("walls", [])),
        "roomsExtracted": len(extracted_data.get("rooms", [])),
        "data": extracted_data
    }
