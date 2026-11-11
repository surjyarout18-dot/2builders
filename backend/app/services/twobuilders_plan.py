import math
import uuid
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
from .vastu_engine import VastuEngine

SQM_TO_SQFT = 10.7639

class TwoBuildersPlanConverter:
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
        Converts extracted geometry into the exact '2builders.plan/1' schema specification.
        Coordinates are in plan-local millimeters: x to the right, y down, origin at top-left.
        """
        if options is None:
            options = {}

        ceiling_mm = int(options.get("ceilingMm", 3050))  # Default 10' = 3050 mm
        north_deg = float(options.get("northDeg", 0.0))
        interior_style = options.get("interiorStyle", "Modern")
        is_furnished = options.get("furnished", True)

        # 1. Build Shared Nodes graph from wall start and end coordinates
        # Snapping tolerance in millimeters: ~240 mm (wall thickness scale for watertight corners)
        snap_dist_mm = 240.0
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
        seen_pairs = set()
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

            start_node = find_or_create_node(sx_mm, sy_mm)
            end_node = find_or_create_node(ex_mm, ey_mm)

            if start_node == end_node:
                continue

            pair = (min(start_node, end_node), max(start_node, end_node))
            if pair in seen_pairs:
                continue
            seen_pairs.add(pair)

            th_mm = round(w.get("thickness", 0.20) * 1000.0)
            is_ext = w.get("type", "external") == "external"

            walls.append({
                "id": f"w{len(walls) + 1}",
                "nodes": [start_node, end_node],
                "thicknessMm": th_mm,
                "isExterior": is_ext,
                "layer": "WALLS"
            })

        if min_x == float('inf'):
            min_x, max_x, min_y, max_y = 0.0, 9000.0, 0.0, 9000.0

        outer_bounds = {
            "x": round(min_x),
            "y": round(min_y),
            "width": round(max_x - min_x),
            "height": round(max_y - min_y)
        }

        # 3. Create Doors & Windows Openings attached to walls
        openings: List[Dict[str, Any]] = []
        node_dict = {n["id"]: n for n in nodes}

        for w_idx, w in enumerate(walls):
            n1 = node_dict[w["nodes"][0]]
            n2 = node_dict[w["nodes"][1]]
            wlen = math.hypot(n2["x"] - n1["x"], n2["y"] - n1["y"])

            # Place architectural doors / windows on walls >= 1.8m
            if wlen >= 1800.0:
                if w["isExterior"]:
                    # Windows on exterior walls
                    win_w = 1200 if wlen >= 2400 else 900
                    win_offset = round((wlen - win_w) / 2)
                    openings.append({
                        "id": f"op{len(openings) + 1}",
                        "wallId": w["id"],
                        "type": "window",
                        "offsetMm": win_offset,
                        "widthMm": win_w,
                        "heightMm": 1400,
                        "sillHeightMm": 900
                    })
                else:
                    # Door on interior partitions
                    door_w = 850
                    if wlen > door_w + 300:
                        openings.append({
                            "id": f"op{len(openings) + 1}",
                            "wallId": w["id"],
                            "type": "door",
                            "offsetMm": 200,
                            "widthMm": door_w,
                            "heightMm": 2100,
                            "swing": "right" if w_idx % 2 == 0 else "left"
                        })

        # 4. Rooms with node polygon bounds
        rooms: List[Dict[str, Any]] = []
        for r_idx, r in enumerate(extracted_rooms):
            b_pts = r.get("boundary", [])
            r_nodes: List[str] = []
            for pt in b_pts:
                px_mm = pt[0] * 1000.0
                py_mm = pt[1] * 1000.0
                r_nodes.append(find_or_create_node(px_mm, py_mm))

            area_sqm = r.get("area", 0.0)
            area_sqft = round(area_sqm * SQM_TO_SQFT, 1)

            # Auto-infer room type
            r_name = r.get("name", "Room")
            r_type = "living"
            name_lower = r_name.lower()
            if "bed" in name_lower:
                r_type = "bedroom"
            elif "bath" in name_lower or "toilet" in name_lower:
                r_type = "bath"
            elif "kitchen" in name_lower:
                r_type = "kitchen"
            elif "balcony" in name_lower:
                r_type = "balcony"
            elif "hall" in name_lower or "living" in name_lower:
                r_type = "living"
            else:
                r_type = "other"

            rooms.append({
                "id": f"r{len(rooms) + 1}",
                "name": r_name,
                "type": r_type,
                "boundary": r_nodes,
                "areaM2": area_sqm,
                "areaSqFt": area_sqft
            })

        # 5. Semantic Review Questions
        questions = []
        for r in rooms:
            if r["type"] == "bedroom" and "balcony" not in [x["type"] for x in rooms]:
                questions.append({
                    "id": f"q_{r['id']}_balcony",
                    "type": "add_balcony",
                    "prompt": f"Add an outdoor balcony adjacent to {r['name']}?",
                    "options": ["Yes, Add Balcony", "No Balcony"],
                    "default": "Yes, Add Balcony",
                    "targetId": r["id"]
                })
            elif r["type"] == "living" and "dining" not in r["name"].lower():
                questions.append({
                    "id": f"q_{r['id']}_dining",
                    "type": "confirm_dining",
                    "prompt": "Separate dining area or open plan living & dining?",
                    "options": ["Open Plan Living & Dining", "Enclosed Formal Dining"],
                    "default": "Open Plan Living & Dining",
                    "targetId": r["id"]
                })

        # Ensure at least 2 questions for interactive confirmation
        if len(questions) < 2:
            questions.append({
                "id": "q_ceiling_height",
                "type": "ceiling_height",
                "prompt": "Confirm ceiling height for the building:",
                "options": ["9' (2.7m)", "10' (3.0m) Standard", "11' (3.3m) Luxury"],
                "default": "10' (3.0m) Standard",
                "targetId": None
            })
            questions.append({
                "id": "q_flooring_finish",
                "type": "interior_style",
                "prompt": "Select primary flooring finish:",
                "options": ["Italian Marble", "Hardwood Oak", "Polished Vitrified Tile"],
                "default": "Italian Marble",
                "targetId": None
            })

        # 6. Vastu Compliance Evaluation
        vastu_rooms = []
        for r in rooms:
            if r.get("boundary"):
                r_pts = [node_dict[nid] for nid in r["boundary"] if nid in node_dict]
                if r_pts:
                    rx = sum(p["x"] for p in r_pts) / len(r_pts)
                    ry = sum(p["y"] for p in r_pts) / len(r_pts)
                    vastu_rooms.append({
                        "name": r["name"],
                        "type": r.get("type", "room"),
                        "x": rx,
                        "y": ry,
                        "area": r.get("areaM2", 0)
                    })
        vastu_report = VastuEngine.analyze_plan(
            rooms=vastu_rooms,
            outer_bounds=outer_bounds,
            north_deg=north_deg
        )

        # 7. Procedural Furniture Fixtures
        fixtures: List[Dict[str, Any]] = []
        for r in rooms:
            if r["boundary"] and len(r["boundary"]) >= 3:
                r_pts = [node_dict[nid] for nid in r["boundary"] if nid in node_dict]
                if not r_pts:
                    continue
                rx = sum(p["x"] for p in r_pts) / len(r_pts)
                ry = sum(p["y"] for p in r_pts) / len(r_pts)

                if r["type"] == "bedroom" and is_furnished:
                    fixtures.append({
                        "id": f"fx_{r['id']}_bed",
                        "type": "bed_queen",
                        "roomId": r["id"],
                        "x": round(rx),
                        "y": round(ry),
                        "widthMm": 1800,
                        "depthMm": 2000,
                        "rotationDeg": 0
                    })
                    fixtures.append({
                        "id": f"fx_{r['id']}_wardrobe",
                        "type": "wardrobe",
                        "roomId": r["id"],
                        "x": round(rx - 1200),
                        "y": round(ry),
                        "widthMm": 1800,
                        "depthMm": 600,
                        "rotationDeg": 90
                    })
                elif r["type"] == "living" and is_furnished:
                    fixtures.append({
                        "id": f"fx_{r['id']}_sofa",
                        "type": "sofa_l_shape",
                        "roomId": r["id"],
                        "x": round(rx),
                        "y": round(ry),
                        "widthMm": 2400,
                        "depthMm": 1600,
                        "rotationDeg": 0
                    })
                    fixtures.append({
                        "id": f"fx_{r['id']}_tv",
                        "type": "tv_unit",
                        "roomId": r["id"],
                        "x": round(rx),
                        "y": round(ry - 1200),
                        "widthMm": 1600,
                        "depthMm": 400,
                        "rotationDeg": 0
                    })
                elif r["type"] == "kitchen":
                    fixtures.append({
                        "id": f"fx_{r['id']}_counter",
                        "type": "kitchen_counter_l",
                        "roomId": r["id"],
                        "x": round(rx),
                        "y": round(ry),
                        "widthMm": 2400,
                        "depthMm": 600,
                        "rotationDeg": 0
                    })

        # Remove duplicate walls
        cleaned_walls = []
        seen_pairs = set()
        for w in walls:
            n_pair = tuple(sorted(w["nodes"]))
            if n_pair not in seen_pairs:
                seen_pairs.add(n_pair)
                cleaned_walls.append(w)

        # Compute pixel per millimeter
        px_per_mm = round((1.0 / (scale_m_per_px * 1000.0)), 4) if scale_m_per_px > 0 else 0.071

        plan_doc = {
            "schema": "2builders.plan/1",
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


