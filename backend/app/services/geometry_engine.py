import math
import uuid
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import cv2
import shapely
from shapely.geometry import LineString, Polygon, MultiPolygon, box
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

def wall_footprints(walls: List[Dict[str, Any]]) -> List[Polygon]:
    """Axis-aligned footprint rectangles for every wall centreline."""
    polys: List[Polygon] = []
    for w in walls:
        (x1, y1), (x2, y2) = w["start"], w["end"]
        t = max(0.02, float(w.get("thickness", 0.15)))
        if abs(y1 - y2) <= abs(x1 - x2):
            polys.append(box(min(x1, x2) - t / 2.0, y1 - t / 2.0,
                             max(x1, x2) + t / 2.0, y1 + t / 2.0))
        else:
            polys.append(box(x1 - t / 2.0, min(y1, y2) - t / 2.0,
                             x1 + t / 2.0, max(y1, y2) + t / 2.0))
    return polys


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

    @staticmethod
    def process_dxf(file_path: str, scale: float = 1.0, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Processes DXF file into structured architectural walls and room polygons,
        matching the output contract of RasterProcessor.
        """
        raw_data = DXFProcessor.parse_dxf(file_path, scale=1.0)
        raw_walls = raw_data.get("walls", [])
        bounds = raw_data.get("bounds", {"min": [0, 0], "max": [10, 10]})

        min_x, min_y = bounds["min"]
        max_x, max_y = bounds["max"]
        dxf_width = max(0.1, max_x - min_x)

        real_width = options.get("realWidth", 9.0) if options else 9.0
        # If DXF is already in meters (e.g. 2-60 units), scale_factor is 1.0
        if 2.0 <= dxf_width <= 60.0:
            scale_factor = 1.0
        elif dxf_width > 60.0:
            # Millimeters: convert to meters
            scale_factor = 0.001
        else:
            scale_factor = real_width / dxf_width

        normalized_walls: List[Dict[str, Any]] = []
        shapely_lines = []

        for i, w in enumerate(raw_walls):
            sx = round((w["start"][0] - min_x) * scale_factor, 3)
            sy = round((w["start"][1] - min_y) * scale_factor, 3)
            ex = round((w["end"][0] - min_x) * scale_factor, 3)
            ey = round((w["end"][1] - min_y) * scale_factor, 3)
            w_len = math.hypot(ex - sx, ey - sy)
            if w_len < 0.05:
                continue

            layer_name = str(w.get("layer", "WALLS")).upper()
            is_ext = any(k in layer_name for k in ["EXT", "OUTER", "PERIMETER"]) or (
                sx <= 0.15 or ex <= 0.15 or sx >= (max_x - min_x) * scale_factor - 0.15 or
                sy <= 0.15 or ey <= 0.15 or sy >= (max_y - min_y) * scale_factor - 0.15
            )

            wall_obj = {
                "id": f"w-dxf-{i + 1}",
                "start": [sx, sy],
                "end": [ex, ey],
                "thickness": 0.20 if is_ext else 0.15,
                "height": 3.0,
                "type": "external" if is_ext else "internal",
                "layer": w.get("layer", "WALLS"),
                "openings": []
            }
            normalized_walls.append(wall_obj)
            shapely_lines.append(LineString([[sx, sy], [ex, ey]]))

        # Discover room polygons using Shapely polygonize
        rooms: List[Dict[str, Any]] = []
        try:
            mls = unary_union(shapely_lines)
            polys = list(polygonize(mls))
            polys = [p for p in polys if p.is_valid and p.area >= 1.0]
            if len(polys) > 1:
                max_poly = max(polys, key=lambda p: p.area)
                if max_poly.area > sum(p.area for p in polys if p != max_poly) * 0.7:
                    polys.remove(max_poly)

            names_pool = [
                "Living Room", "Master Bedroom", "Kitchen", "Dining Area",
                "Bedroom 2", "Bathroom", "Foyer", "Balcony", "Study"
            ]
            for r_idx, poly in enumerate(polys):
                poly_simplified = poly.simplify(0.02, preserve_topology=True)
                coords = [[round(x, 3), round(y, 3)] for x, y in list(poly_simplified.exterior.coords)[:-1]]
                if len(coords) < 3:
                    continue
                room_name = names_pool[r_idx % len(names_pool)]
                rooms.append({
                    "id": f"room-{r_idx + 1}",
                    "name": room_name,
                    "area": round(poly.area, 2),
                    "boundary": coords
                })
        except Exception:
            pass

        return {
            "scale": scale_factor,
            "walls": normalized_walls,
            "rooms": rooms,
            "bounds": {
                "min": [0.0, 0.0],
                "max": [round((max_x - min_x) * scale_factor, 2), round((max_y - min_y) * scale_factor, 2)]
            }
        }

class RasterProcessor:
    @staticmethod
    def _median(v: List[float]) -> float:
        if not v:
            return 0.0
        s = sorted(v)
        m = len(s) // 2
        return float(s[m] if len(s) % 2 == 1 else (s[m - 1] + s[m]) / 2.0)

    @staticmethod
    def _estimate_wall_thickness(bin_img: np.ndarray, w: int, h: int) -> int:
        hw, hh = max(20, w // 2), max(20, h // 2)
        m_sub = bin_img[:hh * 2, :hw * 2]
        half_m = (m_sub.reshape(hh, 2, hw, 2).max(axis=(1, 3))).astype(np.uint8)

        max_dim = max(hw, hh)
        max_k = max(4, round(max_dim / 22))
        best = 0
        best_k = 0
        best_len = 0
        k = 2
        while k <= max_k:
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (k, k))
            opened = cv2.morphologyEx(half_m, cv2.MORPH_OPEN, kernel)
            min_run = max(12, 5 * k)
            tot = 0
            for y in range(hh):
                diff = np.diff(np.concatenate(([0], opened[y], [0])).astype(np.int16))
                for s, e in zip(np.where(diff == 1)[0], np.where(diff == -1)[0]):
                    if (e - s) >= min_run:
                        tot += (e - s)
            for x in range(hw):
                diff = np.diff(np.concatenate(([0], opened[:, x], [0])).astype(np.int16))
                for s, e in zip(np.where(diff == 1)[0], np.where(diff == -1)[0]):
                    if (e - s) >= min_run:
                        tot += (e - s)

            if tot < max_dim * 1.5:
                break
            if tot * k > best:
                best = tot * k
                best_k = k
                best_len = tot
            k += 1 if k < 8 else 2

        if not best_k or best_len < max_dim * 1.5:
            return max(4, round(max(w, h) * 0.015))

        guess = best_k * 2
        lo, hi = max(3, guess - 3), guess + 3
        hist = np.zeros(hi + 1, dtype=np.int32)
        for y in range(h):
            diff = np.diff(np.concatenate(([0], bin_img[y], [0])).astype(np.int16))
            for s, e in zip(np.where(diff == 1)[0], np.where(diff == -1)[0]):
                r = e - s
                if lo <= r <= hi:
                    hist[r] += 1
        for x in range(w):
            diff = np.diff(np.concatenate(([0], bin_img[:, x], [0])).astype(np.int16))
            for s, e in zip(np.where(diff == 1)[0], np.where(diff == -1)[0]):
                r = e - s
                if lo <= r <= hi:
                    hist[r] += 1

        t = guess
        for i in range(lo, hi + 1):
            if hist[i] > hist[t]:
                t = i
        return max(4, int(t))

    @staticmethod
    def _keep_building_components(mask: np.ndarray) -> np.ndarray:
        """Drops small annotation fragments (labels, ticks, arrow heads, symbols)."""
        count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
        if count <= 1:
            return mask

        min_area = max(90, 0.00035 * mask.size)
        keep = np.zeros_like(mask)
        for i in range(1, count):
            if int(stats[i, cv2.CC_STAT_AREA]) < min_area:
                continue
            keep[labels == i] = 1
        return keep if keep.any() else mask

    @staticmethod
    def _bands_from_binary(matrix: np.ndarray, min_len: int, min_t: int, max_t: int) -> List[Dict[str, Any]]:
        """Tracks long horizontal runs across rows into bands of a given thickness."""
        active: List[Dict[str, Any]] = []
        done: List[Dict[str, Any]] = []

        for y in range(matrix.shape[0]):
            row = matrix[y]
            diff = np.diff(np.concatenate(([0], row, [0])).astype(np.int16))
            starts = np.where(diff == 1)[0]
            ends = np.where(diff == -1)[0]
            runs = [(int(a), int(b - 1)) for a, b in zip(starts, ends) if (b - a) >= min_len]

            for band in active:
                band['hit'] = False
            nxt: List[Dict[str, Any]] = []
            for run in runs:
                best = None
                best_ov = 0
                for band in active:
                    if band['hit']:
                        continue
                    ov = min(run[1], band['last'][1]) - max(run[0], band['last'][0]) + 1
                    need = 0.5 * min(run[1] - run[0] + 1, band['last'][1] - band['last'][0] + 1)
                    if ov >= need and ov > best_ov:
                        best = band
                        best_ov = ov
                if best is not None:
                    best['hit'] = True
                    best['y1'] = y
                    best['last'] = run
                    best['s'] = min(best['s'], run[0])
                    best['e'] = max(best['e'], run[1])
                    nxt.append(best)
                else:
                    nxt.append({'y0': y, 'y1': y, 's': run[0], 'e': run[1], 'last': run, 'hit': True})
            for band in active:
                if not band['hit']:
                    done.append(band)
            active = nxt
        done.extend(active)

        bands: List[Dict[str, Any]] = []
        for band in done:
            thick = band['y1'] - band['y0'] + 1
            if thick < min_t or thick > max_t:
                continue
            if band['e'] - band['s'] + 1 < min_len:
                continue
            bands.append({'c': (band['y0'] + band['y1']) / 2.0, 's': band['s'], 'e': band['e'], 't': thick})
        return bands

    @staticmethod
    @staticmethod
    def _pair_face_chains(chains: List[Dict[str, Any]], max_separation: float) -> List[Dict[str, Any]]:
        """
        A wall is drawn as two parallel face lines around a hollow core. Pair the
        face chains belonging to the same wall and emit one wall on the centreline
        with the separation as its real thickness. Faces are matched longest-match
        first and widest separation first, so window symbols inside an opening do
        not steal a real face.
        """
        if len(chains) < 2:
            return chains

        candidates = []
        for i in range(len(chains)):
            a = chains[i]
            len_a = a['e'] - a['s']
            for j in range(i + 1, len(chains)):
                b = chains[j]
                if a['o'] != b['o']:
                    continue
                sep = abs(b['c'] - a['c'])
                if sep < 5.0 or sep > max_separation:
                    continue
                overlap = min(a['e'], b['e']) - max(a['s'], b['s'])
                if overlap <= 0:
                    continue
                len_b = b['e'] - b['s']
                coverage = overlap / max(1.0, min(len_a, len_b))
                if coverage < 0.5:
                    continue
                candidates.append((coverage, sep, i, j))

        used = [False] * len(chains)
        merged: List[Dict[str, Any]] = []
        for coverage, sep, i, j in sorted(candidates, key=lambda c: (-c[0], -c[1])):
            if used[i] or used[j]:
                continue
            used[i] = used[j] = True
            a, b = chains[i], chains[j]
            total = (a['e'] - a['s']) + (b['e'] - b['s']) or 1.0
            merged.append({
                'o': a['o'],
                'c': (a['c'] * (a['e'] - a['s']) + b['c'] * (b['e'] - b['s'])) / total,
                's': min(a['s'], b['s']),
                'e': max(a['e'], b['e']),
                't': sep + (a['t'] + b['t']) / 2.0,
                'gaps': sorted(a.get('gaps', []) + b.get('gaps', [])),
            })

        if len(merged) < 3:
            # single-line drawings: no face pairs to merge, keep the faces as walls
            return chains

        return merged

    @staticmethod
    @staticmethod
    def _wall_region_mask(bin_img: np.ndarray) -> np.ndarray:
        """
        Isolates the wall body from a floor plan raster.

        Wall faces are drawn with a heavier pen than dimension chains, section
        ticks, leader lines, room labels and furniture symbols. The stroke-weight
        histogram therefore splits into a hairline mode and a wall mode; only the
        wall mode is kept, wall cores are filled, and leftovers outside the main
        wall network are discarded.
        """
        h, w = bin_img.shape[:2]
        strokes = bin_img

        solid = cv2.morphologyEx(bin_img, cv2.MORPH_CLOSE, np.ones((2, 2), np.uint8))
        dist = cv2.distanceTransform(solid, cv2.DIST_L2, 5)
        ink = dist[dist > 0]

        if ink.size:
            hist, edges = np.histogram(ink, bins=np.arange(0.0, 6.25, 0.25))
            peak = int(np.argmax(hist))
            # walk out of the hairline mode, then forward across the valley
            i = peak
            while i < len(hist) - 1 and hist[i] > 0.05 * hist[peak]:
                i += 1
            j = i
            limit = max(3.0, 0.08 * hist[peak])
            while j < len(hist) - 1 and hist[j] < limit:
                j += 1

            if j > i and hist[j] >= limit:
                thick = float(edges[j])
                core = (dist >= thick).astype(np.uint8)
                if core.sum() >= 0.0015 * bin_img.size:
                    k = max(3, int(round(2.0 * thick)) | 1)
                    core = cv2.dilate(core, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
                    strokes = cv2.bitwise_and(core, solid)

        return RasterProcessor._keep_building_components(strokes)

    @staticmethod
    def _horizontal_bands(mask: np.ndarray, w: int, h: int, T: int) -> List[Dict[str, Any]]:
        min_len = max(14, round(2.5 * T))
        active: List[Dict[str, Any]] = []
        done: List[Dict[str, Any]] = []

        def finish(b: Dict[str, Any]):
            t = b['y1'] - b['y0'] + 1
            if t < max(2, round(0.3 * T)) or t > 2.8 * T:
                return
            s = RasterProcessor._median(b['x0s'])
            e = RasterProcessor._median(b['x1s'])
            if e - s + 1 < min_len:
                return
            done.append({'c': (b['y0'] + b['y1']) / 2.0, 's': s, 'e': e, 't': t})

        for y in range(h):
            row = mask[y]
            diff = np.diff(np.concatenate(([0], row, [0])).astype(np.int16))
            starts = np.where(diff == 1)[0]
            ends = np.where(diff == -1)[0]
            runs = [(int(s), int(e - 1)) for s, e in zip(starts, ends) if (e - s) >= min_len]

            for b in active:
                b['hit'] = False
            next_active = []

            for run in runs:
                best = None
                best_ov = 0
                for b in active:
                    if b['hit']:
                        continue
                    ov = min(run[1], b['last'][1]) - max(run[0], b['last'][0]) + 1
                    need = 0.6 * min(run[1] - run[0] + 1, b['last'][1] - b['last'][0] + 1)
                    if ov >= need and ov > best_ov:
                        best = b
                        best_ov = ov
                if best:
                    best['hit'] = True
                    best['y1'] = y
                    best['x0s'].append(run[0])
                    best['x1s'].append(run[1])
                    best['last'] = run
                    next_active.append(best)
                else:
                    next_active.append({
                        'y0': y, 'y1': y,
                        'x0s': [run[0]], 'x1s': [run[1]],
                        'last': run, 'hit': True
                    })

            for b in active:
                if not b['hit']:
                    finish(b)
            active = next_active

        for b in active:
            finish(b)
        return done

    @staticmethod
    def _weighted_c(g: List[Dict[str, Any]]) -> float:
        s = sum(b['c'] * (b['e'] - b['s'] + 1) for b in g)
        wsum = sum(b['e'] - b['s'] + 1 for b in g)
        return float(s / max(1e-6, wsum))

    @staticmethod
    def _chains_of(o: str, bands: List[Dict[str, Any]], T: int, max_gap: float, cluster_tol: float) -> List[Dict[str, Any]]:
        sorted_bands = sorted(bands, key=lambda b: b['c'])
        groups: List[List[Dict[str, Any]]] = []
        for b in sorted_bands:
            if groups and abs(b['c'] - RasterProcessor._weighted_c(groups[-1])) <= cluster_tol:
                groups[-1].append(b)
            else:
                groups.append([b])

        chains: List[Dict[str, Any]] = []
        for g in groups:
            c = RasterProcessor._weighted_c(g)
            pieces = sorted([{'s': b['s'], 'e': b['e'], 't': b['t']} for b in g], key=lambda x: x['s'])
            merged: List[Dict[str, Any]] = []
            for p in pieces:
                if merged and p['s'] <= merged[-1]['e'] + 1.0 * T:
                    m = merged[-1]
                    tlen = m['len'] + (p['e'] - p['s'])
                    m['t'] = (m['t'] * m['len'] + p['t'] * (p['e'] - p['s'])) / max(1, tlen)
                    m['e'] = max(m['e'], p['e'])
                    m['len'] = tlen
                else:
                    merged.append({'s': p['s'], 'e': p['e'], 't': p['t'], 'len': p['e'] - p['s']})

            cur: Optional[Dict[str, Any]] = None
            for m in merged:
                can_join = False
                if cur:
                    gap = m['s'] - cur['e']
                    if gap <= max_gap:
                        can_join = True

                if can_join and cur is not None:
                    cur['gaps'].append((cur['e'], m['s']))
                    cur['t'] = max(cur['t'], m['t'])
                    cur['e'] = m['e']
                else:
                    if cur:
                        chains.append(cur)
                    cur = {'o': o, 'c': c, 's': m['s'], 'e': m['e'], 't': m['t'], 'gaps': []}
            if cur:
                chains.append(cur)

        return chains

    @staticmethod
    def _join_ends(hs: List[Dict[str, Any]], vs: List[Dict[str, Any]], T: int):
        tol = 1.0 * T
        reach = 1.6 * T
        loose = set()

        def snap(a: List[Dict[str, Any]], b: List[Dict[str, Any]], tag: str):
            for ci, ch in enumerate(a):
                for end in ['s', 'e']:
                    pos = ch[end]
                    best = None
                    best_d = float('inf')
                    for p in b:
                        if ch['c'] < p['s'] - tol or ch['c'] > p['e'] + tol:
                            continue
                        d = abs(p['c'] - pos)
                        if d <= tol and d < best_d:
                            best = p
                            best_d = d
                    if not best:
                        loose.add(f"{tag}{ci}{end}")
                        continue
                    loose.discard(f"{tag}{ci}{end}")
                    ch[end] = best['c']
                    if ch['c'] < best['s']:
                        best['s'] = ch['c']
                    if ch['c'] > best['e']:
                        best['e'] = ch['c']

        snap(hs, vs, 'h')
        snap(vs, hs, 'v')

        def extend(a: List[Dict[str, Any]], b: List[Dict[str, Any]], tag: str):
            for ci, ch in enumerate(a):
                for end in ['s', 'e']:
                    key = f"{tag}{ci}{end}"
                    if key not in loose:
                        continue
                    pos = ch[end]
                    dir_val = 1 if end == 'e' else -1
                    best = None
                    best_d = float('inf')
                    for p in b:
                        if ch['c'] < p['s'] - T or ch['c'] > p['e'] + T:
                            continue
                        d = (p['c'] - pos) * dir_val
                        if 0 < d <= reach and d < best_d:
                            best = p
                            best_d = d
                    for q in a:
                        if q is ch or abs(q['c'] - ch['c']) > 0.6 * T:
                            continue
                        d = (q['s'] - pos) if end == 'e' else (pos - q['e'])
                        if 0 < d < best_d:
                            best = None
                            best_d = d
                    if not best:
                        continue
                    face = best['c'] - dir_val * (best['t'] / 2.0)
                    if (face - pos) * dir_val > 0.5 * T:
                        ch['gaps'].append((pos, face) if end == 'e' else (face, pos))
                    ch[end] = best['c']
                    if ch['c'] < best['s']:
                        best['s'] = ch['c']
                    if ch['c'] > best['e']:
                        best['e'] = ch['c']

        extend(hs, vs, 'h')
        extend(vs, hs, 'v')

        for ch in hs + vs:
            if ch['s'] > ch['e']:
                ch['s'], ch['e'] = ch['e'], ch['s']
            ch['gaps'] = [
                (max(g[0], ch['s']), min(g[1], ch['e']))
                for g in ch['gaps']
                if g[1] > ch['s'] and g[0] < ch['e']
            ]
            ch['gaps'].sort(key=lambda g: g[0])

    @staticmethod
    def _window_score(bin_img: np.ndarray, w: int, h: int, ch: Dict[str, Any], a: float, b: float) -> float:
        half = max(1, round(ch['t'] / 2.0))
        crossed = 0
        n = 0
        u_start = int(math.ceil(a)) + 1
        u_end = int(math.floor(b))
        for u in range(u_start, u_end):
            dark = 0
            prev = 0
            for k in range(-half, half + 1):
                x = u if ch['o'] == 'h' else int(round(ch['c'])) + k
                y = int(round(ch['c'])) + k if ch['o'] == 'h' else u
                if 0 <= x < w and 0 <= y < h:
                    v = bin_img[y, x]
                    if v and not prev:
                        dark += 1
                    prev = v
            n += 1
            if dark >= 2:
                crossed += 1
        return (crossed / n) if n > 0 else 0.0

    @staticmethod
    def process_image(image_path: str, scale: float = 0.01, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        2BUILDERS Watertight Architectural Geometry Engine
        Pure deterministic computer vision:
        1. Adaptive tone check & Otsu binarization
        2. Morphological wall thickness T estimation
        3. Row-by-row band extraction (vectorise.ts approach)
        4. Band clustering with tolerance >= 1.4*T to merge double lines into single centerlines
        5. L-corner & T-junction watertight snapping
        6. Perpendicular crossing splitting with zero duplicate / overlapping segments
        7. Physical gap opening classification (doors & windows)
        8. Watertight grid floodfill for non-overlapping room polygons snapped to wall faces
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
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 1. Background inversion check
        edge_pixels = np.concatenate([gray[0, :], gray[-1, :], gray[:, 0], gray[:, -1]])
        if np.median(edge_pixels) < 110:
            gray = 255 - gray

        # Otsu binarization
        _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        bin_m = (otsu > 128).astype(np.uint8)

        # 2. Wall region mask: keep the heavy wall strokes only and fill the hollow
        #    between the two faces of each wall. Dimension chains, section ticks,
        #    leader lines, room labels and furniture hairlines are dropped here so
        #    they can never be mistaken for walls.
        cavity = RasterProcessor._wall_region_mask(bin_m)

        # 3. Wall thickness measured on the solid wall bands
        T = RasterProcessor._estimate_wall_thickness(cavity, width, height)
        T = max(4, T)

        clean_mask = cavity

        # 4. The two faces of every wall, one band per face
        face_min_len = max(14, round(0.018 * max(width, height)))
        h_faces = RasterProcessor._bands_from_binary(clean_mask, face_min_len, 2, 16)
        v_faces = RasterProcessor._bands_from_binary(clean_mask.T, face_min_len, 2, 16)

        # 5. Continuous face chains, then pair the two faces of each wall
        face_t = max(4.0, RasterProcessor._median([b['t'] for b in h_faces + v_faces] or [4]))
        face_gap = max(40.0, 0.16 * max(width, height))
        h_chains = RasterProcessor._chains_of('h', h_faces, face_t, face_gap, 3.0)
        v_chains = RasterProcessor._chains_of('v', v_faces, face_t, face_gap, 3.0)

        max_separation = max(20.0, 0.05 * max(width, height))
        h_bands = RasterProcessor._pair_face_chains(h_chains, max_separation)
        v_bands_t = RasterProcessor._pair_face_chains(v_chains, max_separation)

        # Wall thickness drives every later tolerance
        T = max(6.0, RasterProcessor._median([b['t'] for b in h_bands + v_bands_t]))

        # 6. Chains: collinear pieces belong to the same wall, doors bridge over
        cluster_tol = max(4.0, 0.35 * T)
        max_gap = max(4.0 * T, 0.085 * max(width, height))
        hs = RasterProcessor._chains_of('h', h_bands, T, max_gap, cluster_tol)
        vs = RasterProcessor._chains_of('v', v_bands_t, T, max_gap, cluster_tol)

        min_chain_len = max(24, round(2.0 * T))
        hs = [ch for ch in hs if (ch['e'] - ch['s']) >= min_chain_len]
        vs = [ch for ch in vs if (ch['e'] - ch['s']) >= min_chain_len]

        # 6. Snap ends at corners and junctions
        RasterProcessor._join_ends(hs, vs, T)

        # 7. Split at perpendicular crossings
        eps = 0.6 * T
        splits = {id(ch): [ch['s'], ch['e']] for ch in hs + vs}
        for hc in hs:
            for vc in vs:
                if (vc['c'] >= hc['s'] - eps and vc['c'] <= hc['e'] + eps and
                    hc['c'] >= vc['s'] - eps and hc['c'] <= vc['e'] + eps):
                    splits[id(hc)].append(min(hc['e'], max(hc['s'], vc['c'])))
                    splits[id(vc)].append(min(vc['e'], max(vc['s'], hc['c'])))

        all_xs = [ch['c'] for ch in vs] + [ch['s'] for ch in hs] + [ch['e'] for ch in hs]
        all_ys = [ch['c'] for ch in hs] + [ch['s'] for ch in vs] + [ch['e'] for ch in vs]
        min_px_x = min(all_xs) if all_xs else 0
        max_px_x = max(all_xs) if all_xs else width
        min_px_y = min(all_ys) if all_ys else 0
        max_px_y = max(all_ys) if all_ys else height

        real_width = options.get("realWidth", 9.0) if options else 9.0
        bw_px = max(100, max_px_x - min_px_x)
        # Wall coordinates are already in resized pixel space, so the scale is
        # simply real width over the measured building width.
        scale = real_width / bw_px

        min_m_x = min_px_x * scale
        max_m_x = max_px_x * scale
        min_m_y = min_px_y * scale
        max_m_y = max_px_y * scale
        ext_margin = max(0.40, T * scale * 2.0)

        # Node registry with 0.6 T tolerance
        nodes: List[Tuple[str, float, float]] = []
        def node_at(x: float, y: float) -> str:
            for n in nodes:
                if abs(n[1] - x) <= 0.6 * T and abs(n[2] - y) <= 0.6 * T:
                    return n[0]
            nid = f"n{len(nodes) + 1}"
            nodes.append((nid, round(x, 1), round(y, 1)))
            return nid

        final_walls: List[Dict[str, Any]] = []
        seen_pairs = set()

        for ch in hs + vs:
            pts = sorted(list(set(round(p, 1) for p in splits[id(ch)])))
            cuts = []
            for p in pts:
                if not cuts or p - cuts[-1] > 0.6 * T:
                    cuts.append(p)
            if len(cuts) < 2:
                continue

            pieces: List[Dict[str, Any]] = []
            for i in range(len(cuts) - 1):
                s = cuts[i]
                e = cuts[i + 1]
                if (e - s) < 1.0 * T:
                    continue
                ax, ay = (s, ch['c']) if ch['o'] == 'h' else (ch['c'], s)
                bx, by = (e, ch['c']) if ch['o'] == 'h' else (ch['c'], e)
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
                if piece_len_m < 0.20:
                    continue

                is_ext = (
                    abs(min(x1_m, x2_m) - min_m_x) < ext_margin or
                    abs(max(x1_m, x2_m) - max_m_x) < ext_margin or
                    abs(min(y1_m, y2_m) - min_m_y) < ext_margin or
                    abs(max(y1_m, y2_m) - max_m_y) < ext_margin
                )

                wid = f"wall-{uuid.uuid4().hex[:8]}"
                # real wall thickness read from the drawing, not a guessed constant
                wall_t = round(min(0.45, max(0.10, ch['t'] * scale)), 3)
                wall_obj = {
                    'id': wid,
                    'start': [x1_m, y1_m],
                    'end': [x2_m, y2_m],
                    'thickness': wall_t,
                    'height': 3.0,
                    'type': "external" if is_ext else "internal",
                    'layer': "WALLS",
                    'openings': [],
                    '_o': ch['o'],
                    '_s': s,
                    '_e': e,
                    '_c': ch['c'],
                    '_t': ch['t']
                }
                pieces.append(wall_obj)

            # Detect openings on pieces
            for ga, gb in ch['gaps']:
                width_px = gb - ga
                if width_px < 0.75 * T:
                    continue
                mid = (ga + gb) / 2.0
                piece = next((p for p in pieces if p['_s'] <= mid <= p['_e']), None)
                if not piece:
                    continue
                win = RasterProcessor._window_score(bin_m, width, height, ch, ga, gb)
                op_type = "window" if win >= 0.55 else ("door" if width_px <= 7 * T else "opening")
                p_len = math.hypot(piece['end'][0] - piece['start'][0], piece['end'][1] - piece['start'][1])
                gap_w_m = round(min(p_len * 0.7, max(0.8, width_px * scale)), 2)
                offset_m = round(max(0.1, (ga - piece['_s']) * scale), 2)

                op_obj = {
                    'id': f"op-{uuid.uuid4().hex[:6]}",
                    'type': op_type,
                    'offset': offset_m,
                    'width': gap_w_m,
                    'height': 1.4 if op_type == 'window' else 2.1,
                    'sill_height': 0.9 if op_type == 'window' else 0.0
                }
                piece['openings'].append(op_obj)

            final_walls.extend(pieces)

        # 8. Rooms via Watertight Grid Floodfill
        cell = max(1, round(T / 3.0))
        gw = int(math.ceil(width / cell))
        gh = int(math.ceil(height / cell))
        WALL, OUT = 1, 2
        grid = np.zeros((gh, gw), dtype=np.int32)

        for wl in final_walls:
            half = max(wl['_t'] / 2.0, cell * 0.75)
            if wl['_o'] == 'h':
                x0 = min(wl['_s'], wl['_e']) - half
                x1 = max(wl['_s'], wl['_e']) + half
                y0 = wl['_c'] - half
                y1 = wl['_c'] + half
            else:
                x0 = wl['_c'] - half
                x1 = wl['_c'] + half
                y0 = min(wl['_s'], wl['_e']) - half
                y1 = max(wl['_s'], wl['_e']) + half

            gy0 = max(0, int(math.floor(y0 / cell)))
            gy1 = min(gh - 1, int(math.floor(y1 / cell)))
            gx0 = max(0, int(math.floor(x0 / cell)))
            gx1 = min(gw - 1, int(math.floor(x1 / cell)))

            for gy in range(gy0, gy1 + 1):
                cy = (gy + 0.5) * cell
                if cy < y0 or cy > y1:
                    continue
                for gx in range(gx0, gx1 + 1):
                    cx = (gx + 0.5) * cell
                    if x0 <= cx <= x1:
                        grid[gy, gx] = WALL

        # Floodfill exterior from border seeds
        flood_mask = np.zeros((gh + 2, gw + 2), dtype=np.uint8)
        border_seeds = [(0, 0), (gw - 1, 0), (0, gh - 1), (gw - 1, gh - 1)]
        for gx in range(0, gw, max(1, gw // 20)):
            border_seeds.extend([(gx, 0), (gx, gh - 1)])
        for gy in range(0, gh, max(1, gh // 20)):
            border_seeds.extend([(0, gy), (gw - 1, gy)])

        for sx, sy in border_seeds:
            if grid[sy, sx] == 0:
                cv2.floodFill(grid, flood_mask, (sx, sy), OUT)

        min_room_cells = max(6, round((3.5 * T * 3.5 * T) / (cell * cell)))
        raw_rooms: List[Tuple[List[List[float]], float]] = []
        label = 10
        total_house_cells = (bw_px // cell) * ((max_px_y - min_px_y) // cell)

        for y in range(gh):
            for x in range(gw):
                if grid[y, x] == 0:
                    val = label
                    label += 1
                    area, _, _, _ = cv2.floodFill(grid, flood_mask, (x, y), val)
                    if area < min_room_cells:
                        continue

                    comp = (grid == val).astype(np.uint8)
                    cnts, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                    if not cnts:
                        continue
                    cnt = max(cnts, key=cv2.contourArea)
                    rx, ry, rw, rh = cv2.boundingRect(cnt)

                    # Reject outer margins / title frame wrapping around the house
                    if rw >= 0.82 * (bw_px / cell) and rh >= 0.82 * ((max_px_y - min_px_y) / cell):
                        grid[comp > 0] = OUT
                        continue

                    peri = cv2.arcLength(cnt, True)
                    approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)
                    if len(approx) < 3:
                        continue

                    # Contour runs through free cell centres, so the polygon never
                    # enters a wall body; converting directly keeps it that way.
                    pts_m = [
                        [round(float(pt[0][0]) * cell * scale, 3),
                         round(float(pt[0][1]) * cell * scale, 3)]
                        for pt in approx
                    ]

                    room_area_m2 = round(area * (cell * scale) ** 2, 2)
                    if room_area_m2 >= 0.5:
                        raw_rooms.append((pts_m, room_area_m2))

        # Clean temporary private keys from walls
        for wl in final_walls:
            for k in ['_o', '_s', '_e', '_c', '_t']:
                wl.pop(k, None)

        # Rooms must never be drawn on top of a wall: clip any overlap away.
        if final_walls:
            wall_union = unary_union(wall_footprints(final_walls))
            trimmed_rooms: List[Tuple[List[List[float]], float]] = []
            for pts, fallback_area in raw_rooms:
                try:
                    poly = Polygon(pts)
                    if not poly.is_valid:
                        poly = poly.buffer(0)
                    if poly.is_empty:
                        continue
                    if poly.intersection(wall_union).area > 1e-4:
                        poly = poly.difference(wall_union.buffer(0.002))
                    if poly.is_empty:
                        continue
                    if poly.geom_type == 'MultiPolygon':
                        poly = max(poly.geoms, key=lambda g: g.area)
                    if poly.geom_type != 'Polygon':
                        continue
                    poly = poly.simplify(0.02, preserve_topology=True)
                    if poly.geom_type != 'Polygon' or poly.is_empty:
                        continue
                    boundary = [[round(x, 3), round(y, 3)] for x, y in list(poly.exterior.coords)[:-1]]
                    if len(boundary) < 3 or poly.area < 0.5:
                        continue
                    trimmed_rooms.append((boundary, round(poly.area, 2)))
                except Exception:
                    trimmed_rooms.append((pts, fallback_area))
            raw_rooms = trimmed_rooms

        # Sort rooms by area descending
        raw_rooms.sort(key=lambda r: r[1], reverse=True)

        names_pool = [
            "Great Room / Living", "Dining Area", "Kitchen", "Master Bedroom",
            "Bedroom 2", "Bedroom 3", "Master Bathroom", "Bathroom",
            "Flex Room", "Foyer / Entry", "Hallway", "Walk-in Closet",
            "Utility Room", "Powder Room", "Study / Office"
        ]
        used_names = set()
        final_rooms: List[Dict[str, Any]] = []

        for idx, (pts, a_m2) in enumerate(raw_rooms):
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
            rel_x = (cx - min_m_x) / max(0.1, max_m_x - min_m_x)
            rel_y = (cy - min_m_y) / max(0.1, max_m_y - min_m_y)

            name = None
            if idx == 0 and "Great Room / Living" not in used_names:
                name = "Great Room / Living"
            elif "Master Bedroom" not in used_names and a_m2 >= 1.5:
                name = "Master Bedroom"
            elif "Kitchen" not in used_names and a_m2 >= 1.0 and rel_x > 0.4:
                name = "Kitchen"
            elif "Dining Area" not in used_names and a_m2 >= 1.0:
                name = "Dining Area"
            elif "Bedroom 2" not in used_names and a_m2 >= 1.2:
                name = "Bedroom 2"
            elif "Bedroom 3" not in used_names and a_m2 >= 1.0:
                name = "Bedroom 3"
            elif "Master Bathroom" not in used_names and a_m2 >= 0.8:
                name = "Master Bathroom"
            elif "Bathroom" not in used_names and a_m2 >= 0.6:
                name = "Bathroom"
            elif "Flex Room" not in used_names and a_m2 >= 0.8:
                name = "Flex Room"

            if not name:
                for cand in names_pool:
                    if cand not in used_names:
                        name = cand
                        break
            if not name:
                name = f"Room {idx + 1}"

            used_names.add(name)
            final_rooms.append({
                'id': f"room-{uuid.uuid4().hex[:8]}",
                'name': name,
                'boundary': pts,
                'area': a_m2
            })

        # Slab boundary
        contours, _ = cv2.findContours(cavity, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        slab_boundary: List[List[float]] = []
        if contours:
            outer_c = max(contours, key=cv2.contourArea)
            peri = cv2.arcLength(outer_c, True)
            approx = cv2.approxPolyDP(outer_c, 0.015 * peri, True)
            slab_boundary = [[round(float(p[0][0] * scale), 3), round(float(p[0][1] * scale), 3)] for p in approx]

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

