import sys
import os
sys.path.insert(0, os.path.abspath('.'))

import io
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_convert_floorplan_endpoint(synthetic_floorplan_bytes):
    files = {'file': ('test_plan.jpg', io.BytesIO(synthetic_floorplan_bytes), 'image/jpeg')}
    data = {'name': 'Synthetic Test Plan', 'unit': 'meters', 'realWidth': '9.0'}
    resp = client.post('/api/projects/convert-floorplan', files=files, data=data)

    assert resp.status_code == 200, f"Convert failed: {resp.text}"
    proj = resp.json()
    assert 'id' in proj
    assert proj['name'] == 'Synthetic Test Plan'
    assert len(proj['floors']) > 0
    fl = proj['floors'][0]
    assert len(fl['walls']) > 0
