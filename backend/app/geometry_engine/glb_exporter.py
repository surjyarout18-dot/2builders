"""
GLTF 2.0 Binary (GLB) & Wavefront OBJ Exporter Engine.
Packages parametric building meshes into industry-standard 3D formats without external CLI dependencies.
"""
import struct
import json
from typing import List, Dict, Any, Tuple
from backend.app.schemas import WallSchema, RoomSchema, DoorSchema, WindowSchema
from backend.app.geometry_engine.mesh_generator import MeshGenerator

def export_model_to_glb(
    walls: List[WallSchema],
    rooms: List[RoomSchema] = [],
    doors: List[DoorSchema] = [],
    windows: List[WindowSchema] = []
) -> bytes:
    """
    Exports architectural model into self-contained binary glTF 2.0 (.glb) format.
    """
    generator = MeshGenerator()
    
    # Aggregate all geometry
    # Each sub-mesh will have vertices, normals, indices, and material
    submeshes = []

    # 1. Walls
    for wall in walls:
        m = generator.generate_wall_mesh(wall, doors, windows)
        if len(m["vertices"]) > 0:
            submeshes.append({
                "name": f"Wall_{wall.id}",
                "vertices": m["vertices"],
                "normals": m["normals"],
                "indices": m["indices"],
                "color": [0.85, 0.88, 0.92, 1.0],
                "roughness": 0.8,
                "metallic": 0.1
            })

    # 2. Floors
    for room in rooms:
        m = generator.generate_floor_mesh(room, elevation=0.0)
        if len(m["vertices"]) > 0:
            submeshes.append({
                "name": f"Floor_{room.id}",
                "vertices": m["vertices"],
                "normals": m["normals"],
                "indices": m["indices"],
                "color": [0.72, 0.65, 0.55, 1.0],  # Warm architectural oak tone
                "roughness": 0.6,
                "metallic": 0.05
            })

    # If no meshes exist, add a fallback ground slab
    if not submeshes:
        submeshes.append({
            "name": "Ground",
            "vertices": [[-5.0, 0.0, -5.0], [5.0, 0.0, -5.0], [5.0, 0.0, 5.0], [-5.0, 0.0, 5.0]],
            "normals": [[0.0, 1.0, 0.0], [0.0, 1.0, 0.0], [0.0, 1.0, 0.0], [0.0, 1.0, 0.0]],
            "indices": [0, 1, 2, 0, 2, 3],
            "color": [0.5, 0.5, 0.5, 1.0],
            "roughness": 0.9,
            "metallic": 0.0
        })

    # Pack binary buffer
    bin_data = bytearray()
    buffer_views = []
    accessors = []
    meshes_json = []
    materials_json = []
    nodes_json = []

    for idx, sm in enumerate(submeshes):
        # 1. Material
        mat_idx = len(materials_json)
        materials_json.append({
            "name": f"Mat_{sm['name']}",
            "pbrMetallicRoughness": {
                "baseColorFactor": sm["color"],
                "roughnessFactor": sm["roughness"],
                "metallicFactor": sm["metallic"]
            },
            "doubleSided": True
        })

        # 2. Position attribute (VEC3, FLOAT)
        pos_offset = len(bin_data)
        min_v = [float("inf"), float("inf"), float("inf")]
        max_v = [float("-inf"), float("-inf"), float("-inf")]
        for v in sm["vertices"]:
            bin_data.extend(struct.pack("<fff", v[0], v[1], v[2]))
            for k in range(3):
                min_v[k] = min(min_v[k], v[k])
                max_v[k] = max(max_v[k], v[k])
        pos_len = len(bin_data) - pos_offset
        # Pad to 4 bytes
        while len(bin_data) % 4 != 0:
            bin_data.append(0)

        pos_bv_idx = len(buffer_views)
        buffer_views.append({
            "buffer": 0,
            "byteOffset": pos_offset,
            "byteLength": pos_len,
            "target": 34962 # ARRAY_BUFFER
        })

        pos_acc_idx = len(accessors)
        accessors.append({
            "bufferView": pos_bv_idx,
            "byteOffset": 0,
            "componentType": 5126, # FLOAT
            "count": len(sm["vertices"]),
            "type": "VEC3",
            "min": min_v,
            "max": max_v
        })

        # 3. Normal attribute (VEC3, FLOAT)
        norm_offset = len(bin_data)
        for n in sm["normals"]:
            bin_data.extend(struct.pack("<fff", n[0], n[1], n[2]))
        norm_len = len(bin_data) - norm_offset
        while len(bin_data) % 4 != 0:
            bin_data.append(0)

        norm_bv_idx = len(buffer_views)
        buffer_views.append({
            "buffer": 0,
            "byteOffset": norm_offset,
            "byteLength": norm_len,
            "target": 34962
        })

        norm_acc_idx = len(accessors)
        accessors.append({
            "bufferView": norm_bv_idx,
            "byteOffset": 0,
            "componentType": 5126,
            "count": len(sm["normals"]),
            "type": "VEC3"
        })

        # 4. Indices (SCALAR, UNSIGNED_INT)
        idx_offset = len(bin_data)
        for i in sm["indices"]:
            bin_data.extend(struct.pack("<I", i))
        idx_len = len(bin_data) - idx_offset
        while len(bin_data) % 4 != 0:
            bin_data.append(0)

        idx_bv_idx = len(buffer_views)
        buffer_views.append({
            "buffer": 0,
            "byteOffset": idx_offset,
            "byteLength": idx_len,
            "target": 34963 # ELEMENT_ARRAY_BUFFER
        })

        idx_acc_idx = len(accessors)
        accessors.append({
            "bufferView": idx_bv_idx,
            "byteOffset": 0,
            "componentType": 5125, # UNSIGNED_INT
            "count": len(sm["indices"]),
            "type": "SCALAR"
        })

        # Mesh JSON
        mesh_idx = len(meshes_json)
        meshes_json.append({
            "name": sm["name"],
            "primitives": [{
                "attributes": {
                    "POSITION": pos_acc_idx,
                    "NORMAL": norm_acc_idx
                },
                "indices": idx_acc_idx,
                "material": mat_idx
            }]
        })

        # Node
        node_idx = len(nodes_json)
        nodes_json.append({
            "name": sm["name"],
            "mesh": mesh_idx
        })

    # glTF JSON manifest
    gltf_dict = {
        "asset": {"version": "2.0", "generator": "Sketch2Space Engine"},
        "scene": 0,
        "scenes": [{"nodes": list(range(len(nodes_json)))}],
        "nodes": nodes_json,
        "meshes": meshes_json,
        "materials": materials_json,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{"byteLength": len(bin_data)}]
    }

    json_str = json.dumps(gltf_dict, separators=(",", ":"))
    json_bytes = json_str.encode("utf-8")
    # Pad JSON to 4-byte boundary with spaces (0x20)
    while len(json_bytes) % 4 != 0:
        json_bytes += b" "

    # Total file size = 12 (header) + 8 (json chunk header) + len(json_bytes) + 8 (bin chunk header) + len(bin_data)
    total_length = 12 + 8 + len(json_bytes) + 8 + len(bin_data)

    # Pack binary GLB
    # Header: magic (glTF = 0x46546C67), version (2), total_length
    glb_out = bytearray()
    glb_out.extend(struct.pack("<4sII", b"glTF", 2, total_length))

    # Chunk 0: JSON (type = 0x4E4F534A 'JSON')
    glb_out.extend(struct.pack("<II", len(json_bytes), 0x4E4F534A))
    glb_out.extend(json_bytes)

    # Chunk 1: BIN (type = 0x004E4942 'BIN\0')
    glb_out.extend(struct.pack("<II", len(bin_data), 0x004E4942))
    glb_out.extend(bin_data)

    return bytes(glb_out)

def export_model_to_obj(
    walls: List[WallSchema],
    rooms: List[RoomSchema] = [],
    doors: List[DoorSchema] = [],
    windows: List[WindowSchema] = []
) -> str:
    """
    Exports architectural model into standard Wavefront OBJ format.
    """
    generator = MeshGenerator()
    lines = [
        "# Sketch2Space Wavefront OBJ Export",
        "# 100% Free Forever Architecture Platform",
        "o BuildingModel"
    ]

    vert_offset = 1

    # Walls
    for wall in walls:
        m = generator.generate_wall_mesh(wall, doors, windows)
        if not m["vertices"]:
            continue
        lines.append(f"g Wall_{wall.id}")
        for v in m["vertices"]:
            lines.append(f"v {v[0]:.4f} {v[1]:.4f} {v[2]:.4f}")
        for n in m["normals"]:
            lines.append(f"vn {n[0]:.4f} {n[1]:.4f} {n[2]:.4f}")

        # Faces (3 indices per triangle)
        indices = m["indices"]
        for k in range(0, len(indices), 3):
            i1 = indices[k] + vert_offset
            i2 = indices[k + 1] + vert_offset
            i3 = indices[k + 2] + vert_offset
            lines.append(f"f {i1}//{i1} {i2}//{i2} {i3}//{i3}")

        vert_offset += len(m["vertices"])

    # Floors
    for room in rooms:
        m = generator.generate_floor_mesh(room, elevation=0.0)
        if not m["vertices"]:
            continue
        lines.append(f"g Floor_{room.id}")
        for v in m["vertices"]:
            lines.append(f"v {v[0]:.4f} {v[1]:.4f} {v[2]:.4f}")
        for n in m["normals"]:
            lines.append(f"vn {n[0]:.4f} {n[1]:.4f} {n[2]:.4f}")

        indices = m["indices"]
        for k in range(0, len(indices), 3):
            i1 = indices[k] + vert_offset
            i2 = indices[k + 1] + vert_offset
            i3 = indices[k + 2] + vert_offset
            lines.append(f"f {i1}//{i1} {i2}//{i2} {i3}//{i3}")

        vert_offset += len(m["vertices"])

    return "\n".join(lines)
