"""
Tests for 2builders new features:
1. Algorithmic Prompt-to-Plan layout generation (constraint solver with 3 distinct candidates)
2. Version Checkpoints (save and restore)
3. Parametric 3D Roof calculations (Gable, Hip, Shed, Flat)
4. Quantity Takeoff & Schedule CSV export
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.ai_engine.layout_generator import generate_candidate_layouts
from backend.app.geometry_engine.roof_generator import generate_roof_mesh
from backend.app.schemas import RoofSchema, FloorSchema, WallSchema, PointXZ

client = TestClient(app)

def test_prompt_to_plan_generator():
    res = client.post("/api/v1/generate-plan", json={
        "prompt": "Modern 3-bedroom villa with master suite and open patio",
        "plot_width": 16.0,
        "plot_depth": 22.0,
        "target_area_sqm": 150.0,
        "bedrooms_count": 3,
        "bathrooms_count": 2,
        "style": "modern"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["count"] == 3
    assert len(data["candidates"]) == 3

    for candidate in data["candidates"]:
        assert candidate["schema_version"] == "1.0"
        assert candidate["units"] == "meters"
        assert len(candidate["floors"]) >= 1
        floor = candidate["floors"][0]
        # Must have valid walls, rooms, doors, windows, and stairs
        assert len(floor["walls"]) >= 4
        assert len(floor["rooms"]) >= 3
        assert len(floor["doors"]) >= 1
        assert len(floor["windows"]) >= 1
        assert len(floor["stairs"]) >= 1
        assert len(floor["columns"]) >= 1
        # Bounding wall lengths must be positive
        for w in floor["walls"]:
            dx = w["end"]["x"] - w["start"]["x"]
            dz = w["end"]["z"] - w["start"]["z"]
            assert (dx * dx + dz * dz) > 0

def test_roof_generator_all_types():
    dummy_floor = FloorSchema(
        id="floor_0",
        name="Ground Floor",
        level=0,
        elevation=0.0,
        height=2.80,
        walls=[
            WallSchema(id="w1", floor_id="floor_0", start=PointXZ(x=0, z=0), end=PointXZ(x=10, z=0), thickness=0.2, height=2.8, wall_type="exterior"),
            WallSchema(id="w2", floor_id="floor_0", start=PointXZ(x=10, z=0), end=PointXZ(x=10, z=8), thickness=0.2, height=2.8, wall_type="exterior"),
            WallSchema(id="w3", floor_id="floor_0", start=PointXZ(x=10, z=8), end=PointXZ(x=0, z=8), thickness=0.2, height=2.8, wall_type="exterior"),
            WallSchema(id="w4", floor_id="floor_0", start=PointXZ(x=0, z=8), end=PointXZ(x=0, z=0), thickness=0.2, height=2.8, wall_type="exterior"),
        ],
        doors=[],
        windows=[],
        rooms=[]
    )

    for r_type in ["gable", "hip", "shed", "flat"]:
        roof = RoofSchema(
            roof_type=r_type,
            pitch=25.0,
            overhang=0.5,
            thickness=0.15,
            material="zinc_standing_seam",
            visible=True
        )
        mesh = generate_roof_mesh(roof, dummy_floor)
        assert mesh["roof_type"] == r_type
        assert len(mesh["vertices"]) > 0
        assert len(mesh["faces"]) > 0
        assert len(mesh["normals"]) == len(mesh["faces"])

def test_checkpoints_workflow():
    # 1. Create project
    create_res = client.post("/api/v1/projects", json={"name": "Checkpoint Test Villa"})
    proj_id = create_res.json()["id"]

    # 2. Add checkpoint
    cp_res = client.post(f"/api/v1/projects/{proj_id}/checkpoints", json={
        "name": "Design Milestone A",
        "change_summary": "Initial walls and interior partitions approved"
    })
    assert cp_res.status_code == 200
    cp_data = cp_res.json()
    assert cp_data["status"] == "saved"
    cp_id = cp_data["checkpoint"]["id"]

    # 3. List checkpoints
    list_res = client.get(f"/api/v1/projects/{proj_id}/checkpoints")
    assert list_res.status_code == 200
    checkpoints = list_res.json()["checkpoints"]
    assert len(checkpoints) >= 1
    assert checkpoints[-1]["name"] == "Design Milestone A"

    # 4. Restore checkpoint
    rest_res = client.post(f"/api/v1/projects/{proj_id}/restore-checkpoint/{cp_id}")
    assert rest_res.status_code == 200
    assert rest_res.json()["project_id"] == proj_id

def test_csv_export_endpoint():
    create_res = client.post("/api/v1/projects", json={"name": "Takeoff Export Villa"})
    proj_id = create_res.json()["id"]

    csv_res = client.get(f"/api/v1/projects/{proj_id}/export/csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")
    assert "2builders" in csv_res.text.lower()
    assert "room schedule" in csv_res.text.lower()
    assert "structural quantities" in csv_res.text.lower()
