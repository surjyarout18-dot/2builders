import sys
import os
sys.path.insert(0, os.path.abspath('.'))

import io
from fastapi import UploadFile
from backend.app.database import SessionLocal
from backend.app.api.projects import convert_floorplan

def test_direct_convert(synthetic_floorplan_bytes):
    db = SessionLocal()
    try:
        upload = UploadFile(
            file=io.BytesIO(synthetic_floorplan_bytes),
            filename='synthetic_plan.jpg'
        )

        proj = convert_floorplan(
            file=upload,
            name='Synthetic Direct Test',
            unit='meters',
            realWidth=9.0,
            db=db
        )

        assert proj['id'] is not None
        assert proj['name'] == 'Synthetic Direct Test'
        assert proj['scale'] > 0
        fl = proj['floors'][0]
        assert len(fl['walls']) > 0
    finally:
        db.close()
