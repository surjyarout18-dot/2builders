"""
Computational Geometry & Architectural Topology Processor.
Cleans 2D vector centerlines, snaps corners, and builds clean polygon footprints.
"""
import math
from typing import List, Tuple
from shapely.geometry import LineString, Polygon, MultiPolygon
from backend.app.schemas import WallSchema, PointXZ

class TopologyEngine:
    def __init__(self, snap_tolerance_m: float = 0.08):
        self.snap_tolerance_m = snap_tolerance_m

    def clean_and_snap_walls(self, walls: List[WallSchema]) -> List[WallSchema]:
        """Snaps wall endpoints that are within snap_tolerance_m."""
        if not walls:
            return []

        points = []
        for w in walls:
            points.append([w.start.x, w.start.z])
            points.append([w.end.x, w.end.z])

        n = len(points)
        for i in range(n):
            for j in range(i + 1, n):
                d = math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1])
                if d <= self.snap_tolerance_m:
                    avg_x = round((points[i][0] + points[j][0]) / 2.0, 3)
                    avg_z = round((points[i][1] + points[j][1]) / 2.0, 3)
                    points[i] = [avg_x, avg_z]
                    points[j] = [avg_x, avg_z]

        cleaned = []
        for i, w in enumerate(walls):
            p1 = points[2 * i]
            p2 = points[2 * i + 1]
            length = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
            if length > 0.10:  # Minimum 10cm length
                cleaned.append(WallSchema(
                    id=w.id,
                    floor_id=w.floor_id,
                    start=PointXZ(x=p1[0], z=p1[1]),
                    end=PointXZ(x=p2[0], z=p2[1]),
                    thickness=w.thickness,
                    height=w.height,
                    wall_type=w.wall_type,
                    color=w.color
                ))

        return cleaned

    def get_wall_polygon(self, wall: WallSchema) -> Polygon:
        """Returns 2D buffer polygon of the wall with its thickness."""
        line = LineString([(wall.start.x, wall.start.z), (wall.end.x, wall.end.z)])
        poly = line.buffer(wall.thickness / 2.0, cap_style="flat", join_style="mitre")
        return poly
