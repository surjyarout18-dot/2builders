import os
import sys
sys.path.insert(0, os.path.abspath("."))

import pytest
import httpx
from backend.app.main import app
from backend.app.services.geometry_engine import CoordinateSystem, ShoelaceArea, LineMerger, GeometryValidator

@pytest.mark.anyio
async def test_health():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        assert response.json()["status"] == "online"

@pytest.mark.anyio
async def test_project_crud():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Create project
        create_res = await client.post("/api/projects", json={
            "name": "Test Residential Layout",
            "unit": "meters",
            "scale": 0.01,
            "settings": {"notes": "Phase 1 test"}
        })
        assert create_res.status_code == 201
        data = create_res.json()
        assert data["name"] == "Test Residential Layout"
        project_id = data["id"]
        assert len(data["floors"]) == 1

        # Get project
        get_res = await client.get(f"/api/projects/{project_id}")
        assert get_res.status_code == 200
        assert get_res.json()["id"] == project_id

        # Update project
        patch_res = await client.patch(f"/api/projects/{project_id}", json={
            "name": "Updated House Model"
        })
        assert patch_res.status_code == 200
        assert patch_res.json()["name"] == "Updated House Model"

def test_shoelace_area():
    # 10m x 8m rectangle
    rect = [[0, 0], [10, 0], [10, 8], [0, 8]]
    area = ShoelaceArea.calculate(rect)
    assert area == pytest.approx(80.0, 0.01)

def test_scale_calibration():
    # 500 px = 5.0 meters -> scale = 0.01 meters/px
    scale = CoordinateSystem.calculate_scale((0, 0), (500, 0), 5.0, "meters")
    assert scale == pytest.approx(0.01, 0.0001)

def test_geometry_validation():
    # Test zero length wall error detection
    floors = [{
        "name": "Ground",
        "walls": [
            {"id": "w1", "start": [0, 0], "end": [0.01, 0], "thickness": 0.20, "height": 3.0}
        ],
        "rooms": []
    }]
    report = GeometryValidator.validate_building(floors)
    assert report["isValid"] is False
    assert len(report["issues"]) > 0
    assert any("invalid length" in i["description"] for i in report["issues"])
