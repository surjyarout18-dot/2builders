import sys
import os
sys.path.insert(0, os.path.abspath('.'))

import cv2
import numpy as np

def test_room_cavity_detection(synthetic_floorplan_img):
    img = synthetic_floorplan_img
    h, w = img.shape[:2]

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(blurred, 210, 255, cv2.THRESH_BINARY_INV)

    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(thresh)
    assert num_labels > 1, "Should detect wall components"
    largest_idx = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    s = stats[largest_idx]
    bx, by, bw, bh = int(s[0]), int(s[1]), int(s[2]), int(s[3])

    building_mask = np.zeros_like(thresh)
    building_mask[by:by+bh, bx:bx+bw] = (labels[by:by+bh, bx:bx+bw] == largest_idx).astype(np.uint8) * 255

    closed_walls = cv2.morphologyEx(building_mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (17, 17)))
    solid_walls = cv2.morphologyEx(closed_walls, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (10, 10)))

    interior = np.zeros_like(thresh)
    interior[by:by+bh, bx:bx+bw] = 255 - solid_walls[by:by+bh, bx:bx+bw]
    interior_closed = cv2.morphologyEx(interior, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15)))
    clean_interior = cv2.morphologyEx(interior_closed, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15)))

    cnts, _ = cv2.findContours(clean_interior, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    assert len(cnts) >= 1, "Should identify at least 1 interior cavity"
