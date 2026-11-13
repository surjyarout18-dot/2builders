"""
FastAPI REST Endpoints for Sketch2Space.
Handles projects, uploads, CV analysis, scale calibration, geometry persistence, and multi-format exports.
"""
import uuid
import time
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Response
from pydantic import BaseModel
from backend.app.schemas import (
    ArchitecturalModel, FloorSchema, ScaleCalibrationSchema, BuildingSchema, PointXZ
)
from backend.app.ai_engine.pipeline import process_floor_plan
from backend.app.geometry_engine.glb_exporter import export_model_to_glb, export_model_to_obj

router = APIRouter(prefix="/api/v1")

# In-memory storage for projects, uploaded files, and models
PROJECTS_DB: Dict[str, Dict[str, Any]] = {}
FILES_DB: Dict[str, bytes] = {}
MODELS_DB: Dict[str, ArchitecturalModel] = {}

class CreateProjectRequest(BaseModel):
    name: str = "New Architectural Project"
    description: Optional[str] = "Uploaded floor plan conversion"

class CalibrateRequest(BaseModel):
    pixel_distance: float
    real_meters: float

class AnalyzeRequest(BaseModel):
    scale_meters_per_pixel: Optional[float] = 0.02

class AssistantChatRequest(BaseModel):
    project_id: str
    prompt: str

@router.post("/projects")
def create_project(req: CreateProjectRequest) -> Dict[str, Any]:
    project_id = f"proj_{uuid.uuid4().hex[:8]}"
    now = int(time.time())
    proj = {
        "id": project_id,
        "name": req.name,
        "description": req.description,
        "created_at": now,
        "updated_at": now,
        "status": "created",
        "has_image": False,
        "has_model": False
    }
    PROJECTS_DB[project_id] = proj

    # Create empty initial model
    empty_model = ArchitecturalModel(
        project_id=project_id,
        name=req.name,
        units="meters",
        building=BuildingSchema(total_floors=1, default_height=2.80),
        floors=[FloorSchema()]
    )
    MODELS_DB[project_id] = empty_model
    return proj

@router.get("/projects")
def list_projects() -> List[Dict[str, Any]]:
    return list(PROJECTS_DB.values())

@router.get("/projects/{project_id}")
def get_project(project_id: str) -> Dict[str, Any]:
    if project_id not in PROJECTS_DB:
        raise HTTPException(status_code=404, detail="Project not found")
    return PROJECTS_DB[project_id]

@router.post("/projects/{project_id}/upload")
async def upload_floorplan_image(project_id: str, file: UploadFile = File(...)) -> Dict[str, Any]:
    if project_id not in PROJECTS_DB:
        raise HTTPException(status_code=404, detail="Project not found")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    FILES_DB[project_id] = content
    PROJECTS_DB[project_id]["has_image"] = True
    PROJECTS_DB[project_id]["status"] = "uploaded"
    PROJECTS_DB[project_id]["updated_at"] = int(time.time())
    PROJECTS_DB[project_id]["filename"] = file.filename

    return {
        "project_id": project_id,
        "filename": file.filename,
        "status": "uploaded",
        "bytes_received": len(content)
    }

@router.post("/projects/{project_id}/analyze")
def analyze_floorplan(project_id: str, req: AnalyzeRequest) -> ArchitecturalModel:
    if project_id not in PROJECTS_DB:
        raise HTTPException(status_code=404, detail="Project not found")
    if project_id not in FILES_DB:
        raise HTTPException(status_code=400, detail="No floor plan image has been uploaded for this project")

    image_bytes = FILES_DB[project_id]
    scale = req.scale_meters_per_pixel if req.scale_meters_per_pixel else 0.02
    
    # Execute CV & geometry extraction
    model = process_floor_plan(
        image_bytes=image_bytes,
        scale_meters_per_pixel=scale,
        project_id=project_id,
        project_name=PROJECTS_DB[project_id]["name"]
    )

    MODELS_DB[project_id] = model
    PROJECTS_DB[project_id]["has_model"] = True
    PROJECTS_DB[project_id]["status"] = "analyzed"
    PROJECTS_DB[project_id]["updated_at"] = int(time.time())

    return model

@router.post("/projects/{project_id}/calibrate")
def calibrate_scale(project_id: str, req: CalibrateRequest) -> Dict[str, Any]:
    if project_id not in PROJECTS_DB:
        raise HTTPException(status_code=404, detail="Project not found")
    if req.pixel_distance <= 0 or req.real_meters <= 0:
        raise HTTPException(status_code=400, detail="Calibration values must be positive non-zero numbers")

    new_scale = req.real_meters / req.pixel_distance

    if project_id in MODELS_DB:
        model = MODELS_DB[project_id]
        old_scale = model.calibration.meters_per_pixel
        ratio = new_scale / old_scale if old_scale > 0 else 1.0

        # Rescale all wall and room coordinates
        for fl in model.floors:
            for w in fl.walls:
                w.start.x = round(w.start.x * ratio, 3)
                w.start.z = round(w.start.z * ratio, 3)
                w.end.x = round(w.end.x * ratio, 3)
                w.end.z = round(w.end.z * ratio, 3)
            for d in fl.doors:
                d.position.x = round(d.position.x * ratio, 3)
                d.position.z = round(d.position.z * ratio, 3)
            for win in fl.windows:
                win.position.x = round(win.position.x * ratio, 3)
                win.position.z = round(win.position.z * ratio, 3)
            for rm in fl.rooms:
                for pt in rm.polygon:
                    pt.x = round(pt.x * ratio, 3)
                    pt.z = round(pt.z * ratio, 3)
                rm.area_sqm = round(rm.area_sqm * (ratio ** 2), 2)
                rm.area_sqft = round(rm.area_sqm * 10.7639, 1)

        model.calibration.pixel_distance = req.pixel_distance
        model.calibration.real_meters = req.real_meters
        model.calibration.meters_per_pixel = new_scale
        model.calibration.is_calibrated = True

    return {
        "project_id": project_id,
        "pixel_distance": req.pixel_distance,
        "real_meters": req.real_meters,
        "meters_per_pixel": new_scale,
        "status": "calibrated"
    }

@router.get("/projects/{project_id}/model")
def get_model(project_id: str) -> ArchitecturalModel:
    if project_id not in MODELS_DB:
        raise HTTPException(status_code=404, detail="Model not found")
    return MODELS_DB[project_id]

@router.put("/projects/{project_id}/model")
def update_model(project_id: str, updated_model: ArchitecturalModel) -> ArchitecturalModel:
    if project_id not in PROJECTS_DB:
        raise HTTPException(status_code=404, detail="Project not found")
    MODELS_DB[project_id] = updated_model
    PROJECTS_DB[project_id]["updated_at"] = int(time.time())
    return updated_model

@router.get("/projects/{project_id}/export/{fmt}")
def export_project(project_id: str, fmt: str):
    if project_id not in MODELS_DB:
        raise HTTPException(status_code=404, detail="Project model not found")

    model = MODELS_DB[project_id]
    fl = model.floors[0] if model.floors else FloorSchema()

    format_lower = fmt.lower()
    if format_lower == "glb":
        glb_data = export_model_to_glb(fl.walls, fl.rooms, fl.doors, fl.windows)
        return Response(
            content=glb_data,
            media_type="model/gltf-binary",
            headers={"Content-Disposition": f'attachment; filename="{model.name.replace(" ", "_")}.glb"'}
        )
    elif format_lower == "obj":
        obj_text = export_model_to_obj(fl.walls, fl.rooms, fl.doors, fl.windows)
        return Response(
            content=obj_text,
            media_type="text/plain",
            headers={"Content-Disposition": f'attachment; filename="{model.name.replace(" ", "_")}.obj"'}
        )
    elif format_lower == "dxf":
        # Generate AutoCAD 2D DXF
        dxf_lines = [
            "0", "SECTION", "2", "ENTITIES"
        ]
        for w in fl.walls:
            dxf_lines.extend([
                "0", "LINE",
                "8", "WALLS",
                "10", f"{w.start.x:.3f}",
                "20", f"{w.start.z:.3f}",
                "30", "0.0",
                "11", f"{w.end.x:.3f}",
                "21", f"{w.end.z:.3f}",
                "31", "0.0"
            ])
        dxf_lines.extend(["0", "ENDSEC", "0", "EOF"])
        dxf_text = "\n".join(dxf_lines)
        return Response(
            content=dxf_text,
            media_type="application/dxf",
            headers={"Content-Disposition": f'attachment; filename="{model.name.replace(" ", "_")}.dxf"'}
        )
    elif format_lower == "svg":
        # Generate 2D Vector SVG
        min_x = min([w.start.x for w in fl.walls] + [w.end.x for w in fl.walls] + [0.0])
        max_x = max([w.start.x for w in fl.walls] + [w.end.x for w in fl.walls] + [10.0])
        min_z = min([w.start.z for w in fl.walls] + [w.end.z for w in fl.walls] + [0.0])
        max_z = max([w.start.z for w in fl.walls] + [w.end.z for w in fl.walls] + [10.0])
        width = max(1.0, max_x - min_x)
        height = max(1.0, max_z - min_z)
        scale = 50.0 # 50px per meter in SVG

        svg_parts = [
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width * scale + 40} {height * scale + 40}" width="800" height="600" style="background:#0A0D14">',
            f'<g transform="translate(20, 20)">'
        ]
        # Rooms
        for rm in fl.rooms:
            if len(rm.polygon) >= 3:
                pts = " ".join([f"{(pt.x - min_x) * scale},{(pt.z - min_z) * scale}" for pt in rm.polygon])
                svg_parts.append(f'<polygon points="{pts}" fill="#161F33" stroke="#00F0FF" stroke-width="1" opacity="0.6"/>')
        # Walls
        for w in fl.walls:
            x1 = (w.start.x - min_x) * scale
            y1 = (w.start.z - min_z) * scale
            x2 = (w.end.x - min_x) * scale
            y2 = (w.end.z - min_z) * scale
            thickness = max(2.0, w.thickness * scale)
            svg_parts.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#E2E8F0" stroke-width="{thickness}" stroke-linecap="square"/>')
        svg_parts.append('</g></svg>')
        return Response(content="".join(svg_parts), media_type="image/svg+xml")
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported export format '{fmt}'. Available: glb, obj, dxf, svg")

@router.post("/assistant/chat")
def assistant_chat(req: AssistantChatRequest) -> Dict[str, Any]:
    """
    Intelligent AI architectural query assistant.
    Provides answers about floor area, wall counts, room dimensions, and design suggestions.
    """
    model = MODELS_DB.get(req.project_id)
    prompt_lower = req.prompt.lower()

    if not model:
        return {"response": "I cannot find the active architectural project. Please create or load a project first."}

    fl = model.floors[0] if model.floors else FloorSchema()
    total_area_sqm = sum(r.area_sqm for r in fl.rooms)
    total_area_sqft = total_area_sqm * 10.7639
    wall_count = len(fl.walls)
    room_count = len(fl.rooms)
    door_count = len(fl.doors)
    window_count = len(fl.windows)

    if "wall" in prompt_lower and ("count" in prompt_lower or "how many" in prompt_lower):
        reply = f"This floor plan contains {wall_count} structural walls ({len([w for w in fl.walls if w.wall_type == 'exterior'])} exterior and {len([w for w in fl.walls if w.wall_type != 'exterior'])} interior)."
    elif "area" in prompt_lower or "size" in prompt_lower or "square" in prompt_lower:
        reply = f"The total measured living area is {total_area_sqm:.1f} m² ({total_area_sqft:.1f} sq ft) across {room_count} detected rooms."
    elif "room" in prompt_lower or "bedroom" in prompt_lower:
        room_list = ", ".join([f"{r.name} ({r.area_sqm:.1f} m²)" for r in fl.rooms])
        reply = f"The layout includes {room_count} rooms: {room_list if room_list else 'No rooms partitioned yet.'}"
    elif "door" in prompt_lower or "window" in prompt_lower:
        reply = f"There are {door_count} doors and {window_count} windows detected and attached to structural walls."
    elif "suggest" in prompt_lower or "recommend" in prompt_lower or "furniture" in prompt_lower:
        reply = "Architectural Recommendation: For the Living Room, placing an L-shaped sofa opposite the main wall preserves a 1.2m open walking corridor. For bedrooms, orienting the bed with side clearance maximizes natural ventilation from the exterior windows."
    else:
        reply = f"Project '{model.name}' summary: {room_count} rooms, {wall_count} walls, {total_area_sqm:.1f} m² living area. You can edit any element in the 2D CAD canvas or inspect the 3D model."

    return {
        "project_id": req.project_id,
        "prompt": req.prompt,
        "response": reply
    }
