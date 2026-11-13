"""
Unified AI Floor Plan Processing Pipeline.
Converts raw raster drawing into verified architectural geometric model.
"""
import uuid
from typing import Optional
from backend.app.schemas import (
    ArchitecturalModel, FloorSchema, WallSchema, DoorSchema, WindowSchema,
    RoomSchema, PointXZ, ScaleCalibrationSchema, BuildingSchema
)
from backend.app.ai_engine.preprocessor import ImagePreprocessor
from backend.app.ai_engine.wall_detector import WallDetector
from backend.app.ai_engine.opening_detector import OpeningDetector
from backend.app.ai_engine.room_detector import RoomDetector

def process_floor_plan(
    image_bytes: bytes,
    scale_meters_per_pixel: float = 0.02,
    project_id: Optional[str] = None,
    project_name: str = "Extracted Architectural Plan"
) -> ArchitecturalModel:
    """
    Executes end-to-end computer vision and computational geometry analysis on an uploaded floor plan.
    """
    if not project_id:
        project_id = f"proj_{uuid.uuid4().hex[:8]}"

    # Step 1: Preprocess raster image
    preprocessor = ImagePreprocessor()
    color_img, binary_walls, metadata = preprocessor.preprocess(image_bytes)

    # Step 2: Detect walls
    wall_detector = WallDetector()
    raw_walls, wall_mask = wall_detector.detect_walls(binary_walls)

    # Step 3: Detect openings (doors & windows)
    opening_detector = OpeningDetector()
    raw_doors, raw_windows = opening_detector.detect_openings(binary_walls, raw_walls)

    # Step 4: Detect room boundaries
    room_detector = RoomDetector()
    raw_rooms = room_detector.detect_rooms(wall_mask, scale_meters_per_pixel)

    # Step 5: Convert pixel coordinates to metric architectural model (meters)
    # Coordinate mapping: X = px * scale, Z = py * scale, Y = height
    scale = scale_meters_per_pixel

    metric_walls = []
    for w in raw_walls:
        x1, y1 = w["start"]
        x2, y2 = w["end"]
        thickness_m = max(0.12, round(w["thickness_px"] * scale, 2))
        metric_walls.append(WallSchema(
            id=w["id"],
            floor_id="floor_0",
            start=PointXZ(x=round(x1 * scale, 3), z=round(y1 * scale, 3)),
            end=PointXZ(x=round(x2 * scale, 3), z=round(y2 * scale, 3)),
            thickness=thickness_m,
            height=2.80,
            wall_type=w["wall_type"],
            color="#E2E8F0" if w["wall_type"] == "exterior" else "#CBD5E1"
        ))

    metric_doors = []
    for d in raw_doors:
        px, py = d["position"]
        width_m = max(0.75, min(1.60, round(d["width_px"] * scale, 2)))
        metric_doors.append(DoorSchema(
            id=d["id"],
            floor_id="floor_0",
            wall_id=d.get("wall_id"),
            position=PointXZ(x=round(px * scale, 3), z=round(py * scale, 3)),
            width=width_m,
            height=d["height_m"],
            swing_direction=d.get("swing_direction", "left"),
            door_type=d.get("door_type", "single")
        ))

    metric_windows = []
    for win in raw_windows:
        px, py = win["position"]
        width_m = max(0.80, min(2.40, round(win["width_px"] * scale, 2)))
        metric_windows.append(WindowSchema(
            id=win["id"],
            floor_id="floor_0",
            wall_id=win.get("wall_id"),
            position=PointXZ(x=round(px * scale, 3), z=round(py * scale, 3)),
            width=width_m,
            height=win["height_m"],
            sill_height=win["sill_height_m"],
            window_type=win.get("window_type", "casement")
        ))

    metric_rooms = []
    for r in raw_rooms:
        metric_poly = [
            PointXZ(x=round(pt[0] * scale, 3), z=round(pt[1] * scale, 3))
            for pt in r["polygon_px"]
        ]
        metric_rooms.append(RoomSchema(
            id=r["id"],
            floor_id="floor_0",
            name=r["name"],
            room_type=r["room_type"],
            area_sqm=r["area_sqm"],
            area_sqft=r["area_sqft"],
            polygon=metric_poly,
            floor_material=r["floor_material"],
            wall_color=r["wall_color"]
        ))

    # Assemble ground floor
    ground_floor = FloorSchema(
        id="floor_0",
        name="Ground Floor",
        level=0,
        elevation=0.0,
        height=2.80,
        walls=metric_walls,
        doors=metric_doors,
        windows=metric_windows,
        rooms=metric_rooms,
        furniture=[]
    )

    # Build canonical architectural model
    model = ArchitecturalModel(
        schema_version="1.0",
        project_id=project_id,
        name=project_name,
        units="meters",
        building=BuildingSchema(total_floors=1, default_height=2.80, units="meters"),
        floors=[ground_floor],
        calibration=ScaleCalibrationSchema(
            pixel_distance=100.0,
            real_meters=round(100.0 * scale, 2),
            meters_per_pixel=scale,
            is_calibrated=True
        ),
        metadata={
            "image_width_px": metadata["width"],
            "image_height_px": metadata["height"],
            "wall_count": len(metric_walls),
            "room_count": len(metric_rooms),
            "door_count": len(metric_doors),
            "window_count": len(metric_windows)
        }
    )

    return model
