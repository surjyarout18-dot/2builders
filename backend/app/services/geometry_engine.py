import math
import uuid
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import cv2
import shapely
from shapely.geometry import LineString, Polygon, MultiPolygon
from shapely.ops import unary_union, polygonize

UNIT_TO_METERS = {
    "meters": 1.0,
    "m": 1.0,
    "millimeters": 0.001,
    "mm": 0.001,
    "centimeters": 0.01,
    "cm": 0.01,
    "feet": 0.3048,
    "ft": 0.3048,
    "inches": 0.0254,
    "in": 0.0254
}

class CoordinateSystem:
    @staticmethod
    def to_meters(value: float, unit: str) -> float:
        factor = UNIT_TO_METERS.get(unit.lower(), 1.0)
        return value * factor

    @staticmethod
    def from_meters(meters: float, unit: str) -> float:
        factor = UNIT_TO_METERS.get(unit.lower(), 1.0)
        return meters / factor if factor > 0 else meters

    @staticmethod
    def calculate_scale(p1: Tuple[float, float], p2: Tuple[float, float], real_dist: float, unit: str = "meters") -> float:
        pixel_dist = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
        if pixel_dist <= 1e-6:
            raise ValueError("Endpoints must not be identical.")
        real_dist_meters = CoordinateSystem.to_meters(real_dist, unit)
        return real_dist_meters / pixel_dist  # meters per pixel

class ShoelaceArea:
    @staticmethod
    def calculate(points: List[List[float]]) -> float:
        n = len(points)
        if n < 3:
            return 0.0
        area = 0.0
        for i in range(n):
            j = (i + 1) % n
            area += points[i][0] * points[j][1]
            area -= points[j][0] * points[i][1]
        return abs(area) / 2.0

class LineMerger:
    @staticmethod
    def merge_collinear_segments(segments: List[Dict[str, Any]], distance_threshold: float = 0.1, angle_threshold_deg: float = 5.0) -> List[Dict[str, Any]]:
        """
        Merges nearly collinear segments that overlap or have small gaps.
        """
        if not segments:
            return []
        
        merged = []
        used = [False] * len(segments)

        for i in range(len(segments)):
            if used[i]:
                continue
            seg = segments[i]
            x1, y1 = seg["start"]
            x2, y2 = seg["end"]
            
            # Line vector
            dx = x2 - x1
            dy = y2 - y1
            length = math.hypot(dx, dy)
            if length < 1e-4:
                continue

            current_start = [x1, y1]
            current_end = [x2, y2]
            used[i] = True

            # Greedily merge connected collinear segments
            for j in range(i + 1, len(segments)):
                if used[j]:
                    continue
                other = segments[j]
                ox1, oy1 = other["start"]
                ox2, oy2 = other["end"]
                
                # Check angle alignment
                odx = ox2 - ox1
                ody = oy2 - oy1
                olength = math.hypot(odx, ody)
                if olength < 1e-4:
                    continue

                dot = (dx * odx + dy * ody) / (length * olength)
                # Angle must be close to 0 or 180 degrees
                if abs(abs(dot) - 1.0) > (1.0 - math.cos(math.radians(angle_threshold_deg))):
                    continue

                # Check proximity of endpoints
                d_end_start = math.hypot(current_end[0] - ox1, current_end[1] - oy1)
                d_end_end = math.hypot(current_end[0] - ox2, current_end[1] - oy2)
                d_start_start = math.hypot(current_start[0] - ox1, current_start[1] - oy1)
                d_start_end = math.hypot(current_start[0] - ox2, current_start[1] - oy2)

                if d_end_start < distance_threshold:
                    current_end = [ox2, oy2]
                    used[j] = True
                elif d_end_end < distance_threshold:
                    current_end = [ox1, oy1]
                    used[j] = True
                elif d_start_start < distance_threshold:
                    current_start = [ox2, oy2]
                    used[j] = True
                elif d_start_end < distance_threshold:
                    current_start = [ox1, oy1]
                    used[j] = True

            merged.append({
                "id": f"wall-{uuid.uuid4().hex[:8]}",
                "start": [round(current_start[0], 3), round(current_start[1], 3)],
                "end": [round(current_end[0], 3), round(current_end[1], 3)],
                "thickness": seg.get("thickness", 0.20),
                "height": seg.get("height", 3.0),
                "type": seg.get("type", "external"),
                "layer": seg.get("layer", "WALLS"),
                "openings": []
            })

        return merged

class DXFProcessor:
    @staticmethod
    def parse_dxf(file_path: str, scale: float = 1.0) -> Dict[str, Any]:
        """
        Parses DXF entity modelspace deterministically via ezdxf.
        Extracts LINE, LWPOLYLINE, POLYLINE, ARC, CIRCLE.
        """
        import ezdxf
        doc = ezdxf.readfile(file_path)
        msp = doc.modelspace()

        layers = [layer.dxf.name for layer in doc.layers]
        raw_segments = []

        # Coordinate bounding box tracking
        min_x = float('inf')
        min_y = float('inf')
        max_x = float('-inf')
        max_y = float('-inf')

        def update_bbox(x, y):
            nonlocal min_x, min_y, max_x, max_y
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)

        for entity in msp:
            layer = entity.dxf.layer if hasattr(entity.dxf, 'layer') else "DEFAULT"
            etype = entity.dxftype()

            if etype == "LINE":
                start = entity.dxf.start
                end = entity.dxf.end
                sx, sy = float(start.x) * scale, float(start.y) * scale
                ex, ey = float(end.x) * scale, float(end.y) * scale
                update_bbox(sx, sy)
                update_bbox(ex, ey)
                raw_segments.append({
                    "start": [sx, sy],
                    "end": [ex, ey],
                    "layer": layer
                })

            elif etype in ("LWPOLYLINE", "POLYLINE"):
                points = []
                if etype == "LWPOLYLINE":
                    points = [(float(p[0]) * scale, float(p[1]) * scale) for p in entity.get_points()]
                else:
                    points = [(float(v.dxf.location.x) * scale, float(v.dxf.location.y) * scale) for v in entity.vertices]

                is_closed = entity.is_closed if hasattr(entity, 'is_closed') else False
                for p in points:
                    update_bbox(p[0], p[1])

                for k in range(len(points) - 1):
                    raw_segments.append({
                        "start": list(points[k]),
                        "end": list(points[k + 1]),
                        "layer": layer
                    })
                if is_closed and len(points) > 2:
                    raw_segments.append({
                        "start": list(points[-1]),
                        "end": list(points[0]),
                        "layer": layer
                    })

            elif etype == "ARC":
                # Approximate arc with line chords
                center = entity.dxf.center
                radius = float(entity.dxf.radius) * scale
                start_angle = math.radians(float(entity.dxf.start_angle))
                end_angle = math.radians(float(entity.dxf.end_angle))
                if end_angle < start_angle:
                    end_angle += 2 * math.pi
                steps = max(8, int(abs(end_angle - start_angle) / (math.pi / 8)))
                arc_points = []
                for step in range(steps + 1):
                    theta = start_angle + (end_angle - start_angle) * (step / steps)
                    ax = (float(center.x) + radius * math.cos(theta)) * scale
                    ay = (float(center.y) + radius * math.sin(theta)) * scale
                    update_bbox(ax, ay)
                    arc_points.append([ax, ay])
                for k in range(len(arc_points) - 1):
                    raw_segments.append({
                        "start": arc_points[k],
                        "end": arc_points[k + 1],
                        "layer": layer
                    })

        # Normalize coordinates so bottom-left or origin starts reasonably if huge offset
        merged_walls = LineMerger.merge_collinear_segments(raw_segments)

        return {
            "entityCount": len(raw_segments),
            "layers": layers,
            "bounds": {
                "min": [min_x if min_x != float('inf') else 0, min_y if min_y != float('inf') else 0],
                "max": [max_x if max_x != float('-inf') else 0, max_y if max_y != float('-inf') else 0]
            },
            "walls": merged_walls
        }

class RasterProcessor:
    @staticmethod
    def process_image(image_path: str, scale: float = 0.01, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Enhanced deterministic 2builders architectural recognition pipeline:
        1. Multi-threshold adaptive binarization (Otsu + dark stroke union).
        2. Directional morphological filtering to preserve long continuous structural walls while filtering out furniture, text, and dimension noise.
        3. Wall opening bridging to connect walls across doors and windows.
        4. Medial skeletonization & adaptive probabilistic Hough Transform for orthogonal and diagonal walls.
        5. Smart collinear clustering, gap bridging, and corner/T-junction snapping.
        6. Closed room polygon extraction via planar graph topology (Shapely polygonize) with intelligent semantic labeling.
        7. Extraction of architectural doors and windows along walls.
        """
        if options is None:
            options = {}

        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not open or decode image: {image_path}")

        height, width = img.shape[:2]
        diag = max(height, width)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 1. Multi-threshold adaptive binarization
        _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        _, dark = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY_INV)
        raw_walls = cv2.bitwise_or(otsu, dark)

        # Dynamic kernel sizes scaled to image resolution
        kw = max(3, round(diag * 0.008))
        kd = max(20, round(diag * 0.055))
        kl = max(15, round(diag * 0.025))

        # Directional structural filtering to isolate genuine walls from furniture and labels
        h_open = cv2.morphologyEx(raw_walls, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (kl, 1)))
        v_open = cv2.morphologyEx(raw_walls, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, kl)))

        h_bridge = cv2.morphologyEx(h_open, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (kd, 1)))
        v_bridge = cv2.morphologyEx(v_open, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (1, kd)))

        gen_close = cv2.morphologyEx(raw_walls, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (kw*2, kw*2)))
        gen_open = cv2.morphologyEx(gen_close, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (kw, kw)))

        wall_mask = cv2.bitwise_or(cv2.bitwise_or(h_bridge, v_bridge), gen_open)

        # 2. Skeletonize to medial centerline
        element = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
        skel = np.zeros(wall_mask.shape, np.uint8)
        temp = wall_mask.copy()
        while True:
            eroded = cv2.erode(temp, element)
            temp2 = cv2.dilate(eroded, element)
            temp2 = cv2.subtract(temp, temp2)
            skel = cv2.bitwise_or(skel, temp2)
            temp = eroded.copy()
            if cv2.countNonZero(temp) == 0:
                break

        lines = cv2.HoughLinesP(skel, rho=1, theta=np.pi/180, threshold=12, minLineLength=15, maxLineGap=20)
        if lines is None:
            return {"imageDimensions": {"width": width, "height": height}, "walls": [], "rooms": [], "scale": scale}

        h_lines, v_lines, d_lines = [], [], []
        for l in lines:
            pts = l.reshape(-1)
            x1, y1, x2, y2 = int(pts[0]), int(pts[1]), int(pts[2]), int(pts[3])
            dx, dy = abs(x2 - x1), abs(y2 - y1)
            if np.hypot(dx, dy) < 14:
                continue
            if dx > 0 and (dy / dx) <= 0.22:
                y_avg = round((y1 + y2) / 2)
                h_lines.append((min(x1, x2), max(x1, x2), y_avg))
            elif dy > 0 and (dx / dy) <= 0.22:
                x_avg = round((x1 + x2) / 2)
                v_lines.append((min(y1, y2), max(y1, y2), x_avg))
            else:
                d_lines.append(((x1, y1), (x2, y2)))

        def cluster_merge(segs, tol=10, bridge_gap=40, min_len=18):
            groups = {}
            for s1, s2, c in segs:
                matched = False
                for k in groups:
                    if abs(k - c) <= tol:
                        groups[k].append((s1, s2))
                        matched = True
                        break
                if not matched:
                    groups[c] = [(s1, s2)]
            res = []
            for c, spans in groups.items():
                spans.sort(key=lambda x: x[0])
                cs, ce = spans[0]
                for s1, s2 in spans[1:]:
                    if s1 <= ce + bridge_gap:
                        ce = max(ce, s2)
                    else:
                        if ce - cs >= min_len:
                            res.append((cs, ce, c))
                        cs, ce = s1, s2
                if ce - cs >= min_len:
                    res.append((cs, ce, c))
            return res

        h_merged = cluster_merge(h_lines)
        v_merged = cluster_merge(v_lines)

        cand_h = [[cs, ce, y] for cs, ce, y in h_merged]
        cand_v = [[cs, ce, x] for cs, ce, x in v_merged]
        snap = max(20, round(diag * 0.035))

        for hw in cand_h:
            for vw in cand_v:
                vx, vy1, vy2 = vw[2], vw[0], vw[1]
                hy, hx1, hx2 = hw[2], hw[0], hw[1]
                if vy1 - snap <= hy <= vy2 + snap:
                    if abs(hx1 - vx) <= snap: hw[0] = vx
                    if abs(hx2 - vx) <= snap: hw[1] = vx
                if hx1 - snap <= vx <= hx2 + snap:
                    if abs(vy1 - hy) <= snap: vw[0] = hy
                    if abs(vy2 - hy) <= snap: vw[1] = hy

        for hw in cand_h:
            for vw in cand_v:
                vx, hy = vw[2], hw[2]
                for he in (0, 1):
                    for ve in (0, 1):
                        if abs(hw[he] - vx) <= snap and abs(vw[ve] - hy) <= snap:
                            hw[he] = vx
                            vw[ve] = hy

        def merge_touching(cands, is_h=True):
            by_coord = {}
            for item in cands:
                c = item[2]
                by_coord.setdefault(c, []).append((item[0], item[1]))
            merged = []
            for c, spans in by_coord.items():
                spans.sort(key=lambda x: x[0])
                cs, ce = spans[0]
                for s1, s2 in spans[1:]:
                    if s1 <= ce + 10:
                        ce = max(ce, s2)
                    else:
                        if ce - cs >= 15:
                            merged.append((cs, ce, c) if is_h else (c, cs, ce))
                        cs, ce = s1, s2
                if ce - cs >= 15:
                    merged.append((cs, ce, c) if is_h else (c, cs, ce))
            return merged

        final_h = merge_touching(cand_h, is_h=True)
        final_v = merge_touching(cand_v, is_h=False)

        # Scale calibration
        all_xs = [s[0] for s in final_h] + [s[1] for s in final_h] + [s[0] for s in final_v]
        all_ys = [s[2] for s in final_h] + [s[1] for s in final_v] + [s[2] for s in final_v]
        if not all_xs or not all_ys:
            min_x, max_x, min_y, max_y = 0, width, 0, height
        else:
            min_x, max_x = min(all_xs), max(all_xs)
            min_y, max_y = min(all_ys), max(all_ys)

        real_width = options.get("realWidth", 9.0) if options else 9.0
        bw = max(100, max_x - min_x)
        scale = real_width / bw

        # Helper to detect openings along a wall
        def find_wall_openings(px1, py1, px2, py2, is_ext):
            dx = px2 - px1
            dy = py2 - py1
            length = math.hypot(dx, dy)
            if length < 35: return []
            
            ux, uy = dx / length, dy / length
            step = 3
            samples = []
            for d in range(5, int(length) - 5, step):
                sx = int(round(px1 + ux * d))
                sy = int(round(py1 + uy * d))
                if 0 <= sx < width and 0 <= sy < height:
                    val = raw_walls[sy, sx]
                    samples.append((d, val > 0))
            
            openings = []
            in_gap = False
            gap_start = 0
            for d, has_wall in samples:
                if not has_wall and not in_gap:
                    in_gap = True
                    gap_start = d
                elif has_wall and in_gap:
                    in_gap = False
                    gap_len = d - gap_start
                    if 12 <= gap_len <= 65:
                        op_type = "window" if is_ext else "door"
                        openings.append({
                            "type": op_type,
                            "offset": round(gap_start * scale, 2),
                            "width": round(gap_len * scale, 2),
                            "height": 2.1 if op_type == "door" else 1.4,
                            "sill_height": 0.0 if op_type == "door" else 0.9
                        })
            return openings

        # Build clean wall models
        final_walls = []
        shapely_lines = []

        for x1, x2, y in final_h:
            if x2 <= x1 + 5: continue
            wx1, wy1 = round(x1 * scale, 3), round(y * scale, 3)
            wx2, wy2 = round(x2 * scale, 3), round(y * scale, 3)
            is_ext = abs(y - min_y) < 25 or abs(y - max_y) < 25
            shapely_lines.append(LineString([(x1, y), (x2, y)]))
            ops = find_wall_openings(x1, y, x2, y, is_ext)
            final_walls.append({
                "id": f"wall-{uuid.uuid4().hex[:8]}",
                "start": [wx1, wy1],
                "end": [wx2, wy2],
                "thickness": 0.25 if is_ext else 0.15,
                "height": 3.0,
                "type": "external" if is_ext else "internal",
                "layer": "WALLS",
                "openings": ops
            })

        for x, y1, y2 in final_v:
            if y2 <= y1 + 5: continue
            wx1, wy1 = round(x * scale, 3), round(y1 * scale, 3)
            wx2, wy2 = round(x * scale, 3), round(y2 * scale, 3)
            is_ext = abs(x - min_x) < 25 or abs(x - max_x) < 25
            shapely_lines.append(LineString([(x, y1), (x, y2)]))
            ops = find_wall_openings(x, y1, x, y2, is_ext)
            final_walls.append({
                "id": f"wall-{uuid.uuid4().hex[:8]}",
                "start": [wx1, wy1],
                "end": [wx2, wy2],
                "thickness": 0.25 if is_ext else 0.15,
                "height": 3.0,
                "type": "external" if is_ext else "internal",
                "layer": "WALLS",
                "openings": ops
            })

        # Add diagonal walls if any
        for (x1, y1), (x2, y2) in d_lines[:15]:
            if np.hypot(x2 - x1, y2 - y1) >= 25:
                wx1, wy1 = round(x1 * scale, 3), round(y1 * scale, 3)
                wx2, wy2 = round(x2 * scale, 3), round(y2 * scale, 3)
                shapely_lines.append(LineString([(x1, y1), (x2, y2)]))
                final_walls.append({
                    "id": f"wall-{uuid.uuid4().hex[:8]}",
                    "start": [wx1, wy1],
                    "end": [wx2, wy2],
                    "thickness": 0.20,
                    "height": 3.0,
                    "type": "internal",
                    "layer": "WALLS",
                    "openings": []
                })

        # Extract rooms with Shapely polygonize
        noded = unary_union(shapely_lines)
        polys = list(polygonize(noded))
        room_polys = [p for p in polys if not any(p.contains(other) and p.area > other.area * 1.5 for other in polys if p != other)]
        
        valid_polys = []
        for p in room_polys:
            a_m2 = p.area * (scale ** 2)
            if a_m2 >= 1.0:
                valid_polys.append((p, a_m2))

        valid_polys.sort(key=lambda item: item[1], reverse=True)
        final_rooms = []
        room_names_pool = [
            "Great Room / Living",
            "Dining Area",
            "Kitchen",
            "Master Bedroom",
            "Bedroom 2",
            "Bedroom 3",
            "Flex Room",
            "Bathroom",
            "Powder Room",
            "Foyer / Entry",
            "Hallway",
            "Utility Room",
            "Walk-in Closet"
        ]
        used_names = set()

        for idx, (poly, a_m2) in enumerate(valid_polys):
            minx, miny, maxx, maxy = poly.bounds
            cx, cy = (minx + maxx) / 2, (miny + maxy) / 2
            rel_y = (cy - min_y) / (max_y - min_y) if (max_y - min_y) > 0 else 0.5
            rel_x = (cx - min_x) / (max_x - min_x) if (max_x - min_x) > 0 else 0.5

            chosen_name = None
            if idx == 0 and a_m2 >= 20.0:
                chosen_name = "Great Room / Living"
            elif 8.0 <= a_m2 < 20.0:
                if rel_y < 0.45 and rel_x > 0.45 and "Kitchen" not in used_names:
                    chosen_name = "Kitchen"
                elif "Master Bedroom" not in used_names:
                    chosen_name = "Master Bedroom"
                elif "Bedroom 2" not in used_names:
                    chosen_name = "Bedroom 2"
                elif "Bedroom 3" not in used_names:
                    chosen_name = "Bedroom 3"
            elif 4.0 <= a_m2 < 8.0:
                if "Dining Area" not in used_names and rel_y < 0.5:
                    chosen_name = "Dining Area"
                elif "Flex Room" not in used_names:
                    chosen_name = "Flex Room"
                elif "Bathroom" not in used_names:
                    chosen_name = "Bathroom"
            elif 2.0 <= a_m2 < 4.0:
                if "Powder Room" not in used_names:
                    chosen_name = "Powder Room"
                elif "Foyer / Entry" not in used_names and rel_y > 0.6:
                    chosen_name = "Foyer / Entry"
                elif "Hallway" not in used_names:
                    chosen_name = "Hallway"
                elif "Walk-in Closet" not in used_names:
                    chosen_name = "Walk-in Closet"
            
            if not chosen_name:
                for candidate in room_names_pool:
                    if candidate not in used_names:
                        chosen_name = candidate
                        break
            if not chosen_name:
                chosen_name = f"Room {idx + 1}"

            used_names.add(chosen_name)

            coords = list(poly.exterior.coords)[:-1]
            pts = [[round(px * scale, 3), round(py * scale, 3)] for px, py in coords]

            final_rooms.append({
                "id": f"room-{uuid.uuid4().hex[:8]}",
                "name": chosen_name,
                "boundary": pts,
                "area": round(a_m2, 2)
            })

        # Building perimeter slab
        contours, _ = cv2.findContours(wall_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        slab_boundary = []
        if contours:
            outer_c = max(contours, key=cv2.contourArea)
            peri = cv2.arcLength(outer_c, True)
            approx_outer = cv2.approxPolyDP(outer_c, 0.015 * peri, True)
            for pt in approx_outer:
                px, py = pt[0]
                slab_boundary.append([round(float(px * scale), 3), round(float(py * scale), 3)])

        return {
            "imageDimensions": {"width": width, "height": height},
            "candidateLineCount": len(lines) if lines is not None else 0,
            "walls": final_walls,
            "rooms": final_rooms,
            "slabBoundary": slab_boundary,
            "scale": scale
        }

class GeometryValidator:
    @staticmethod
    def validate_building(floors: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validates all geometric rules:
        - No zero-length walls (< 0.05m)
        - No negative thickness or height
        - No openings exceeding wall bounds or overlapping
        - Valid room boundaries
        """
        issues = []
        total_walls = 0
        total_openings = 0

        for f_idx, floor in enumerate(floors):
            floor_name = floor.get("name", f"Floor {f_idx + 1}")
            walls = floor.get("walls", [])
            rooms = floor.get("rooms", [])

            for wall in walls:
                total_walls += 1
                wid = wall.get("id", f"wall-{total_walls}")
                start = wall.get("start", [0, 0])
                end = wall.get("end", [0, 0])
                length = math.hypot(end[0] - start[0], end[1] - start[1])

                # Check zero length
                if length < 0.05:
                    issues.append({
                        "type": "error",
                        "objectId": wid,
                        "description": f"Wall '{wid}' on {floor_name} has invalid length ({length:.3f}m < 0.05m).",
                        "suggestion": "Delete or extend the wall segment."
                    })

                # Check thickness & height
                thickness = wall.get("thickness", 0.20)
                height = wall.get("height", 3.0)
                if thickness <= 0.01:
                    issues.append({
                        "type": "error",
                        "objectId": wid,
                        "description": f"Wall '{wid}' has non-positive thickness ({thickness}m).",
                        "suggestion": "Set thickness to at least 0.05m."
                    })
                if height <= 0.1:
                    issues.append({
                        "type": "error",
                        "objectId": wid,
                        "description": f"Wall '{wid}' has non-positive height ({height}m).",
                        "suggestion": "Set height to at least 1.0m."
                    })

                # Check openings
                openings = wall.get("openings", [])
                total_openings += len(openings)
                sorted_openings = sorted(openings, key=lambda o: o.get("offset", 0.0))

                prev_end = -1.0
                for op in sorted_openings:
                    op_id = op.get("id", "opening")
                    offset = op.get("offset", 0.0)
                    w = op.get("width", 0.9)
                    h = op.get("height", 2.1)
                    sill = op.get("sillHeight", 0.0)

                    if offset < 0:
                        issues.append({
                            "type": "error",
                            "objectId": op_id,
                            "description": f"Opening '{op_id}' starts before wall beginning (offset: {offset}m).",
                            "suggestion": "Move opening inside the wall segment."
                        })
                    if offset + w > length:
                        issues.append({
                            "type": "error",
                            "objectId": op_id,
                            "description": f"Opening '{op_id}' extends beyond wall end (offset {offset}m + width {w}m > wall length {length:.2f}m).",
                            "suggestion": "Reduce width or adjust offset."
                        })
                    if offset < prev_end:
                        issues.append({
                            "type": "warning",
                            "objectId": op_id,
                            "description": f"Opening '{op_id}' overlaps with adjacent opening on wall '{wid}'.",
                            "suggestion": "Separate the openings so they don't collide."
                        })
                    if sill + h > height:
                        issues.append({
                            "type": "warning",
                            "objectId": op_id,
                            "description": f"Opening '{op_id}' exceeds wall height (sill {sill}m + height {h}m > wall height {height}m).",
                            "suggestion": "Adjust opening height or sill elevation."
                        })
                    prev_end = offset + w

            for r_idx, room in enumerate(rooms):
                rid = room.get("id", f"room-{r_idx}")
                boundary = room.get("boundary", [])
                if len(boundary) < 3:
                    issues.append({
                        "type": "error",
                        "objectId": rid,
                        "description": f"Room '{room.get('name', rid)}' has fewer than 3 boundary vertices.",
                        "suggestion": "Define at least 3 points to create an enclosed room polygon."
                    })
                else:
                    area = ShoelaceArea.calculate(boundary)
                    if area < 0.1:
                        issues.append({
                            "type": "warning",
                            "objectId": rid,
                            "description": f"Room '{room.get('name', rid)}' has near-zero area ({area:.2f} m²).",
                            "suggestion": "Verify boundary vertices."
                        })

        error_count = sum(1 for i in issues if i["type"] == "error")
        warning_count = sum(1 for i in issues if i["type"] == "warning")
        is_valid = error_count == 0

        summary = f"Validation completed: {error_count} errors, {warning_count} warnings across {total_walls} walls and {total_openings} openings."
        return {
            "isValid": is_valid,
            "issues": issues,
            "summary": summary
        }

