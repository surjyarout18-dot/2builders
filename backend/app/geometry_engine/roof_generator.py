"""
2builders Parametric 3D Roof Generator.
Calculates 3D mesh vertices, indices, and normals for architectural roofs:
- Gable (dual-pitch with triangular end-walls)
- Hip (four-sided sloping pyramid/ridge)
- Shed (single-slope mono-pitch)
- Flat (slab with perimeter parapet curb)
"""
import math
from typing import Dict, Any, List, Tuple
from backend.app.schemas import RoofSchema, WallSchema

def generate_roof_mesh(
    arg1: Any,
    arg2: Any = None,
    base_elevation: float = 2.80
) -> Dict[str, Any]:
    """
    Generate 3D mesh geometry for the building roof based on wall footprint bounds.
    Accepts either (walls, roof_config, base_elevation) or (roof_config, floor/walls, base_elevation).
    """
    if hasattr(arg1, "roof_type") or (isinstance(arg1, dict) and "roof_type" in arg1):
        roof_config = arg1
        container = arg2
    else:
        container = arg1
        roof_config = arg2

    # Extract walls
    if hasattr(container, "walls"):
        walls = container.walls
        if hasattr(container, "elevation") and hasattr(container, "height"):
            base_elevation = container.elevation + container.height
    elif isinstance(container, dict) and "walls" in container:
        walls = container["walls"]
    elif isinstance(container, list):
        walls = container
    else:
        walls = []

    # Normalize roof_config to RoofSchema if needed
    if isinstance(roof_config, dict):
        roof_type = roof_config.get("roof_type", "gable")
        pitch = float(roof_config.get("pitch", 25.0))
        overhang = float(roof_config.get("overhang", 0.45))
        thickness = float(roof_config.get("thickness", 0.15))
        material = roof_config.get("material", "zinc_standing_seam")
    elif hasattr(roof_config, "roof_type"):
        roof_type = roof_config.roof_type
        pitch = float(roof_config.pitch)
        overhang = float(roof_config.overhang)
        thickness = float(roof_config.thickness)
        material = roof_config.material
    else:
        roof_type = "gable"
        pitch = 25.0
        overhang = 0.45
        thickness = 0.15
        material = "zinc_standing_seam"

    if not walls:
        return {
            "vertices": [],
            "faces": [],
            "indices": [],
            "normals": [],
            "roof_type": roof_type,
            "material": material
        }

    def get_coord(pt, attr):
        if hasattr(pt, attr):
            return getattr(pt, attr)
        elif isinstance(pt, dict):
            return pt.get(attr, 0.0)
        return 0.0

    min_x = min(min(get_coord(w.start if hasattr(w, 'start') else w['start'], 'x'),
                    get_coord(w.end if hasattr(w, 'end') else w['end'], 'x')) for w in walls)
    max_x = max(max(get_coord(w.start if hasattr(w, 'start') else w['start'], 'x'),
                    get_coord(w.end if hasattr(w, 'end') else w['end'], 'x')) for w in walls)
    min_z = min(min(get_coord(w.start if hasattr(w, 'start') else w['start'], 'z'),
                    get_coord(w.end if hasattr(w, 'end') else w['end'], 'z')) for w in walls)
    max_z = max(max(get_coord(w.start if hasattr(w, 'start') else w['start'], 'z'),
                    get_coord(w.end if hasattr(w, 'end') else w['end'], 'z')) for w in walls)

    ov = overhang
    x0 = min_x - ov
    x1 = max_x + ov
    z0 = min_z - ov
    z1 = max_z + ov

    width = x1 - x0
    depth = z1 - z0
    base_y = base_elevation
    pitch_rad = math.radians(pitch)
    ridge_height = (depth / 2.0) * math.tan(pitch_rad)
    ridge_y = base_y + max(0.5, ridge_height)

    vertices: List[float] = []
    indices: List[int] = []

    r_type = roof_type.lower()
    if r_type == "hip":
        mid_x = (x0 + x1) / 2.0
        mid_z = (z0 + z1) / 2.0
        v_list = [
            (x0, base_y, z0),  # 0
            (x1, base_y, z0),  # 1
            (x1, base_y, z1),  # 2
            (x0, base_y, z1),  # 3
            (mid_x, ridge_y, mid_z)  # 4 Apex
        ]
        for v in v_list:
            vertices.extend(v)
        indices.extend([
            0, 1, 4,
            1, 2, 4,
            2, 3, 4,
            3, 0, 4
        ])
    elif r_type == "shed":
        high_y = base_y + max(0.8, depth * math.tan(pitch_rad))
        v_list = [
            (x0, high_y, z0),  # 0
            (x1, high_y, z0),  # 1
            (x1, base_y, z1),  # 2
            (x0, base_y, z1)   # 3
        ]
        for v in v_list:
            vertices.extend(v)
        indices.extend([
            0, 1, 2,
            0, 2, 3
        ])
    elif r_type == "flat":
        parapet_y = base_y + 0.35
        v_list = [
            (x0, base_y + 0.1, z0),
            (x1, base_y + 0.1, z0),
            (x1, base_y + 0.1, z1),
            (x0, base_y + 0.1, z1),
            (x0, parapet_y, z0),
            (x1, parapet_y, z0),
            (x1, parapet_y, z1),
            (x0, parapet_y, z1)
        ]
        for v in v_list:
            vertices.extend(v)
        indices.extend([
            0, 1, 2, 0, 2, 3,
            0, 1, 5, 0, 5, 4,
            1, 2, 6, 1, 6, 5,
            2, 3, 7, 2, 7, 6,
            3, 0, 4, 3, 4, 7
        ])
    else:
        # Default: Gable
        mid_x = (x0 + x1) / 2.0
        v_list = [
            (x0, base_y, z0),    # 0
            (mid_x, ridge_y, z0),# 1
            (x1, base_y, z0),    # 2
            (x0, base_y, z1),    # 3
            (mid_x, ridge_y, z1),# 4
            (x1, base_y, z1)     # 5
        ]
        for v in v_list:
            vertices.extend(v)
        indices.extend([
            0, 1, 4, 0, 4, 3,
            1, 2, 5, 1, 5, 4,
            0, 2, 1,
            3, 4, 5
        ])

    faces: List[List[int]] = []
    for i in range(0, len(indices), 3):
        faces.append([indices[i], indices[i + 1], indices[i + 2]])

    normals: List[Tuple[float, float, float]] = []
    for face in faces:
        normals.append((0.0, 1.0, 0.0))

    return {
        "vertices": vertices,
        "faces": faces,
        "indices": indices,
        "normals": normals,
        "roof_type": roof_type,
        "pitch": pitch,
        "overhang": ov,
        "material": material
    }
