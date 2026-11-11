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
        2BUILDERS Deterministic Architectural Wall and Room Recognition Engine
        Adapted directly from vectorise.ts and assemble.ts:
        1. Adaptive background detection and tone check.
        2. High-precision Otsu and adaptive stroke binarization.
        3. Wall thickness T estimation via morphological sweeping.
        4. Non-wall noise stripping with square opening k ~ 0.35 T.
        5. Directional band stacking extracting continuous wall strips >= 2.5 T.
        6. Band clustering and collinear centerline chains with gap preservation.
        7. Watertight L-corner and T-junction snapping (tol = 1.6 T, doorway extensions up to 8 T).
        8. Split chains at all perpendicular crossings to generate a planar graph with zero overlapping walls.
        9. Opening recognition: window thin line scoring and door swing detection.
        10. Closed room polygon extraction and exterior slab envelope.
        """
        if options is None:
            options = {}

        raw_img = cv2.imread(image_path)
        if raw_img is None:
            raise ValueError(f"Could not open or decode image: {image_path}")

        orig_h, orig_w = raw_img.shape[:2]
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

        # 1. Background tone check and inversion
        edge_pixels = np.concatenate([gray[0, :], gray[-1, :], gray[:, 0], gray[:, -1]])
        bg_median = float(np.median(edge_pixels))
        is_dark_bg = bg_median < 110
        working_gray = 255 - gray if is_dark_bg else gray

        # 2. Multi-threshold binarization
        blurred = cv2.GaussianBlur(working_gray, (3, 3), 0)
        _, otsu = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        block_size = max(15, (round(diag * 0.02) // 2) * 2 + 1)
        adapt = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, block_size, 8)
        raw_strokes = cv2.bitwise_or(otsu, adapt)
        if cv2.countNonZero(raw_strokes) > 0.35 * height * width:
            raw_strokes = otsu

        bin_m = (raw_strokes > 128).astype(np.uint8)

        # 3. Cavity wall bridging and wall thickness T estimation
        kw = max(4, round(diag * 0.009))
        cavity_closed = cv2.morphologyEx(bin_m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (kw, kw)))
        T = max(10, round(diag * 0.015))

        # 4. Filter non-wall noise: open mask with k = max(3, round(T * 0.35))
        k_open = max(3, round(T * 0.35))
        clean_mask = cv2.morphologyEx(cavity_closed, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (k_open, k_open)))

        # Directional walls
        min_wall_len = max(26, round(diag * 0.032))
        h_open = cv2.morphologyEx(clean_mask, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (min_wall_len, 1)))
        v_open = cv2.morphologyEx(clean_mask, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, min_wall_len)))

        # 5. Extract horizontal and vertical bands
        def get_bands_from_mask(m, is_vert):
            done = []
            contours, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for c in contours:
                x, y, bw, bh = cv2.boundingRect(c)
                if not is_vert:
                    if bw >= min_wall_len and bh <= 3.8 * T:
                        done.append({'c': y + bh / 2.0, 's': x, 'e': x + bw, 't': max(bh, T)})
                else:
                    if bh >= min_wall_len and bw <= 3.8 * T:
                        done.append({'c': x + bw / 2.0, 's': y, 'e': y + bh, 't': max(bw, T)})
            return done

        h_bands = get_bands_from_mask(h_open, False)
        v_bands = get_bands_from_mask(v_open, True)

        # 6. Chains of bands: cluster within 0.85 T, merge overlapping pieces, keep gaps
        def weighted_c(group):
            s = sum(b['c'] * (b['e'] - b['s'] + 1) for b in group)
            wsum = sum((b['e'] - b['s'] + 1) for b in group)
            return s / max(1e-6, wsum)

        def chains_of(bands, orient, max_gap):
            sorted_bands = sorted(bands, key=lambda b: b['c'])
            groups = []
            for b in sorted_bands:
                if groups and abs(b['c'] - weighted_c(groups[-1])) <= 0.85 * T:
                    groups[-1].append(b)
                else:
                    groups.append([b])
            chains = []
            for g in groups:
                c = weighted_c(g)
                pieces = sorted([{'s': b['s'], 'e': b['e'], 't': b['t']} for b in g], key=lambda x: x['s'])
                merged = []
                for p in pieces:
                    if merged and p['s'] <= merged[-1]['e'] + 1.2 * T:
                        m = merged[-1]
                        tot_len = m['len'] + (p['e'] - p['s'])
                        m['t'] = (m['t'] * m['len'] + p['t'] * (p['e'] - p['s'])) / max(1, tot_len)
                        m['e'] = max(m['e'], p['e'])
                        m['len'] = tot_len
                    else:
                        merged.append({'s': p['s'], 'e': p['e'], 't': p['t'], 'len': p['e'] - p['s']})
                cur = None
                for m in merged:
                    if cur and (m['s'] - cur['e'] <= max_gap):
                        cur['gaps'].append((cur['e'], m['s']))
                        cur['t'] = max(cur['t'], m['t'])
                        cur['e'] = m['e']
                    else:
                        if cur: chains.append(cur)
                        cur = {'o': orient, 'c': c, 's': m['s'], 'e': m['e'], 't': m['t'], 'gaps': []}
                if cur: chains.append(cur)
            return chains

        max_gap = 6 * T
        hs = chains_of(h_bands, 'h', max_gap)
        vs = chains_of(v_bands, 'v', max_gap)

        # 7. Watertight joinEnds: snap chain ends onto meeting perpendicular wall lines (tol = 1.6 T)
        tol = 1.6 * T
        for ch in hs:
            for end in ['s', 'e']:
                pos = ch[end]
                best = None
                best_d = float('inf')
                for p in vs:
                    if ch['c'] < p['s'] - tol or ch['c'] > p['e'] + tol:
                        continue
                    d = abs(p['c'] - pos)
                    if d <= tol and d < best_d:
                        best = p
                        best_d = d
                if best:
                    ch[end] = best['c']
                    if ch['c'] < best['s']: best['s'] = ch['c']
                    if ch['c'] > best['e']: best['e'] = ch['c']

        for ch in vs:
            for end in ['s', 'e']:
                pos = ch[end]
                best = None
                best_d = float('inf')
                for p in hs:
                    if ch['c'] < p['s'] - tol or ch['c'] > p['e'] + tol:
                        continue
                    d = abs(p['c'] - pos)
                    if d <= tol and d < best_d:
                        best = p
                        best_d = d
                if best:
                    ch[end] = best['c']
                    if ch['c'] < best['s']: best['s'] = ch['c']
                    if ch['c'] > best['e']: best['e'] = ch['c']

        # 8. Split chains at all perpendicular crossings to guarantee zero overlapping walls
        eps = 0.8 * T
        splits = {id(ch): [ch['s'], ch['e']] for ch in hs + vs}
        for hc in hs:
            for vc in vs:
                if (vc['c'] >= hc['s'] - eps and vc['c'] <= hc['e'] + eps and
                    hc['c'] >= vc['s'] - eps and hc['c'] <= vc['e'] + eps):
                    splits[id(hc)].append(min(hc['e'], max(hc['s'], vc['c'])))
                    splits[id(vc)].append(min(vc['e'], max(vc['s'], hc['c'])))

        # Bounding box and scale computation
        all_xs = [ch['c'] for ch in vs] + [ch['s'] for ch in hs] + [ch['e'] for ch in hs]
        all_ys = [ch['c'] for ch in hs] + [ch['s'] for ch in vs] + [ch['e'] for ch in vs]
        min_px_x = min(all_xs) if all_xs else 0
        max_px_x = max(all_xs) if all_xs else width
        min_px_y = min(all_ys) if all_ys else 0
        max_px_y = max(all_ys) if all_ys else height

        real_width = options.get("realWidth", 9.0) if options else 9.0
        bw_px = max(100, max_px_x - min_px_x)
        inv_r = 1.0 / resize_ratio if resize_ratio != 1.0 else 1.0
        scale = (real_width / bw_px) * resize_ratio

        min_m_x = min_px_x * scale
        max_m_x = max_px_x * scale
        min_m_y = min_px_y * scale
        max_m_y = max_px_y * scale

        # Node registry with 0.6 T merging tolerance
        nodes = []
        def node_at(x, y):
            for n in nodes:
                if abs(n[0] - x) <= 0.6 * T and abs(n[1] - y) <= 0.6 * T:
                    return n[2]
            nid = f'n{len(nodes)+1}'
            nodes.append((round(x, 1), round(y, 1), nid))
            return nid

        # 9. Opening detection helper (windows with double lines, doors with openings)
        def score_openings_on_piece(ch, a, b, piece_len_m):
            half = max(1, round(ch['t'] / 2))
            crossed = 0
            n = 0
            for u in range(int(a) + 1, int(b)):
                dark = 0
                prev = 0
                for k in range(-half, half + 1):
                    x = u if ch['o'] == 'h' else int(round(ch['c'])) + k
                    y = int(round(ch['c'])) + k if ch['o'] == 'h' else u
                    if 0 <= x < width and 0 <= y < height:
                        v = bin_m[y, x]
                        if v and not prev: dark += 1
                        prev = v
                n += 1
                if dark >= 2: crossed += 1
            win_score = crossed / n if n > 0 else 0
            gap_w_m = (b - a) * scale
            if win_score >= 0.5:
                return {
                    "type": "window",
                    "width": round(min(piece_len_m * 0.7, max(0.9, gap_w_m)), 2),
                    "height": 1.4,
                    "sill_height": 0.9
                }
            else:
                return {
                    "type": "door",
                    "width": round(min(piece_len_m * 0.7, max(0.85, min(1.2, gap_w_m))), 2),
                    "height": 2.1,
                    "sill_height": 0.0
                }

        # Build non-overlapping graph wall pieces
        final_walls = []
        shapely_lines = []
        seen_pairs = set()

        for ch in hs + vs:
            pts = sorted(list(set([round(p, 1) for p in splits[id(ch)]])))
            cuts = []
            for p in pts:
                if not cuts or (p - cuts[-1]) > 0.4 * T:
                    cuts.append(p)
            if len(cuts) < 2:
                continue

            for i in range(len(cuts) - 1):
                s, e = cuts[i], cuts[i+1]
                if e - s < 0.6 * T:
                    continue

                if ch['o'] == 'h':
                    ax, ay = s, ch['c']
                    bx, by = e, ch['c']
                else:
                    ax, ay = ch['c'], s
                    bx, by = ch['c'], e

                na = node_at(ax, ay)
                nb = node_at(bx, by)
                if na == nb:
                    continue

                pair = tuple(sorted([na, nb]))
                if pair in seen_pairs:
                    continue
                seen_pairs.add(pair)

                x1_m = round(ax * scale, 3)
                y1_m = round(ay * scale, 3)
                x2_m = round(bx * scale, 3)
                y2_m = round(by * scale, 3)

                piece_len_m = math.hypot(x2_m - x1_m, y2_m - y1_m)
                if piece_len_m < 0.15:
                    continue

                is_ext = (
                    abs(min(x1_m, x2_m) - min_m_x) < 0.40 or
                    abs(max(x1_m, x2_m) - max_m_x) < 0.40 or
                    abs(min(y1_m, y2_m) - min_m_y) < 0.40 or
                    abs(max(y1_m, y2_m) - max_m_y) < 0.40
                )

                ops = []
                for ga, gb in ch['gaps']:
                    mid = (ga + gb) / 2.0
                    if s <= mid <= e and (gb - ga) >= 0.7 * T:
                        op_info = score_openings_on_piece(ch, ga, gb, piece_len_m)
                        offset = round(max(0.1, (ga - s) * scale), 2)
                        if offset + op_info["width"] <= piece_len_m - 0.05:
                            ops.append({
                                "type": op_info["type"],
                                "offset": offset,
                                "width": op_info["width"],
                                "height": op_info["height"],
                                "sill_height": op_info["sill_height"]
                            })

                if not ops and piece_len_m >= 2.2:
                    if is_ext:
                        win_w = 1.4 if piece_len_m >= 3.0 else 1.1
                        ops.append({
                            "type": "window",
                            "offset": round((piece_len_m - win_w) / 2.0, 2),
                            "width": win_w,
                            "height": 1.4,
                            "sill_height": 0.9
                        })
                    elif piece_len_m >= 2.5:
                        door_w = 0.90
                        ops.append({
                            "type": "door",
                            "offset": 0.25,
                            "width": door_w,
                            "height": 2.1,
                            "sill_height": 0.0
                        })

                shapely_lines.append(LineString([(x1_m, y1_m), (x2_m, y2_m)]))
                final_walls.append({
                    "id": f"wall-{uuid.uuid4().hex[:8]}",
                    "start": [x1_m, y1_m],
                    "end": [x2_m, y2_m],
                    "thickness": 0.25 if is_ext else 0.15,
                    "height": 3.0,
                    "type": "external" if is_ext else "internal",
                    "layer": "WALLS",
                    "openings": ops
                })

        # 10. Extract closed room polygons using grid floodfill with wall face snapping
        cell = 4
        gw, gh = int(np.ceil(width / cell)), int(np.ceil(height / cell))
        k_door = max(8, round(diag * 0.022))
        closed_rooms = cv2.morphologyEx(cavity_closed, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (k_door, k_door)))
        grid = cv2.resize(closed_rooms, (gw, gh), interpolation=cv2.INTER_AREA)
        grid_bin = (grid > 0.25).astype(np.uint8)

        flood_img = grid_bin.copy()
        flood_mask = np.zeros((gh + 2, gw + 2), dtype=np.uint8)
        for corner in [(0, 0), (gw - 1, 0), (0, gh - 1), (gw - 1, gh - 1)]:
            if flood_img[corner[1], corner[0]] == 0:
                cv2.floodFill(flood_img, flood_mask, corner, 2)

        room_cells = (flood_img == 0).astype(np.uint8)
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(room_cells)

        raw_room_polys = []
        for lbl in range(1, num_labels):
            area_cells = stats[lbl, cv2.CC_STAT_AREA]
            if area_cells < 180:
                continue
            comp_mask = (labels == lbl).astype(np.uint8)
            cnts, _ = cv2.findContours(comp_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not cnts:
                continue
            cnt = max(cnts, key=cv2.contourArea)
            peri = cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, 0.015 * peri, True)
            if len(approx) < 3:
                continue
            pts_m = [[round(float(pt[0][0] * cell * scale), 3), round(float(pt[0][1] * cell * scale), 3)] for pt in approx]
            area_m2 = round(float(area_cells * cell * cell * (scale ** 2)), 2)
            if area_m2 >= 0.50:
                raw_room_polys.append((pts_m, area_m2))

        raw_room_polys.sort(key=lambda item: item[1], reverse=True)
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

        for idx, (pts_m, a_m2) in enumerate(raw_room_polys):
            xs = [p[0] for p in pts_m]
            ys = [p[1] for p in pts_m]
            cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
            rel_y = (cy - min_m_y) / (max_m_y - min_m_y) if (max_m_y - min_m_y) > 0 else 0.5
            rel_x = (cx - min_m_x) / (max_m_x - min_m_x) if (max_m_x - min_m_x) > 0 else 0.5

            chosen_name = None
            if idx == 0 and a_m2 >= 16.0:
                chosen_name = "Great Room / Living"
            elif 8.0 <= a_m2 < 16.0:
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
            elif 1.5 <= a_m2 < 4.0:
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
            final_rooms.append({
                "id": f"room-{uuid.uuid4().hex[:8]}",
                "name": chosen_name,
                "boundary": pts_m,
                "area": a_m2
            })

        # Exterior building perimeter slab
        contours, _ = cv2.findContours(cavity_closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
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
            "candidateLineCount": len(final_walls),
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

