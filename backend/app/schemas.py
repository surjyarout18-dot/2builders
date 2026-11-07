from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class OpeningBase(BaseModel):
    id: Optional[str] = None
    wallId: Optional[str] = None
    type: str = "door"  # "door" or "window"
    offset: float = 1.0
    width: float = 0.9
    height: float = 2.1
    sillHeight: float = 0.0

class OpeningCreate(OpeningBase):
    pass

class OpeningResponse(OpeningBase):
    id: str
    wallId: str

    class Config:
        from_attributes = True

class WallBase(BaseModel):
    id: Optional[str] = None
    start: List[float] = Field(..., description="[x, y] start coordinates in world units")
    end: List[float] = Field(..., description="[x, y] end coordinates in world units")
    thickness: float = 0.20
    height: float = 3.0
    type: str = "external"  # external, internal, partition
    layer: Optional[str] = "WALLS"
    material: Optional[str] = "default"
    openings: List[OpeningBase] = []

class WallCreate(WallBase):
    pass

class WallResponse(WallBase):
    id: str

    class Config:
        from_attributes = True

class RoomBase(BaseModel):
    id: Optional[str] = None
    name: str = "Room"
    boundary: List[List[float]] = []  # list of [x, y]
    area: float = 0.0

class RoomResponse(RoomBase):
    id: str

    class Config:
        from_attributes = True

class StructuralObjectBase(BaseModel):
    id: Optional[str] = None
    type: str = "column"  # column, beam, stair, slab
    geometry: Dict[str, Any] = {}
    properties: Dict[str, Any] = {}

class StructuralObjectResponse(StructuralObjectBase):
    id: str

    class Config:
        from_attributes = True

class FloorBase(BaseModel):
    id: Optional[str] = None
    name: str = "Floor 1"
    elevation: float = 0.0
    wallHeight: float = 3.0
    order_index: int = 0
    walls: List[WallBase] = []
    rooms: List[RoomBase] = []
    structuralObjects: List[StructuralObjectBase] = []

class FloorResponse(BaseModel):
    id: str
    name: str
    elevation: float
    wallHeight: float
    order_index: int
    walls: List[WallBase]
    rooms: List[RoomResponse]
    structuralObjects: List[StructuralObjectResponse]

    class Config:
        from_attributes = True

class SourceFileResponse(BaseModel):
    id: str
    filename: str
    format: str
    file_path: str
    file_size: int
    metadata_json: Dict[str, Any] = {}
    created_at: datetime

    class Config:
        from_attributes = True

class ProjectCreate(BaseModel):
    name: str = "New Floor Plan"
    unit: str = "meters"
    scale: float = 1.0
    settings: Dict[str, Any] = {}

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    scale: Optional[float] = None
    settings: Optional[Dict[str, Any]] = None

class ProjectResponse(BaseModel):
    id: str
    name: str
    unit: str
    scale: float
    settings: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    floors: List[FloorResponse] = []
    sourceFiles: List[SourceFileResponse] = []

    class Config:
        from_attributes = True

class CalibrationRequest(BaseModel):
    point1: List[float]  # [x, y] in pixels
    point2: List[float]  # [x, y] in pixels
    realDistance: float  # in specified unit
    unit: str = "meters"

class CalibrationResponse(BaseModel):
    pixelDistance: float
    realDistance: float
    unit: str
    scale: float  # real units per pixel
    message: str

class ExtractionOptions(BaseModel):
    minLineLength: float = 20.0
    maxLineGap: float = 10.0
    cannyThreshold1: float = 50.0
    cannyThreshold2: float = 150.0
    defaultThickness: float = 0.20
    defaultHeight: float = 3.0

class ValidationIssue(BaseModel):
    type: str  # "error", "warning"
    objectId: Optional[str] = None
    description: str
    suggestion: str

class GeometryValidationReport(BaseModel):
    isValid: bool
    issues: List[ValidationIssue] = []
    summary: str

