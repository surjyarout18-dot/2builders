import pytest
from backend.app.agents.blender_bridge import generate_blender_python_script
from backend.app.agents.architectural_agent import ArchitecturalAgent
from backend.app.agents.realism_agent import RealismAgent

def test_blender_script_generation():
    arch_agent = ArchitecturalAgent()
    realism_agent = RealismAgent()
    
    raw_walls = [
        {"start": {"x": 0.0, "z": 0.0}, "end": {"x": 10.0, "z": 0.0}},
        {"start": {"x": 10.0, "z": 0.0}, "end": {"x": 10.0, "z": 8.0}},
        {"start": {"x": 10.0, "z": 8.0}, "end": {"x": 0.0, "z": 8.0}},
        {"start": {"x": 0.0, "z": 8.0}, "end": {"x": 0.0, "z": 0.0}},
        {"start": {"x": 5.0, "z": 0.0}, "end": {"x": 5.0, "z": 8.0}},
    ]
    model = arch_agent.synthesize_from_walls(raw_walls)
    model = realism_agent.apply_realism(model, style="contemporary_warm")
    
    script = generate_blender_python_script(model, output_render_path="test_render.png")
    
    assert isinstance(script, str)
    assert "import bpy" in script
    assert "import math" in script
    assert "CYCLES" in script
    assert "Principled BSDF" in script
    assert "bpy.ops.render.render" in script
    assert "test_render.png" in script
    # Assert walls are present in code
    assert "create_wall_mesh" in script
