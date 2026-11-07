import os
import shutil
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from PIL import Image

from ..database import get_db
from ..models import Project, SourceFile
from ..services.geometry_engine import DXFProcessor

router = APIRouter(prefix="/api", tags=["files"])

from ..paths import UPLOAD_DIR

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".dxf", ".svg", ".pdf"}

@router.post("/projects/{project_id}/upload")
async def upload_file(project_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{ext}'. Supported formats: JPG, PNG, DXF, SVG, PDF."
        )

    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}_{file.filename}"
    dest_path = os.path.join(UPLOAD_DIR, safe_filename)

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(dest_path)
    metadata = {"extension": ext, "originalName": file.filename}

    # Extract metadata according to format
    format_name = ext.lstrip(".")
    if format_name in ("jpg", "jpeg", "png"):
        try:
            with Image.open(dest_path) as im:
                metadata["width"], metadata["height"] = im.size
                metadata["mode"] = im.mode
        except Exception as e:
            metadata["imageReadError"] = str(e)
    elif format_name == "dxf":
        try:
            dxf_meta = DXFProcessor.parse_dxf(dest_path)
            metadata["layers"] = dxf_meta.get("layers", [])
            metadata["entityCount"] = dxf_meta.get("entityCount", 0)
            metadata["bounds"] = dxf_meta.get("bounds", {})
        except Exception as e:
            metadata["dxfParseError"] = str(e)

    source_file = SourceFile(
        id=file_id,
        project_id=project.id,
        filename=file.filename,
        format=format_name,
        file_path=dest_path,
        file_size=file_size,
        metadata_json=metadata
    )
    db.add(source_file)
    db.commit()
    db.refresh(source_file)

    return {
        "id": source_file.id,
        "projectId": project.id,
        "filename": source_file.filename,
        "format": source_file.format,
        "fileSize": source_file.file_size,
        "metadata": source_file.metadata_json,
        "url": f"/api/files/{source_file.id}/download"
    }

@router.get("/files/{file_id}")
def get_file_info(file_id: str, db: Session = Depends(get_db)):
    source_file = db.query(SourceFile).filter(SourceFile.id == file_id).first()
    if not source_file:
        raise HTTPException(status_code=404, detail="File not found")
    return {
        "id": source_file.id,
        "projectId": source_file.project_id,
        "filename": source_file.filename,
        "format": source_file.format,
        "fileSize": source_file.file_size,
        "metadata": source_file.metadata_json,
        "url": f"/api/files/{source_file.id}/download"
    }

@router.get("/files/{file_id}/download")
def download_file(file_id: str, db: Session = Depends(get_db)):
    source_file = db.query(SourceFile).filter(SourceFile.id == file_id).first()
    if not source_file or not os.path.exists(source_file.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(
        source_file.file_path,
        filename=source_file.filename
    )

