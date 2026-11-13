"""
3D Mesh Generation Engine.
Generates parametric vertices, normals, UVs, and indices for walls with cutouts, floors, and ceilings.
"""
import math
from typing import List, Dict, Any, Tuple, Optional
from shapely.geometry import Polygon
from shapely.ops import triangulate
from backend.app.schemas import WallSchema, DoorSchema, WindowSchema, RoomSchema, PointXZ

class MeshGenerator:
    def __init__(self):
        pass

    def generate_wall_mesh(
        self,
        wall: WallSchema,
        doors: List[DoorSchema] = [],
        windows: List[WindowSchema] = []
    ) -> Dict[str, Any]:
        """
        Extrudes a wall into 3D with clean boolean-style cutouts for doors and windows.
        Produces watertight oriented 3D triangle mesh.
        """
        x1, z1 = wall.start.x, wall.start.z
        x2, z2 = wall.end.x, wall.end.z
        dx, dz = x2 - x1, z2 - z1
        wall_len = math.hypot(dx, dz)
        if wall_len < 0.01:
            return {"vertices": [], "normals": [], "uvs": [], "indices": []}

        # Unit vector along wall length (u) and perpendicular normal in XZ plane (n)
        ux, uz = dx / wall_len, dz / wall_len
        nx, nz = -uz, ux
        half_t = wall.thickness / 2.0
        wall_h = wall.height

        # Collect openings along this wall
        openings: List[Dict[str, float]] = []

        # Find doors hosted on this wall
        for d in doors:
            if d.wall_id == wall.id or self._is_point_on_wall(d.position.x, d.position.z, x1, z1, x2, z2):
                # Project door position along wall
                s = self._project_point(d.position.x, d.position.z, x1, z1, ux, uz)
                half_w = d.width / 2.0
                s_start = max(0.0, s - half_w)
                s_end = min(wall_len, s + half_w)
                if s_end > s_start:
                    openings.append({
                        "start": s_start,
                        "end": s_end,
                        "bottom": 0.0,
                        "top": min(wall_h, d.height),
                        "type": "door"
                    })

        # Find windows hosted on this wall
        for w in windows:
            if w.wall_id == wall.id or self._is_point_on_wall(w.position.x, w.position.z, x1, z1, x2, z2):
                s = self._project_point(w.position.x, w.position.z, x1, z1, ux, uz)
                half_w = w.width / 2.0
                s_start = max(0.0, s - half_w)
                s_end = min(wall_len, s + half_w)
                if s_end > s_start:
                    openings.append({
                        "start": s_start,
                        "end": s_end,
                        "bottom": max(0.0, w.sill_height),
                        "top": min(wall_h, w.sill_height + w.height),
                        "type": "window"
                    })

        # Sort openings by start coordinate
        openings.sort(key=lambda o: o["start"])

        # Subdivide wall into parametric 3D bounding blocks:
        # A block is defined by: s_min, s_max, y_min, y_max
        blocks: List[Tuple[float, float, float, float]] = []

        current_s = 0.0
        for op in openings:
            # 1. Solid full-height wall before opening
            if op["start"] > current_s + 0.01:
                blocks.append((current_s, op["start"], 0.0, wall_h))

            # 2. Window sill below opening (if bottom > 0)
            if op["bottom"] > 0.01:
                blocks.append((op["start"], op["end"], 0.0, op["bottom"]))

            # 3. Lintel segment above opening (if top < wall_h)
            if wall_h > op["top"] + 0.01:
                blocks.append((op["start"], op["end"], op["top"], wall_h))

            current_s = max(current_s, op["end"])

        # Remaining wall after last opening
        if current_s < wall_len - 0.01:
            blocks.append((current_s, wall_len, 0.0, wall_h))

        # If no openings, the whole wall is a single block
        if not blocks:
            blocks.append((0.0, wall_len, 0.0, wall_h))

        # Build 3D box meshes for each block and concatenate
        all_vertices: List[List[float]] = []
        all_normals: List[List[float]] = []
        all_uvs: List[List[float]] = []
        all_indices: List[int] = []

        for s_min, s_max, y_min, y_max in blocks:
            self._add_box_block(
                x1, z1, ux, uz, nx, nz, half_t,
                s_min, s_max, y_min, y_max,
                all_vertices, all_normals, all_uvs, all_indices
            )

        return {
            "vertices": all_vertices,
            "normals": all_normals,
            "uvs": all_uvs,
            "indices": all_indices
        }

    def _add_box_block(
        self,
        x1: float, z1: float,
        ux: float, uz: float,
        nx: float, nz: float,
        half_t: float,
        s0: float, s1: float,
        y0: float, y1: float,
        vertices: List[List[float]],
        normals: List[List[float]],
        uvs: List[List[float]],
        indices: List[int]
    ):
        """Creates an extruded 3D oriented box with 6 faces."""
        # Calculate the 4 base corners in XZ plane
        # c0: s0, -half_t; c1: s1, -half_t; c2: s1, +half_t; c3: s0, +half_t
        def get_pos(s: float, t_side: float, y: float):
            px = x1 + s * ux + t_side * nx
            pz = z1 + s * uz + t_side * nz
            return [round(px, 4), round(y, 4), round(pz, 4)]

        # 8 box corners
        p0 = get_pos(s0, -half_t, y0)
        p1 = get_pos(s1, -half_t, y0)
        p2 = get_pos(s1, +half_t, y0)
        p3 = get_pos(s0, +half_t, y0)
        p4 = get_pos(s0, -half_t, y1)
        p5 = get_pos(s1, -half_t, y1)
        p6 = get_pos(s1, +half_t, y1)
        p7 = get_pos(s0, +half_t, y1)

        # 6 faces: (4 corners, normal vector)
        # Front (-half_t)
        faces = [
            ([p0, p1, p5, p4], [-nx, 0.0, -nz]),
            # Back (+half_t)
            ([p2, p3, p7, p6], [nx, 0.0, nz]),
            # Top
            ([p4, p5, p6, p7], [0.0, 1.0, 0.0]),
            # Bottom
            ([p3, p2, p1, p0], [0.0, -1.0, 0.0]),
            # Start cap (s0)
            ([p3, p0, p4, p7], [-ux, 0.0, -uz]),
            # End cap (s1)
            ([p1, p2, p6, p5], [ux, 0.0, uz]),
        ]

        for pts, norm in faces:
            base_idx = len(vertices)
            for i, pt in enumerate(pts):
                vertices.append(pt)
                normals.append(norm)
            uvs.extend([[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]])
            # Two triangles per face (0, 1, 2) and (0, 2, 3)
            indices.extend([
                base_idx, base_idx + 1, base_idx + 2,
                base_idx, base_idx + 2, base_idx + 3
            ])

    def generate_floor_mesh(self, room: RoomSchema, elevation: float = 0.0) -> Dict[str, Any]:
        """Triangulates the room polygon into a 3D floor slab."""
        if len(room.polygon) < 3:
            return {"vertices": [], "normals": [], "uvs": [], "indices": []}

        coords = [(pt.x, pt.z) for pt in room.polygon]
        poly = Polygon(coords)
        if not poly.is_valid:
            poly = poly.buffer(0)
        if poly.is_empty:
            return {"vertices": [], "normals": [], "uvs": [], "indices": []}

        # Triangulate polygon using Shapely Delaunay triangulation
        triangles = triangulate(poly)
        vertices: List[List[float]] = []
        normals: List[List[float]] = []
        uvs: List[List[float]] = []
        indices: List[int] = []

        for tri in triangles:
            # Check if triangle centroid is inside the room polygon
            if poly.contains(tri.centroid):
                pts = list(tri.exterior.coords)[:3]
                base_idx = len(vertices)
                for pt in pts:
                    vertices.append([round(pt[0], 4), round(elevation, 4), round(pt[1], 4)])
                    normals.append([0.0, 1.0, 0.0])
                    uvs.append([round(pt[0] / 3.0, 4), round(pt[1] / 3.0, 4)])
                indices.extend([base_idx, base_idx + 1, base_idx + 2])

        return {
            "vertices": vertices,
            "normals": normals,
            "uvs": uvs,
            "indices": indices
        }

    def _is_point_on_wall(self, px: float, pz: float, x1: float, z1: float, x2: float, z2: float) -> bool:
        dx, dz = x2 - x1, z2 - z1
        sq = dx * dx + dz * dz
        if sq == 0:
            return False
        u = max(0.0, min(1.0, ((px - x1) * dx + (pz - z1) * dz) / sq))
        nx = x1 + u * dx
        nz = z1 + u * dz
        return math.hypot(px - nx, pz - nz) < 0.25

    def _project_point(self, px: float, pz: float, x1: float, z1: float, ux: float, uz: float) -> float:
        return (px - x1) * ux + (pz - z1) * uz
