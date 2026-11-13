import cv2
import numpy as np
import pytest
from backend.app.ai_engine.pipeline import process_floor_plan
from backend.app.schemas import ArchitecturalModel

def create_synthetic_floorplan_bytes() -> bytes:
    # 600x600 image, white background
    img = np.ones((600, 600, 3), dtype=np.uint8) * 255
    
    # Outer rectangle walls (black lines, thickness 12)
    # Top wall: (100, 100) to (500, 100)
    cv2.line(img, (100, 100), (500, 100), (0, 0, 0), 12)
    # Right wall: (500, 100) to (500, 500)
    cv2.line(img, (500, 100), (500, 500), (0, 0, 0), 12)
    # Bottom wall with door opening gap: (100, 500) to (250, 500) and (320, 500) to (500, 500)
    cv2.line(img, (100, 500), (250, 500), (0, 0, 0), 12)
    cv2.line(img, (320, 500), (500, 500), (0, 0, 0), 12)
    # Left wall: (100, 100) to (100, 500)
    cv2.line(img, (100, 100), (100, 500), (0, 0, 0), 12)
    
    # Interior dividing wall: (300, 100) to (300, 500) with a door gap
    cv2.line(img, (300, 100), (300, 260), (0, 0, 0), 10)
    cv2.line(img, (300, 320), (300, 500), (0, 0, 0), 10)
    
    # Door swing arc (thin 1px curve representing door opening)
    cv2.ellipse(img, (250, 500), (70, 70), 0, 180, 270, (80, 80, 80), 2)
    
    _, buffer = cv2.imencode('.png', img)
    return buffer.tobytes()

def test_cv_pipeline_extraction():
    img_bytes = create_synthetic_floorplan_bytes()
    model = process_floor_plan(img_bytes, scale_meters_per_pixel=0.02)
    
    assert isinstance(model, ArchitecturalModel)
    assert len(model.floors) >= 1
    floor = model.floors[0]
    
    # Assert detected walls
    assert len(floor.walls) >= 4, f"Expected at least 4 walls, got {len(floor.walls)}"
    
    # Assert detected rooms (should find enclosed spaces)
    assert len(floor.rooms) >= 1, f"Expected at least 1 room, got {len(floor.rooms)}"
    
    # Verify metric units are valid
    for wall in floor.walls:
        dx = wall.end.x - wall.start.x
        dz = wall.end.z - wall.start.z
        length = (dx**2 + dz**2)**0.5
        assert length > 0.5, "Wall should have meaningful metric length"
        assert wall.thickness > 0.05, "Wall thickness should be reasonable"
