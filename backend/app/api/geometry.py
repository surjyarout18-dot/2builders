from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Project, Floor, Wall, Opening, Room, StructuralObject
from ..schemas import FloorBase, GeometryValidationReport
from ..services.geometry_engine import GeometryValidator
from .projects import serialize_project

router = APIRouter(prefix="/api/projects", tags=["geometry"])

class GeometrySyncPayload(BaseModel):
    floors: List[FloorBase]

@router.get("/{project_id}/geometry")
def get_geometry(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    serialized = serialize_project(project)
    return {
        "projectId": project.id,
        "unit": project.unit,
        "scale": project.scale,
        "floors": serialized["floors"]
    }

@router.post("/{project_id}/geometry")
def save_geometry(project_id: str, payload: GeometrySyncPayload, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    floors_raw = [f.model_dump() for f in payload.floors]
    validation_report = GeometryValidator.validate_building(floors_raw)

    # Re-sync project floors, walls, openings, rooms
    floor_ids = [f.id for f in project.floors]
    if floor_ids:
        wall_ids = [w.id for w in db.query(Wall).filter(Wall.floor_id.in_(floor_ids)).all()]
        if wall_ids:
            db.query(Opening).filter(Opening.wall_id.in_(wall_ids)).delete(synchronize_session=False)
        db.query(Wall).filter(Wall.floor_id.in_(floor_ids)).delete(synchronize_session=False)
        db.query(Room).filter(Room.floor_id.in_(floor_ids)).delete(synchronize_session=False)
        db.query(StructuralObject).filter(StructuralObject.floor_id.in_(floor_ids)).delete(synchronize_session=False)
        db.query(Floor).filter(Floor.project_id == project.id).delete(synchronize_session=False)
        db.commit()

    import uuid

    for idx, floor_data in enumerate(payload.floors):
        new_floor = Floor(
            id=floor_data.id,
            project_id=project.id,
            name=floor_data.name,
            elevation=floor_data.elevation,
            wall_height=floor_data.wallHeight,
            order_index=floor_data.order_index if floor_data.order_index is not None else idx
        )
        db.add(new_floor)
        db.flush()

        for w in floor_data.walls:
            wid = w.id or str(uuid.uuid4())
            if db.query(Wall).filter(Wall.id == wid).first():
                wid = f"{wid}_{uuid.uuid4().hex[:6]}"

            new_wall = Wall(
                id=wid,
                floor_id=new_floor.id,
                start_x=w.start[0],
                start_y=w.start[1],
                end_x=w.end[0],
                end_y=w.end[1],
                thickness=w.thickness,
                height=w.height,
                wall_type=w.type,
                layer=w.layer or "WALLS",
                material=w.material or "default"
            )
            db.add(new_wall)
            db.flush()

            for op in w.openings:
                op_id = op.id or str(uuid.uuid4())
                if db.query(Opening).filter(Opening.id == op_id).first():
                    op_id = f"{op_id}_{uuid.uuid4().hex[:6]}"

                new_op = Opening(
                    id=op_id,
                    wall_id=new_wall.id,
                    type=op.type,
                    offset=op.offset,
                    width=op.width,
                    height=op.height,
                    sill_height=op.sillHeight
                )
                db.add(new_op)

        for r in floor_data.rooms:
            rid = r.id or str(uuid.uuid4())
            if db.query(Room).filter(Room.id == rid).first():
                rid = f"{rid}_{uuid.uuid4().hex[:6]}"

            new_room = Room(
                id=rid,
                floor_id=new_floor.id,
                name=r.name,
                boundary=r.boundary,
                area=r.area
            )
            db.add(new_room)

        for s in floor_data.structuralObjects:
            sid = s.id or str(uuid.uuid4())
            if db.query(StructuralObject).filter(StructuralObject.id == sid).first():
                sid = f"{sid}_{uuid.uuid4().hex[:6]}"

            new_so = StructuralObject(
                id=sid,
                floor_id=new_floor.id,
                type=s.type,
                geometry=s.geometry,
                properties=s.properties
            )
            db.add(new_so)

    db.commit()
    db.refresh(project)

    return {
        "success": True,
        "validation": validation_report,
        "project": serialize_project(project)
    }

@router.post("/{project_id}/validate", response_model=GeometryValidationReport)
def validate_geometry(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    serialized = serialize_project(project)
    report = GeometryValidator.validate_building(serialized["floors"])
    return report
