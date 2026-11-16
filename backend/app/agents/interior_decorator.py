import math
from typing import List
from backend.app.schemas import RoomSchema, FurnitureSchema, Point3D

class InteriorDecorator:
    """
    Parametric interior decoration engine.
    Places contextual furniture clusters based on room typology and clearances.
    """

    @staticmethod
    def decorate_room(room: RoomSchema, floor_id: str = "floor_0") -> List[FurnitureSchema]:
        items: List[FurnitureSchema] = []
        if len(room.polygon) < 3:
            return items

        # Centroid
        cx = sum(p.x for p in room.polygon) / len(room.polygon)
        cz = sum(p.z for p in room.polygon) / len(room.polygon)

        room_type = room.room_type.lower()
        r_id = room.id

        if "living" in room_type:
            # 3-Seater Sofa
            items.append(FurnitureSchema(
                id=f"furn_{r_id}_sofa",
                floor_id=floor_id,
                room_id=r_id,
                asset_id="sofa_3seater",
                name="Architectural 3-Seater Sofa",
                category="living",
                position=Point3D(x=round(cx, 2), y=0.45, z=round(cz + 0.6, 2)),
                rotation_y=0.0,
                dimensions=Point3D(x=2.2, y=0.85, z=0.95),
                color="#334155"
            ))
            # Coffee Table
            items.append(FurnitureSchema(
                id=f"furn_{r_id}_table",
                floor_id=floor_id,
                room_id=r_id,
                asset_id="coffee_table",
                name="Walnut Coffee Table",
                category="living",
                position=Point3D(x=round(cx, 2), y=0.22, z=round(cz - 0.4, 2)),
                rotation_y=0.0,
                dimensions=Point3D(x=1.2, y=0.45, z=0.65),
                color="#78350F"
            ))

        elif "bed" in room_type:
            # Queen Platform Bed
            items.append(FurnitureSchema(
                id=f"furn_{r_id}_bed",
                floor_id=floor_id,
                room_id=r_id,
                asset_id="bed_queen",
                name="Queen Platform Bed",
                category="bedroom",
                position=Point3D(x=round(cx, 2), y=0.50, z=round(cz, 2)),
                rotation_y=0.0,
                dimensions=Point3D(x=1.8, y=1.0, z=2.1),
                color="#0284C7"
            ))
            # Nightstand
            items.append(FurnitureSchema(
                id=f"furn_{r_id}_stand",
                floor_id=floor_id,
                room_id=r_id,
                asset_id="nightstand",
                name="Minimalist Nightstand",
                category="bedroom",
                position=Point3D(x=round(cx + 1.2, 2), y=0.30, z=round(cz - 0.8, 2)),
                rotation_y=0.0,
                dimensions=Point3D(x=0.5, y=0.6, z=0.45),
                color="#475569"
            ))

        elif "kitchen" in room_type or "dining" in room_type:
            # Dining Table
            items.append(FurnitureSchema(
                id=f"furn_{r_id}_dining",
                floor_id=floor_id,
                room_id=r_id,
                asset_id="dining_table",
                name="Scandinavian Dining Table",
                category="dining",
                position=Point3D(x=round(cx, 2), y=0.40, z=round(cz, 2)),
                rotation_y=0.0,
                dimensions=Point3D(x=1.6, y=0.75, z=0.9),
                color="#B45309"
            ))

        elif "bath" in room_type:
            # Vanity
            items.append(FurnitureSchema(
                id=f"furn_{r_id}_vanity",
                floor_id=floor_id,
                room_id=r_id,
                asset_id="vanity",
                name="Floating Double Vanity",
                category="bathroom",
                position=Point3D(x=round(cx, 2), y=0.45, z=round(cz, 2)),
                rotation_y=0.0,
                dimensions=Point3D(x=1.2, y=0.85, z=0.55),
                color="#E2E8F0"
            ))

        return items
