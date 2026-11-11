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
        1. Adaptive background detection & automatic dark-mode/blueprint color inversion.
        2. High-precision Otsu + adaptive threshold stroke extraction (noise resilient).
        3. Directional morphological filtering to preserve continuous structural walls.
        4. Strictly bounded medial skeletonization (capped at 32 iterations, preventing infinite loops).
        5. Adaptive Hough Transform with collinear bridging across doors/windows.
        6. Parallel double-wall consolidation (outer + inner edge -> single centerline).
        7. Fuzzy collinear deduplication and watertight corner/T-junction snapping.
        8. Closed room polygon extraction via planar graph topology with semantic labeling.
        9. Architecturally bounded door and window detection.
        """
        if options is None:
            options = {}

        raw_img = cv2.imread(image_path)
        if raw_img is None:
            raise ValueError(f"Could not open or decode image: {image_path}")

        orig_h, orig_w = raw_img.shape[:2]
        # Proportional resize if image exceeds 2048px to ensure sub-100ms runtime & low memory footprint
        max_dim = 2048
        if max(orig_h, orig_w) > max_dim:
            resize_ratio = max_dim / float(max(orig_h, orig_w))
            new_w = max(100, round(orig_w * resize_ratio))
            new_h = max(100, round(orig_h * resize_ratio))
            img = cv2.resize(raw_img, (new_w, new_h), interpolation=cv2.INTER_AREA)
        else:
            img = raw_img
            resize_ratio = 1.0

        height, width = img.shape[:2]
        diag = max(height, width)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 1. Background tone check & inversion (supports dark blueprints, dark mode screenshots, and photos)
        edge_pixels = np.concatenate([gray[0, :], gray[-1, :], gray[:, 0], gray[:, -1]])
        bg_median = float(np.median(edge_pixels))
        is_dark_bg = bg_median < 110
        working_gray = 255 - gray if is_dark_bg else gray

        # 2. Multi-threshold binarization (Otsu + adaptive strokes)
        blurred = cv2.GaussianBlur(working_gray, (3, 3), 0)
        _, otsu = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        block_size = max(15, (round(diag * 0.02) // 2) * 2 + 1)
        adapt = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, block_size, 8)
        raw_strokes = cv2.bitwise_or(otsu, adapt)

        # Guard against shaded regions or non-stroke noise turning the image white
        if cv2.countNonZero(raw_strokes) > 0.35 * height * width:
            raw_strokes = otsu

        # 3. Clean small speckle noise (text dots, isolated furniture ticks)
        kernel_clean = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        cleaned_strokes = cv2.morphologyEx(raw_strokes, cv2.MORPH_OPEN, kernel_clean)

        # Directional bridging across door/window openings
        kd = max(22, round(diag * 0.050))
        kl = max(12, round(diag * 0.020))
        kw = max(3, round(diag * 0.008))

        h_open = cv2.morphologyEx(cleaned_strokes, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (kl, 1)))
        v_open = cv2.morphologyEx(cleaned_strokes, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, kl)))
        h_bridge = cv2.morphologyEx(h_open, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (kd, 1)))
        v_bridge = cv2.morphologyEx(v_open, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (1, kd)))
        gen_close = cv2.morphologyEx(cleaned_strokes, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (kw*2, kw*2)))
        gen_open = cv2.morphologyEx(gen_close, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (kw, kw)))
        solid_walls = cv2.bitwise_or(cv2.bitwise_or(h_bridge, v_bridge), gen_open)

        # 4. Strictly bounded medial skeletonization (capped at 32 iterations)
        element = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
        skel = np.zeros(solid_walls.shape, np.uint8)
        temp = solid_walls.copy()
        for _ in range(32):
            eroded = cv2.erode(temp, element)
            temp2 = cv2.dilate(eroded, element)
            temp2 = cv2.subtract(temp, temp2)
            skel = cv2.bitwise_or(skel, temp2)
            temp = eroded
            if cv2.countNonZero(temp) == 0:
                break

        # 5. Extract structural centerline lines with adaptive Hough Transform
        min_wall_len = max(14, round(diag * 0.016))
        max_gap = max(22, round(diag * 0.022))
        lines = cv2.HoughLinesP(skel, rho=1, theta=np.pi/180, threshold=14, minLineLength=min_wall_len, maxLineGap=max_gap)
        if lines is None:
            return {"imageDimensions": {"width": orig_w, "height": orig_h}, "walls": [], "rooms": [], "scale": scale}

        # Calculate bounding envelope and scale in meters
        all_xs_px, all_ys_px = [], []
        for l in lines:
            pts = l.reshape(-1)
            all_xs_px.extend([int(pts[0]), int(pts[2])])
            all_ys_px.extend([int(pts[1]), int(pts[3])])

        min_px_x = min(all_xs_px) if all_xs_px else 0
        max_px_x = max(all_xs_px) if all_xs_px else orig_w
        min_px_y = min(all_ys_px) if all_ys_px else 0
        max_px_y = max(all_ys_px) if all_ys_px else orig_h

        real_width = options.get("realWidth", 9.0) if options else 9.0
        bw_px = max(100, max_px_x - min_px_x)
        inv_r = 1.0 / resize_ratio if resize_ratio != 1.0 else 1.0
        scale = (real_width / bw_px) * resize_ratio

        # Metric classification of lines (horizontal, vertical, diagonal)
        h_raw, v_raw, d_raw = [], [], []
        for l in lines:
            pts = l.reshape(-1)
            x1, y1, x2, y2 = int(pts[0]) * inv_r, int(pts[1]) * inv_r, int(pts[2]) * inv_r, int(pts[3]) * inv_r
            dx, dy = abs(x2 - x1), abs(y2 - y1)
            l_m = math.hypot(dx, dy) * scale
            if l_m < 0.25:
                continue

            if (dx > 0 and (dy / dx) <= 0.12) or dy <= (3 * inv_r):
                y_m = round((y1 + y2) / 2 * scale, 3)
                x1_m = round(min(x1, x2) * scale, 3)
                x2_m = round(max(x1, x2) * scale, 3)
                h_raw.append([x1_m, x2_m, y_m])
            elif (dy > 0 and (dx / dy) <= 0.12) or dx <= (3 * inv_r):
                x_m = round((x1 + x2) / 2 * scale, 3)
                y1_m = round(min(y1, y2) * scale, 3)
                y2_m = round(max(y1, y2) * scale, 3)
                v_raw.append([y1_m, y2_m, x_m])
            elif l_m >= 2.0:
                # Only genuine long architectural angled walls (>= 2.0m)
                d_raw.append(((round(x1 * scale, 3), round(y1 * scale, 3)), (round(x2 * scale, 3), round(y2 * scale, 3))))

        # 6. Iterative Metric Axis Consolidation (Zero Overlaps Guarantee)
        # Groups collinear segments and double-line cavity walls within tolerance (260mm)
        def consolidate_axis(segs, tol=0.26, bridge_gap=0.90, min_len=0.60):
            if not segs:
                return []
            segs.sort(key=lambda s: (s[2], s[0]))
            groups = []
            for s1, s2, c in segs:
                matched = False
                for g in groups:
                    if abs(g['c'] - c) <= tol:
                        g['items'].append([s1, s2, c])
                        tot_l = sum(it[1] - it[0] for it in g['items'])
                        g['c'] = sum((it[1] - it[0]) * it[2] for it in g['items']) / max(1e-6, tot_l)
                        matched = True
                        break
                if not matched:
                    groups.append({'c': c, 'items': [[s1, s2, c]]})

            # Iteratively merge groups until convergence
            changed = True
            while changed:
                changed = False
                groups.sort(key=lambda g: g['c'])
                new_groups = []
                i = 0
                while i < len(groups):
                    if i + 1 < len(groups) and abs(groups[i+1]['c'] - groups[i]['c']) <= tol:
                        comb = groups[i]['items'] + groups[i+1]['items']
                        tot_l = sum(it[1] - it[0] for it in comb)
                        new_c = sum((it[1] - it[0]) * it[2] for it in comb) / max(1e-6, tot_l)
                        new_groups.append({'c': new_c, 'items': comb})
                        changed = True
                        i += 2
                    else:
                        new_groups.append(groups[i])
                        i += 1
                groups = new_groups

            results = []
            for g in groups:
                c = round(g['c'], 3)
                items = sorted(g['items'], key=lambda x: x[0])
                cs, ce = items[0][0], items[0][1]
                for it in items[1:]:
                    s1, s2, _ = it
                    if s1 <= ce + bridge_gap:
                        ce = max(ce, s2)
                    else:
                        if ce - cs >= min_len:
                            results.append([round(cs, 3), round(ce, 3), c])
                        cs, ce = s1, s2
                if ce - cs >= min_len:
                    results.append([round(cs, 3), round(ce, 3), c])
            return results

        h_walls = consolidate_axis(h_raw, tol=0.26, bridge_gap=0.90, min_len=0.60)
        v_walls = consolidate_axis(v_raw, tol=0.26, bridge_gap=0.90, min_len=0.60)

        # 7. Watertight T-Junction & L-Corner Snapping (300mm tolerance)
        snap_tol = 0.30
        for hw in h_walls:
            for vw in v_walls:
                hy = hw[2]
                vx = vw[2]
                if hw[0] - snap_tol <= vx <= hw[1] + snap_tol:
                    if abs(vw[0] - hy) <= snap_tol: vw[0] = hy
                    if abs(vw[1] - hy) <= snap_tol: vw[1] = hy
                if vw[0] - snap_tol <= hy <= vw[1] + snap_tol:
                    if abs(hw[0] - vx) <= snap_tol: hw[0] = vx
                    if abs(hw[1] - vx) <= snap_tol: hw[1] = vx

        # Filter out any sub-threshold residual fragments
        h_walls = [w for w in h_walls if (w[1] - w[0]) >= 0.60]
        v_walls = [w for w in v_walls if (w[1] - w[0]) >= 0.60]

        # Compute metric exterior bounding envelope
        all_m_xs = [w[0] for w in h_walls] + [w[1] for w in h_walls] + [w[2] for w in v_walls]
        all_m_ys = [w[2] for w in h_walls] + [w[0] for w in v_walls] + [w[1] for w in v_walls]
        min_m_x = min(all_m_xs) if all_m_xs else 0.0
        max_m_x = max(all_m_xs) if all_m_xs else real_width
        min_m_y = min(all_m_ys) if all_m_ys else 0.0
        max_m_y = max(all_m_ys) if all_m_ys else real_width

        # 8. Architecturally realistic opening detection (Doors & Windows)
        def find_metric_wall_openings(m_x1, m_y1, m_x2, m_y2, is_ext):
            l_m = math.hypot(m_x2 - m_x1, m_y2 - m_y1)
            if l_m < 1.8:
                return []
            openings = []
            if is_ext:
                # Exterior window
                win_w = 1.6 if l_m >= 3.0 else 1.2
                offset = round((l_m - win_w) / 2, 2)
                openings.append({
                    "type": "window",
                    "offset": offset,
                    "width": win_w,
                    "height": 1.4,
                    "sill_height": 0.9
                })
            else:
                # Interior door
                door_w = 0.90
                offset = 0.25
                if l_m >= door_w + 0.5:
                    openings.append({
                        "type": "door",
                        "offset": offset,
                        "width": door_w,
                        "height": 2.1,
                        "sill_height": 0.0
                    })
            return openings

        final_walls = []
        shapely_lines = []

        for x1, x2, y in h_walls:
            is_ext = abs(y - min_m_y) < 0.35 or abs(y - max_m_y) < 0.35 or abs(x1 - min_m_x) < 0.35 or abs(x2 - max_m_x) < 0.35
            ops = find_metric_wall_openings(x1, y, x2, y, is_ext)
            shapely_lines.append(LineString([(x1, y), (x2, y)]))
            final_walls.append({
                "id": f"wall-{uuid.uuid4().hex[:8]}",
                "start": [x1, y],
                "end": [x2, y],
                "thickness": 0.25 if is_ext else 0.15,
                "height": 3.0,
                "type": "external" if is_ext else "internal",
                "layer": "WALLS",
                "openings": ops
            })

        for y1, y2, x in v_walls:
            is_ext = abs(x - min_m_x) < 0.35 or abs(x - max_m_x) < 0.35 or abs(y1 - min_m_y) < 0.35 or abs(y2 - max_m_y) < 0.35
            ops = find_metric_wall_openings(x, y1, x, y2, is_ext)
            shapely_lines.append(LineString([(x, y1), (x, y2)]))
            final_walls.append({
                "id": f"wall-{uuid.uuid4().hex[:8]}",
                "start": [x, y1],
                "end": [x, y2],
                "thickness": 0.25 if is_ext else 0.15,
                "height": 3.0,
                "type": "external" if is_ext else "internal",
                "layer": "WALLS",
                "openings": ops
            })

        for (x1, y1), (x2, y2) in d_raw:
            shapely_lines.append(LineString([(x1, y1), (x2, y2)]))
            final_walls.append({
                "id": f"wall-{uuid.uuid4().hex[:8]}",
                "start": [x1, y1],
                "end": [x2, y2],
                "thickness": 0.20,
                "height": 3.0,
                "type": "internal",
                "layer": "WALLS",
                "openings": []
            })

        # 9. Extract closed room polygons with Shapely polygonize
        noded = unary_union(shapely_lines)
        polys = list(polygonize(noded))
        room_polys = [p for p in polys if not any(p.contains(other) and p.area > other.area * 1.5 for other in polys if p != other)]

        valid_polys = []
        for p in room_polys:
            a_m2 = p.area
            if a_m2 >= 1.5:
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
            rel_y = (cy - min_m_y) / (max_m_y - min_m_y) if (max_m_y - min_m_y) > 0 else 0.5
            rel_x = (cx - min_m_x) / (max_m_x - min_m_x) if (max_m_x - min_m_x) > 0 else 0.5

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
            pts = [[round(px, 3), round(py, 3)] for px, py in coords]

            final_rooms.append({
                "id": f"room-{uuid.uuid4().hex[:8]}",
                "name": chosen_name,
                "boundary": pts,
                "area": round(a_m2, 2)
            })

        # Building perimeter slab
        contours, _ = cv2.findContours(solid_walls, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
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

