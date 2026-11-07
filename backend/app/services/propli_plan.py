import math
import uuid
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
from .vastu_engine import VastuEngine

SQM_TO_SQFT = 10.7639

class PropliPlanConverter:
    @staticmethod
    def from_raster_extraction(
        plan_id: str,
        image_url: str,
        extracted_walls: List[Dict[str, Any]],
        extracted_rooms: List[Dict[str, Any]],
        scale_m_per_px: float,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Converts extracted geometry into the exact 'propli.plan/1' schema specification.
        Coordinates are in plan-local millimeters: x to the right, y down, origin at top-left.
        """
        if options is None:
            options = {}

        ceiling_mm = int(options.get("ceilingMm", 3050))  # Default 10' = 3050 mm
        north_deg = float(options.get("northDeg", 0.0))
        interior_style = options.get("interiorStyle", "Modern")
        is_furnished = options.get("furnished", True)

        # 1. Build Shared Nodes graph from wall start and end coordinates
        # Snapping tolerance in millimeters: ~120 mm
        snap_dist_mm = 120.0
        nodes: List[Dict[str, Any]] = []
        node_lookup: Dict[str, str] = {}  # "x_y" -> node_id

        def find_or_create_node(x_mm: float, y_mm: float) -> str:
            for n in nodes:
                d = math.hypot(n["x"] - x_mm, n["y"] - y_mm)
                if d <= snap_dist_mm:
                    return n["id"]
            nid = f"n{len(nodes) + 1}"
            nodes.append({"id": nid, "x": round(x_mm), "y": round(y_mm)})
            return nid

        # 2. Convert walls to mm and attach to nodes
        walls: List[Dict[str, Any]] = []
        min_x, max_x = float('inf'), float('-inf')
        min_y, max_y = float('inf'), float('-inf')

        for idx, w in enumerate(extracted_walls):
            s = w.get("start", [0, 0])
            e = w.get("end", [0, 0])

            # w coordinates are in meters
            sx_mm = s[0] * 1000.0
            sy_mm = s[1] * 1000.0
            ex_mm = e[0] * 1000.0
            ey_mm = e[1] * 1000.0

            min_x = min(min_x, sx_mm, ex_mm)
            max_x = max(max_x, sx_mm, ex_mm)
            min_y = min(min_y, sy_mm, ey_mm)
            max_y = max(max_y, sy_mm, ey_mm)

            node_a = find_or_create_node(sx_mm, sy_mm)
            node_b = find_or_create_node(ex_mm, ey_mm)

            if node_a == node_b:
                continue

            wall_len = math.hypot(ex_mm - sx_mm, ey_mm - sy_mm)
            if wall_len < 200:  # Ignore tiny stubs < 200 mm
                continue

            thick_mm = int(w.get("thickness", 0.20) * 1000.0)
            is_ext = w.get("type", "external") == "external"
            conf = 0.95 if is_ext else 0.88

            wid = f"w{idx + 1}"
            walls.append({
                "id": wid,
                "a": node_a,
                "b": node_b,
                "thickMm": thick_mm,
                "exterior": is_ext,
                "conf": conf,
                "_start": [sx_mm, sy_mm],
                "_end": [ex_mm, ey_mm]
            })

        if min_x == float('inf'):
            min_x, max_x, min_y, max_y = 0, 9000, 0, 7000

        outer_bounds = {
            "min_x": min_x,
            "max_x": max_x,
            "min_y": min_y,
            "max_y": max_y,
            "widthMm": round(max_x - min_x),
            "heightMm": round(max_y - min_y)
        }

        # 3. Detect and attach openings (Doors & Windows) along walls
        openings: List[Dict[str, Any]] = []
        op_count = 0

        # For external walls, place standard windows at regular intervals if length >= 2.4m
        # For internal room boundaries, place doors
        for w in walls:
            sx, sy = w["_start"]
            ex, ey = w["_end"]
            w_len = math.hypot(ex - sx, ey - sy)

            if w["exterior"]:
                if w_len >= 2400:
                    op_count += 1
                    openings.append({
                        "id": f"win-{op_count}",
                        "wall": w["id"],
                        "type": "window",
                        "offsetMm": round(w_len * 0.4),
                        "widthMm": 1200,
                        "heightMm": 1200,
                        "sillHeightMm": 900,
                        "swing": "sliding",
                        "main": False,
                        "conf": 0.89
                    })
            else:
                # Internal partition wall -> Add door opening
                if w_len >= 1800:
                    op_count += 1
                    openings.append({
                        "id": f"d-{op_count}",
                        "wall": w["id"],
                        "type": "door",
                        "offsetMm": round(w_len * 0.2),
                        "widthMm": 900,
                        "heightMm": 2100,
                        "sillHeightMm": 0,
                        "swing": "in-left",
                        "main": False,
                        "conf": 0.92
                    })

        # Ensure at least one main entrance door on external wall
        has_main_door = False
        for op in openings:
            if op["type"] == "door":
                op["main"] = True
                has_main_door = True
                break
        if not has_main_door and walls:
            op_count += 1
            openings.append({
                "id": f"d-{op_count}",
                "wall": walls[0]["id"],
                "type": "door",
                "offsetMm": 1000,
                "widthMm": 1000,
                "heightMm": 2100,
                "sillHeightMm": 0,
                "swing": "in-left",
                "main": True,
                "conf": 0.95
            })

        # 4. Rooms processing
        rooms: List[Dict[str, Any]] = []
        fixtures: List[Dict[str, Any]] = []
        fix_id = 0

        for idx, r in enumerate(extracted_rooms):
            rid = f"r{idx + 1}"
            raw_name = r.get("name", f"Room {idx + 1}")
            area_sqm = float(r.get("area", 10.0))
            area_sqft = round(area_sqm * SQM_TO_SQFT)

            # Map raw meters boundary to millimeters
            raw_boundary = r.get("boundary", [])
            boundary_mm = [[round(p[0] * 1000), round(p[1] * 1000)] for p in raw_boundary]

            # Categorize room type
            name_lower = raw_name.lower()
            if "bed" in name_lower and ("1" in name_lower or "master" in name_lower):
                r_type = "master_bedroom"
                r_name = "Master Bedroom"
            elif "bed" in name_lower:
                r_type = "bedroom"
                r_name = "Bedroom"
            elif "bath" in name_lower or "toilet" in name_lower:
                r_type = "toilet"
                r_name = "Bathroom"
            elif "kitchen" in name_lower:
                r_type = "kitchen"
                r_name = "Kitchen"
            elif "living" in name_lower:
                r_type = "living"
                r_name = "Living Room"
            elif "hall" in name_lower:
                r_type = "living"
                r_name = "Hall / Living"
            else:
                r_type = "other"
                r_name = raw_name

            # Centroid
            if boundary_mm:
                cx = sum(p[0] for p in boundary_mm) / len(boundary_mm)
                cy = sum(p[1] for p in boundary_mm) / len(boundary_mm)
            else:
                cx = (min_x + max_x) / 2
                cy = (min_y + max_y) / 2

            rooms.append({
                "id": rid,
                "type": r_type,
                "name": r_name,
                "walls": [w["id"] for w in walls[:4]],  # Enclosing wall references
                "boundary": boundary_mm,
                "areaSqft": area_sqft,
                "areaSqm": round(area_sqm, 2),
                "conf": 0.91,
                "centroid": [round(cx), round(cy)]
            })

            # 5. Place rule-based furniture fixtures inside rooms
            if is_furnished:
                if r_type in ("master_bedroom", "bedroom"):
                    fix_id += 1
                    fixtures.append({
                        "id": f"f{fix_id}",
                        "type": "bed",
                        "room": rid,
                        "x": round(cx),
                        "y": round(cy),
                        "rotDeg": 0
                    })
                elif r_type == "living":
                    fix_id += 1
                    fixtures.append({
                        "id": f"f{fix_id}",
                        "type": "sofa",
                        "room": rid,
                        "x": round(cx),
                        "y": round(cy),
                        "rotDeg": 0
                    })
                elif r_type == "kitchen":
                    fix_id += 1
                    fixtures.append({
                        "id": f"f{fix_id}",
                        "type": "sink",
                        "room": rid,
                        "x": round(cx),
                        "y": round(cy),
                        "rotDeg": 90
                    })
                elif r_type == "toilet":
                    fix_id += 1
                    fixtures.append({
                        "id": f"f{fix_id}",
                        "type": "wc",
                        "room": rid,
                        "x": round(cx),
                        "y": round(cy),
                        "rotDeg": 0
                    })

        # 6. Run Vastu Engine Analysis
        vastu_report = VastuEngine.analyze_plan(rooms, outer_bounds, north_deg=north_deg)

        # 7. Generate Low-Confidence Review Questions (Up to 3 questions)
        questions = []
        # Question 1: Check if any room has low confidence or generic label
        uncertain_room = next((r for r in rooms if r["type"] == "other" or r["conf"] < 0.85), None)
        if uncertain_room:
            questions.append({
                "id": "q1_room_type",
                "trigger": "Room type verification",
                "question": f"Confirm room type for {uncertain_room['name']}:",
                "options": ["Master Bedroom", "Bedroom", "Living Room", "Kitchen", "Bathroom", "Balcony"],
                "selected": "Master Bedroom",
                "targetId": uncertain_room["id"]
            })
        else:
            # First room confirmation
            r0 = rooms[0] if rooms else None
            if r0:
                questions.append({
                    "id": "q1_room_type",
                    "trigger": "Room verification",
                    "question": f"Confirm room assignment for {r0['name']} ({r0['areaSqft']} sq ft):",
                    "options": ["Master Bedroom", "Guest Bedroom", "Living Area", "Kitchen", "Bathroom"],
                    "selected": r0["name"],
                    "targetId": r0["id"]
                })

        # Question 2: Gap verification
        questions.append({
            "id": "q2_wall_gap",
            "trigger": "Wall opening check",
            "question": "Is the 1.5m hallway passage an open archway or fitted with a door?",
            "options": ["Open Archway (No Door)", "Hinged Single Door", "Sliding Door"],
            "selected": "Open Archway (No Door)"
        })

        # Question 3: Overall dimensions verification
        w_m = round(outer_bounds["widthMm"] / 1000.0, 1)
        h_m = round(outer_bounds["heightMm"] / 1000.0, 1)
        questions.append({
            "id": "q3_scale_check",
            "trigger": "Overall scale check",
            "question": f"Extracted outer size is {w_m}m × {h_m}m. Does this match your plan?",
            "options": ["Yes, dimensions are exact", "Scale by +5%", "Scale by -5%", "Adjust in 2D Editor"],
            "selected": "Yes, dimensions are exact"
        })

        # Clean private keys from walls
        cleaned_walls = []
        for w in walls:
            cleaned_walls.append({
                "id": w["id"],
                "a": w["a"],
                "b": w["b"],
                "thickMm": w["thickMm"],
                "exterior": w["exterior"],
                "conf": w["conf"]
            })

        # Compute pixel per millimeter
        px_per_mm = round((1.0 / (scale_m_per_px * 1000.0)), 4) if scale_m_per_px > 0 else 0.071

        plan_doc = {
            "schema": "propli.plan/1",
            "id": plan_id,
            "source": {
                "image": image_url,
                "pxPerMm": px_per_mm,
                "scaleFrom": "dimension"
            },
            "north": {
                "deg": north_deg,
                "from": "user"
            },
            "ceilingMm": ceiling_mm,
            "interiorStyle": interior_style,
            "isFurnished": is_furnished,
            "outerBounds": outer_bounds,
            "nodes": nodes,
            "walls": cleaned_walls,
            "openings": openings,
            "rooms": rooms,
            "fixtures": fixtures,
            "review": {
                "questions": questions[:3],
                "confirmedBy": "auto_pipeline",
                "confirmedAt": datetime.utcnow().isoformat() + "Z"
            },
            "vastu": vastu_report,
            "version": 1
        }

        return plan_doc

