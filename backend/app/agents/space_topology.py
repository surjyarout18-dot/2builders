import math
from typing import List, Dict, Any, Tuple
from shapely.geometry import LineString, Polygon, MultiLineString, Point
from shapely.ops import polygonize, unary_union

class SpaceTopologyEngine:
    """
    Constructs 2D architectural topology from wall lines.
    Extracts enclosed room polygons, classifies exterior vs interior walls,
    and calculates accurate dimensions.
    """

    @staticmethod
    def extract_rooms_and_classify_walls(
        walls: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Takes raw wall segments [{'start': {'x': float, 'z': float}, 'end': {'x': float, 'z': float}}]
        Returns:
            classified_walls: List with 'wall_type' ('exterior' | 'interior') and 'thickness' (0.25 | 0.15)
            rooms: List of room objects with polygon, area_sqm, area_sqft, and inferred room_type
        """
        lines = []
        for w in walls:
            sx, sz = w['start']['x'], w['start']['z']
            ex, ez = w['end']['x'], w['end']['z']
            if math.hypot(ex - sx, ez - sz) > 0.05:  # filter degenerate segments
                lines.append(LineString([(sx, sz), (ex, ez)]))

        if not lines:
            return walls, []

        merged_lines = unary_union(lines)
        enclosed_polygons = list(polygonize(merged_lines))

        # Filter very small sliver polygons (< 1.0 m^2)
        valid_polygons = [p for p in enclosed_polygons if p.area >= 1.0]

        # Classify each wall:
        # A wall is interior if both sides (positive and negative normal offset) fall inside rooms
        classified_walls = []
        for i, w in enumerate(walls):
            sx, sz = w['start']['x'], w['start']['z']
            ex, ez = w['end']['x'], w['end']['z']
            dx = ex - sx
            dz = ez - sz
            length = math.hypot(dx, dz)
            
            if length < 0.01:
                continue

            # Unit normal perpendicular to wall
            nx = -dz / length
            nz = dx / length
            
            mx = (sx + ex) / 2.0
            mz = (sz + ez) / 2.0

            # Test points offset by 15cm on both sides
            offset_dist = 0.15
            pt_left = Point(mx + nx * offset_dist, mz + nz * offset_dist)
            pt_right = Point(mx - nx * offset_dist, mz - nz * offset_dist)

            left_inside = any(poly.contains(pt_left) for poly in valid_polygons)
            right_inside = any(poly.contains(pt_right) for poly in valid_polygons)

            if left_inside and right_inside:
                wall_type = "interior"
                thickness = 0.15
            else:
                wall_type = "exterior"
                thickness = 0.25

            wall_id = w.get('id', f"w_{i}")
            classified_walls.append({
                "id": wall_id,
                "floor_id": w.get('floor_id', 'floor_0'),
                "start": {"x": round(sx, 3), "z": round(sz, 3)},
                "end": {"x": round(ex, 3), "z": round(ez, 3)},
                "thickness": thickness,
                "height": w.get('height', 2.80),
                "wall_type": wall_type,
                "color": w.get('color', "#F8FAFC" if wall_type == "exterior" else "#E2E8F0")
            })

        # Build room structures
        rooms = []
        for idx, poly in enumerate(valid_polygons):
            area_m2 = round(poly.area, 2)
            area_sqft = round(area_m2 * 10.7639, 1)

            # Heuristic Room Typing
            if area_m2 > 30.0:
                room_type = "living_room"
                room_name = f"Living Great Room {idx+1}"
                floor_material = "parquet_herringbone"
            elif area_m2 >= 14.0:
                room_type = "bedroom"
                room_name = f"Master Suite {idx+1}" if idx == 0 else f"Bedroom {idx+1}"
                floor_material = "hardwood_oak"
            elif area_m2 >= 8.0:
                room_type = "kitchen"
                room_name = f"Kitchen & Dining {idx+1}"
                floor_material = "tile_slate"
            else:
                room_type = "bathroom"
                room_name = f"En-suite Bath {idx+1}"
                floor_material = "tile_marble"

            coords = list(poly.exterior.coords)[:-1]  # omit duplicate closing point
            polygon_pts = [{"x": round(pt[0], 3), "z": round(pt[1], 3)} for pt in coords]

            rooms.append({
                "id": f"rm_{idx+1}",
                "floor_id": "floor_0",
                "name": room_name,
                "room_type": room_type,
                "area_sqm": area_m2,
                "area_sqft": area_sqft,
                "floor_material": floor_material,
                "wall_color": "#F1F5F9",
                "polygon": polygon_pts
            })

        return classified_walls, rooms
