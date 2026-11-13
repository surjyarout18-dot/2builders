"""
Wall Detection & Vectorization Engine.
Extracts linear wall candidates, merges collinear segments, and estimates thickness.
"""
import math
import cv2
import numpy as np
from typing import List, Dict, Any, Tuple

class WallDetector:
    def __init__(self, min_wall_length_px: int = 25, snap_dist_px: float = 18.0):
        self.min_wall_length_px = min_wall_length_px
        self.snap_dist_px = snap_dist_px

    def detect_walls(self, binary_img: np.ndarray) -> Tuple[List[Dict[str, Any]], np.ndarray]:
        """
        Detects structural walls from binary floor plan.
        Returns:
            - walls: list of wall dicts with start, end, thickness, wall_type
            - wall_mask: clean binary mask containing only structural walls
        """
        h, w = binary_img.shape[:2]

        # Extract horizontal and vertical dominant structures using directional morphological kernels
        kernel_len = max(15, min(h, w) // 50)
        h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_len, 1))
        v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, kernel_len))

        h_lines = cv2.morphologyEx(binary_img, cv2.MORPH_OPEN, h_kernel)
        v_lines = cv2.morphologyEx(binary_img, cv2.MORPH_OPEN, v_kernel)

        # Merge structural wall regions
        wall_mask = cv2.bitwise_or(h_lines, v_lines)
        
        # Dilate slightly then close to merge dual-line architectural wall representations
        close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        wall_mask = cv2.morphologyEx(wall_mask, cv2.MORPH_CLOSE, close_kernel)

        # If morphological separation yielded too few pixels (e.g. thin-line plans or sketches),
        # fall back to using binary_img directly with morphological bridge
        if np.count_nonzero(wall_mask) < 0.005 * (h * w):
            wall_mask = cv2.morphologyEx(binary_img, cv2.MORPH_CLOSE, close_kernel)

        # Probabilistic Hough Line Transform to detect line centerlines
        raw_lines = cv2.HoughLinesP(
            wall_mask,
            rho=1,
            theta=np.pi / 180,
            threshold=25,
            minLineLength=self.min_wall_length_px,
            maxLineGap=20
        )

        if raw_lines is None:
            return [], wall_mask

        # Normalize line segments
        segments: List[Tuple[float, float, float, float]] = []
        for line in raw_lines:
            coords = line.flatten()
            if len(coords) < 4:
                continue
            x1, y1, x2, y2 = float(coords[0]), float(coords[1]), float(coords[2]), float(coords[3])
            # Ensure start point is to the left or top
            if x1 > x2 or (x1 == x2 and y1 > y2):
                x1, y1, x2, y2 = x2, y2, x1, y1
            segments.append((x1, y1, x2, y2))

        # Merge collinear segments
        merged = self._merge_collinear_segments(segments)

        # Snap endpoints that are close to each other
        snapped = self._snap_endpoints(merged)

        # Calculate thickness and wall type
        walls: List[Dict[str, Any]] = []
        for i, (x1, y1, x2, y2) in enumerate(snapped):
            dx = x2 - x1
            dy = y2 - y1
            length = math.hypot(dx, dy)
            if length < self.min_wall_length_px:
                continue

            thickness = self._estimate_thickness(wall_mask, x1, y1, x2, y2)
            
            # Exterior walls are typically thicker or touch outer bounds
            is_exterior = (
                x1 < 0.15 * w or x2 > 0.85 * w or
                y1 < 0.15 * h or y2 > 0.85 * h or
                thickness >= 12.0
            )

            walls.append({
                "id": f"wall_{i+1:03d}",
                "start": (x1, y1),
                "end": (x2, y2),
                "thickness_px": thickness,
                "wall_type": "exterior" if is_exterior else "interior"
            })

        return walls, wall_mask

    def _merge_collinear_segments(self, segments: List[Tuple[float, float, float, float]]) -> List[Tuple[float, float, float, float]]:
        merged = list(segments)
        changed = True

        while changed:
            changed = False
            i = 0
            while i < len(merged):
                j = i + 1
                while j < len(merged):
                    s1 = merged[i]
                    s2 = merged[j]
                    combined = self._try_merge_two(s1, s2)
                    if combined is not None:
                        merged[i] = combined
                        merged.pop(j)
                        changed = True
                    else:
                        j += 1
                i += 1

        return merged

    def _try_merge_two(self, s1: Tuple[float, float, float, float], s2: Tuple[float, float, float, float]) -> Any:
        x1, y1, x2, y2 = s1
        x3, y3, x4, y4 = s2

        dx1, dy1 = x2 - x1, y2 - y1
        dx2, dy2 = x4 - x3, y4 - y3

        len1 = math.hypot(dx1, dy1)
        len2 = math.hypot(dx2, dy2)
        if len1 == 0 or len2 == 0:
            return None

        # Check angle alignment (dot product of unit vectors)
        dot = abs((dx1 * dx2 + dy1 * dy2) / (len1 * len2))
        if dot < 0.96:  # Angle > ~16 degrees
            return None

        # Orthogonal distance from s2 points to s1 line
        dist1 = self._point_to_line_dist(x3, y3, x1, y1, x2, y2)
        dist2 = self._point_to_line_dist(x4, y4, x1, y1, x2, y2)
        if dist1 > 15.0 or dist2 > 15.0:
            return None

        # Project all 4 points onto the line axis and find extent
        points = [(x1, y1), (x2, y2), (x3, y3), (x4, y4)]
        # Sort along primary axis (dx or dy)
        if abs(dx1) >= abs(dy1):
            points.sort(key=lambda p: p[0])
        else:
            points.sort(key=lambda p: p[1])

        p_start, p_end = points[0], points[3]
        total_span = math.hypot(p_end[0] - p_start[0], p_end[1] - p_start[1])
        # Only merge if gap between segments is reasonably small (<= 35px)
        if total_span <= len1 + len2 + 35.0:
            # Orthogonalize near horizontal or near vertical lines
            px1, py1 = p_start
            px2, py2 = p_end
            if abs(py2 - py1) < 8.0:
                avg_y = (py1 + py2) / 2.0
                return (px1, avg_y, px2, avg_y)
            elif abs(px2 - px1) < 8.0:
                avg_x = (px1 + px2) / 2.0
                return (avg_x, py1, avg_x, py2)
            return (px1, py1, px2, py2)

        return None

    def _point_to_line_dist(self, px: float, py: float, x1: float, y1: float, x2: float, y2: float) -> float:
        dx, dy = x2 - x1, y2 - y1
        line_len_sq = dx * dx + dy * dy
        if line_len_sq == 0:
            return math.hypot(px - x1, py - y1)
        u = ((px - x1) * dx + (py - y1) * dy) / line_len_sq
        u = max(0.0, min(1.0, u))
        nearest_x = x1 + u * dx
        nearest_y = y1 + u * dy
        return math.hypot(px - nearest_x, py - nearest_y)

    def _snap_endpoints(self, segments: List[Tuple[float, float, float, float]]) -> List[Tuple[float, float, float, float]]:
        """Snaps endpoints that are within snap_dist_px to form closed corners."""
        endpoints = []
        for s in segments:
            endpoints.append([s[0], s[1]])
            endpoints.append([s[2], s[3]])

        # Cluster endpoints
        for i in range(len(endpoints)):
            for j in range(i + 1, len(endpoints)):
                d = math.hypot(endpoints[i][0] - endpoints[j][0], endpoints[i][1] - endpoints[j][1])
                if d <= self.snap_dist_px:
                    # Snap both to their midpoint
                    avg_x = (endpoints[i][0] + endpoints[j][0]) / 2.0
                    avg_y = (endpoints[i][1] + endpoints[j][1]) / 2.0
                    endpoints[i][0] = avg_x
                    endpoints[i][1] = avg_y
                    endpoints[j][0] = avg_x
                    endpoints[j][1] = avg_y

        snapped = []
        for i in range(len(segments)):
            snapped.append((
                endpoints[2 * i][0], endpoints[2 * i][1],
                endpoints[2 * i + 1][0], endpoints[2 * i + 1][1]
            ))
        return snapped

    def _estimate_thickness(self, wall_mask: np.ndarray, x1: float, y1: float, x2: float, y2: float) -> float:
        """Samples perpendicular intensity across wall midpoint to calculate thickness in pixels."""
        h, w = wall_mask.shape[:2]
        mx, my = (x1 + x2) / 2.0, (y1 + y2) / 2.0
        dx, dy = x2 - x1, y2 - y1
        length = math.hypot(dx, dy)
        if length == 0:
            return 10.0

        # Perpendicular unit vector
        nx = -dy / length
        ny = dx / length

        count = 0
        for step in range(-25, 26):
            sx = int(round(mx + nx * step))
            sy = int(round(my + ny * step))
            if 0 <= sx < w and 0 <= sy < h:
                if wall_mask[sy, sx] > 128:
                    count += 1

        return float(max(6, min(count, 35)))
