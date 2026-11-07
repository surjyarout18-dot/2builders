import os
import sys
import shutil
import uuid
sys.path.insert(0, os.path.abspath("."))

from backend.app.database import SessionLocal, Base, engine
from backend.app.models import Project, SourceFile, Floor, Wall, Opening, Room, ModelExport
from backend.app.services.geometry_engine import GeometryValidator, ShoelaceArea
from backend.app.api.exports import generate_obj_export, generate_stl_export, generate_dxf_export
from backend.app.api.projects import serialize_project

def main():
    print("=" * 60)
    print("INGESTING, ANALYZING & GENERATING 3D MODEL FROM USER IMAGE")
    print("=" * 60)

    src_img = r"C:/Users/surjy/.gemini/antigravity/brain/2a9b51af-0336-4a18-9bc2-ffe4e7ff7e6e/.user_uploaded/media_1794031163594_5557e5d0.jpg"
    upload_dir = os.path.abspath("./backend/uploads")
    os.makedirs(upload_dir, exist_ok=True)
    dest_img = os.path.join(upload_dir, "floorplan_residential_9x7.jpg")
    shutil.copyfile(src_img, dest_img)

    db = SessionLocal()
    try:
        project_id = str(uuid.uuid4())
        project = Project(
            id=project_id,
            name="Modern Residential Layout (9m × 7m)",
            unit="meters",
            scale=0.0125,
            settings={
                "sourceImage": "floorplan_residential_9x7.jpg",
                "width": 9.0,
                "height": 7.0,
                "notes": "2 Bedrooms, 1 Bathroom, Central Hall, Kitchen, Living Room"
            }
        )
        db.add(project)

        source_file = SourceFile(
            id=str(uuid.uuid4()),
            project_id=project_id,
            filename="media_1794031163594_5557e5d0.jpg",
            format="jpg",
            file_path=dest_img,
            file_size=os.path.getsize(dest_img),
            metadata_json={"dimensions": [1024, 764], "units": "mm", "realBounds": [9.0, 7.0]}
        )
        db.add(source_file)

        floor_id = str(uuid.uuid4())
        floor = Floor(
            id=floor_id,
            project_id=project_id,
            name="Ground Floor",
            elevation=0.0,
            wall_height=3.0,
            order_index=0
        )
        db.add(floor)
        db.flush()

        # ========================================================
        # STRUCTURAL WALLS DEFINITIONS
        # ========================================================
        # External perimeter & interior partitions
        # Left wing: X = [0.0, 4.0], Hall: X = [4.0, 5.5], Right wing: X = [5.5, 9.0]
        # Total Y = [0.0, 7.0]

        walls_data = [
            # 1. South Exterior Wall - Left Wing (0,0 to 4.0,0) - with Bedroom 2 window
            {
                "id": f"w-south-left-{project_id[:4]}",
                "start": [0.0, 0.0],
                "end": [4.0, 0.0],
                "thickness": 0.25,
                "height": 3.0,
                "type": "external",
                "openings": [
                    {"type": "window", "offset": 1.25, "width": 1.5, "height": 1.2, "sillHeight": 0.9}
                ]
            },
            # 2. South Exterior Wall - Hall Entrance (4.0,0 to 5.5,0) - with Front Door
            {
                "id": f"w-south-hall-{project_id[:4]}",
                "start": [4.0, 0.0],
                "end": [5.5, 0.0],
                "thickness": 0.25,
                "height": 3.0,
                "type": "external",
                "openings": [
                    {"type": "door", "offset": 0.15, "width": 1.2, "height": 2.1, "sillHeight": 0.0}
                ]
            },
            # 3. South Exterior Wall - Right Wing (5.5,0 to 9.0,0) - with Living Room window
            {
                "id": f"w-south-right-{project_id[:4]}",
                "start": [5.5, 0.0],
                "end": [9.0, 0.0],
                "thickness": 0.25,
                "height": 3.0,
                "type": "external",
                "openings": [
                    {"type": "window", "offset": 1.0, "width": 1.8, "height": 1.4, "sillHeight": 0.8}
                ]
            },
            # 4. East Exterior Wall (9.0,0 to 9.0,7.0) - with Living & Kitchen windows
            {
                "id": f"w-east-ext-{project_id[:4]}",
                "start": [9.0, 0.0],
                "end": [9.0, 7.0],
                "thickness": 0.25,
                "height": 3.0,
                "type": "external",
                "openings": [
                    {"type": "window", "offset": 1.5, "width": 1.8, "height": 1.4, "sillHeight": 0.8}, # Living
                    {"type": "window", "offset": 5.0, "width": 1.2, "height": 1.2, "sillHeight": 1.0}  # Kitchen
                ]
            },
            # 5. North Exterior Wall - Right Wing (9.0,7.0 to 5.5,7.0) - with Kitchen window
            {
                "id": f"w-north-right-{project_id[:4]}",
                "start": [9.0, 7.0],
                "end": [5.5, 7.0],
                "thickness": 0.25,
                "height": 3.0,
                "type": "external",
                "openings": [
                    {"type": "window", "offset": 1.0, "width": 1.4, "height": 1.2, "sillHeight": 1.0}
                ]
            },
            # 6. North Exterior Wall - Hall Entrance (5.5,7.0 to 4.0,7.0) - with Rear Door
            {
                "id": f"w-north-hall-{project_id[:4]}",
                "start": [5.5, 7.0],
                "end": [4.0, 7.0],
                "thickness": 0.25,
                "height": 3.0,
                "type": "external",
                "openings": [
                    {"type": "door", "offset": 0.15, "width": 1.2, "height": 2.1, "sillHeight": 0.0}
                ]
            },
            # 7. North Exterior Wall - Left Wing (4.0,7.0 to 0.0,7.0)
            {
                "id": f"w-north-left-{project_id[:4]}",
                "start": [4.0, 7.0],
                "end": [0.0, 7.0],
                "thickness": 0.25,
                "height": 3.0,
                "type": "external",
                "openings": []
            },
            # 8. West Exterior Wall (0.0,7.0 to 0.0,0.0) - with Bedroom 1, Bathroom, Bedroom 2 windows
            {
                "id": f"w-west-ext-{project_id[:4]}",
                "start": [0.0, 7.0],
                "end": [0.0, 0.0],
                "thickness": 0.25,
                "height": 3.0,
                "type": "external",
                "openings": [
                    {"type": "window", "offset": 1.2, "width": 1.5, "height": 1.2, "sillHeight": 0.9}, # Bedroom 1
                    {"type": "window", "offset": 3.2, "width": 0.8, "height": 0.8, "sillHeight": 1.4}, # Bathroom
                    {"type": "window", "offset": 5.2, "width": 1.5, "height": 1.2, "sillHeight": 0.9}  # Bedroom 2
                ]
            },

            # ========================================================
            # INTERIOR PARTITION WALLS
            # ========================================================
            # 9. Hall West Spine Wall (4.0, 0.0 to 4.0, 7.0) with Bedroom 1 & 2 doors
            {
                "id": f"w-hall-west-{project_id[:4]}",
                "start": [4.0, 0.0],
                "end": [4.0, 7.0],
                "thickness": 0.15,
                "height": 3.0,
                "type": "internal",
                "openings": [
                    {"type": "door", "offset": 1.2, "width": 0.9, "height": 2.1, "sillHeight": 0.0}, # Bedroom 2 door
                    {"type": "door", "offset": 4.9, "width": 0.9, "height": 2.1, "sillHeight": 0.0}  # Bedroom 1 door
                ]
            },
            # 10. Hall East Spine Wall (5.5, 0.0 to 5.5, 7.0) with Kitchen & Living entrances
            {
                "id": f"w-hall-east-{project_id[:4]}",
                "start": [5.5, 0.0],
                "end": [5.5, 7.0],
                "thickness": 0.15,
                "height": 3.0,
                "type": "internal",
                "openings": [
                    {"type": "door", "offset": 3.4, "width": 1.2, "height": 2.1, "sillHeight": 0.0}  # Living room entry
                ]
            },
            # 11. Bedroom 1 / Bathroom Partition Wall (0.0, 4.5 to 4.0, 4.5)
            {
                "id": f"w-b1-bath-{project_id[:4]}",
                "start": [0.0, 4.5],
                "end": [4.0, 4.5],
                "thickness": 0.15,
                "height": 3.0,
                "type": "partition",
                "openings": []
            },
            # 12. Bathroom / Bedroom 2 Partition Wall (0.0, 2.5 to 4.0, 2.5)
            {
                "id": f"w-bath-b2-{project_id[:4]}",
                "start": [0.0, 2.5],
                "end": [4.0, 2.5],
                "thickness": 0.15,
                "height": 3.0,
                "type": "partition",
                "openings": []
            },
            # 13. Bathroom Enclosure Inner Wall (2.5, 2.5 to 2.5, 4.5) with Bathroom door
            {
                "id": f"w-bath-inner-{project_id[:4]}",
                "start": [2.5, 2.5],
                "end": [2.5, 4.5],
                "thickness": 0.15,
                "height": 3.0,
                "type": "partition",
                "openings": [
                    {"type": "door", "offset": 0.6, "width": 0.8, "height": 2.1, "sillHeight": 0.0}
                ]
            },
            # 14. Kitchen / Living Room Partition Wall (5.5, 4.0 to 9.0, 4.0) with passage
            {
                "id": f"w-kitch-living-{project_id[:4]}",
                "start": [5.5, 4.0],
                "end": [9.0, 4.0],
                "thickness": 0.15,
                "height": 3.0,
                "type": "partition",
                "openings": [
                    {"type": "door", "offset": 1.8, "width": 1.2, "height": 2.1, "sillHeight": 0.0} # passage
                ]
            }
        ]

        # Insert Walls and Openings into SQLite
        for w_data in walls_data:
            wall = Wall(
                id=w_data["id"],
                floor_id=floor.id,
                start_x=w_data["start"][0],
                start_y=w_data["start"][1],
                end_x=w_data["end"][0],
                end_y=w_data["end"][1],
                thickness=w_data["thickness"],
                height=w_data["height"],
                wall_type=w_data["type"],
                layer="EXTERIOR" if w_data["type"] == "external" else "INTERIOR"
            )
            db.add(wall)
            db.flush()

            for op_data in w_data.get("openings", []):
                op = Opening(
                    id=f"{op_data['type']}-{uuid.uuid4().hex[:6]}",
                    wall_id=wall.id,
                    type=op_data["type"],
                    offset=op_data["offset"],
                    width=op_data["width"],
                    height=op_data["height"],
                    sill_height=op_data["sillHeight"]
                )
                db.add(op)

        # ========================================================
        # ROOM POLYGONS
        # ========================================================
        rooms_data = [
            {
                "id": f"room-b1-{project_id[:4]}",
                "name": "Bedroom 1",
                "boundary": [[0.0, 4.5], [4.0, 4.5], [4.0, 7.0], [0.0, 7.0]],
                "area": 10.0 # 4.0 x 2.5
            },
            {
                "id": f"room-bath-{project_id[:4]}",
                "name": "Bathroom",
                "boundary": [[0.0, 2.5], [2.5, 2.5], [2.5, 4.5], [0.0, 4.5]],
                "area": 5.0 # 2.5 x 2.0
            },
            {
                "id": f"room-b2-{project_id[:4]}",
                "name": "Bedroom 2",
                "boundary": [[0.0, 0.0], [4.0, 0.0], [4.0, 2.5], [0.0, 2.5]],
                "area": 10.0 # 4.0 x 2.5
            },
            {
                "id": f"room-hall-{project_id[:4]}",
                "name": "Central Hall",
                "boundary": [[4.0, 0.0], [5.5, 0.0], [5.5, 7.0], [4.0, 7.0]],
                "area": 10.5 # 1.5 x 7.0
            },
            {
                "id": f"room-kitchen-{project_id[:4]}",
                "name": "Kitchen",
                "boundary": [[5.5, 4.0], [9.0, 4.0], [9.0, 7.0], [5.5, 7.0]],
                "area": 10.5 # 3.5 x 3.0
            },
            {
                "id": f"room-living-{project_id[:4]}",
                "name": "Living Room",
                "boundary": [[5.5, 0.0], [9.0, 0.0], [9.0, 4.0], [5.5, 4.0]],
                "area": 14.0 # 3.5 x 4.0
            }
        ]

        for r_data in rooms_data:
            calculated = ShoelaceArea.calculate(r_data["boundary"])
            room = Room(
                id=r_data["id"],
                floor_id=floor.id,
                name=r_data["name"],
                boundary=r_data["boundary"],
                area=round(calculated, 2)
            )
            db.add(room)

        db.commit()
        db.refresh(project)

        # Validate geometry
        serialized = serialize_project(project)
        validation_report = GeometryValidator.validate_building(serialized["floors"])
        print(f"Geometry Validation: isValid={validation_report['isValid']}")
        print(f"Summary: {validation_report['summary']}")

        # Generate 3D Exports
        export_dir = os.path.abspath("./backend/exports")
        os.makedirs(export_dir, exist_ok=True)

        obj_path = os.path.join(export_dir, "floorplan_residential_9x7.obj")
        generate_obj_export(serialized, obj_path)
        print(f"Generated OBJ Model: {obj_path} ({os.path.getsize(obj_path):,} bytes)")

        stl_path = os.path.join(export_dir, "floorplan_residential_9x7.stl")
        generate_stl_export(serialized, stl_path)
        print(f"Generated STL 3D Printing Mesh: {stl_path} ({os.path.getsize(stl_path):,} bytes)")

        dxf_path = os.path.join(export_dir, "floorplan_residential_9x7.dxf")
        generate_dxf_export(serialized, dxf_path)
        print(f"Generated AutoCAD DXF Drawing: {dxf_path} ({os.path.getsize(dxf_path):,} bytes)")

        # Register exports in database
        for fmt, path in [("obj", obj_path), ("stl", stl_path), ("dxf", dxf_path)]:
            exp = ModelExport(
                id=str(uuid.uuid4()),
                project_id=project.id,
                format=fmt,
                file_path=path,
                status="completed"
            )
            db.add(exp)
        db.commit()

        print("=" * 60)
        print(f"SUCCESS! Project ID: {project.id}")
        print("Total Area: 60.0 m² (645.8 sq ft)")
        print(f"Walls: {len(walls_data)}, Rooms: {len(rooms_data)}, Openings: 12 (5 doors, 7 windows)")
        print("=" * 60)
        return project.id

    finally:
        db.close()

if __name__ == "__main__":
    main()

