import io
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def make_test_image_bytes():
    img = np.ones((500, 500, 3), dtype=np.uint8) * 255
    cv2.rectangle(img, (50, 50), (450, 450), (0, 0, 0), 12)
    cv2.line(img, (250, 50), (250, 450), (0, 0, 0), 10)
    _, buf = cv2.imencode('.png', img)
    return buf.tobytes()

def test_full_project_workflow():
    # 1. Create project
    create_res = client.post("/api/v1/projects", json={"name": "Test Modern Villa"})
    assert create_res.status_code == 200
    proj_data = create_res.json()
    proj_id = proj_data["id"]
    assert proj_id is not None

    # 2. Upload floor plan image
    img_bytes = make_test_image_bytes()
    upload_res = client.post(
        f"/api/v1/projects/{proj_id}/upload",
        files={"file": ("villa.png", img_bytes, "image/png")}
    )
    assert upload_res.status_code == 200
    assert upload_res.json()["status"] == "uploaded"

    # 3. Analyze floor plan
    analyze_res = client.post(
        f"/api/v1/projects/{proj_id}/analyze",
        json={"scale_meters_per_pixel": 0.02}
    )
    assert analyze_res.status_code == 200
    model = analyze_res.json()
    assert model["project_id"] == proj_id
    assert len(model["floors"]) >= 1
    assert len(model["floors"][0]["walls"]) >= 4

    # 4. Calibrate scale
    calib_res = client.post(
        f"/api/v1/projects/{proj_id}/calibrate",
        json={"pixel_distance": 200.0, "real_meters": 5.0}
    )
    assert calib_res.status_code == 200
    calib_data = calib_res.json()
    assert calib_data["meters_per_pixel"] == pytest.approx(0.025, abs=0.001)

    # 5. Get model
    get_res = client.get(f"/api/v1/projects/{proj_id}/model")
    assert get_res.status_code == 200

    # 6. Export GLB
    glb_res = client.get(f"/api/v1/projects/{proj_id}/export/glb")
    assert glb_res.status_code == 200
    assert glb_res.content[:4] == b"glTF"

    # 7. Export OBJ
    obj_res = client.get(f"/api/v1/projects/{proj_id}/export/obj")
    assert obj_res.status_code == 200
    assert "v " in obj_res.text

    # 8. AI Architectural Assistant Chat
    chat_res = client.post(
        "/api/v1/assistant/chat",
        json={"project_id": proj_id, "prompt": "How many walls are in this project?"}
    )
    assert chat_res.status_code == 200
    assert "response" in chat_res.json()
