import sys
import os
sys.path.insert(0, os.path.abspath('.'))

import cv2
import numpy as np

img_path = r'C:/Users/surjy/.gemini/antigravity/brain/2a9b51af-0336-4a18-9bc2-ffe4e7ff7e6e/.user_uploaded/media_1794032952424_93a7f716.jpg'
img = cv2.imread(img_path)
h, w = img.shape[:2]

gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
blurred = cv2.GaussianBlur(gray, (5, 5), 0)
_, thresh = cv2.threshold(blurred, 210, 255, cv2.THRESH_BINARY_INV)

num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(thresh)
largest_idx = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
s = stats[largest_idx]
bx, by, bw, bh = int(s[0]), int(s[1]), int(s[2]), int(s[3])

building_mask = np.zeros_like(thresh)
building_mask[by:by+bh, bx:bx+bw] = (labels[by:by+bh, bx:bx+bw] == largest_idx).astype(np.uint8) * 255

closed_walls = cv2.morphologyEx(building_mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (17, 17)))
solid_walls = cv2.morphologyEx(closed_walls, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (10, 10)))

# Test interior with solid_walls instead of closed_walls!
interior = np.zeros_like(thresh)
interior[by:by+bh, bx:bx+bw] = 255 - solid_walls[by:by+bh, bx:bx+bw]
# Morphological close to bridge door openings inside rooms!
interior_closed = cv2.morphologyEx(interior, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15)))
clean_interior = cv2.morphologyEx(interior_closed, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15)))

cnts, _ = cv2.findContours(clean_interior, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
scale = 9.0 / bw
print(f'Using solid_walls: Found {len(cnts)} cavities')
for idx, c in enumerate(cnts):
    area_px = cv2.contourArea(c)
    real_area = area_px * (scale ** 2)
    x, y, cw, ch = cv2.boundingRect(c)
    print(f'Cavity {idx}: area={real_area:.2f} m2, rect=({x}, {y}, {cw}, {ch})')

