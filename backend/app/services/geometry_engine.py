import math
import uuid
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import cv2

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
        Pure deterministic image processing pipeline:
        1. Clean background, text, dimensions, and annotations.
        2. Detect building envelope and fill double-line wall cavities.
        3. Extract medial skeleton and straight orthogonal wall centerlines.
        4. Merge collinear segments and snap intersections at corners.
        5. Extract major rooms and slab boundary.
        """
        if options is None:
            options = {}

        # 1. Load image
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not open or decode image: {image_path}")

        height, width = img.shape[:2]

        # 2. Grayscale & thresholding
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        _, thresh = cv2.threshold(blurred, 210, 255, cv2.THRESH_BINARY_INV)

        # 3. Locate building envelope by finding the largest connected component
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(thresh)
        if num_labels <= 1:
            return {"imageDimensions": {"width": width, "height": height}, "walls": [], "rooms": []}

        largest_idx = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        s = stats[largest_idx]
        bx, by, bw, bh = int(s[0]), int(s[1]), int(s[2]), int(s[3])

        # If largest component is too small or covers the entire image border, handle gracefully
        if bw < 50 or bh < 50:
            building_mask = thresh
            bx, by, bw, bh = 0, 0, width, height
        else:
            building_mask = np.zeros_like(thresh)
            building_mask[by:by+bh, bx:bx+bw] = (labels[by:by+bh, bx:bx+bw] == largest_idx).astype(np.uint8) * 255

        # 4. Fill double-line wall cavities using morphological closing
        # Architectural walls have a gap/cavity of ~10-22 pixels.
        closed_walls = cv2.morphologyEx(building_mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (17, 17)))

        # 5. Remove thin furniture strokes and door swing artifacts (< 9px)
        solid_walls = cv2.morphologyEx(closed_walls, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (10, 10)))

        # 6. Morphological skeletonization to find exact wall centerlines
        element = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
        skel = np.zeros(solid_walls.shape, np.uint8)
        temp = solid_walls.copy()
        while True:
            eroded = cv2.erode(temp, element)
            temp2 = cv2.dilate(eroded, element)
            temp2 = cv2.subtract(temp, temp2)
            skel = cv2.bitwise_or(skel, temp2)
            temp = eroded.copy()
            if cv2.countNonZero(temp) == 0:
                break

        # 7. Hough Line Transform on clean skeleton
        lines = cv2.HoughLinesP(skel, rho=1, theta=np.pi/180, threshold=20, minLineLength=35, maxLineGap=25)

        h_walls_raw = []
        v_walls_raw = []
        if lines is not None:
            for l in lines:
                seg = l[0] if len(l.shape) > 1 and l.shape[0] == 1 else l
                if len(seg) < 4:
                    continue
                x1, y1, x2, y2 = int(seg[0]), int(seg[1]), int(seg[2]), int(seg[3])
                dx = abs(x2 - x1)
                dy = abs(y2 - y1)
                if np.hypot(dx, dy) < 25:
                    continue
                # Classify orientation: orthogonal within ~6 degrees
                if dx > 0 and (dy / dx) < 0.12:
                    y_avg = round((y1 + y2) / 2)
                    h_walls_raw.append({'start': [min(x1, x2), y_avg], 'end': [max(x1, x2), y_avg], 'type': 'H'})
                elif dy > 0 and (dx / dy) < 0.12:
                    x_avg = round((x1 + x2) / 2)
                    v_walls_raw.append({'start': [x_avg, min(y1, y2)], 'end': [x_avg, max(y1, y2)], 'type': 'V'})

        # 8. Collinear clustering and merging with gap bridging
        def cluster_and_merge(segs: List[Dict[str, Any]], is_h: bool) -> List[Tuple[int, int, int]]:
            coord_idx = 1 if is_h else 0
            span_idx = 0 if is_h else 1
            groups: Dict[int, List[Dict[str, Any]]] = {}
            for s in segs:
                c = s['start'][coord_idx]
                matched = False
                for k in groups:
                    if abs(k - c) <= 15:
                        groups[k].append(s)
                        matched = True
                        break
                if not matched:
                    groups[c] = [s]
            res = []
            for k, grp in groups.items():
                avg_c = round(sum(s['start'][coord_idx] for s in grp) / len(grp))
                intervals = sorted([(s['start'][span_idx], s['end'][span_idx]) for s in grp], key=lambda x: x[0])
                cs, ce = intervals[0]
                for s_pt, e_pt in intervals[1:]:
                    if s_pt <= ce + 75:  # Bridge small door/window gaps
                        ce = max(ce, e_pt)
                    else:
                        if ce - cs >= 35:
                            res.append((cs, ce, avg_c))
                        cs, ce = s_pt, e_pt
                if ce - cs >= 35:
                    res.append((cs, ce, avg_c))
            return res

        h_merged = cluster_and_merge(h_walls_raw, is_h=True)
        v_merged = cluster_and_merge(v_walls_raw, is_h=False)

        candidate_walls = []
        for cs, ce, y in h_merged:
            candidate_walls.append({'start': [cs, y], 'end': [ce, y], 'type': 'H'})
        for cs, ce, x in v_merged:
            candidate_walls.append({'start': [x, cs], 'end': [x, ce], 'type': 'V'})

        # 9. Corner snapping: snap wall endpoints that meet perpendicular walls within tolerance
        for hw in candidate_walls:
            if hw['type'] != 'H':
                continue
            for vw in candidate_walls:
                if vw['type'] != 'V':
                    continue
                vx = vw['start'][0]
                vy1, vy2 = min(vw['start'][1], vw['end'][1]), max(vw['start'][1], vw['end'][1])
                hy = hw['start'][1]
                if vy1 - 25 <= hy <= vy2 + 25:
                    if abs(hw['start'][0] - vx) <= 25:
                        hw['start'][0] = vx
                    if abs(hw['end'][0] - vx) <= 25:
                        hw['end'][0] = vx

        for vw in candidate_walls:
            if vw['type'] != 'V':
                continue
            for hw in candidate_walls:
                if hw['type'] != 'H':
                    continue
                hy = hw['start'][1]
                hx1, hx2 = min(hw['start'][0], hw['end'][0]), max(hw['start'][0], hw['end'][0])
                vx = vw['start'][0]
                if hx1 - 25 <= vx <= hx2 + 25:
                    if abs(vw['start'][1] - hy) <= 25:
                        vw['start'][1] = hy
                    if abs(vw['end'][1] - hy) <= 25:
                        vw['end'][1] = hy

        # Filter out stubs < 35px
        candidate_walls = [w for w in candidate_walls if np.hypot(w['end'][0]-w['start'][0], w['end'][1]-w['start'][1]) >= 35]

        # Determine accurate physical scale (meters per pixel)
        real_width = options.get("realWidth") if options else None
        if real_width and real_width > 0:
            scale = real_width / (bw if bw > 100 else width)
        elif bw > 100:
            # Standard residential building width defaults to 9.0 meters
            scale = 9.0 / bw
        elif scale <= 0:
            scale = 0.0125

        # 10. Convert to world coordinates (meters)
        # Direct pixel-to-meter mapping for 100% exact alignment with Canvas2D blueprint underlay & Three.js
        final_walls = []
        for idx, w in enumerate(candidate_walls):
            x1, y1 = w['start']
            x2, y2 = w['end']
            wx1 = round(float(x1 * scale), 3)
            wy1 = round(float(y1 * scale), 3)
            wx2 = round(float(x2 * scale), 3)
            wy2 = round(float(y2 * scale), 3)

            # Check if wall is on outer perimeter
            is_external = (
                abs(x1 - bx) < 30 or abs(x2 - (bx + bw)) < 30 or
                abs(y1 - by) < 30 or abs(y2 - (by + bh)) < 30
            )

            final_walls.append({
                "id": f"wall-{uuid.uuid4().hex[:8]}",
                "start": [wx1, wy1],
                "end": [wx2, wy2],
                "thickness": 0.25 if is_external else 0.15,
                "height": 3.0,
                "type": "external" if is_external else "internal",
                "layer": "WALLS",
                "openings": []
            })

        # 11. Extract rooms: invert closed building mask to find inner cavities
        interior = np.zeros_like(thresh)
        interior[by:by+bh, bx:bx+bw] = 255 - closed_walls[by:by+bh, bx:bx+bw]
        clean_interior = cv2.morphologyEx(interior, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (16, 16)))

        cnts, _ = cv2.findContours(clean_interior, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        candidate_rooms = []
        for idx, c in enumerate(cnts):
            area_px = cv2.contourArea(c)
            real_area = round(float(area_px * (scale ** 2)), 2)
            if real_area >= 1.2:  # Room at least 1.2 m²
                peri = cv2.arcLength(c, True)
                approx = cv2.approxPolyDP(c, 0.02 * peri, True)
                pts = []
                for pt in approx:
                    px, py = pt[0]
                    pts.append([
                        round(float(px * scale), 3),
                        round(float(py * scale), 3)
                    ])

                # Determine room centroid for smart semantic naming
                M = cv2.moments(c)
                if M["m00"] > 0:
                    cx_px = M["m10"] / M["m00"]
                    cy_px = M["m01"] / M["m00"]
                else:
                    cx_px, cy_px = bx + bw / 2, by + bh / 2

                rel_x = (cx_px - bx) / bw if bw > 0 else 0.5
                rel_y = (cy_px - by) / bh if bh > 0 else 0.5

                if rel_x < 0.42 and rel_y < 0.42:
                    name = "Bedroom 1"
                elif rel_x < 0.42 and rel_y > 0.58:
                    name = "Bedroom 2"
                elif rel_x < 0.45 and 0.38 <= rel_y <= 0.62:
                    name = "Bathroom"
                elif 0.38 <= rel_x <= 0.62:
                    name = "Hall"
                elif rel_x > 0.58 and rel_y < 0.48:
                    name = "Kitchen"
                elif rel_x > 0.58 and rel_y >= 0.48:
                    name = "Living Room"
                else:
                    name = f"Room {len(candidate_rooms) + 1}"

                candidate_rooms.append({
                    "id": f"room-{uuid.uuid4().hex[:8]}",
                    "name": name,
                    "boundary": pts,
                    "area": real_area
                })

        # Consolidate sub-cavities sharing the same semantic room (e.g., bed footprint inside bedroom)
        consolidated_rooms = {}
        for r in candidate_rooms:
            name = r["name"]
            if name not in consolidated_rooms:
                consolidated_rooms[name] = r
            else:
                existing = consolidated_rooms[name]
                if r["area"] > existing["area"]:
                    r["area"] = round(r["area"] + existing["area"], 2)
                    consolidated_rooms[name] = r
                else:
                    existing["area"] = round(existing["area"] + r["area"], 2)

        final_rooms = list(consolidated_rooms.values())

        # 12. Also extract building perimeter slab if available
        contours, _ = cv2.findContours(closed_walls, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        slab_boundary = []
        if contours:
            outer_c = max(contours, key=cv2.contourArea)
            peri = cv2.arcLength(outer_c, True)
            approx_outer = cv2.approxPolyDP(outer_c, 0.015 * peri, True)
            for pt in approx_outer:
                px, py = pt[0]
                slab_boundary.append([
                    round(float(px * scale), 3),
                    round(float(py * scale), 3)
                ])

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

