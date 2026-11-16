import math
from typing import Dict, Any
from backend.app.schemas import ArchitecturalModel

def export_d5_render_bundle(model: ArchitecturalModel) -> Dict[str, Any]:
    """
    Exports a production-ready asset bundle formatted specifically for
    D5 Render (Real-Time Ray Tracing + DLSS 3.5) and Unreal Engine 5.
    Returns:
        {
            "obj_content": str,
            "mtl_content": str,
            "manifest": dict
        }
    """
    obj_lines = [
        f"# 2builders to D5 Render / Unreal Engine 5 PBR Asset",
        f"# Project: {model.name}",
        f"mtllib {model.name.replace(' ', '_')}.mtl\n"
    ]

    mtl_lines = [
        f"# 2builders PBR Material Library for D5 Render / Unreal Engine",
        f"# Formatted for NVIDIA DLSS 3.5 Ray Reconstruction\n",
        # Exterior Wall
        "newmtl Mat_Wall_Exterior",
        "Ka 1.0 1.0 1.0",
        "Kd 0.95 0.95 0.96",
        "Ks 0.1 0.1 0.1",
        "Ns 10.0",
        "d 1.0\n",
        # Interior Wall
        "newmtl Mat_Wall_Interior",
        "Ka 1.0 1.0 1.0",
        "Kd 0.92 0.92 0.93",
        "Ks 0.05 0.05 0.05",
        "Ns 5.0",
        "d 1.0\n",
        # Wood Oak Floor
        "newmtl Mat_Floor_Oak",
        "Ka 1.0 1.0 1.0",
        "Kd 0.62 0.44 0.28",
        "Ks 0.4 0.4 0.4",
        "Ns 65.0",
        "d 1.0\n",
        # Marble Floor
        "newmtl Mat_Floor_Marble",
        "Ka 1.0 1.0 1.0",
        "Kd 0.92 0.90 0.88",
        "Ks 0.8 0.8 0.8",
        "Ns 120.0",
        "d 1.0\n",
        # Slate Floor
        "newmtl Mat_Floor_Slate",
        "Ka 1.0 1.0 1.0",
        "Kd 0.25 0.28 0.32",
        "Ks 0.3 0.3 0.3",
        "Ns 35.0",
        "d 1.0\n",
        # Roof Zinc
        "newmtl Mat_Roof_Zinc",
        "Ka 1.0 1.0 1.0",
        "Kd 0.28 0.32 0.36",
        "Ks 0.85 0.85 0.85",
        "Ns 90.0",
        "d 1.0\n",
        # Glass
        "newmtl Mat_Glass",
        "Ka 1.0 1.0 1.0",
        "Kd 0.9 0.95 1.0",
        "Ks 0.95 0.95 0.95",
        "Ns 180.0",
        "d 0.15\n",
        # Grass Site
        "newmtl Mat_Site_Grass",
        "Ka 1.0 1.0 1.0",
        "Kd 0.25 0.48 0.20",
        "Ks 0.05 0.05 0.05",
        "Ns 5.0",
        "d 1.0\n"
    ]

    vert_offset = 1
    all_x = []
    all_z = []

    for floor in model.floors:
        elev = floor.elevation
        for wall in floor.walls:
            sx, sz = wall.start.x, wall.start.z
            ex, ez = wall.end.x, wall.end.z
            height = wall.height
            thick = wall.thickness
            all_x.extend([sx, ex])
            all_z.extend([sz, ez])

            dx = ex - sx
            dz = ez - sz
            length = math.hypot(dx, dz)
            if length < 0.01:
                continue

            nx = -dz / length * (thick / 2.0)
            nz = dx / length * (thick / 2.0)

            # 8 Vertices
            v_coords = [
                (sx - nx, elev, sz - nz),
                (sx + nx, elev, sz + nz),
                (ex + nx, elev, ez + nz),
                (ex - nx, elev, ez - nz),
                (sx - nx, elev + height, sz - nz),
                (sx + nx, elev + height, sz + nz),
                (ex + nx, elev + height, ez + nz),
                (ex - nx, elev + height, ez - nz),
            ]

            obj_lines.append(f"g Wall_{wall.id}")
            obj_lines.append(f"usemtl {'Mat_Wall_Exterior' if wall.wall_type == 'exterior' else 'Mat_Wall_Interior'}")

            for vx, vy, vz in v_coords:
                obj_lines.append(f"v {vx:.4f} {vy:.4f} {vz:.4f}")

            # 6 Quad faces (split into triangles for D5/Unreal Engine standard)
            base = vert_offset
            faces = [
                (base, base+1, base+2), (base, base+2, base+3),       # Bottom
                (base+7, base+6, base+5), (base+7, base+5, base+4),   # Top
                (base, base+4, base+5), (base, base+5, base+1),       # Start cap
                (base+2, base+6, base+7), (base+2, base+7, base+3),   # End cap
                (base+1, base+5, base+6), (base+1, base+6, base+2),   # Side A
                (base+3, base+7, base+4), (base+3, base+4, base),     # Side B
            ]
            for f1, f2, f3 in faces:
                obj_lines.append(f"f {f1} {f2} {f3}")

            vert_offset += 8

    # Calculate centroid
    cx = sum(all_x) / len(all_x) if all_x else 5.0
    cz = sum(all_z) / len(all_z) if all_z else 4.0

    manifest = {
        "renderer": "D5_Render",
        "engine_compatibility": ["D5_Render_2.7+", "Unreal_Engine_5.4+", "Blender_4.2+"],
        "project_name": model.name,
        "units": model.units,
        "ray_tracing": {
            "dlss_supported": True,
            "dlss_version": "3.5_ray_reconstruction",
            "real_time_gi": "hardware_accelerated",
            "ambient_occlusion": "ground_truth_pao"
        },
        "camera_preset": {
            "target": [cx, 1.2, cz],
            "position": [cx + 12.0, 10.0, cz + 14.0],
            "fov": 42.0,
            "focal_length_mm": 35.0
        },
        "lighting": {
            "sun_azimuth_deg": 180.0,
            "sun_elevation_deg": 45.0,
            "hdri_atmosphere": "clear_architectural_sky"
        }
    }

    return {
        "obj_content": "\n".join(obj_lines),
        "mtl_content": "\n".join(mtl_lines),
        "manifest": manifest
    }
