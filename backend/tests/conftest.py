import pytest
import cv2
import numpy as np

def create_synthetic_floorplan_image() -> np.ndarray:
    """Generate a clean synthetic 2D floor plan image for deterministic testing."""
    img = np.ones((600, 600, 3), dtype=np.uint8) * 255
    # Outer perimeter walls
    cv2.rectangle(img, (100, 100), (500, 500), (0, 0, 0), 12)
    # Dividing interior wall between two rooms
    cv2.line(img, (300, 100), (300, 500), (0, 0, 0), 10)
    # Door cutout on interior wall
    cv2.line(img, (300, 260), (300, 340), (255, 255, 255), 14)
    return img

@pytest.fixture
def synthetic_floorplan_img() -> np.ndarray:
    return create_synthetic_floorplan_image()

@pytest.fixture
def synthetic_floorplan_bytes() -> bytes:
    img = create_synthetic_floorplan_image()
    success, encoded = cv2.imencode('.jpg', img)
    return encoded.tobytes()

@pytest.fixture
def synthetic_floorplan_path(tmp_path) -> str:
    img = create_synthetic_floorplan_image()
    path = str(tmp_path / "synthetic_floorplan.jpg")
    cv2.imwrite(path, img)
    return path
