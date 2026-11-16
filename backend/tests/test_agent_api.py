import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_agent_api_endpoints():
    # 1. Create a project
    create_res = client.post("/api/v1/projects", json={"name": "Realism Test Villa"})
    assert create_res.status_code == 200
    proj_id = create_res.json()["id"]

    # 2. Enhance Realism Endpoint
    realism_res = client.post("/api/v1/agents/enhance-realism", json={
        "project_id": proj_id,
        "style": "contemporary_warm",
        "orientation": "south"
    })
    assert realism_res.status_code == 200
    enhanced = realism_res.json()
    assert "floors" in enhanced
    assert len(enhanced["floors"][0]["furniture"]) >= 1
    assert enhanced["building"]["roof"]["visible"] is True

    # 3. Blender Script Export Endpoint
    blender_res = client.post(f"/api/v1/projects/{proj_id}/export/blender-script")
    assert blender_res.status_code == 200
    script_content = blender_res.text
    assert "import bpy" in script_content
    assert "CYCLES" in script_content
