import math
from typing import List, Dict, Any, Tuple

VASTU_ZONES_8 = [
    {"name": "North", "code": "N", "min_deg": 337.5, "max_deg": 22.5, "element": "Water", "color": "#38bdf8", "deity": "Kubera (Wealth)"},
    {"name": "North-East", "code": "NE", "min_deg": 22.5, "max_deg": 67.5, "element": "Water/Ether", "color": "#818cf8", "deity": "Ishan (Spirituality)"},
    {"name": "East", "code": "E", "min_deg": 67.5, "max_deg": 112.5, "element": "Air/Sun", "color": "#34d399", "deity": "Indra (Growth)"},
    {"name": "South-East", "code": "SE", "min_deg": 112.5, "max_deg": 157.5, "element": "Fire", "color": "#f87171", "deity": "Agni (Energy/Cooking)"},
    {"name": "South", "code": "S", "min_deg": 157.5, "max_deg": 202.5, "element": "Fire/Earth", "color": "#fb923c", "deity": "Yama (Justice/Discipline)"},
    {"name": "South-West", "code": "SW", "min_deg": 202.5, "max_deg": 247.5, "element": "Earth", "color": "#fbbf24", "deity": "Niruthi (Stability/Leadership)"},
    {"name": "West", "code": "W", "min_deg": 247.5, "max_deg": 292.5, "element": "Space/Water", "color": "#94a3b8", "deity": "Varuna (Prosperity)"},
    {"name": "North-West", "code": "NW", "min_deg": 292.5, "max_deg": 337.5, "element": "Air", "color": "#a78bfa", "deity": "Vayu (Movement/Social)"},
]

class VastuEngine:
    @staticmethod
    def get_zone_from_angle(deg: float) -> Dict[str, Any]:
        d = deg % 360.0
        for z in VASTU_ZONES_8:
            if z["code"] == "N":
                if d >= 337.5 or d < 22.5:
                    return z
            else:
                if z["min_deg"] <= d < z["max_deg"]:
                    return z
        return VASTU_ZONES_8[0]

    @staticmethod
    def calculate_brahmasthan(outer_points: List[List[float]]) -> Tuple[float, float]:
        if not outer_points:
            return (0.0, 0.0)
        cx = sum(p[0] for p in outer_points) / len(outer_points)
        cy = sum(p[1] for p in outer_points) / len(outer_points)
        return (cx, cy)

    @staticmethod
    def analyze_plan(rooms: List[Dict[str, Any]], outer_bounds: Dict[str, float], north_deg: float = 0.0) -> Dict[str, Any]:
        """
        Calculates Brahmasthan, sector zones, assigns rooms, and evaluates compliance.
        Coordinates are in mm (or meters).
        """
        cx = (outer_bounds.get("min_x", 0) + outer_bounds.get("max_x", 0)) / 2.0
        cy = (outer_bounds.get("min_y", 0) + outer_bounds.get("max_y", 0)) / 2.0
        brahmasthan = {"x": round(cx, 1), "y": round(cy, 1)}

        analyzed_rooms = []
        score = 100
        findings = []

        for r in rooms:
            boundary = r.get("boundary", [])
            if boundary:
                rx = sum(p[0] for p in boundary) / len(boundary)
                ry = sum(p[1] for p in boundary) / len(boundary)
            else:
                rx = r.get("x", cx)
                ry = r.get("y", cy)

            # In plan coords: x is right, y is down.
            # Upward direction (-y) is North at 0 deg.
            dx = rx - cx
            dy = ry - cy
            # Math angle: 0 deg = +x, 90 deg = +y.
            # Compass bearing: 0 deg = North (-y), 90 deg = East (+x), 180 deg = South (+y), 270 deg = West (-x).
            bearing = (math.degrees(math.atan2(dx, -dy)) - north_deg) % 360.0
            zone = VastuEngine.get_zone_from_angle(bearing)

            r_type = r.get("type", "").lower()
            name = r.get("name", "Room")

            # Compliance evaluation
            status = "neutral"
            message = ""

            if "kitchen" in r_type or "kitchen" in name.lower():
                if zone["code"] == "SE":
                    status = "ideal"
                    message = "Ideal placement: South-East (Agni zone) boosts health and prosperity."
                elif zone["code"] == "NW":
                    status = "acceptable"
                    message = "Acceptable placement in North-West (Vayu zone)."
                elif zone["code"] in ("NE", "N"):
                    status = "dosha"
                    score -= 20
                    message = "Critical Dosha: Kitchen in North-East creates conflict between Fire and Water elements."
                    findings.append({"severity": "high", "room": name, "issue": "Kitchen in North-East", "remedy": "Use bronze utensils or place yellow jaisalmer stone slab under the gas stove."})
                elif zone["code"] == "SW":
                    status = "dosha"
                    score -= 15
                    message = "Dosha: Kitchen in South-West can cause domestic friction."
                    findings.append({"severity": "medium", "room": name, "issue": "Kitchen in South-West", "remedy": "Paint the kitchen wall light pastel yellow and keep gas stove in SE corner of room."})

            elif "master" in r_type or "master" in name.lower() or ("bed" in r_type and "1" in name):
                if zone["code"] == "SW":
                    status = "ideal"
                    message = "Ideal placement: South-West (Earth element) ensures stability and authoritative leadership."
                elif zone["code"] in ("S", "W"):
                    status = "acceptable"
                    message = "Favorable placement in South/West zone."
                elif zone["code"] in ("NE", "N"):
                    status = "dosha"
                    score -= 15
                    message = "Dosha: Master bedroom in North-East may cause restlessness or financial volatility."
                    findings.append({"severity": "medium", "room": name, "issue": "Master Bedroom in NE", "remedy": "Sleep with head towards South and keep room uncluttered."})

            elif "toilet" in r_type or "bath" in r_type or "toilet" in name.lower() or "bath" in name.lower():
                if zone["code"] in ("W", "NW", "S"):
                    status = "ideal"
                    message = "Ideal placement: West/North-West is auspicious for disposal & elimination."
                elif zone["code"] == "NE":
                    status = "dosha"
                    score -= 25
                    message = "Severe Dosha: Toilet in North-East (Ishan) severely impairs positive cosmic energy."
                    findings.append({"severity": "high", "room": name, "issue": "Toilet in North-East (Ishan)", "remedy": "Place sea salt in a bronze bowl and hang a zinc Vastu helix on the outer wall."})
                elif zone["code"] == "SW":
                    status = "dosha"
                    score -= 15
                    message = "Dosha: Toilet in South-West drains earth stability."
                    findings.append({"severity": "medium", "room": name, "issue": "Toilet in South-West", "remedy": "Install a lead metal strip on the bathroom door threshold."})

            elif "living" in r_type or "hall" in r_type or "living" in name.lower() or "hall" in name.lower():
                if zone["code"] in ("N", "E", "NE"):
                    status = "ideal"
                    message = "Ideal placement: Living area in North/East welcomes abundant light and social vitality."
                else:
                    status = "acceptable"
                    message = "Acceptable placement for common living area."

            analyzed_rooms.append({
                "id": r.get("id"),
                "name": name,
                "type": r_type,
                "zone": zone["code"],
                "zoneName": zone["name"],
                "zoneElement": zone["element"],
                "zoneColor": zone["color"],
                "bearingDeg": round(bearing, 1),
                "status": status,
                "note": message
            })

        score = max(35, min(100, score))
        grade = "A+" if score >= 90 else "A" if score >= 80 else "B" if score >= 70 else "C" if score >= 55 else "Needs Remedy"

        return {
            "brahmasthan": brahmasthan,
            "northDeg": north_deg,
            "score": score,
            "grade": grade,
            "rooms": analyzed_rooms,
            "findings": findings,
            "zones": VASTU_ZONES_8
        }

