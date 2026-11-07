import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
import uuid
import shutil
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Project, SourceFile, Floor, Wall, Opening, Room, StructuralObject
from ..schemas import ProjectCreate, ProjectUpdate, ProjectResponse
from ..services.geometry_engine import DXFProcessor, RasterProcessor, ShoelaceArea

router = APIRouter(prefix="/api/projects", tags=["projects"])

def serialize_project(project: Project) -> dict:
    floors_data = []
    for f in sorted(project.floors, key=lambda x: x.order_index):
        walls_data = []
        for w in f.walls:
            openings_data = [
                {
                    "id": op.id,
                    "wallId": op.wall_id,
                    "type": op.type,
                    "offset": op.offset,
                    "width": op.width,
                    "height": op.height,
                    "sillHeight": op.sill_height
                }
                for op in w.openings
            ]
            walls_data.append({
                "id": w.id,
                "start": [w.start_x, w.start_y],
                "end": [w.end_x, w.end_y],
                "thickness": w.thickness,
                "height": w.height,
                "type": w.wall_type,
                "layer": w.layer,
                "material": w.material,
                "openings": openings_data
            })
        
        rooms_data = [
            {
                "id": r.id,
                "name": r.name,
                "boundary": r.boundary or [],
                "area": r.area
            }
            for r in f.rooms
        ]

        struct_data = [
            {
                "id": s.id,
                "type": s.type,
                "geometry": s.geometry or {},
                "properties": s.properties or {}
            }
            for s in f.structural_objects
        ]

        floors_data.append({
            "id": f.id,
            "name": f.name,
            "elevation": f.elevation,
            "wallHeight": f.wall_height,
            "order_index": f.order_index,
            "walls": walls_data,
            "rooms": rooms_data,
            "structuralObjects": struct_data
        })

    sources_data = [
        {
            "id": sf.id,
            "filename": sf.filename,
            "format": sf.format,
            "file_path": sf.file_path,
            "file_size": sf.file_size,
            "metadata_json": sf.metadata_json or {},
            "created_at": sf.created_at
        }
        for sf in project.source_files
    ]

    return {
        "id": project.id,
        "name": project.name,
        "unit": project.unit,
        "scale": project.scale,
        "settings": project.settings or {},
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "floors": floors_data,
        "sourceFiles": sources_data
    }

@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(
        name=payload.name,
        unit=payload.unit,
        scale=payload.scale,
        settings=payload.settings
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Initialize default Floor 1
    default_floor = Floor(
        project_id=project.id,
        name="Ground Floor",
        elevation=0.0,
        wall_height=3.0,
        order_index=0
    )
    db.add(default_floor)
    db.commit()
    db.refresh(project)

    return serialize_project(project)

@router.get("", response_model=List[dict])
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).order_by(Project.updated_at.desc()).all()
    return [serialize_project(p) for p in projects]

@router.get("/{project_id}", response_model=dict)
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return serialize_project(project)

@router.patch("/{project_id}", response_model=dict)
def update_project(project_id: str, payload: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.name is not None:
        project.name = payload.name
    if payload.unit is not None:
        project.unit = payload.unit
    if payload.scale is not None:
        project.scale = payload.scale
    if payload.settings is not None:
        merged = dict(project.settings or {})
        merged.update(payload.settings)
        project.settings = merged

    db.commit()
    db.refresh(project)
    return serialize_project(project)

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return None

@router.post("/convert-floorplan")
def convert_floorplan(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    unit: str = Form("meters"),
    realWidth: Optional[float] = Form(None),
    realHeight: Optional[float] = Form(None),
    db: Session = Depends(get_db)
):
    """
    1-Click Floor Plan to 3D Model:
    Uploads drawing, runs deterministic extraction, constructs walls & rooms, and generates 3D building.
    """
    upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
    os.makedirs(upload_dir, exist_ok=True)

    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1].lower()
    dest_path = os.path.join(upload_dir, f"{file_id}_{file.filename}")

    contents = file.file.read()
    with open(dest_path, "wb") as buffer:
        buffer.write(contents)

    fmt = ext.lstrip(".")
    proj_name = name or os.path.splitext(file.filename)[0].replace("_", " ").title()

    # Determine scale
    scale = 0.0125
    extracted_walls = []
    extracted_rooms = []

    if fmt == "dxf":
        dxf_res = DXFProcessor.parse_dxf(dest_path, scale=1.0)
        bounds = dxf_res.get("bounds", {})
        dx = bounds.get("max", [10, 10])[0] - bounds.get("min", [0, 0])[0]
        if dx > 100:  # in mm
            scale = 0.001
        extracted_walls = DXFProcessor.parse_dxf(dest_path, scale=scale).get("walls", [])

    elif fmt in ("png", "jpg", "jpeg", "pdf"):
        image_to_process = dest_path
        if fmt == "pdf":
            import fitz
            doc = fitz.open(dest_path)
            if len(doc) > 0:
                page = doc.load_page(0)
                pix = page.get_pixmap(dpi=200)
                image_to_process = dest_path + "_page0.png"
                pix.save(image_to_process)
            doc.close()

        from PIL import Image
        with Image.open(image_to_process) as im:
            img_w, img_h = im.size
        opts = {}
        if realWidth and realWidth > 0:
            opts["realWidth"] = realWidth
        elif realHeight and realHeight > 0:
            opts["realHeight"] = realHeight

        raster_res = RasterProcessor.process_image(image_to_process, scale=scale, options=opts)
        scale = raster_res.get("scale", scale)
        extracted_walls = raster_res.get("walls", [])
        extracted_rooms = raster_res.get("rooms", [])

    project_id = str(uuid.uuid4())
    project = Project(
        id=project_id,
        name=proj_name,
        unit=unit,
        scale=scale,
        settings={"uploadedFile": file.filename, "extractedWalls": len(extracted_walls)}
    )
    db.add(project)

    source_file = SourceFile(
        id=file_id,
        project_id=project_id,
        filename=file.filename,
        format=fmt,
        file_path=dest_path,
        file_size=os.path.getsize(dest_path),
        metadata_json={"format": fmt, "scale": scale}
    )
    db.add(source_file)

    floor = Floor(
        id=str(uuid.uuid4()),
        project_id=project_id,
        name="Ground Floor",
        elevation=0.0,
        wall_height=3.0,
        order_index=0
    )
    db.add(floor)
    db.flush()

    for w in extracted_walls:
        wall = Wall(
            id=f"w-{uuid.uuid4().hex[:8]}",
            floor_id=floor.id,
            start_x=w["start"][0],
            start_y=w["start"][1],
            end_x=w["end"][0],
            end_y=w["end"][1],
            thickness=w.get("thickness", 0.20),
            height=w.get("height", 3.0),
            wall_type=w.get("type", "external")
        )
        db.add(wall)

    for r in extracted_rooms:
        room = Room(
            id=f"r-{uuid.uuid4().hex[:8]}",
            floor_id=floor.id,
            name=r.get("name", "Room"),
            boundary=r.get("boundary", []),
            area=r.get("area", 0.0)
        )
        db.add(room)

    db.commit()
    db.refresh(project)

    return serialize_project(project)


