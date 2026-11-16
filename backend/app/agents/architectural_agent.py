import time
import math
from typing import List, Dict, Any, Optional
import numpy as np
import cv2

from backend.app.schemas import (
    ArchitecturalModel,
    BuildingSchema as BuildingSpec,
    FloorSchema as Floor,
    WallSchema as Wall,
    RoomSchema as Room,
    ScaleCalibrationSchema as ScaleCalibration,
    SiteSchema as SiteSpec,
    RoofSchema as RoofSpec,
    PointXZ
)
from backend.app.agents.space_topology import SpaceTopologyEngine
from backend.app.ai_engine.pipeline import process_floor_plan

class ArchitecturalAgent:
    """
    Agent 1: Architectural Intelligence Agent
    Understands floor plans, calculates metric dimensions and wall thicknesses,
    identifies rooms and spatial adjacency, and outputs verified 100% editable 3D geometry.
    """

    def __init__(self):
        self.topology_engine = SpaceTopologyEngine()

    def synthesize_from_walls(
        self,
        raw_walls: List[Dict[str, Any]],
        project_name: str = "Synthesized Architectural Model",
        default_height: float = 2.80,
        scale_meters_per_pixel: float = 0.025
    ) -> ArchitecturalModel:
        """
        Builds a structurally coherent, dimensionally consistent ArchitecturalModel from wall segments.
        """
        classified_walls_dict, rooms_dict = self.topology_engine.extract_rooms_and_classify_walls(raw_walls)

        walls: List[Wall] = []
        for w in classified_walls_dict:
            walls.append(Wall(
                id=w["id"],
                floor_id="floor_0",
                start=PointXZ(x=w["start"]["x"], z=w["start"]["z"]),
                end=PointXZ(x=w["end"]["x"], z=w["end"]["z"]),
                thickness=w["thickness"],
                height=w.get("height", default_height),
                wall_type=w["wall_type"],
                color=w.get("color")
            ))

        rooms: List[Room] = []
        for r in rooms_dict:
            rooms.append(Room(
                id=r["id"],
                floor_id="floor_0",
                name=r["name"],
                room_type=r["room_type"],
                area_sqm=r["area_sqm"],
                area_sqft=r["area_sqft"],
                floor_material=r["floor_material"],
                wall_color=r["wall_color"],
                polygon=[PointXZ(x=pt["x"], z=pt["z"]) for pt in r["polygon"]]
            ))

        # Calculate bounding box for plot and site
        all_x = [w.start.x for w in walls] + [w.end.x for w in walls]
        all_z = [w.start.z for w in walls] + [w.end.z for w in walls]
        min_x, max_x = min(all_x) if all_x else 0, max(all_x) if all_x else 10
        min_z, max_z = min(all_z) if all_z else 0, max(all_z) if all_z else 8
        span_x = max(10.0, max_x - min_x)
        span_z = max(8.0, max_z - min_z)

        floor_0 = Floor(
            id="floor_0",
            name="Ground Floor",
            level=0,
            elevation=0.0,
            height=default_height,
            walls=walls,
            doors=[],
            windows=[],
            stairs=[],
            columns=[],
            rooms=rooms,
            furniture=[]
        )

        model = ArchitecturalModel(
            schema_version="1.0",
            project_id=f"proj_{int(time.time())}",
            name=project_name,
            units="meters",
            unit_system="metric",
            building=BuildingSpec(
                total_floors=1,
                default_height=default_height,
                units="meters",
                roof=RoofSpec(
                    roof_type="gable",
                    pitch=22.0,
                    overhang=0.45,
                    thickness=0.15,
                    material="zinc_standing_seam",
                    visible=False
                ),
                site=SiteSpec(
                    plot_width=round(span_x + 8.0, 1),
                    plot_depth=round(span_z + 8.0, 1),
                    setback_front=4.0,
                    setback_rear=4.0,
                    setback_sides=3.0,
                    has_driveway=True,
                    has_garden=True,
                    has_boundary_wall=True
                )
            ),
            calibration=ScaleCalibration(
                pixel_distance=100.0,
                real_meters=round(100.0 * scale_meters_per_pixel, 2),
                meters_per_pixel=scale_meters_per_pixel,
                is_calibrated=True
            ),
            floors=[floor_0]
        )

        return model

    def process_plan(
        self,
        image_bytes: bytes,
        scale_meters_per_pixel: float = 0.02
    ) -> ArchitecturalModel:
        """
        End-to-end plan extraction: detects walls from bitmap image,
        vectorizes into metric coordinate frame, and runs topological solving.
        """
        base_model = process_floor_plan(image_bytes, scale_meters_per_pixel)
        
        # Convert detected walls to raw dicts for topological refinement
        raw_walls = []
        for w in base_model.floors[0].walls:
            raw_walls.append({
                "id": w.id,
                "start": {"x": w.start.x, "z": w.start.z},
                "end": {"x": w.end.x, "z": w.end.z},
                "thickness": w.thickness,
                "height": w.height
            })

        refined_model = self.synthesize_from_walls(
            raw_walls,
            project_name=base_model.name,
            scale_meters_per_pixel=scale_meters_per_pixel
        )
        
        # Retain doors and windows if detected
        refined_model.floors[0].doors = base_model.floors[0].doors
        refined_model.floors[0].windows = base_model.floors[0].windows
        
        return refined_model
