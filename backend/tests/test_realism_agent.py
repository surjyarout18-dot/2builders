import pytest
from backend.app.agents.realism_agent import RealismAgent
from backend.app.agents.architectural_agent import ArchitecturalAgent
from backend.app.agents.geometry_guard import GeometryInvarianceViolationError

def create_sample_model():
    agent = ArchitecturalAgent()
    raw_walls = [
        {"start": {"x": 0.0, "z": 0.0}, "end": {"x": 10.0, "z": 0.0}},
        {"start": {"x": 10.0, "z": 0.0}, "end": {"x": 10.0, "z": 8.0}},
        {"start": {"x": 10.0, "z": 8.0}, "end": {"x": 0.0, "z": 8.0}},
        {"start": {"x": 0.0, "z": 8.0}, "end": {"x": 0.0, "z": 0.0}},
        {"start": {"x": 5.0, "z": 0.0}, "end": {"x": 5.0, "z": 8.0}},
    ]
    return agent.synthesize_from_walls(raw_walls, default_height=2.80)

def test_realism_agent_enhances_without_mutating_geometry():
    realism_agent = RealismAgent()
    base_model = create_sample_model()
    
    original_walls = [
        (w.id, w.start.x, w.start.z, w.end.x, w.end.z, w.thickness, w.height)
        for w in base_model.floors[0].walls
    ]
    original_room_coords = [
        [(pt.x, pt.z) for pt in r.polygon] for r in base_model.floors[0].rooms
    ]
    
    enhanced = realism_agent.apply_realism(base_model, style="contemporary_warm")
    
    # 1. Verify strict Geometry Invariance
    new_walls = [
        (w.id, w.start.x, w.start.z, w.end.x, w.end.z, w.thickness, w.height)
        for w in enhanced.floors[0].walls
    ]
    new_room_coords = [
        [(pt.x, pt.z) for pt in r.polygon] for r in enhanced.floors[0].rooms
    ]
    
    assert original_walls == new_walls
    assert original_room_coords == new_room_coords
    
    # 2. Verify Realism enhancements
    # Floor materials assigned
    for r in enhanced.floors[0].rooms:
        assert r.floor_material in ["hardwood_oak", "parquet_herringbone", "tile_marble", "concrete_polished", "tile_slate"]
    
    # Furniture added
    assert len(enhanced.floors[0].furniture) >= 2
    
    # Roof enabled and realistic material assigned
    assert enhanced.building.roof.visible is True
    assert enhanced.building.roof.material in ["zinc_standing_seam", "slate_shingle", "terracotta_tile"]
    
    # Site landscaping enriched
    assert enhanced.building.site.has_garden is True

def test_geometry_guard_detects_unauthorized_mutation():
    realism_agent = RealismAgent()
    base_model = create_sample_model()
    
    # Intentionally mutate a wall coordinate
    mutated = base_model.model_copy(deep=True)
    mutated.floors[0].walls[0].end.x += 1.5
    
    with pytest.raises(GeometryInvarianceViolationError):
        realism_agent.validate_geometry_invariance(base_model, mutated)
