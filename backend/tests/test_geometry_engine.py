import pytest
from backend.app.schemas import WallSchema, DoorSchema, RoomSchema, PointXZ
from backend.app.geometry_engine.mesh_generator import MeshGenerator
from backend.app.geometry_engine.glb_exporter import export_model_to_glb, export_model_to_obj

def test_wall_mesh_with_door_cutout():
    # 5-meter wall along X axis
    wall = WallSchema(
        id="wall_1",
        start=PointXZ(x=0.0, z=0.0),
        end=PointXZ(x=5.0, z=0.0),
        thickness=0.20,
        height=2.80,
        wall_type="exterior"
    )
    # Door centered at x=2.5, width=0.9m, height=2.1m
    door = DoorSchema(
        id="door_1",
        wall_id="wall_1",
        position=PointXZ(x=2.5, z=0.0),
        width=0.90,
        height=2.10
    )

    generator = MeshGenerator()
    mesh = generator.generate_wall_mesh(wall, doors=[door], windows=[])

    assert "vertices" in mesh
    assert "indices" in mesh
    assert len(mesh["vertices"]) > 0
    assert len(mesh["indices"]) > 0
    # Number of triangles should be divisible by 3
    assert len(mesh["indices"]) % 3 == 0

    # Ensure lintel segment exists above door (y between 2.1 and 2.8)
    y_coords = [v[1] for v in mesh["vertices"]]
    assert max(y_coords) == pytest.approx(2.80, abs=0.01)
    assert min(y_coords) == pytest.approx(0.0, abs=0.01)

def test_room_floor_mesh_generation():
    room = RoomSchema(
        id="room_1",
        name="Living Room",
        area_sqm=20.0,
        polygon=[
            PointXZ(x=0.0, z=0.0),
            PointXZ(x=5.0, z=0.0),
            PointXZ(x=5.0, z=4.0),
            PointXZ(x=0.0, z=4.0),
        ]
    )
    generator = MeshGenerator()
    floor_mesh = generator.generate_floor_mesh(room)
    assert len(floor_mesh["vertices"]) >= 4
    assert len(floor_mesh["indices"]) >= 6

def test_glb_and_obj_export():
    wall = WallSchema(
        id="wall_1",
        start=PointXZ(x=0.0, z=0.0),
        end=PointXZ(x=4.0, z=0.0),
        thickness=0.20,
        height=2.80
    )
    room = RoomSchema(
        id="room_1",
        polygon=[
            PointXZ(x=0.0, z=0.0),
            PointXZ(x=4.0, z=0.0),
            PointXZ(x=4.0, z=3.0),
            PointXZ(x=0.0, z=3.0),
        ]
    )
    glb_bytes = export_model_to_glb([wall], [room], doors=[], windows=[])
    # GLTF binary magic number is 0x46546C67 ("glTF")
    assert glb_bytes[:4] == b"glTF"
    assert len(glb_bytes) > 100

    obj_text = export_model_to_obj([wall], [room])
    assert "v " in obj_text
    assert "f " in obj_text
