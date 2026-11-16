import math
from backend.app.schemas import WallSchema, PointXZ
from backend.app.geometry_engine.mesh_generator import MeshGenerator

def test_l_junction_corner_no_overlap():
    generator = MeshGenerator()
    
    # Wall 1: Along X, length 10m, thickness 0.25m
    w1 = WallSchema(
        id="w1_north",
        floor_id="floor_0",
        start=PointXZ(x=0.0, z=0.0),
        end=PointXZ(x=10.0, z=0.0),
        thickness=0.25,
        height=2.8,
        wall_type="exterior"
    )
    
    # Wall 2: Along Z, length 8m, thickness 0.25m meeting w1 at (10, 0)
    w2 = WallSchema(
        id="w2_east",
        floor_id="floor_0",
        start=PointXZ(x=10.0, z=0.0),
        end=PointXZ(x=10.0, z=8.0),
        thickness=0.25,
        height=2.8,
        wall_type="exterior"
    )
    
    all_walls = [w1, w2]
    
    # Generate meshes with junction trimming
    m1 = generator.generate_wall_mesh(w1, all_walls=all_walls)
    m2 = generator.generate_wall_mesh(w2, all_walls=all_walls)
    
    # W1 is longer (10m vs 8m), so W1 is dominant and extends to corner.
    # W2 is subordinate, so W2's start trims by W1's half thickness (0.125m).
    # Vertices of W2 should start at z >= 0.125 (inner face of W1).
    w2_z_coords = [v[2] for v in m2["vertices"]]
    min_w2_z = min(w2_z_coords)
    
    assert min_w2_z >= 0.125 - 1e-4, f"W2 should start at or beyond inner face of W1, got {min_w2_z}"

def test_t_junction_no_overlap():
    generator = MeshGenerator()
    
    # Exterior boundary wall: (0, 0) -> (10, 0), thickness 0.25m
    w_boundary = WallSchema(
        id="w_ext",
        floor_id="floor_0",
        start=PointXZ(x=0.0, z=0.0),
        end=PointXZ(x=10.0, z=0.0),
        thickness=0.25,
        height=2.8,
        wall_type="exterior"
    )
    
    # Interior partition meeting at (5, 0): (5, 0) -> (5, 5), thickness 0.15m
    w_partition = WallSchema(
        id="w_int",
        floor_id="floor_0",
        start=PointXZ(x=5.0, z=0.0),
        end=PointXZ(x=5.0, z=5.0),
        thickness=0.15,
        height=2.8,
        wall_type="interior"
    )
    
    all_walls = [w_boundary, w_partition]
    
    m_int = generator.generate_wall_mesh(w_partition, all_walls=all_walls)
    
    # Partition wall terminates into exterior wall.
    # Its start should trim by w_boundary's half thickness (0.125m) so it starts at z = 0.125.
    int_z_coords = [v[2] for v in m_int["vertices"]]
    min_int_z = min(int_z_coords)
    
    assert min_int_z >= 0.125 - 1e-4, f"Partition wall should start flush at boundary wall face (0.125m), got {min_int_z}"
