import os
import sys
sys.path.insert(0, os.path.abspath("."))

from backend.app.services.geometry_engine import CoordinateSystem, ShoelaceArea, LineMerger, GeometryValidator
from backend.app.database import SessionLocal, Base, engine
from backend.app.api.projects import create_project, get_project, list_projects, serialize_project
from backend.app.schemas import ProjectCreate

def main():
    print(">>> Testing Geometry Engine Functions...")
    # 1. Shoelace Formula
    rect = [[0, 0], [10, 0], [10, 8], [0, 8]]
    area = ShoelaceArea.calculate(rect)
    assert abs(area - 80.0) < 0.001, f"Expected 80.0, got {area}"
    print("[PASS] Shoelace Area (10m x 8m) = 80.0 m²")

    # 2. Scale Calibration
    scale = CoordinateSystem.calculate_scale((0, 0), (500, 0), 5.0, "meters")
    assert abs(scale - 0.01) < 0.0001, f"Expected 0.01, got {scale}"
    print("[PASS] Scale Calibration: 500px for 5.0m = 0.01 m/px")

    # 3. Geometry Validation
    invalid_floor = [{
        "name": "Ground",
        "walls": [
            {"id": "w1", "start": [0, 0], "end": [0.01, 0], "thickness": 0.20, "height": 3.0}
        ],
        "rooms": []
    }]
    report = GeometryValidator.validate_building(invalid_floor)
    assert not report["isValid"]
    assert len(report["issues"]) == 1
    print("[PASS] Geometry Validator detected zero-length wall (<0.05m)")

    # 4. Valid building check
    valid_floor = [{
        "name": "Ground Floor",
        "walls": [
            {"id": "w1", "start": [0, 0], "end": [10, 0], "thickness": 0.20, "height": 3.0, "openings": [
                {"id": "d1", "type": "door", "offset": 2.0, "width": 1.0, "height": 2.1, "sillHeight": 0.0}
            ]},
            {"id": "w2", "start": [10, 0], "end": [10, 8], "thickness": 0.20, "height": 3.0},
            {"id": "w3", "start": [10, 8], "end": [0, 8], "thickness": 0.20, "height": 3.0},
            {"id": "w4", "start": [0, 8], "end": [0, 0], "thickness": 0.20, "height": 3.0}
        ],
        "rooms": [
            {"id": "r1", "name": "Living Room", "boundary": [[0, 0], [10, 0], [10, 8], [0, 8]], "area": 80.0}
        ]
    }]
    valid_report = GeometryValidator.validate_building(valid_floor)
    assert valid_report["isValid"]
    print(f"[PASS] Geometry Validator passed valid building: {valid_report['summary']}")

    # 5. Database CRUD with SQLite
    db = SessionLocal()
    try:
        proj_payload = ProjectCreate(
            name="Villa Master Plan",
            unit="meters",
            scale=0.01
        )
        created = create_project(proj_payload, db=db)
        assert created["name"] == "Villa Master Plan"
        assert len(created["floors"]) == 1
        print(f"[PASS] SQLite Project created: ID={created['id']}, Floor={created['floors'][0]['name']}")

        fetched = get_project(created["id"], db=db)
        assert fetched["id"] == created["id"]
        print(f"[PASS] Project fetched from SQLite successfully")
    finally:
        db.close()

    print("\nALL 5 TEST SUITES PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    main()

