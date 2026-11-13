"""
Opening Detection Engine (Doors & Windows).
Identifies wall openings, door swing arcs, and assigns host wall relationships.
"""
import math
import cv2
import numpy as np
from typing import List, Dict, Any, Tuple

class OpeningDetector:
    def __init__(self, min_opening_px: float = 20.0, max_opening_px: float = 120.0):
        self.min_opening_px = min_opening_px
        self.max_opening_px = max_opening_px

    def detect_openings(
        self,
        binary_img: np.ndarray,
        walls: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Detects doors and windows from floor plan drawing and attaches them to host walls.
        Returns:
            - doors: list of door dicts
            - windows: list of window dicts
        """
        doors: List[Dict[str, Any]] = []
        windows: List[Dict[str, Any]] = []

        if not walls:
            return doors, windows

        h, w = binary_img.shape[:2]

        # 1. Detect circular door swing arcs using Hough Circles and contour arcs
        # Invert or extract thin lines
        gray_edges = cv2.Canny(binary_img, 50, 150)
        circles = cv2.HoughCircles(
            gray_edges,
            cv2.HOUGH_GRADIENT,
            dp=1.2,
            minDist=30,
            param1=80,
            param2=25,
            minRadius=int(self.min_opening_px // 2),
            maxRadius=int(self.max_opening_px)
        )

        detected_swing_centers: List[Tuple[float, float, float]] = []
        if circles is not None:
            for c in circles[0]:
                cx, cy, r = float(c[0]), float(c[1]), float(c[2])
                detected_swing_centers.append((cx, cy, r))

        # 2. Check for collinear gaps between collinear wall pairs
        door_id = 1
        window_id = 1

        for i in range(len(walls)):
            w1 = walls[i]
            x1, y1 = w1["start"]
            x2, y2 = w1["end"]

            for j in range(i + 1, len(walls)):
                w2 = walls[j]
                x3, y3 = w2["start"]
                x4, y4 = w2["end"]

                gap = self._check_collinear_gap(w1, w2)
                if gap:
                    gx, gy, g_width, host_wall_id = gap
                    # Check if gap is near a door swing arc
                    is_door = False
                    for cx, cy, r in detected_swing_centers:
                        if math.hypot(gx - cx, gy - cy) < (r + 20.0):
                            is_door = True
                            break

                    # If not explicitly confirmed as door swing, check if host wall is exterior (window) or interior (door)
                    if not is_door:
                        if w1["wall_type"] == "exterior":
                            windows.append({
                                "id": f"window_{window_id:03d}",
                                "wall_id": host_wall_id,
                                "position": (gx, gy),
                                "width_px": g_width,
                                "height_m": 1.40,
                                "sill_height_m": 0.90,
                                "window_type": "casement"
                            })
                            window_id += 1
                        else:
                            doors.append({
                                "id": f"door_{door_id:03d}",
                                "wall_id": host_wall_id,
                                "position": (gx, gy),
                                "width_px": g_width,
                                "height_m": 2.10,
                                "swing_direction": "left",
                                "door_type": "single"
                            })
                            door_id += 1
                    else:
                        doors.append({
                            "id": f"door_{door_id:03d}",
                            "wall_id": host_wall_id,
                            "position": (gx, gy),
                            "width_px": g_width,
                            "height_m": 2.10,
                            "swing_direction": "left",
                            "door_type": "single"
                        })
                        door_id += 1

        # 3. If no door was found via gap analysis, attach any detected swing arc directly to nearest wall
        if len(doors) == 0 and detected_swing_centers:
            for cx, cy, r in detected_swing_centers[:4]:
                nearest_wall = self._find_nearest_wall(cx, cy, walls)
                if nearest_wall:
                    doors.append({
                        "id": f"door_{door_id:03d}",
                        "wall_id": nearest_wall["id"],
                        "position": (cx, cy),
                        "width_px": float(r * 1.4),
                        "height_m": 2.10,
                        "swing_direction": "left",
                        "door_type": "single"
                    })
                    door_id += 1

        return doors, windows

    def _check_collinear_gap(self, w1: Dict[str, Any], w2: Dict[str, Any]) -> Any:
        x1, y1 = w1["start"]
        x2, y2 = w1["end"]
        x3, y3 = w2["start"]
        x4, y4 = w2["end"]

        dx1, dy1 = x2 - x1, y2 - y1
        dx2, dy2 = x4 - x3, y4 - y3
        len1 = math.hypot(dx1, dy1)
        len2 = math.hypot(dx2, dy2)
        if len1 == 0 or len2 == 0:
            return None

        dot = abs((dx1 * dx2 + dy1 * dy2) / (len1 * len2))
        if dot < 0.98:
            return None

        # Check endpoints distance
        endpoints_pairs = [
            ((x2, y2), (x3, y3)),
            ((x1, y1), (x4, y4)),
            ((x2, y2), (x4, y4)),
            ((x1, y1), (x3, y3))
        ]

        for pA, pB in endpoints_pairs:
            dist = math.hypot(pA[0] - pB[0], pA[1] - pB[1])
            if self.min_opening_px <= dist <= self.max_opening_px:
                # Gap midpoint
                mx = (pA[0] + pB[0]) / 2.0
                my = (pA[1] + pB[1]) / 2.0
                return (mx, my, dist, w1["id"])

        return None

    def _find_nearest_wall(self, px: float, py: float, walls: List[Dict[str, Any]]) -> Any:
        best_wall = None
        min_dist = float("inf")
        for w in walls:
            x1, y1 = w["start"]
            x2, y2 = w["end"]
            dx, dy = x2 - x1, y2 - y1
            sq_len = dx * dx + dy * dy
            if sq_len == 0:
                continue
            u = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / sq_len))
            nx = x1 + u * dx
            ny = y1 + u * dy
            d = math.hypot(px - nx, py - ny)
            if d < min_dist:
                min_dist = d
                best_wall = w
        return best_wall if min_dist < 60.0 else None
