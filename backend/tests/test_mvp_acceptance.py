import os
import sys
sys.path.insert(0, os.path.abspath("."))

from backend.app.database import SessionLocal, Base, engine
from backend.app.api.projects import create_project, serialize_project
from backend.app.api.geometry import save_geometry
from backend.app.api.exports import generate_obj_export, generate_stl_export, generate_dxf_export
from backend.app.schemas import ProjectCreate, FloorBase, WallBase, OpeningBase, RoomBase
from backend.app.services.geometry_engine import GeometryValidator

def test_mvp_acceptance():
    print("==================================================")
    print("FLOORPLAN3D - SECTION 13 MVP ACCEPTANCE TEST")
    print("Test Building: Small Residential ADU (10m x 8m)")
    print("==================================================")

    db = SessionLocal()
    try:
        # 1. Create Project in SQLite
        payload = ProjectCreate(
            name="MVP Test ADU House",
            unit="meters",
            scale=0.01
        )
        proj = create_project(payload, db=db)
        project_id = proj["id"]
        print(f"[1] Project created in SQLite: ID={project_id}")

        # 2. Construct 10m x 8m Residential Layout
        # External: 10m x 8m, thickness 0.20m, height 3m
        # Internal partition: 6m x 5m, thickness 0.15m, height 3m
        # Openings: Door (1m x 2.1m), Windows (1.5m x 1.2m)
        walls = [
            WallBase(
                id="wall-south",
                start=[0, 0],
                end=[10, 0],
                thickness=0.20,
                height=3.0,
                type="external",
                openings=[
                    OpeningBase(id="door-main", type="door", offset=4.5, width=1.0, height=2.1, sillHeight=0.0)
                ]
            ),
            WallBase(
                id="wall-east",
                start=[10, 0],
                end=[10, 8],
                thickness=0.20,
                height=3.0,
                type="external",
                openings=[
                    OpeningBase(id="win-east", type="window", offset=3.0, width=1.5, height=1.2, sillHeight=0.9)
                ]
            ),
            WallBase(
                id="wall-north",
                start=[10, 8],
                end=[0, 8],
                thickness=0.20,
                height=3.0,
                type="external",
                openings=[]
            ),
            WallBase(
                id="wall-west",
                start=[0, 8],
                end=[0, 0],
                thickness=0.20,
                height=3.0,
                type="external",
                openings=[]
            ),
            WallBase(
                id="wall-partition",
                start=[6, 0],
                end=[6, 5],
                thickness=0.15,
                height=3.0,
                type="partition",
                openings=[
                    OpeningBase(id="door-internal", type="door", offset=1.0, width=0.9, height=2.1, sillHeight=0.0)
                ]
            )
        ]

        rooms = [
            RoomBase(
                id="room-main",
                name="Living Area",
                boundary=[[0, 0], [10, 0], [10, 8], [0, 8]],
                area=80.0
            )
        ]

        floors = [
            FloorBase(
                id=proj["floors"][0]["id"],
                name="Ground Floor",
                elevation=0.0,
                wallHeight=3.0,
                order_index=0,
                walls=walls,
                rooms=rooms
            )
        ]

        # 3. Geometric Validation
        report = GeometryValidator.validate_building([f.model_dump() for f in floors])
        print(f"[2] Geometry Validator report: isValid={report['isValid']}")
        assert report["isValid"], f"Validation failed: {report['issues']}"
        print(f"    Summary: {report['summary']}")

        # 4. Save to Database
        class DummyPayload:
            pass
        dummy = DummyPayload()
        dummy.floors = floors
        save_res = save_geometry(project_id, dummy, db=db)
        print(f"[3] Geometry saved to SQLite successfully. Walls stored: {len(walls)}, Openings: 3")

        # 5. Export to OBJ
        export_dir = os.path.join(os.path.dirname(__file__), "..", "exports")
        os.makedirs(export_dir, exist_ok=True)
        obj_file = os.path.join(export_dir, "acceptance_adu_model.obj")
        generate_obj_export(save_res["project"], obj_file)
        assert os.path.exists(obj_file) and os.path.getsize(obj_file) > 100
        print(f"[4] OBJ Export generated: {obj_file} ({os.path.getsize(obj_file)} bytes)")

        # 6. Export to STL
        stl_file = os.path.join(export_dir, "acceptance_adu_model.stl")
        generate_stl_export(save_res["project"], stl_file)
        assert os.path.exists(stl_file) and os.path.getsize(stl_file) > 100
        print(f"[5] STL Export generated: {stl_file} ({os.path.getsize(stl_file)} bytes)")

        # 7. Export to DXF
        dxf_file = os.path.join(export_dir, "acceptance_adu_model.dxf")
        generate_dxf_export(save_res["project"], dxf_file)
        assert os.path.exists(dxf_file) and os.path.getsize(dxf_file) > 100
        print(f"[6] DXF Export generated: {dxf_file} ({os.path.getsize(dxf_file)} bytes)")

        print("==================================================")
        print("ALL ACCEPTANCE CRITERIA VERIFIED AND PASSED!")
        print("==================================================")

    finally:
        db.close()

if __name__ == "__main__":
    test_mvp_acceptance()
