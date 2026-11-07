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

element = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
skel = np.zeros(solid_walls.shape, np.uint8)
temp = solid_walls.copy()
while True:
    eroded = cv2.erode(temp, element)
    temp2 = cv2.dilate(eroded, element)
    temp2 = cv2.subtract(temp, temp2)
    skel = cv2.bitwise_or(skel, temp2)
    temp = eroded.copy()
    if cv2.countNonZero(temp) == 0:
        break

lines = cv2.HoughLinesP(skel, rho=1, theta=np.pi/180, threshold=20, minLineLength=35, maxLineGap=25)

h_walls_raw = []
v_walls_raw = []
if lines is not None:
    for l in lines:
        seg = l[0] if len(l.shape) > 1 and l.shape[0] == 1 else l
        if len(seg) < 4:
            continue
        x1, y1, x2, y2 = int(seg[0]), int(seg[1]), int(seg[2]), int(seg[3])
        dx = abs(x2 - x1)
        dy = abs(y2 - y1)
        if np.hypot(dx, dy) < 25:
            continue
        if dx > 0 and (dy / dx) < 0.12:
            y_avg = round((y1 + y2) / 2)
            h_walls_raw.append({'start': [min(x1, x2), y_avg], 'end': [max(x1, x2), y_avg], 'type': 'H'})
        elif dy > 0 and (dx / dy) < 0.12:
            x_avg = round((x1 + x2) / 2)
            v_walls_raw.append({'start': [x_avg, min(y1, y2)], 'end': [x_avg, max(y1, y2)], 'type': 'V'})

print(f'h_walls_raw count: {len(h_walls_raw)}, v_walls_raw count: {len(v_walls_raw)}')

# Draw h_walls_raw and v_walls_raw directly on the image to see what was detected before merging
vis = img.copy()
for hw in h_walls_raw:
    cv2.line(vis, (hw['start'][0], hw['start'][1]), (hw['end'][0], hw['end'][1]), (0, 0, 255), 2)
for vw in v_walls_raw:
    cv2.line(vis, (vw['start'][0], vw['start'][1]), (vw['end'][0], vw['end'][1]), (255, 0, 0), 2)

scratch_dir = r'C:/Users/surjy/.gemini/antigravity/brain/2a9b51af-0336-4a18-9bc2-ffe4e7ff7e6e/scratch'
cv2.imwrite(os.path.join(scratch_dir, 'raw_detected_lines.png'), vis)
print('Saved raw_detected_lines.png')

