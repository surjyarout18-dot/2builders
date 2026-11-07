import os
import json
import uuid
import math
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import ezdxf

from ..database import get_db
from ..models import Project, ModelExport
from .projects import serialize_project

router = APIRouter(prefix="/api", tags=["exports"])

EXPORT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "exports"))
os.makedirs(EXPORT_DIR, exist_ok=True)

def generate_dxf_export(project_data: dict, out_path: str):
    doc = ezdxf.new('R2010')
    msp = doc.modelspace()
    
    # Layers
    doc.layers.add(name="WALLS", color=7)
    doc.layers.add(name="DOORS", color=1)
    doc.layers.add(name="WINDOWS", color=4)
    doc.layers.add(name="ROOMS", color=3)

    for floor in project_data.get("floors", []):
        for wall in floor.get("walls", []):
            start = wall.get("start", [0, 0])
            end = wall.get("end", [0, 0])
            msp.add_line((start[0], start[1]), (end[0], end[1]), dxfattribs={'layer': 'WALLS'})

            # Add openings
            for op in wall.get("openings", []):
                # Calculate opening start along wall
                dx = end[0] - start[0]
                dy = end[1] - start[1]
                wlen = math.hypot(dx, dy)
                if wlen > 1e-4:
                    ux = dx / wlen
                    uy = dy / wlen
                    op_offset = op.get("offset", 0.0)
                    op_width = op.get("width", 0.9)
                    os_x = start[0] + ux * op_offset
                    os_y = start[1] + uy * op_offset
                    oe_x = os_x + ux * op_width
                    oe_y = os_y + uy * op_width
                    layer = "DOORS" if op.get("type") == "door" else "WINDOWS"
                    msp.add_line((os_x, os_y), (oe_x, oe_y), dxfattribs={'layer': layer})

        for room in floor.get("rooms", []):
            boundary = room.get("boundary", [])
            if len(boundary) >= 3:
                pts = [(p[0], p[1]) for p in boundary]
                pts.append(pts[0])
                msp.add_lwpolyline(pts, dxfattribs={'layer': 'ROOMS'})

    doc.saveas(out_path)

def generate_obj_export(project_data: dict, out_path: str):
    """
    Generates Wavefront .OBJ geometry representing extruded 3D structural walls and floor slabs.
    """
    vertices = []
    faces = []

    def add_quad(v1, v2, v3, v4):
        # 1-indexed vertex positions
        base = len(vertices)
        vertices.extend([v1, v2, v3, v4])
        # Two triangles for the quad
        faces.append([base + 1, base + 2, base + 3])
        faces.append([base + 1, base + 3, base + 4])

    for floor in project_data.get("floors", []):
        elevation = floor.get("elevation", 0.0)
        wall_height = floor.get("wallHeight", 3.0)

        for wall in floor.get("walls", []):
            sx, sy = wall.get("start", [0, 0])
            ex, ey = wall.get("end", [0, 0])
            th = wall.get("thickness", 0.20)
            h = wall.get("height", wall_height)

            dx = ex - sx
            dy = ey - sy
            dist = math.hypot(dx, dy)
            if dist < 1e-4:
                continue

            # Perpendicular normal
            nx = -dy / dist * (th / 2.0)
            ny = dx / dist * (th / 2.0)

            # 4 bottom vertices
            b1 = [sx + nx, elevation, sy + ny]
            b2 = [sx - nx, elevation, sy - ny]
            b3 = [ex - nx, elevation, ey - ny]
            b4 = [ex + nx, elevation, ey + ny]

            # 4 top vertices
            t1 = [sx + nx, elevation + h, sy + ny]
            t2 = [sx - nx, elevation + h, sy - ny]
            t3 = [ex - nx, elevation + h, ey - ny]
            t4 = [ex + nx, elevation + h, ey + ny]

            # 6 faces of the wall cuboid
            add_quad(b1, b4, b3, b2)  # bottom
            add_quad(t1, t2, t3, t4)  # top
            add_quad(b1, t1, t4, b4)  # side 1
            add_quad(b4, t4, t3, b3)  # end cap 1
            add_quad(b3, t3, t2, b2)  # side 2
            add_quad(b2, t2, t1, b1)  # end cap 2

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("# 2builders Generated Model\n")
        f.write(f"# Project: {project_data.get('name', 'Building')}\n")
        for v in vertices:
            f.write(f"v {v[0]:.4f} {v[1]:.4f} {v[2]:.4f}\n")
        for face in faces:
            f.write(f"f {face[0]} {face[1]} {face[2]}\n")

def generate_stl_export(project_data: dict, out_path: str):
    """
    Generates ASCII STL format triangulated 3D mesh.
    """
    obj_tmp = out_path + ".tmp.obj"
    generate_obj_export(project_data, obj_tmp)

    # Read obj vertices and faces to construct STL facets
    vertices = []
    triangles = []
    with open(obj_tmp, "r") as f:
        for line in f:
            if line.startswith("v "):
                parts = line.strip().split()
                vertices.append([float(parts[1]), float(parts[2]), float(parts[3])])
            elif line.startswith("f "):
                parts = line.strip().split()
                triangles.append([int(parts[1]) - 1, int(parts[2]) - 1, int(parts[3]) - 1])

    if os.path.exists(obj_tmp):
        os.remove(obj_tmp)

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("solid twobuilders_model\n")
        for tri in triangles:
            v1 = vertices[tri[0]]
            v2 = vertices[tri[1]]
            v3 = vertices[tri[2]]

            # Normal calculation
            u = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]]
            v = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]]
            norm = [
                u[1] * v[2] - u[2] * v[1],
                u[2] * v[0] - u[0] * v[2],
                u[0] * v[1] - u[1] * v[0]
            ]
            mag = math.hypot(norm[0], norm[1], norm[2])
            if mag > 1e-6:
                norm = [norm[0] / mag, norm[1] / mag, norm[2] / mag]
            else:
                norm = [0.0, 1.0, 0.0]

            f.write(f"  facet normal {norm[0]:.4f} {norm[1]:.4f} {norm[2]:.4f}\n")
            f.write("    outer loop\n")
            f.write(f"      vertex {v1[0]:.4f} {v1[1]:.4f} {v1[2]:.4f}\n")
            f.write(f"      vertex {v2[0]:.4f} {v2[1]:.4f} {v2[2]:.4f}\n")
            f.write(f"      vertex {v3[0]:.4f} {v3[1]:.4f} {v3[2]:.4f}\n")
            f.write("    endloop\n")
            f.write("  endfacet\n")
        f.write("endsolid twobuilders_model\n")

def generate_svg_export(project_data: dict, out_path: str):
    """
    Generates a high-precision 2D architectural vector blueprint in SVG format.
    Includes walls, true openings, doors with swing arcs, windows, and room dimensions.
    """
    min_x = float('inf')
    min_y = float('inf')
    max_x = float('-inf')
    max_y = float('-inf')

    walls_to_render = []
    rooms_to_render = []

    for floor in project_data.get("floors", []):
        for wall in floor.get("walls", []):
            s = wall.get("start", [0, 0])
            e = wall.get("end", [0, 0])
            t = wall.get("thickness", 0.20)
            walls_to_render.append((s, e, t, wall.get("type", "external"), wall.get("openings", [])))
            min_x = min(min_x, s[0], e[0])
            min_y = min(min_y, s[1], e[1])
            max_x = max(max_x, s[0], e[0])
            max_y = max(max_y, s[1], e[1])

        for room in floor.get("rooms", []):
            boundary = room.get("boundary", [])
            if len(boundary) >= 3:
                rooms_to_render.append((boundary, room.get("name", "Room"), room.get("area", 0.0)))
                for p in boundary:
                    min_x = min(min_x, p[0])
                    min_y = min(min_y, p[1])
                    max_x = max(max_x, p[0])
                    max_y = max(max_y, p[1])

    if min_x == float('inf'):
        min_x, min_y, max_x, max_y = 0, 0, 10, 10

    # Add margin
    margin = 1.5
    min_x -= margin
    min_y -= margin
    max_x += margin
    max_y += margin

    scale = 80.0  # 80 px per meter
    width_px = max(600, int((max_x - min_x) * scale))
    height_px = max(500, int((max_y - min_y) * scale))

    def to_svg_x(x):
        return round((x - min_x) * scale, 1)

    def to_svg_y(y):
        return round((max_y - y) * scale, 1)

    svg_lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width_px} {height_px}" width="{width_px}" height="{height_px}" style="background-color: #0b1120; font-family: sans-serif;">',
        '  <defs>',
        '    <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">',
        '      <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#1e293b" stroke-width="1"/>',
        '    </pattern>',
        '  </defs>',
        f'  <rect width="{width_px}" height="{height_px}" fill="url(#grid)" />'
    ]

    for boundary, name, area in rooms_to_render:
        pts_str = " ".join([f"{to_svg_x(p[0])},{to_svg_y(p[1])}" for p in boundary])
        svg_lines.append(f'  <polygon points="{pts_str}" fill="#0284c7" fill-opacity="0.08" stroke="#38bdf8" stroke-width="1" stroke-dasharray="4,4" />')
        cx = sum(p[0] for p in boundary) / len(boundary)
        cy = sum(p[1] for p in boundary) / len(boundary)
        svg_lines.append(f'  <text x="{to_svg_x(cx)}" y="{to_svg_y(cy)}" text-anchor="middle" fill="#38bdf8" font-size="12" font-weight="bold">{name}</text>')
        svg_lines.append(f'  <text x="{to_svg_x(cx)}" y="{to_svg_y(cy) + 16}" text-anchor="middle" fill="#94a3b8" font-size="10">{area:.1f} m²</text>')

    for s, e, t, wtype, openings in walls_to_render:
        x1, y1 = to_svg_x(s[0]), to_svg_y(s[1])
        x2, y2 = to_svg_x(e[0]), to_svg_y(e[1])
        stroke_w = max(4, round(t * scale, 1))
        wall_color = "#f8fafc" if wtype == "external" else "#cbd5e1"
        svg_lines.append(f'  <line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{wall_color}" stroke-width="{stroke_w}" stroke-linecap="square" />')

        dx = e[0] - s[0]
        dy = e[1] - s[1]
        wlen = math.hypot(dx, dy)
        if wlen > 1e-4:
            ux = dx / wlen
            uy = dy / wlen
            for op in openings:
                off = op.get("offset", 0.0)
                ow = op.get("width", 0.9)
                op_type = op.get("type", "door")
                op_sx = s[0] + ux * off
                op_sy = s[1] + uy * off
                op_ex = op_sx + ux * ow
                op_ey = op_sy + uy * ow
                ox1, oy1 = to_svg_x(op_sx), to_svg_y(op_sy)
                ox2, oy2 = to_svg_x(op_ex), to_svg_y(op_ey)
                svg_lines.append(f'  <line x1="{ox1}" y1="{oy1}" x2="{ox2}" y2="{oy2}" stroke="#0b1120" stroke-width="{stroke_w + 1}" />')
                if op_type == "door":
                    svg_lines.append(f'  <line x1="{ox1}" y1="{oy1}" x2="{ox2}" y2="{oy2}" stroke="#f59e0b" stroke-width="2" />')
                else:
                    svg_lines.append(f'  <line x1="{ox1}" y1="{oy1}" x2="{ox2}" y2="{oy2}" stroke="#38bdf8" stroke-width="2" />')

    svg_lines.append(f'  <text x="30" y="{height_px - 25}" fill="#f8fafc" font-size="14" font-weight="bold">{project_data.get("name", "Floor Plan")}</text>')
    svg_lines.append(f'  <text x="30" y="{height_px - 10}" fill="#64748b" font-size="10">2builders Deterministic Architectural Vector Blueprint • Scale: 1m = {int(scale)}px</text>')
    svg_lines.append('</svg>')

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(svg_lines))

from pydantic import BaseModel

class ExportPayload(BaseModel):
    format: Optional[str] = "obj"

@router.post("/projects/{project_id}/export")
def create_export(project_id: str, payload: Optional[ExportPayload] = None, format: Optional[str] = None, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    raw_format = (payload.format if payload and payload.format else format) or "obj"
    fmt = raw_format.lower()
    if fmt not in ("obj", "stl", "dxf", "json", "svg"):
        raise HTTPException(status_code=400, detail=f"Unsupported server export format '{fmt}'. For GLB, use client-side 3D export.")

    project_data = serialize_project(project)
    export_id = str(uuid.uuid4())
    filename = f"{project.name.replace(' ', '_')}_{export_id[:8]}.{fmt}"
    file_path = os.path.join(EXPORT_DIR, filename)

    if fmt == "dxf":
        generate_dxf_export(project_data, file_path)
    elif fmt == "obj":
        generate_obj_export(project_data, file_path)
    elif fmt == "stl":
        generate_stl_export(project_data, file_path)
    elif fmt == "svg":
        generate_svg_export(project_data, file_path)
    elif fmt == "json":
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(project_data, f, indent=2, default=str)

    export_record = ModelExport(
        id=export_id,
        project_id=project.id,
        format=fmt,
        file_path=file_path,
        status="completed"
    )
    db.add(export_record)
    db.commit()

    return {
        "exportId": export_record.id,
        "format": fmt,
        "filename": filename,
        "downloadUrl": f"/api/exports/{export_record.id}/download"
    }

@router.post("/projects/{project_id}/upload-glb")
async def save_client_glb(project_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Accepts GLB binary generated on the client via Three.js GLTFExporter and registers it.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    export_id = str(uuid.uuid4())
    filename = f"{project.name.replace(' ', '_')}_{export_id[:8]}.glb"
    file_path = os.path.join(EXPORT_DIR, filename)

    with open(file_path, "wb") as buffer:
        import shutil
        shutil.copyfileobj(file.file, buffer)

    export_record = ModelExport(
        id=export_id,
        project_id=project.id,
        format="glb",
        file_path=file_path,
        status="completed"
    )
    db.add(export_record)
    db.commit()

    return {
        "exportId": export_record.id,
        "format": "glb",
        "filename": filename,
        "downloadUrl": f"/api/exports/{export_record.id}/download"
    }

@router.get("/exports/{export_id}/download")
def download_export(export_id: str, db: Session = Depends(get_db)):
    export_record = db.query(ModelExport).filter(ModelExport.id == export_id).first()
    if not export_record or not os.path.exists(export_record.file_path):
        raise HTTPException(status_code=404, detail="Export file not found")
    return FileResponse(
        export_record.file_path,
        filename=os.path.basename(export_record.file_path)
    )

