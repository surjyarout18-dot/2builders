import os
import json
import uuid
import math
import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import ezdxf

from ..database import get_db
from ..models import Project, ModelExport
from .projects import serialize_project

router = APIRouter(prefix="/api", tags=["exports"])

from ..paths import EXPORT_DIR, ensure_dir

MIME_TYPES = {
    "pdf": "application/pdf",
    "glb": "model/gltf-binary",
    "gltf": "model/gltf+json",
    "obj": "text/plain",
    "stl": "model/stl",
    "dxf": "application/dxf",
    "svg": "image/svg+xml",
    "json": "application/json",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
}

def generate_pdf_export(project_data: dict, out_path: str):
    """
    Generates an ISO standard A4 Landscape vector architectural blueprint PDF (PDF 1.4).
    Pure Python: 0 heavy external C libraries (keeps serverless lambda tiny & lightning fast).
    Features:
    - Double blueprint border & title block with project metadata
    - Scaled room boundaries with fills, room labels, and areas in m² & sq ft
    - Scaled structural walls with line-thickness & door/window opening cutouts
    - Room Schedule table summarizing individual room and total carpet areas
    - Technical scale note & 2builders engine certification
    """
    w, h = 842.0, 595.0  # A4 Landscape in points (72 pt/inch)
    s = []

    def stroke_rgb(r, g, b): s.append(f"{r:.3f} {g:.3f} {b:.3f} RG")
    def fill_rgb(r, g, b): s.append(f"{r:.3f} {g:.3f} {b:.3f} rg")
    def line_w(lw): s.append(f"{lw:.2f} w")
    def dash(arr=None, phase=0):
        if arr: s.append(f"[{' '.join(str(x) for x in arr)}] {phase} d")
        else: s.append("[] 0 d")
    def line(x1, y1, x2, y2): s.append(f"{x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l S")
    def rect(x, y, rw, rh, fill=False, stroke=True):
        op = "B" if fill and stroke else ("f" if fill else "S")
        s.append(f"{x:.2f} {y:.2f} {rw:.2f} {rh:.2f} re {op}")
    def polygon(pts, fill=False, stroke=True):
        if not pts: return
        op = "B" if fill and stroke else ("f" if fill else "S")
        s.append(f"{pts[0][0]:.2f} {pts[0][1]:.2f} m")
        for p in pts[1:]: s.append(f"{p[0]:.2f} {p[1]:.2f} l")
        s.append(f"h {op}")
    def text(t, x, y, font="F1", size=10, align="left"):
        safe = str(t).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        offset = 0
        if align == "center": offset = len(safe) * size * 0.28
        elif align == "right": offset = len(safe) * size * 0.55
        s.append(f"BT /{font} {size} Tf {x - offset:.2f} {y:.2f} Td ({safe}) Tj ET")

    # 1. Background Canvas
    fill_rgb(0.985, 0.99, 1.0)
    rect(0, 0, w, h, fill=True, stroke=False)

    # Outer and Inner Blueprint Border
    stroke_rgb(0.12, 0.18, 0.28)
    line_w(1.5)
    rect(24, 24, w - 48, h - 48, fill=False, stroke=True)

    stroke_rgb(0.35, 0.45, 0.60)
    line_w(0.6)
    rect(28, 28, w - 56, h - 56, fill=False, stroke=True)

    # 2. Right-hand Title Block Panel
    panel_x = w - 232
    panel_w = 200
    panel_y = 32
    panel_h = h - 64

    fill_rgb(0.95, 0.97, 0.99)
    stroke_rgb(0.20, 0.30, 0.45)
    line_w(1.0)
    rect(panel_x, panel_y, panel_w, panel_h, fill=True, stroke=True)

    # Brand Header
    fill_rgb(0.08, 0.20, 0.38)
    text("2BUILDERS", panel_x + 10, panel_y + panel_h - 24, font="F2", size=15)
    fill_rgb(0.35, 0.45, 0.55)
    text("ARCHITECTURAL BLUEPRINT", panel_x + 10, panel_y + panel_h - 37, font="F1", size=8)

    stroke_rgb(0.75, 0.82, 0.90)
    line_w(0.8)
    line(panel_x + 10, panel_y + panel_h - 45, panel_x + panel_w - 10, panel_y + panel_h - 45)

    proj_name = project_data.get("name", "Architectural Floor Plan")
    if len(proj_name) > 22: proj_name = proj_name[:20] + ".."
    fill_rgb(0.10, 0.15, 0.25)
    text("PROJECT:", panel_x + 10, panel_y + panel_h - 60, font="F2", size=8)
    text(proj_name, panel_x + 10, panel_y + panel_h - 73, font="F2", size=11)

    today = datetime.datetime.now().strftime("%Y-%m-%d")
    fill_rgb(0.40, 0.45, 0.55)
    text(f"Date: {today}", panel_x + 10, panel_y + panel_h - 89, font="F1", size=8)
    text("Standard: 2D Deterministic Vector Plan", panel_x + 10, panel_y + panel_h - 101, font="F1", size=8)

    # 3. Collect walls and rooms for rendering
    min_x, min_y, max_x, max_y = float("inf"), float("inf"), float("-inf"), float("-inf")
    walls_to_draw = []
    rooms_to_draw = []

    for floor in project_data.get("floors", []):
        for w_item in floor.get("walls", []):
            s_pt = w_item.get("start", [0, 0])
            e_pt = w_item.get("end", [0, 0])
            th = w_item.get("thickness", 0.20)
            wtype = w_item.get("type", "external")
            ops = w_item.get("openings", [])
            walls_to_draw.append((s_pt, e_pt, th, wtype, ops))
            min_x = min(min_x, s_pt[0], e_pt[0])
            min_y = min(min_y, s_pt[1], e_pt[1])
            max_x = max(max_x, s_pt[0], e_pt[0])
            max_y = max(max_y, s_pt[1], e_pt[1])

        for r_item in floor.get("rooms", []):
            b_pts = r_item.get("boundary", [])
            if len(b_pts) >= 3:
                r_name = r_item.get("name", "Room")
                r_area = r_item.get("area", 0.0)
                rooms_to_draw.append((b_pts, r_name, r_area))
                for pt in b_pts:
                    min_x = min(min_x, pt[0])
                    min_y = min(min_y, pt[1])
                    max_x = max(max_x, pt[0])
                    max_y = max(max_y, pt[1])

    if min_x == float("inf"):
        min_x, min_y, max_x, max_y = 0.0, 0.0, 10.0, 10.0

    pad = 1.0
    min_x -= pad; min_y -= pad
    max_x += pad; max_y += pad
    span_x = max(max_x - min_x, 1.0)
    span_y = max(max_y - min_y, 1.0)

    # Drawing area bounds
    cv_x = 35.0
    cv_y = 35.0
    cv_w = panel_x - cv_x - 12.0
    cv_h = h - 70.0

    scale = min((cv_w - 40) / span_x, (cv_h - 40) / span_y)
    mid_x = (min_x + max_x) / 2.0
    mid_y = (min_y + max_y) / 2.0
    cx = cv_x + cv_w / 2.0
    cy = cv_y + cv_h / 2.0

    def tx(x): return cx + (x - mid_x) * scale
    def ty(y): return cy + (y - mid_y) * scale

    # Draw Rooms
    for b_pts, r_name, r_area in rooms_to_draw:
        mapped_pts = [(tx(p[0]), ty(p[1])) for p in b_pts]
        fill_rgb(0.93, 0.96, 0.99)
        stroke_rgb(0.65, 0.78, 0.92)
        line_w(0.8)
        dash([3, 2])
        polygon(mapped_pts, fill=True, stroke=True)
        dash()

        rcx = sum(p[0] for p in b_pts) / len(b_pts)
        rcy = sum(p[1] for p in b_pts) / len(b_pts)
        fill_rgb(0.12, 0.28, 0.50)
        text(r_name, tx(rcx), ty(rcy) + 4, font="F2", size=9, align="center")
        fill_rgb(0.40, 0.48, 0.58)
        text(f"{r_area:.1f} m2  ({r_area * 10.7639:.0f} sq ft)", tx(rcx), ty(rcy) - 7, font="F1", size=7.5, align="center")

    # Draw Walls and Openings
    for s_pt, e_pt, th, wtype, ops in walls_to_draw:
        x1, y1 = tx(s_pt[0]), ty(s_pt[1])
        x2, y2 = tx(e_pt[0]), ty(e_pt[1])
        sw = max(3.5, min(9.0, th * scale * 0.75))
        if wtype == "external":
            stroke_rgb(0.10, 0.15, 0.24)
            line_w(sw)
        else:
            stroke_rgb(0.28, 0.35, 0.48)
            line_w(sw * 0.8)
        line(x1, y1, x2, y2)

        dx = e_pt[0] - s_pt[0]
        dy = e_pt[1] - s_pt[1]
        wlen = math.hypot(dx, dy)
        if wlen > 1e-4:
            ux, uy = dx / wlen, dy / wlen
            for op in ops:
                off = op.get("offset", 0.0)
                ow = op.get("width", 0.9)
                op_type = op.get("type", "door")
                osx = s_pt[0] + ux * off
                osy = s_pt[1] + uy * off
                oex = osx + ux * ow
                oey = osy + uy * ow
                ox1, oy1 = tx(osx), ty(osy)
                ox2, oy2 = tx(oex), ty(oey)

                # Cutout gap in wall
                fill_rgb(0.985, 0.99, 1.0)
                stroke_rgb(0.985, 0.99, 1.0)
                line_w(sw + 1.2)
                line(ox1, oy1, ox2, oy2)

                # Door swing / Window sill line
                if op_type == "door":
                    stroke_rgb(0.85, 0.45, 0.05)
                    line_w(1.8)
                    line(ox1, oy1, ox2, oy2)
                else:
                    stroke_rgb(0.20, 0.65, 0.92)
                    line_w(1.5)
                    line(ox1, oy1, ox2, oy2)

    # 4. Room Schedule in Title Block
    tbl_y = panel_y + 140
    fill_rgb(0.12, 0.22, 0.38)
    text("ROOM SCHEDULE", panel_x + 10, tbl_y + 16, font="F2", size=8.5)

    stroke_rgb(0.70, 0.78, 0.88)
    line_w(0.6)
    line(panel_x + 10, tbl_y + 12, panel_x + panel_w - 10, tbl_y + 12)

    total_area = 0.0
    row_y = tbl_y - 2
    for b_pts, r_name, r_area in rooms_to_draw[:7]:
        total_area += r_area
        fill_rgb(0.20, 0.25, 0.35)
        text(r_name[:16], panel_x + 10, row_y, font="F1", size=7.5)
        fill_rgb(0.10, 0.40, 0.65)
        text(f"{r_area:.1f} m2", panel_x + panel_w - 12, row_y, font="F2", size=7.5, align="right")
        row_y -= 13

    line(panel_x + 10, row_y + 8, panel_x + panel_w - 10, row_y + 8)
    fill_rgb(0.10, 0.15, 0.25)
    text("TOTAL AREA:", panel_x + 10, row_y - 3, font="F2", size=8)
    fill_rgb(0.08, 0.20, 0.38)
    text(f"{total_area:.1f} m2", panel_x + panel_w - 12, row_y - 3, font="F2", size=8, align="right")

    # Scale Bar & Certification
    text(f"Scale: 1m = {int(scale):d}pt", panel_x + 10, panel_y + 24, font="F1", size=7.5)
    text("Engine: 2builders CAD (Non-AI)", panel_x + 10, panel_y + 12, font="F2", size=7)

    # 5. Assemble PDF 1.4 Binary Structure
    content = "\n".join(s).encode("latin-1", "replace")
    objs = [
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
        f"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {w} {h}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj".encode(),
        f"4 0 obj\n<< /Length {len(content)} >>\nstream\n".encode() + content + b"\nendstream\nendobj",
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
        b"6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj"
    ]
    hdr = b"%PDF-1.4\n"
    body = b""
    offs = [0]
    cur = len(hdr)
    for o in objs:
        offs.append(cur)
        body += o + b"\n"
        cur = len(hdr) + len(body)
    xref = f"xref\n0 {len(objs)+1}\n0000000000 65535 f \n".encode()
    for off in offs[1:]:
        xref += f"{off:010d} 00000 n \n".encode()
    trailer = f"trailer\n<< /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{cur}\n%%EOF\n".encode()

    ensure_dir(os.path.dirname(out_path))
    with open(out_path, "wb") as f:
        f.write(hdr + body + xref + trailer)

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

    ensure_dir(os.path.dirname(out_path))
    doc.saveas(out_path)

def generate_obj_export(project_data: dict, out_path: str):
    """
    Generates Wavefront .OBJ geometry representing extruded 3D structural walls and floor slabs.
    """
    vertices = []
    faces = []

    def add_quad(v1, v2, v3, v4):
        base = len(vertices)
        vertices.extend([v1, v2, v3, v4])
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

            nx = -dy / dist * (th / 2.0)
            ny = dx / dist * (th / 2.0)

            b1 = [sx + nx, elevation, sy + ny]
            b2 = [sx - nx, elevation, sy - ny]
            b3 = [ex - nx, elevation, ey - ny]
            b4 = [ex + nx, elevation, ey + ny]

            t1 = [sx + nx, elevation + h, sy + ny]
            t2 = [sx - nx, elevation + h, sy - ny]
            t3 = [ex - nx, elevation + h, ey - ny]
            t4 = [ex + nx, elevation + h, ey + ny]

            add_quad(b1, b4, b3, b2)
            add_quad(t1, t2, t3, t4)
            add_quad(b1, t1, t4, b4)
            add_quad(b4, t4, t3, b3)
            add_quad(b3, t3, t2, b2)
            add_quad(b2, t2, t1, b1)

    ensure_dir(os.path.dirname(out_path))
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
        try:
            os.remove(obj_tmp)
        except Exception:
            pass

    ensure_dir(os.path.dirname(out_path))
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("solid twobuilders_model\n")
        for tri in triangles:
            v1 = vertices[tri[0]]
            v2 = vertices[tri[1]]
            v3 = vertices[tri[2]]

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

    margin = 1.5
    min_x -= margin
    min_y -= margin
    max_x += margin
    max_y += margin

    scale = 80.0
    width_px = max(600, int((max_x - min_x) * scale))
    height_px = max(500, int((max_y - min_y) * scale))

    def to_svg_x(x): return round((x - min_x) * scale, 1)
    def to_svg_y(y): return round((max_y - y) * scale, 1)

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

    ensure_dir(os.path.dirname(out_path))
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(svg_lines))

from pydantic import BaseModel

class ExportPayload(BaseModel):
    format: Optional[str] = "pdf"

@router.post("/projects/{project_id}/export")
def create_export(project_id: str, payload: Optional[ExportPayload] = None, format: Optional[str] = None, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    raw_format = (payload.format if payload and payload.format else format) or "pdf"
    fmt = raw_format.lower()
    if fmt not in ("pdf", "obj", "stl", "dxf", "json", "svg"):
        raise HTTPException(status_code=400, detail=f"Unsupported export format '{fmt}'. Supported: pdf, obj, stl, dxf, json, svg.")

    project_data = serialize_project(project)
    export_id = str(uuid.uuid4())
    filename = f"{project.name.replace(' ', '_')}_{export_id[:8]}.{fmt}"
    file_path = os.path.join(EXPORT_DIR, filename)

    if fmt == "pdf":
        generate_pdf_export(project_data, file_path)
    elif fmt == "dxf":
        generate_dxf_export(project_data, file_path)
    elif fmt == "obj":
        generate_obj_export(project_data, file_path)
    elif fmt == "stl":
        generate_stl_export(project_data, file_path)
    elif fmt == "svg":
        generate_svg_export(project_data, file_path)
    elif fmt == "json":
        ensure_dir(os.path.dirname(file_path))
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

    ensure_dir(os.path.dirname(file_path))
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
    
    filename = os.path.basename(export_record.file_path)
    fmt = export_record.format.lower()
    media_type = MIME_TYPES.get(fmt, "application/octet-stream")

    return FileResponse(
        path=export_record.file_path,
        media_type=media_type,
        filename=filename,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )
