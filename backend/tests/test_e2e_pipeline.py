import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_full_sketch2space_e2e_lifecycle():
    # 1. Create Project
    res = client.post("/api/v1/projects", json={
        "name": "E2E Modern Residence",
        "description": "Full end-to-end integration verification"
    })
    assert res.status_code == 200
    proj_id = res.json()["id"]

    # 2. Synthesize an architectural 2-room floor plan image
    img = np.ones((700, 700, 3), dtype=np.uint8) * 255
    # Outer rectangle: (100, 100) to (600, 600)
    cv2.rectangle(img, (100, 100), (600, 600), (0, 0, 0), 14)
    # Dividing wall with door gap: (350, 100) to (350, 300) and (350, 380) to (350, 600)
    cv2.line(img, (350, 100), (350, 300), (0, 0, 0), 10)
    cv2.line(img, (350, 380), (350, 600), (0, 0, 0), 10)
    # Door swing
    cv2.ellipse(img, (350, 300), (80, 80), 0, 0, 90, (60, 60, 60), 2)
    _, buf = cv2.imencode('.png', img)
    plan_bytes = buf.tobytes()

    # 3. Upload drawing
    up_res = client.post(
        f"/api/v1/projects/{proj_id}/upload",
        files={"file": ("plan.png", plan_bytes, "image/png")}
    )
    assert up_res.status_code == 200
    assert up_res.json()["status"] == "uploaded"

    # 4. Run AI analysis
    ana_res = client.post(
        f"/api/v1/projects/{proj_id}/analyze",
        json={"scale_meters_per_pixel": 0.02}
    )
    assert ana_res.status_code == 200
    model = ana_res.json()
    fl = model["floors"][0]
    assert len(fl["walls"]) >= 4
    assert len(fl["rooms"]) >= 1

    # 5. Calibrate drawing scale (400px = 8 meters -> 0.02 m/px)
    cal_res = client.post(
        f"/api/v1/projects/{proj_id}/calibrate",
        json={"pixel_distance": 400.0, "real_meters": 8.0}
    )
    assert cal_res.status_code == 200
    assert cal_res.json()["meters_per_pixel"] == pytest.approx(0.02, abs=0.001)

    # 6. Verify 3D GLB Export
    glb_res = client.get(f"/api/v1/projects/{proj_id}/export/glb")
    assert glb_res.status_code == 200
    assert glb_res.content[:4] == b"glTF"
    assert len(glb_res.content) > 200

    # 7. Verify Wavefront OBJ Export
    obj_res = client.get(f"/api/v1/projects/{proj_id}/export/obj")
    assert obj_res.status_code == 200
    assert "v " in obj_res.text
    assert "f " in obj_res.text

    # 8. Verify AutoCAD DXF Export
    dxf_res = client.get(f"/api/v1/projects/{proj_id}/export/dxf")
    assert dxf_res.status_code == 200
    assert "SECTION" in dxf_res.text
    assert "WALLS" in dxf_res.text

    # 9. Verify AI Assistant Q&A
    chat_res = client.post(
        "/api/v1/assistant/chat",
        json={"project_id": proj_id, "prompt": "What is the total measured floor area?"}
    )
    assert chat_res.status_code == 200
    assert "m²" in chat_res.json()["response"]

