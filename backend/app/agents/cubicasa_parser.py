from typing import List
from backend.app.schemas import ArchitecturalModel, FurnitureSchema, Point3D

class CubiCasaSemanticParser:
    """
    Open-Source CubiCasa5k-compliant architectural semantic fixture and space parser.
    Converts room typologies and floor plan annotations into standardized architectural
    BIM fixture layouts (kitchen cabinetry, sanitary ware, bedroom & living ensembles).
    """

    CUBICASA_CLASSES = {
        "kitchen": [
            {"asset_id": "kitchen_counter", "name": "Linear Kitchen Counter", "dims": (2.4, 0.9, 0.6), "color": "#E2E8F0"},
            {"asset_id": "cooktop_induction", "name": "Induction Cooktop & Range", "dims": (0.8, 0.9, 0.6), "color": "#1E293B"},
            {"asset_id": "refrigerator", "name": "Integrated Refrigerator", "dims": (0.9, 1.85, 0.7), "color": "#94A3B8"}
        ],
        "bathroom": [
            {"asset_id": "vanity_basin", "name": "Vessel Sink Vanity", "dims": (1.1, 0.85, 0.55), "color": "#F8FAFC"},
            {"asset_id": "toilet_wall_hung", "name": "Wall-Hung Toilet", "dims": (0.45, 0.45, 0.65), "color": "#FFFFFF"},
            {"asset_id": "bathtub_freestanding", "name": "Freestanding Soaking Tub", "dims": (1.7, 0.6, 0.8), "color": "#FFFFFF"}
        ],
        "bedroom": [
            {"asset_id": "bed_queen", "name": "Queen Platform Bed", "dims": (1.8, 1.0, 2.1), "color": "#0284C7"},
            {"asset_id": "nightstand_pair", "name": "Floating Nightstand", "dims": (0.5, 0.5, 0.45), "color": "#475569"},
            {"asset_id": "wardrobe_closet", "name": "Full-Height Wardrobe", "dims": (1.8, 2.4, 0.65), "color": "#334155"}
        ],
        "living_room": [
            {"asset_id": "sofa_sectional", "name": "L-Shape Modular Sofa", "dims": (2.6, 0.85, 1.8), "color": "#334155"},
            {"asset_id": "coffee_table", "name": "Minimalist Coffee Table", "dims": (1.2, 0.45, 0.65), "color": "#78350F"},
            {"asset_id": "credenza_tv", "name": "Lowline Media Credenza", "dims": (2.0, 0.5, 0.45), "color": "#1E293B"}
        ]
    }

    def enrich_with_cubicasa_fixtures(self, model: ArchitecturalModel) -> ArchitecturalModel:
        """
        Enriches rooms with CubiCasa5K architectural fixtures and furniture based on room semantics.
        """
        enhanced = model.model_copy(deep=True)

        for floor in enhanced.floors:
            items: List[FurnitureSchema] = []
            for room in floor.rooms:
                if len(room.polygon) < 3:
                    continue

                cx = sum(p.x for p in room.polygon) / len(room.polygon)
                cz = sum(p.z for p in room.polygon) / len(room.polygon)
                rtype = room.room_type.lower()

                # Match class
                matched_class = "living_room"
                for ckey in self.CUBICASA_CLASSES:
                    if ckey in rtype:
                        matched_class = ckey
                        break

                cat_name = "living" if "living" in matched_class else matched_class
                specs = self.CUBICASA_CLASSES.get(matched_class, self.CUBICASA_CLASSES["living_room"])
                for i, spec in enumerate(specs):
                    offset_x = (i - 1) * 0.9
                    offset_z = (i % 2) * 0.5
                    dx, dy, dz = spec["dims"]
                    items.append(FurnitureSchema(
                        id=f"cb_{room.id}_{spec['asset_id']}",
                        floor_id=floor.id,
                        room_id=room.id,
                        asset_id=spec["asset_id"],
                        name=spec["name"],
                        category=cat_name,
                        position=Point3D(x=round(cx + offset_x, 2), y=round(dy / 2.0, 2), z=round(cz + offset_z, 2)),
                        rotation_y=0.0,
                        dimensions=Point3D(x=dx, y=dy, z=dz),
                        color=spec["color"]
                    ))

            floor.furniture = items

        return enhanced
