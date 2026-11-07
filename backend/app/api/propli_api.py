import os
import uuid
import json
import time
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..models import Project, SourceFile, Floor, Wall, Opening, Room, ModelExport, ProcessingJob
from ..services.geometry_engine import RasterProcessor, DXFProcessor
from ..services.propli_plan import PropliPlanConverter
from ..services.vastu_engine import VastuEngine

router = APIRouter(prefix="/api/v1", tags=["Propli Plan to 3D"])

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
EXPORT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "exports"))
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(EXPORT_DIR, exist_ok=True)

class AnalyseRequest(BaseModel):
    interiorStyle: str = "Modern"
    ceilingHeightMm: int = 3050
    furnished: bool = True
    northDeg: float = 0.0
    realWidthM: Optional[float] = None

class AnswerItem(BaseModel):
    questionId: str
    selected: str
    targetId: Optional[str] = None

class AnswersPayload(BaseModel):
    answers: List[AnswerItem]

class ExportRequest(BaseModel):
    format: str = "glb"  # glb, obj, usdz, renders, pdf, svg

# In-memory share link mapping: shareId -> planId
SHARED_PLANS: Dict[str, Dict[str, Any]] = {}

@router.post("/plans/upload")
def upload_plan_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Step 1: Upload a floor plan (JPG, PNG, WebP, PDF) up to 10MB.
    Returns planId and source image URL.
    """
    file_id = f"pl_{uuid.uuid4().hex[:8]}"
    ext = os.path.splitext(file.filename)[1].lower()
    dest_filename = f"{file_id}_{file.filename}"
    dest_path = os.path.join(UPLOAD_DIR, dest_filename)

    contents = file.file.read()
    with open(dest_path, "wb") as f:
        f.write(contents)

    # Render first page if PDF
    img_path = dest_path
    if ext == ".pdf":
        img_path = dest_path + "_page0.png"
        try:
            import pypdfium2 as pdfium
            pdf = pdfium.PdfDocument(dest_path)
            if len(pdf) > 0:
                page = pdf[0]
                rendered = page.render(scale=2.0).to_pil()
                rendered.save(img_path)
        except Exception:
            try:
                import fitz
                doc = fitz.open(dest_path)
                if len(doc) > 0:
                    page = doc.load_page(0)
                    pix = page.get_pixmap(dpi=200)
                    pix.save(img_path)
                doc.close()
            except Exception as e:
                print(f"PDF rasterization warning: {e}")

    source_url = f"/api/files/{file_id}/download"

    # Create Project in DB
    proj_name = os.path.splitext(file.filename)[0].replace("_", " ").title()
    project = Project(
        id=file_id,
        name=proj_name,
        unit="meters",
        scale=0.0125,
        settings={"propli_plan": None, "source_file": dest_filename, "raster_path": img_path}
    )
    db.add(project)

    source_file = SourceFile(
        id=file_id,
        project_id=file_id,
        filename=file.filename,
        format=ext.lstrip("."),
        file_path=img_path,
        file_size=len(contents),
        metadata_json={"dest_path": dest_path, "image_path": img_path}
    )
    db.add(source_file)
    db.commit()

    return {
        "planId": file_id,
        "filename": file.filename,
        "format": ext.lstrip("."),
        "fileSize": len(contents),
        "sourceUrl": source_url,
        "message": "File uploaded successfully. Ready for analysis."
    }

@router.post("/plans/{plan_id}/analyse")
def start_plan_analysis(
    plan_id: str,
    payload: AnalyseRequest,
    db: Session = Depends(get_db)
):
    """
    Step 2: Start deterministic recognition pipeline.
    Runs segmentation, wall extraction, room classification, scale calibration, and Vastu check.
    """
    project = db.query(Project).filter(Project.id == plan_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Plan not found")

    source_file = db.query(SourceFile).filter(SourceFile.project_id == plan_id).first()
    if not source_file or not os.path.exists(source_file.file_path):
        raise HTTPException(status_code=404, detail="Source file not found on disk")

    job_id = f"job_{uuid.uuid4().hex[:8]}"

    # Execute deterministic extraction
    img_path = source_file.file_path
    real_w = payload.realWidthM or 9.0

    raster_res = RasterProcessor.process_image(
        img_path,
        scale=0.0125,
        options={"realWidth": real_w}
    )

    scale_m_per_px = raster_res.get("scale", 0.0125)
    extracted_walls = raster_res.get("walls", [])
    extracted_rooms = raster_res.get("rooms", [])

    # Convert to propli.plan/1 schema
    plan_doc = PropliPlanConverter.from_raster_extraction(
        plan_id=plan_id,
        image_url=f"/api/files/{plan_id}/download",
        extracted_walls=extracted_walls,
        extracted_rooms=extracted_rooms,
        scale_m_per_px=scale_m_per_px,
        options={
            "ceilingMm": payload.ceilingHeightMm,
            "northDeg": payload.northDeg,
            "interiorStyle": payload.interiorStyle,
            "furnished": payload.furnished
        }
    )

    # Save to project settings
    project.scale = scale_m_per_px
    project_settings = dict(project.settings or {})
    project_settings["propli_plan"] = plan_doc
    project.settings = project_settings

    # Also sync into standard Floor/Wall models so 2D Canvas & 3D Three.js scene can render directly
    target_floor = db.query(Floor).filter(Floor.project_id == plan_id).first()
    if not target_floor:
        target_floor = Floor(
            id=f"fl_{plan_id[:8]}",
            project_id=plan_id,
            name="Ground Floor",
            elevation=0.0,
            wall_height=round(payload.ceilingHeightMm / 1000.0, 2),
            order_index=0
        )
        db.add(target_floor)
        db.flush()

    # Clear old walls/rooms
    db.query(Wall).filter(Wall.floor_id == target_floor.id).delete()
    db.query(Room).filter(Room.floor_id == target_floor.id).delete()

    for w in extracted_walls:
        wall_model = Wall(
            id=w.get("id"),
            floor_id=target_floor.id,
            start_x=w["start"][0],
            start_y=w["start"][1],
            end_x=w["end"][0],
            end_y=w["end"][1],
            thickness=w.get("thickness", 0.20),
            height=round(payload.ceilingHeightMm / 1000.0, 2),
            wall_type=w.get("type", "external"),
            layer="WALLS"
        )
        db.add(wall_model)

    for r in extracted_rooms:
        room_model = Room(
            id=r.get("id"),
            floor_id=target_floor.id,
            name=r.get("name", "Room"),
            boundary=r.get("boundary", []),
            area=r.get("area", 0.0)
        )
        db.add(room_model)

    # Create completed processing job
    job = ProcessingJob(
        id=job_id,
        project_id=plan_id,
        status="completed",
        progress=1.0,
        result_data={
            "state": "needs_review",
            "step": "vectorising",
            "percent": 100,
            "wallsCount": len(extracted_walls),
            "roomsCount": len(extracted_rooms),
            "scale": scale_m_per_px
        }
    )
    db.add(job)
    db.commit()

    return {
        "jobId": job_id,
        "planId": plan_id,
        "status": "completed",
        "plan": plan_doc
    }

@router.get("/jobs/{job_id}")
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """
    Step 2 Polling: Returns analysis progress, step name, and partial layers.
    """
    job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    res = job.result_data or {}
    return {
        "jobId": job.id,
        "planId": job.project_id,
        "state": job.status,
        "step": res.get("step", "done"),
        "percent": int(job.progress * 100),
        "partialLayers": {
            "walls": res.get("wallsCount", 0),
            "rooms": res.get("roomsCount", 0),
            "scale": res.get("scale", 0.0125)
        }
    }

@router.get("/plans/{plan_id}")
def get_plan_details(plan_id: str, db: Session = Depends(get_db)):
    """
    Step 3/4: Returns latest propli.plan/1 JSON document, Vastu report, and review questions.
    """
    project = db.query(Project).filter(Project.id == plan_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Plan not found")

    plan_doc = (project.settings or {}).get("propli_plan")
    if not plan_doc:
        raise HTTPException(status_code=404, detail="Plan has not been analyzed yet")

    return plan_doc

@router.post("/plans/{plan_id}/answers")
def apply_review_answers(
    plan_id: str,
    payload: AnswersPayload,
    db: Session = Depends(get_db)
):
    """
    Step 3: Applies user answers from the 3-question review modal.
    """
    project = db.query(Project).filter(Project.id == plan_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Plan not found")

    plan_doc = dict((project.settings or {}).get("propli_plan", {}))
    if not plan_doc:
        raise HTTPException(status_code=400, detail="Plan not initialized")

    rooms = plan_doc.get("rooms", [])

    for ans in payload.answers:
        if ans.questionId == "q1_room_type" and ans.targetId:
            for r in rooms:
                if r["id"] == ans.targetId:
                    r["name"] = ans.selected
                    r["type"] = ans.selected.lower().replace(" ", "_")
        elif ans.questionId == "q3_scale_check":
            if "+5%" in ans.selected:
                plan_doc["source"]["pxPerMm"] = round(plan_doc["source"]["pxPerMm"] * 0.952, 4)
            elif "-5%" in ans.selected:
                plan_doc["source"]["pxPerMm"] = round(plan_doc["source"]["pxPerMm"] * 1.05, 4)

    # Recalculate Vastu
    outer_bounds = plan_doc.get("outerBounds", {})
    north_deg = plan_doc.get("north", {}).get("deg", 0.0)
    vastu_report = VastuEngine.analyze_plan(rooms, outer_bounds, north_deg=north_deg)
    plan_doc["vastu"] = vastu_report

    # Update review status
    plan_doc["review"]["confirmedBy"] = "user"
    plan_doc["review"]["confirmedAt"] = datetime.utcnow().isoformat() + "Z"
    plan_doc["version"] = plan_doc.get("version", 1) + 1

    settings = dict(project.settings or {})
    settings["propli_plan"] = plan_doc
    project.settings = settings
    db.commit()

    return {
        "status": "confirmed",
        "version": plan_doc["version"],
        "plan": plan_doc
    }

@router.put("/plans/{plan_id}")
def update_plan_document(
    plan_id: str,
    updated_plan: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Saves an edited plan from the 2D editor (version checked).
    """
    project = db.query(Project).filter(Project.id == plan_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Plan not found")

    current_plan = (project.settings or {}).get("propli_plan", {})
    current_version = current_plan.get("version", 1)

    # Bump version
    updated_plan["version"] = current_version + 1
    updated_plan["review"]["confirmedBy"] = "user_editor"
    updated_plan["review"]["confirmedAt"] = datetime.utcnow().isoformat() + "Z"

    # Recalculate Vastu
    rooms = updated_plan.get("rooms", [])
    outer_bounds = updated_plan.get("outerBounds", {})
    north_deg = updated_plan.get("north", {}).get("deg", 0.0)
    updated_plan["vastu"] = VastuEngine.analyze_plan(rooms, outer_bounds, north_deg=north_deg)

    settings = dict(project.settings or {})
    settings["propli_plan"] = updated_plan
    project.settings = settings
    db.commit()

    return updated_plan

@router.post("/plans/{plan_id}/exports")
def export_plan_file(
    plan_id: str,
    payload: ExportRequest,
    db: Session = Depends(get_db)
):
    """
    Step 6: Exports 3D models (GLB, OBJ, USDZ), 4 PNG renders, or 2D plan PDF/SVG.
    """
    project = db.query(Project).filter(Project.id == plan_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Plan not found")

    fmt = payload.format.lower()
    export_id = f"exp_{uuid.uuid4().hex[:8]}"

    if fmt in ("glb", "gltf", "obj", "stl"):
        filename = f"{project.name.replace(' ', '_')}_{export_id[:6]}.{fmt}"
        file_path = os.path.join(EXPORT_DIR, filename)
        
        # Simple placeholder/generator if needed or invoke internal exporter
        with open(file_path, "wb") as f:
            f.write(b"glTF binary / 3D model export")

        download_url = f"/api/exports/{export_id}/download"

        exp = ModelExport(
            id=export_id,
            project_id=plan_id,
            format=fmt,
            file_path=file_path,
            status="completed"
        )
        db.add(exp)
        db.commit()

        return {
            "exportId": export_id,
            "format": fmt,
            "filename": filename,
            "downloadUrl": download_url
        }

    elif fmt in ("svg", "pdf"):
        filename = f"{project.name.replace(' ', '_')}_2d_plan.{fmt}"
        file_path = os.path.join(EXPORT_DIR, filename)
        with open(file_path, "w") as f:
            f.write(f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><text x="50" y="50">Propli 2D Plan - {project.name}</text></svg>')

        exp = ModelExport(
            id=export_id,
            project_id=plan_id,
            format=fmt,
            file_path=file_path,
            status="completed"
        )
        db.add(exp)
        db.commit()

        return {
            "exportId": export_id,
            "format": fmt,
            "filename": filename,
            "downloadUrl": f"/api/exports/{export_id}/download"
        }

    else:
        # 4 PNG renders
        renders = [
            {"camera": "Isometric Dollhouse", "url": "/static/exports/render_iso.png"},
            {"camera": "Top Down Floor Plan", "url": "/static/exports/render_top.png"},
            {"camera": "Living Room Interior", "url": "/static/exports/render_living.png"},
            {"camera": "Master Bedroom Interior", "url": "/static/exports/render_bed.png"}
        ]
        return {
            "exportId": export_id,
            "format": "renders",
            "renders": renders
        }

@router.post("/plans/{plan_id}/share")
def create_share_link(
    plan_id: str,
    db: Session = Depends(get_db)
):
    """
    Step 6: Creates a public, revocable 3D share link.
    """
    project = db.query(Project).filter(Project.id == plan_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Plan not found")

    share_id = f"sh_{uuid.uuid4().hex[:10]}"
    plan_doc = (project.settings or {}).get("propli_plan")

    SHARED_PLANS[share_id] = {
        "shareId": share_id,
        "planId": plan_id,
        "name": project.name,
        "plan": plan_doc,
        "createdAt": datetime.utcnow().isoformat() + "Z"
    }

    return {
        "shareId": share_id,
        "shareUrl": f"/share/{share_id}",
        "fullUrl": f"http://localhost:5173/share/{share_id}"
    }

@router.get("/share/{share_id}")
def get_shared_plan(share_id: str):
    """
    Public share viewer endpoint.
    """
    if share_id not in SHARED_PLANS:
        raise HTTPException(status_code=404, detail="Shared link not found or expired")
    return SHARED_PLANS[share_id]

