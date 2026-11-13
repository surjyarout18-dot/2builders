import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from backend.app.services.geometry_engine import DXFProcessor
from backend.app.database import SessionLocal
from backend.app.api.twobuilders_api import _process_and_save_plan
from backend.app.models import Project, Floor, Wall, Room

def test_dxf_processor(synthetic_dxf_path):
    res = DXFProcessor.process_dxf(synthetic_dxf_path, options={"realWidth": 10.0})
    assert res is not None
    assert "walls" in res
    assert "rooms" in res
    assert len(res["walls"]) >= 4
    assert len(res["rooms"]) >= 1

def test_dxf_e2e_plan_convert(synthetic_dxf_path):
    db = SessionLocal()
    try:
        project_id = "test_dxf_proj_1"
        _process_and_save_plan(
            project_id=project_id,
            clean_name="synthetic_plan.dxf",
            img_path=synthetic_dxf_path,
            payload_dict={"realWidthM": 10.0, "ceilingHeightMm": 3050},
            db=db
        )

        proj = db.query(Project).filter(Project.id == project_id).first()
        assert proj is not None
        assert proj.settings is not None
        plan_doc = proj.settings.get("twobuilders_plan")
        assert plan_doc is not None
        assert plan_doc.get("schema") == "2builders.plan/1"
        assert "walls" in plan_doc
        assert len(plan_doc["walls"]) >= 4

        fl = db.query(Floor).filter(Floor.project_id == project_id).first()
        assert fl is not None
        walls = db.query(Wall).filter(Wall.floor_id == fl.id).all()
        assert len(walls) >= 4
    finally:
        # Cleanup
        db.query(Room).filter(Room.floor_id.like(f"%{project_id[:8]}%")).delete(synchronize_session=False)
        db.query(Wall).filter(Wall.floor_id.like(f"%{project_id[:8]}%")).delete(synchronize_session=False)
        db.query(Floor).filter(Floor.project_id == project_id).delete(synchronize_session=False)
        db.query(Project).filter(Project.id == project_id).delete(synchronize_session=False)
        db.commit()
        db.close()
