"""
Canonical architectural schemas for 2builders.
Coordinates are in metric space (meters) unless explicitly marked as pixel coordinates.
Ground plane: XZ plane; Y is vertical elevation.
Design Philosophy: Geometry first, visualization second. 100% Free Forever.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class Point2D(BaseModel):
    x: float
    y: float

class PointXZ(BaseModel):
    x: float
    z: float

class Point3D(BaseModel):
    x: float
    y: float
    z: float

class WallSchema(BaseModel):
    id: str
    floor_id: str = "floor_0"
    start: PointXZ
    end: PointXZ
    thickness: float = 0.20  # meters (default 20cm exterior / 15cm interior)
    height: float = 2.80     # meters (default 2.8m wall height)
    wall_type: str = "exterior"  # "exterior" | "interior" | "partition"
    color: str = "#E2E8F0"

class DoorSchema(BaseModel):
    id: str
    floor_id: str = "floor_0"
    wall_id: Optional[str] = None
    position: PointXZ       # Center point along the wall
    width: float = 0.90     # meters (standard door 900mm)
    height: float = 2.10    # meters (standard door height 2100mm)
    swing_direction: str = "left"  # "left" | "right" | "sliding" | "double"
    door_type: str = "single"

class WindowSchema(BaseModel):
    id: str
    floor_id: str = "floor_0"
    wall_id: Optional[str] = None
    position: PointXZ       # Center point along the wall
    width: float = 1.20     # meters
    height: float = 1.40    # meters
    sill_height: float = 0.90 # meters from floor
    window_type: str = "casement"  # "casement" | "sliding" | "fixed"

class StairSchema(BaseModel):
    id: str
    floor_id: str = "floor_0"
    start: PointXZ
    end: PointXZ
    width: float = 1.0       # meters
    height: float = 2.80     # rise in meters
    risers_count: int = 14   # step risers
    stair_type: str = "straight"  # "straight" | "l_shape" | "u_shape"

class ColumnSchema(BaseModel):
    id: str
    floor_id: str = "floor_0"
    position: PointXZ
    radius_or_size: float = 0.30  # meters width/diameter
    height: float = 2.80          # meters
    shape: str = "square"         # "square" | "round"

class RoomSchema(BaseModel):
    id: str
    floor_id: str = "floor_0"
    name: str = "Room"
    room_type: str = "living_room" # living_room, bedroom, kitchen, bathroom, hallway, dining, study, utility
    area_sqm: float = 0.0
    area_sqft: float = 0.0
    polygon: List[PointXZ] = []
    floor_material: str = "hardwood_oak"
    wall_color: str = "#F8FAFC"
    ceiling_visible: bool = False

class FurnitureSchema(BaseModel):
    id: str
    floor_id: str = "floor_0"
    room_id: Optional[str] = None
    asset_id: str
    name: str
    category: str  # living, bedroom, dining, kitchen, bathroom, office, decor, outdoor
    position: Point3D
    rotation_y: float = 0.0  # degrees or radians
    dimensions: Point3D = Point3D(x=1.0, y=0.8, z=1.0)
    color: Optional[str] = None

class RoofSchema(BaseModel):
    roof_type: str = "gable"  # "gable" | "hip" | "shed" | "flat"
    pitch: float = 26.0       # degrees slope
    overhang: float = 0.45    # meters
    thickness: float = 0.15   # meters
    material: str = "zinc_standing_seam"  # "zinc_standing_seam" | "terracotta_tile" | "slate_shingle"
    visible: bool = False     # default hidden in CAD interior editing mode

class SiteSchema(BaseModel):
    plot_width: float = 20.0     # meters
    plot_depth: float = 25.0     # meters
    setback_front: float = 3.0   # meters
    setback_rear: float = 2.5    # meters
    setback_sides: float = 1.5   # meters
    has_driveway: bool = True
    has_garden: bool = True
    has_boundary_wall: bool = True

class FloorSchema(BaseModel):
    id: str = "floor_0"
    name: str = "Ground Floor"
    level: int = 0
    elevation: float = 0.0
    height: float = 2.80
    walls: List[WallSchema] = []
    doors: List[DoorSchema] = []
    windows: List[WindowSchema] = []
    stairs: List[StairSchema] = []
    columns: List[ColumnSchema] = []
    rooms: List[RoomSchema] = []
    furniture: List[FurnitureSchema] = []

class BuildingSchema(BaseModel):
    total_floors: int = 1
    default_height: float = 2.80
    units: str = "meters"
    roof: RoofSchema = Field(default_factory=RoofSchema)
    site: SiteSchema = Field(default_factory=SiteSchema)

class ScaleCalibrationSchema(BaseModel):
    pixel_distance: float
    real_meters: float
    meters_per_pixel: float = 0.02
    is_calibrated: bool = False

class VersionCheckpoint(BaseModel):
    id: str
    name: str
    timestamp: int
    change_summary: str = ""

class ArchitecturalModel(BaseModel):
    schema_version: str = "1.0"
    project_id: str
    name: str = "Architectural Project"
    units: str = "meters"
    unit_system: str = "metric"  # "metric" | "imperial"
    building: BuildingSchema = Field(default_factory=BuildingSchema)
    floors: List[FloorSchema] = Field(default_factory=lambda: [FloorSchema()])
    calibration: ScaleCalibrationSchema = ScaleCalibrationSchema(
        pixel_distance=100.0,
        real_meters=2.0,
        meters_per_pixel=0.02,
        is_calibrated=False
    )
    checkpoints: List[VersionCheckpoint] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
