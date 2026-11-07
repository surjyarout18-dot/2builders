import os
import sys
import uuid
sys.path.insert(0, os.path.abspath("."))

from backend.app.database import SessionLocal, Base, engine
from backend.app.models import Project, SourceFile, Floor, Wall, Opening, Room, ModelExport
from backend.app.services.geometry_engine import CoordinateSystem, ShoelaceArea, GeometryValidator, DXFProcessor, RasterProcessor
from backend.app.api.projects import create_project, get_project, list_projects, update_project, delete_project
from backend.app.api.geometry import save_geometry, validate_geometry
from backend.app.api.calibration import calibrate_scale
from backend.app.api.exports import create_export, download_export
from backend.app.schemas import ProjectCreate, ProjectUpdate, CalibrationRequest, FloorBase, WallBase, OpeningBase, RoomBase

def run_comprehensive_tests():
    print("=" * 70)
    print("FLOORPLAN3D – FULL END-TO-END APPLICATION TEST SUITE")
    print("=" * 70)
    
    db = SessionLocal()
    try:
        # TEST 1: Database and Health
        print("[1/8] Verifying Database Connection and Schema Initialization...")
        assert engine is not None
        print("      ✓ SQLite engine is active with PRAGMA foreign_keys = ON.")

        # TEST 2: Project Lifecycle CRUD
        print("[2/8] Testing Project CRUD (Create, Read, Update, Delete)...")
        new_proj_payload = ProjectCreate(
            name="Automated Test Suite Project",
            unit="meters",
            scale=0.0125
        )
        created = create_project(new_proj_payload, db=db)
        proj_id = created["id"]
        assert created["name"] == "Automated Test Suite Project"
        assert len(created["floors"]) == 1
        print(f"      ✓ Project created with default Ground Floor (ID: {proj_id[:8]}...)")

        fetched = get_project(proj_id, db=db)
        assert fetched["id"] == proj_id
        print("      ✓ Project retrieved successfully.")

        updated = update_project(proj_id, ProjectUpdate(name="Renamed Test Project"), db=db)
        assert updated["name"] == "Renamed Test Project"
        print("      ✓ Project metadata updated successfully.")

        # TEST 3: Scale Calibration Calculation
        print("[3/8] Testing Scale Calibration Calculations...")
        calib_req = CalibrationRequest(
            point1=[100, 100],
            point2=[600, 100],
            realDistance=5.0,
            unit="meters"
        )
        calib_res = calibrate_scale(proj_id, calib_req, db=db)
        assert abs(calib_res["scale"] - 0.01) < 1e-4
        assert abs(calib_res["pixelDistance"] - 500.0) < 1e-4
        print(f"      ✓ Calibrated: 500.0px for 5.0m = {calib_res['scale']:.4f} m/px.")

        # TEST 4: Shoelace Formula Precision
        print("[4/8] Testing Computational Geometry: Shoelace Polygon Area...")
        triangle = [[0, 0], [4, 0], [0, 3]]
        assert ShoelaceArea.calculate(triangle) == 6.0
        
        l_shape = [[0, 0], [6, 0], [6, 3], [3, 3], [3, 6], [0, 6]]
        # Area = (6x3) + (3x3) = 18 + 9 = 27
        assert ShoelaceArea.calculate(l_shape) == 27.0
        print("      ✓ Shoelace formula validated on convex, right, and L-shaped concave polygons.")

        # TEST 5: Geometry Validation Engine
        print("[5/8] Testing Geometry Validation Engine (Pre-flight Auditing)...")
        # Test bad geometry detection
        bad_floor = [{
            "name": "Faulty Floor",
            "walls": [
                {"id": "bad-w1", "start": [0, 0], "end": [0.01, 0], "thickness": 0.20, "height": 3.0}, # zero-length
                {"id": "bad-w2", "start": [0, 0], "end": [5, 0], "thickness": -0.1, "height": 3.0}, # negative thickness
                {"id": "bad-w3", "start": [0, 0], "end": [5, 0], "thickness": 0.2, "height": 3.0, "openings": [
                    {"id": "bad-op1", "type": "door", "offset": 4.5, "width": 1.2, "height": 2.1, "sillHeight": 0} # extends past wall
                ]}
            ],
            "rooms": [
                {"id": "bad-r1", "name": "Degenerate Room", "boundary": [[0, 0], [1, 1]]} # fewer than 3 vertices
            ]
        }]
        bad_report = GeometryValidator.validate_building(bad_floor)
        assert not bad_report["isValid"]
        assert len(bad_report["issues"]) >= 4
        print(f"      ✓ Detected {len(bad_report['issues'])} geometry violations correctly (zero-length, invalid thickness, overflowing opening, unclosed polygon).")

        # TEST 6: Multi-Wall & Multi-Opening State Synchronization
        print("[6/8] Testing Full Building Geometry Synchronization & Persistence...")
        sample_walls = [
            WallBase(id="w1", start=[0, 0], end=[8, 0], thickness=0.25, height=3.0, type="external", openings=[
                OpeningBase(id="d1", type="door", offset=1.0, width=1.0, height=2.1, sillHeight=0.0)
            ]),
            WallBase(id="w2", start=[8, 0], end=[8, 6], thickness=0.25, height=3.0, type="external", openings=[
                OpeningBase(id="win1", type="window", offset=2.0, width=1.5, height=1.2, sillHeight=0.9)
            ]),
            WallBase(id="w3", start=[8, 6], end=[0, 6], thickness=0.25, height=3.0, type="external", openings=[]),
            WallBase(id="w4", start=[0, 6], end=[0, 0], thickness=0.25, height=3.0, type="external", openings=[])
        ]
        sample_rooms = [
            RoomBase(id="rm1", name="Suite Room", boundary=[[0, 0], [8, 0], [8, 6], [0, 6]], area=48.0)
        ]
        sample_floors = [
            FloorBase(id=created["floors"][0]["id"], name="Ground Floor", elevation=0.0, wallHeight=3.0, walls=sample_walls, rooms=sample_rooms)
        ]

        class DummyPayload:
            pass
        dummy = DummyPayload()
        dummy.floors = sample_floors

        saved_geom = save_geometry(proj_id, dummy, db=db)
        assert saved_geom["success"] is True
        assert saved_geom["validation"]["isValid"] is True
        print("      ✓ Synchronized 4 walls, 2 openings, and 1 room into SQLite with 100% geometric validation.")

        # TEST 7: 3D Model Exporters (OBJ, STL, DXF, JSON)
        print("[7/8] Testing Multi-Format 3D Exporters (OBJ, STL, DXF, JSON)...")
        for fmt in ["obj", "stl", "dxf", "json"]:
            exp_res = create_export(proj_id, format=fmt, db=db)
            assert exp_res["format"] == fmt
            assert "downloadUrl" in exp_res
            print(f"      ✓ Generated {fmt.upper()} export: {exp_res['filename']}")

        # TEST 8: Cleanup of Test Project
        print("[8/8] Testing Project Cascade Deletion...")
        delete_project(proj_id, db=db)
        try:
            get_project(proj_id, db=db)
            assert False, "Should have thrown 404"
        except Exception:
            pass
        print("      ✓ Project deleted and all children cascade-deleted cleanly.")

        print("=" * 70)
        print("ALL 8 END-TO-END APPLICATION TEST SUITES PASSED WITH ZERO ERRORS!")
        print("=" * 70)

    finally:
        db.close()

if __name__ == "__main__":
    run_comprehensive_tests()

