"""
Room Boundary Detection & Area Calculation Engine.
Uses computational geometry and contour topology to identify enclosed living spaces.
"""
import math
import cv2
import numpy as np
from typing import List, Dict, Any, Tuple
from shapely.geometry import Polygon

class RoomDetector:
    def __init__(self, min_room_area_sqm: float = 2.0, max_room_area_sqm: float = 300.0):
        self.min_room_area_sqm = min_room_area_sqm
        self.max_room_area_sqm = max_room_area_sqm

    def detect_rooms(
        self,
        wall_mask: np.ndarray,
        scale_meters_per_pixel: float
    ) -> List[Dict[str, Any]]:
        """
        Extracts closed room spaces from the wall mask.
        Returns list of room dictionaries with polygons and areas.
        """
        h, w = wall_mask.shape[:2]

        # Close small door openings in the wall mask to form solid enclosed cavities
        close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
        closed_walls = cv2.morphologyEx(wall_mask, cv2.MORPH_CLOSE, close_kernel)

        # Invert: rooms become white (255) foreground regions on black walls
        inverted = cv2.bitwise_not(closed_walls)

        # Find 2-level hierarchy contours (RETR_CCOMP)
        contours, hierarchy = cv2.findContours(inverted, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)

        rooms: List[Dict[str, Any]] = []
        if contours is None or len(contours) == 0:
            return rooms

        # Common room categories assigned in order of decreasing area
        preset_room_types = [
            ("Living Room", "living_room", "hardwood_oak"),
            ("Master Bedroom", "bedroom", "carpet_plush"),
            ("Kitchen", "kitchen", "tile_slate"),
            ("Dining Room", "dining_room", "hardwood_oak"),
            ("Bedroom 2", "bedroom", "hardwood_oak"),
            ("Bathroom", "bathroom", "tile_marble"),
            ("Hallway", "hallway", "hardwood_oak"),
            ("Balcony", "balcony", "concrete_polished"),
        ]

        candidate_rooms = []

        total_canvas_area = h * w
        for i, cnt in enumerate(contours):
            area_px = cv2.contourArea(cnt)
            # Filter out tiny noise and gigantic outer canvas background
            if area_px < 500 or area_px > (0.85 * total_canvas_area):
                continue

            # Check if contour touches image border (which indicates outside background)
            x, y, cw, ch = cv2.boundingRect(cnt)
            if x <= 5 or y <= 5 or (x + cw) >= (w - 5) or (y + ch) >= (h - 5):
                continue

            # Simplify contour to polygon
            epsilon = 0.015 * cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, epsilon, True)
            if len(approx) < 3:
                continue

            coords_px = [(float(pt[0][0]), float(pt[0][1])) for pt in approx]
            poly = Polygon(coords_px)
            if not poly.is_valid:
                poly = poly.buffer(0)
            if poly.is_empty:
                continue

            # Metric area
            area_sqm = float(poly.area * (scale_meters_per_pixel ** 2))
            if self.min_room_area_sqm <= area_sqm <= self.max_room_area_sqm:
                centroid_x, centroid_y = float(poly.centroid.x), float(poly.centroid.y)
                candidate_rooms.append({
                    "polygon_px": coords_px,
                    "area_sqm": area_sqm,
                    "centroid": (centroid_x, centroid_y)
                })

        # Sort largest to smallest for intelligent architectural naming
        candidate_rooms.sort(key=lambda r: r["area_sqm"], reverse=True)

        for idx, r in enumerate(candidate_rooms):
            name, rtype, fmat = preset_room_types[min(idx, len(preset_room_types) - 1)]
            area_sqft = r["area_sqm"] * 10.7639
            rooms.append({
                "id": f"room_{idx+1:03d}",
                "name": name,
                "room_type": rtype,
                "area_sqm": round(r["area_sqm"], 2),
                "area_sqft": round(area_sqft, 1),
                "polygon_px": r["polygon_px"],
                "floor_material": fmat,
                "wall_color": "#F8FAFC"
            })

        return rooms
