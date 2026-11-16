import pytest
from backend.app.agents.architectural_agent import ArchitecturalAgent
from backend.app.agents.cubicasa_parser import CubiCasaSemanticParser
from backend.app.agents.d5_exporter import export_d5_render_bundle

def test_cubicasa_semantic_parser():
    arch_agent = ArchitecturalAgent()
    raw_walls = [
        {"start": {"x": 0.0, "z": 0.0}, "end": {"x": 10.0, "z": 0.0}},
        {"start": {"x": 10.0, "z": 0.0}, "end": {"x": 10.0, "z": 8.0}},
        {"start": {"x": 10.0, "z": 8.0}, "end": {"x": 0.0, "z": 8.0}},
        {"start": {"x": 0.0, "z": 8.0}, "end": {"x": 0.0, "z": 0.0}},
        {"start": {"x": 5.0, "z": 0.0}, "end": {"x": 5.0, "z": 8.0}},
    ]
    model = arch_agent.synthesize_from_walls(raw_walls)
    
    parser = CubiCasaSemanticParser()
    enriched_model = parser.enrich_with_cubicasa_fixtures(model)
    
    assert len(enriched_model.floors[0].furniture) > 0
    categories = [f.category for f in enriched_model.floors[0].furniture]
    assert "living" in categories or "bedroom" in categories or "bathroom" in categories

def test_d5_render_exporter():
    arch_agent = ArchitecturalAgent()
    raw_walls = [
        {"start": {"x": 0.0, "z": 0.0}, "end": {"x": 10.0, "z": 0.0}},
        {"start": {"x": 10.0, "z": 0.0}, "end": {"x": 10.0, "z": 8.0}},
        {"start": {"x": 10.0, "z": 8.0}, "end": {"x": 0.0, "z": 8.0}},
        {"start": {"x": 0.0, "z": 8.0}, "end": {"x": 0.0, "z": 0.0}},
    ]
    model = arch_agent.synthesize_from_walls(raw_walls)
    
    bundle = export_d5_render_bundle(model)
    assert "obj_content" in bundle
    assert "mtl_content" in bundle
    assert "manifest" in bundle
    assert "mtllib" in bundle["obj_content"]
    assert "newmtl Mat_Wall_Exterior" in bundle["mtl_content"]
    assert bundle["manifest"]["renderer"] == "D5_Render"
    assert bundle["manifest"]["ray_tracing"]["dlss_supported"] is True
