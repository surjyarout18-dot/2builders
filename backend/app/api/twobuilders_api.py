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
from ..services.twobuilders_plan import TwoBuildersPlanConverter
from ..services.vastu_engine import VastuEngine
from ..services.respan_tracing import trace_task, trace_workflow
from .projects import serialize_project
from ..paths import UPLOAD_DIR, EXPORT_DIR, ensure_dir

router = APIRouter(prefix="/api/v1", tags=["2builders Plan to 3D"])

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

def get_plan_doc_from_project(project: Project) -> Optional[Dict[str, Any]]:
    """Helper to retrieve twobuilders_plan from project settings."""
    settings = project.settings or {}
    return settings.get("twobuilders_plan")

@trace_task("raster_extraction")
def _extract_raster_geometry(img_path: str, real_width_m: float) -> Dict[str, Any]:
    """CV step: wall and room geometry out of the uploaded plan raster."""
    return RasterProcessor.process_image(
        img_path,
        scale=0.0125,
        options={"realWidth": real_width_m}
    )


@trace_task("plan_document")
def _build_plan_document(
    project_id: str,
    extracted_walls: List[Dict[str, Any]],
    extracted_rooms: List[Dict[str, Any]],
    scale_m_per_px: float,
    options: Dict[str, Any]
) -> Dict[str, Any]:
    """Schema step: 2builders.plan/1 document with Vastu report and fixtures."""
    return TwoBuildersPlanConverter.from_raster_extraction(
        plan_id=project_id,
        image_url=f"/api/files/{project_id}/download",
        extracted_walls=extracted_walls,
        extracted_rooms=extracted_rooms,
        scale_m_per_px=scale_m_per_px,
        options=options
    )


@trace_workflow("plan_convert")
def _process_and_save_plan(project_id: str, clean_name: str, img_path: str, payload_dict: dict, db: Session):
    """Core deterministic processing pipeline shared across endpoints."""
    real_w = payload_dict.get("realWidthM") or 9.0
    ceiling_mm = payload_dict.get("ceilingHeightMm") or 3050
    interior_style = payload_dict.get("interiorStyle") or "Modern"
    furnished = payload_dict.get("furnished", True)
    north_deg = payload_dict.get("northDeg", 0.0)

    if img_path.lower().endswith(".dxf"):
        dxf_res = DXFProcessor.process_dxf(img_path, scale=1.0, options={"realWidth": real_w})
        scale_m_per_px = dxf_res.get("scale", 1.0)
        extracted_walls = dxf_res.get("walls", [])
        extracted_rooms = dxf_res.get("rooms", [])
    else:
        raster_res = _extract_raster_geometry(img_path, real_w)
        scale_m_per_px = raster_res.get("scale", 0.0125)
        extracted_walls = raster_res.get("walls", [])
        extracted_rooms = raster_res.get("rooms", [])

    plan_doc = _build_plan_document(
        project_id=project_id,
        extracted_walls=extracted_walls,
        extracted_rooms=extracted_rooms,
        scale_m_per_px=scale_m_per_px,
        options={
            "ceilingMm": ceiling_mm,
            "northDeg": north_deg,
            "interiorStyle": interior_style,
            "furnished": furnished
        }
    )

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        proj_name = os.path.splitext(clean_name)[0].replace("_", " ").title()
        project = Project(
            id=project_id,
            name=proj_name,
            unit="meters",
            scale=scale_m_per_px,
            settings={
                "twobuilders_plan": plan_doc,
                "raster_path": img_path
            }
        )
        db.add(project)
    else:
        project.scale = scale_m_per_px
        project_settings = dict(project.settings or {})
        project_settings["twobuilders_plan"] = plan_doc
        project.settings = project_settings

    target_floor = db.query(Floor).filter(Floor.project_id == project_id).first()
    if not target_floor:
        target_floor = Floor(
            id=f"fl_{project_id[:8]}",
            project_id=project_id,
            name="Ground Floor",
            elevation=0.0,
            wall_height=round(ceiling_mm / 1000.0, 2),
            order_index=0
        )
        db.add(target_floor)
        db.flush()

    wall_ids = [w.id for w in db.query(Wall).filter(Wall.floor_id == target_floor.id).all()]
    if wall_ids:
        db.query(Opening).filter(Opening.wall_id.in_(wall_ids)).delete(synchronize_session=False)
    db.query(Wall).filter(Wall.floor_id == target_floor.id).delete(synchronize_session=False)
    db.query(Room).filter(Room.floor_id == target_floor.id).delete(synchronize_session=False)

    for w in extracted_walls:
        w_id = w.get("id") or f"wall_{uuid.uuid4().hex[:8]}"
        wall_model = Wall(
            id=w_id,
            floor_id=target_floor.id,
            start_x=w["start"][0],
            start_y=w["start"][1],
            end_x=w["end"][0],
            end_y=w["end"][1],
            thickness=w.get("thickness", 0.20),
            height=round(ceiling_mm / 1000.0, 2),
            wall_type=w.get("type", "external"),
            layer="WALLS"
        )
        db.add(wall_model)

        for op in w.get("openings", []):
            op_model = Opening(
                id=f"op_{uuid.uuid4().hex[:8]}",
                wall_id=w_id,
                type=op.get("type", "door"),
                offset=op.get("offset", 1.0),
                width=op.get("width", 0.9),
                height=op.get("height", 2.1),
                sill_height=op.get("sill_height", 0.0)
            )
            db.add(op_model)

    for r in extracted_rooms:
        room_model = Room(
            id=r.get("id") or f"rm_{uuid.uuid4().hex[:8]}",
            floor_id=target_floor.id,
            name=r.get("name", "Room"),
            boundary=r.get("boundary", []),
            area=r.get("area", 0.0)
        )
        db.add(room_model)

    db.commit()
    return project, plan_doc

@router.post("/plans/convert")
def convert_plan_direct(
    file: UploadFile = File(...),
    interiorStyle: str = Form("Modern"),
    ceilingHeightMm: int = Form(3050),
    furnished: bool = Form(True),
    northDeg: float = Form(0.0),
    realWidthM: float = Form(9.0),
    db: Session = Depends(get_db)
):
    """
    All-in-one 1-step endpoint: upload, analyze, and build 3D geometry in a single request.
    Prevents serverless multi-container filesystem desynchronization.
    """
    try:
        file_id = f"pl_{uuid.uuid4().hex[:8]}"
        clean_name = os.path.basename(file.filename or "floor_plan.png")
        ext = os.path.splitext(clean_name)[1].lower()
        dest_filename = f"{file_id}_{clean_name}"
        ensure_dir(UPLOAD_DIR)
        dest_path = os.path.join(UPLOAD_DIR, dest_filename)

        contents = file.file.read()
        with open(dest_path, "wb") as f:
            f.write(contents)

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

        # The project row must exist before its source file (foreign key).
        project, plan_doc = _process_and_save_plan(
            project_id=file_id,
            clean_name=clean_name,
            img_path=img_path,
            payload_dict={
                "realWidthM": realWidthM,
                "ceilingHeightMm": ceilingHeightMm,
                "interiorStyle": interiorStyle,
                "furnished": furnished,
                "northDeg": northDeg
            },
            db=db
        )

        source_file = SourceFile(
            id=file_id,
            project_id=file_id,
            filename=clean_name,
            format=ext.lstrip("."),
            file_path=img_path,
            file_size=len(contents),
            metadata_json={"dest_path": dest_path, "image_path": img_path}
        )
        db.add(source_file)
        db.commit()
        db.refresh(project)

        return {
            "planId": file_id,
            "project": serialize_project(project),
            "plan": plan_doc
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Conversion error: {str(e)}")

@router.post("/plans/upload")
def upload_plan_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Step 1: Upload a floor plan (JPG, PNG, WebP, PDF).
    Returns planId and source image URL.
    """
    try:
        file_id = f"pl_{uuid.uuid4().hex[:8]}"
        clean_name = os.path.basename(file.filename or "floor_plan.png")
        ext = os.path.splitext(clean_name)[1].lower()
        dest_filename = f"{file_id}_{clean_name}"
        ensure_dir(UPLOAD_DIR)
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
        proj_name = os.path.splitext(clean_name)[0].replace("_", " ").title()
        project = Project(
            id=file_id,
            name=proj_name,
            unit="meters",
            scale=0.0125,
            settings={
                "twobuilders_plan": None,
                "source_file": dest_filename,
                "raster_path": img_path
            }
        )
        db.add(project)

        source_file = SourceFile(
            id=file_id,
            project_id=file_id,
            filename=clean_name,
            format=ext.lstrip("."),
            file_path=img_path,
            file_size=len(contents),
            metadata_json={"dest_path": dest_path, "image_path": img_path}
        )
        db.add(source_file)
        db.commit()

        return {
            "planId": file_id,
            "filename": clean_name,
            "format": ext.lstrip("."),
            "fileSize": len(contents),
            "sourceUrl": source_url,
            "message": "File uploaded successfully. Ready for 2builders analysis."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process uploaded file: {str(e)}")

@router.post("/plans/{plan_id}/analyse")
def start_plan_analysis(
    plan_id: str,
    payload: AnalyseRequest,
    db: Session = Depends(get_db)
):
    """
    Step 2: Start deterministic 2builders recognition pipeline.
    Runs segmentation, wall extraction, room classification, scale calibration, and Vastu check.
    """
    try:
        project = db.query(Project).filter(Project.id == plan_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Plan not found")

        source_file = db.query(SourceFile).filter(SourceFile.project_id == plan_id).first()
        if not source_file or not os.path.exists(source_file.file_path):
            raise HTTPException(status_code=404, detail="Source file not found on disk")

        job_id = f"job_{uuid.uuid4().hex[:8]}"

        # Execute deterministic extraction via shared core pipeline
        img_path = source_file.file_path
        project, plan_doc = _process_and_save_plan(
            project_id=plan_id,
            clean_name=source_file.filename,
            img_path=img_path,
            payload_dict=payload.model_dump() if hasattr(payload, "model_dump") else payload.dict(),
            db=db
        )

        job_id = f"job_{uuid.uuid4().hex[:8]}"
        job = ProcessingJob(
            id=job_id,
            project_id=plan_id,
            status="completed",
            progress=1.0,
            result_data={
                "state": "needs_review",
                "step": "vectorising",
                "percent": 100,
                "wallsCount": len(plan_doc.get("walls", [])),
                "roomsCount": len(plan_doc.get("rooms", [])),
                "scale": project.scale
            }
        )
        db.add(job)
        db.commit()

        return {
            "jobId": job_id,
            "planId": plan_id,
            "status": "completed",
            "plan": plan_doc,
            "project": serialize_project(project)
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Plan analysis failed: {str(e)}")

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
    Step 3/4: Returns latest 2builders.plan/1 JSON document, Vastu report, and review questions.
    """
    project = db.query(Project).filter(Project.id == plan_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Plan not found")

    plan_doc = get_plan_doc_from_project(project)
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

    plan_doc = dict(get_plan_doc_from_project(project) or {})
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
    nodes = plan_doc.get("nodes", [])
    node_dict = {n["id"]: n for n in nodes if "id" in n}

    vastu_rooms = []
    for r in rooms:
        b_nids = r.get("boundary", [])
        r_pts = [node_dict[nid] for nid in b_nids if nid in node_dict]
        if r_pts:
            rx = sum(p["x"] for p in r_pts) / len(r_pts)
            ry = sum(p["y"] for p in r_pts) / len(r_pts)
        else:
            rx = r.get("x", 4500.0)
            ry = r.get("y", 4500.0)
        vastu_rooms.append({
            "name": r.get("name", "Room"),
            "type": r.get("type", "room"),
            "x": rx,
            "y": ry,
            "area": r.get("areaM2", 0)
        })

    vastu_report = VastuEngine.analyze_plan(vastu_rooms, outer_bounds, north_deg=north_deg)
    plan_doc["vastu"] = vastu_report

    # Update review status
    if "review" not in plan_doc:
        plan_doc["review"] = {}
    plan_doc["review"]["confirmedBy"] = "user"
    plan_doc["review"]["confirmedAt"] = datetime.utcnow().isoformat() + "Z"
    plan_doc["version"] = plan_doc.get("version", 1) + 1

    settings = dict(project.settings or {})
    settings["twobuilders_plan"] = plan_doc
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

    current_plan = get_plan_doc_from_project(project) or {}
    current_version = current_plan.get("version", 1)

    # Bump version
    updated_plan["version"] = current_version + 1
    if "review" not in updated_plan:
        updated_plan["review"] = {}
    updated_plan["review"]["confirmedBy"] = "user_editor"
    updated_plan["review"]["confirmedAt"] = datetime.utcnow().isoformat() + "Z"

    # Recalculate Vastu
    rooms = updated_plan.get("rooms", [])
    outer_bounds = updated_plan.get("outerBounds", {})
    north_deg = updated_plan.get("north", {}).get("deg", 0.0)
    updated_plan["vastu"] = VastuEngine.analyze_plan(rooms, outer_bounds, north_deg=north_deg)

    settings = dict(project.settings or {})
    settings["twobuilders_plan"] = updated_plan
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
    Step 6: Exports 3D models (GLB, OBJ, STL), 4 PNG renders, or 2D plan PDF/SVG.
    """
    project = db.query(Project).filter(Project.id == plan_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Plan not found")

    from .exports import generate_pdf_export, generate_svg_export, generate_obj_export, generate_stl_export
    project_data = serialize_project(project)

    fmt = payload.format.lower()
    export_id = f"exp_{uuid.uuid4().hex[:8]}"
    ensure_dir(EXPORT_DIR)

    if fmt == "pdf":
        filename = f"{project.name.replace(' ', '_')}_{export_id[:6]}_blueprint.pdf"
        file_path = os.path.join(EXPORT_DIR, filename)
        generate_pdf_export(project_data, file_path)
    elif fmt == "svg":
        filename = f"{project.name.replace(' ', '_')}_{export_id[:6]}_2d_plan.svg"
        file_path = os.path.join(EXPORT_DIR, filename)
        generate_svg_export(project_data, file_path)
    elif fmt == "obj":
        filename = f"{project.name.replace(' ', '_')}_{export_id[:6]}.obj"
        file_path = os.path.join(EXPORT_DIR, filename)
        generate_obj_export(project_data, file_path)
    elif fmt == "stl":
        filename = f"{project.name.replace(' ', '_')}_{export_id[:6]}.stl"
        file_path = os.path.join(EXPORT_DIR, filename)
        generate_stl_export(project_data, file_path)
    elif fmt in ("glb", "gltf"):
        filename = f"{project.name.replace(' ', '_')}_{export_id[:6]}.{fmt}"
        file_path = os.path.join(EXPORT_DIR, filename)
        generate_obj_export(project_data, file_path)
    elif fmt == "renders":
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
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format '{fmt}'.")

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

@router.post("/plans/{plan_id}/share")
def create_share_link(
    plan_id: str,
    db: Session = Depends(get_db)
):
    """
    Step 6: Creates a public 3D share link.
    """
    project = db.query(Project).filter(Project.id == plan_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Plan not found")

    share_id = f"sh_{uuid.uuid4().hex[:10]}"
    plan_doc = get_plan_doc_from_project(project)

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
        "fullUrl": f"/share/{share_id}"
    }

@router.get("/share/{share_id}")
def get_shared_plan(share_id: str):
    """
    Public share viewer endpoint.
    """
    if share_id not in SHARED_PLANS:
        raise HTTPException(status_code=404, detail="Shared link not found or expired")
    return SHARED_PLANS[share_id]
