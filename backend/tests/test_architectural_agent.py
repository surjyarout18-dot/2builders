import pytest
import numpy as np
import cv2
from backend.app.agents.architectural_agent import ArchitecturalAgent
from backend.app.schemas import ArchitecturalModel

def test_architectural_agent_wall_classification_and_topology():
    agent = ArchitecturalAgent()
    # 10m x 8m room with a center partition dividing it into two 5m x 8m rooms
    raw_walls = [
        {"start": {"x": 0.0, "z": 0.0}, "end": {"x": 10.0, "z": 0.0}},
        {"start": {"x": 10.0, "z": 0.0}, "end": {"x": 10.0, "z": 8.0}},
        {"start": {"x": 10.0, "z": 8.0}, "end": {"x": 0.0, "z": 8.0}},
        {"start": {"x": 0.0, "z": 8.0}, "end": {"x": 0.0, "z": 0.0}},
        {"start": {"x": 5.0, "z": 0.0}, "end": {"x": 5.0, "z": 8.0}},  # interior partition
    ]
    
    model = agent.synthesize_from_walls(raw_walls, default_height=2.80)
    assert isinstance(model, ArchitecturalModel)
    assert len(model.floors) == 1
    floor = model.floors[0]
    
    assert len(floor.walls) == 5
    ext_walls = [w for w in floor.walls if w.wall_type == 'exterior']
    int_walls = [w for w in floor.walls if w.wall_type == 'interior']
    
    assert len(ext_walls) == 4
    assert len(int_walls) == 1
    assert ext_walls[0].thickness >= 0.20
    assert int_walls[0].thickness <= 0.15
    
    # Topology extraction: should extract 2 closed rooms
    assert len(floor.rooms) == 2
    for room in floor.rooms:
        assert room.area_sqm > 30.0  # Approx 5m x 8m = 40m2
        assert len(room.polygon) >= 4

def test_architectural_agent_process_synthetic_plan_image():
    agent = ArchitecturalAgent()
    # Create black canvas with white walls (500 x 400 px)
    canvas = np.zeros((400, 500, 3), dtype=np.uint8)
    # Draw outer rectangle
    cv2.rectangle(canvas, (50, 50), (450, 350), (255, 255, 255), 10)
    # Draw middle partition
    cv2.line(canvas, (250, 50), (250, 350), (255, 255, 255), 6)
    
    _, encoded = cv2.imencode('.png', canvas)
    image_bytes = encoded.tobytes()
    
    model = agent.process_plan(image_bytes, scale_meters_per_pixel=0.025)
    assert isinstance(model, ArchitecturalModel)
    assert len(model.floors[0].walls) >= 4
