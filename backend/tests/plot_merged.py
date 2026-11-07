import sys
import os
sys.path.insert(0, os.path.abspath('.'))

import cv2
import numpy as np
from backend.app.services.geometry_engine import RasterProcessor

img_path = r'C:/Users/surjy/.gemini/antigravity/brain/2a9b51af-0336-4a18-9bc2-ffe4e7ff7e6e/.user_uploaded/media_1794032952424_93a7f716.jpg'
img = cv2.imread(img_path)

# Let's inspect the candidate walls inside RasterProcessor
res = RasterProcessor.process_image(img_path, scale=1.0) # scale=1 so coords are in raw units or let's check
vis = img.copy()

# Look at how res['walls'] are generated
# in current RasterProcessor:
# wx1 = round(float((x1 - bx) * scale), 3)
# wy1 = round(float(((by + bh) - y1) * scale), 3)
# If we do NOT subtract bx and do NOT invert y:
# wx1 = x1 * scale, wy1 = y1 * scale!
# Let's test candidate_walls directly

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

def cluster_and_merge(segs, is_h: bool):
    coord_idx = 1 if is_h else 0
    span_idx = 0 if is_h else 1
    groups = {}
    for s in segs:
        c = s['start'][coord_idx]
        matched = False
        for k in groups:
            if abs(k - c) <= 15:
                groups[k].append(s)
                matched = True
                break
        if not matched:
            groups[c] = [s]
    res = []
    for k, grp in groups.items():
        avg_c = round(sum(s['start'][coord_idx] for s in grp) / len(grp))
        intervals = sorted([(s['start'][span_idx], s['end'][span_idx]) for s in grp], key=lambda x: x[0])
        cs, ce = intervals[0]
        for s_pt, e_pt in intervals[1:]:
            if s_pt <= ce + 75:  # Bridge small door/window gaps
                ce = max(ce, e_pt)
            else:
                if ce - cs >= 35:
                    res.append((cs, ce, avg_c))
                cs, ce = s_pt, e_pt
        if ce - cs >= 35:
            res.append((cs, ce, avg_c))
    return res

h_merged = cluster_and_merge(h_walls_raw, is_h=True)
v_merged = cluster_and_merge(v_walls_raw, is_h=False)

candidate_walls = []
for cs, ce, y in h_merged:
    candidate_walls.append({'start': [cs, y], 'end': [ce, y], 'type': 'H'})
for cs, ce, x in v_merged:
    candidate_walls.append({'start': [x, cs], 'end': [x, ce], 'type': 'V'})

# Corner snapping:
for hw in candidate_walls:
    if hw['type'] != 'H':
        continue
    for vw in candidate_walls:
        if vw['type'] != 'V':
            continue
        vx = vw['start'][0]
        vy1, vy2 = min(vw['start'][1], vw['end'][1]), max(vw['start'][1], vw['end'][1])
        hy = hw['start'][1]
        if vy1 - 25 <= hy <= vy2 + 25:
            if abs(hw['start'][0] - vx) <= 25:
                hw['start'][0] = vx
            if abs(hw['end'][0] - vx) <= 25:
                hw['end'][0] = vx

for vw in candidate_walls:
    if vw['type'] != 'V':
        continue
    for hw in candidate_walls:
        if hw['type'] != 'H':
            continue
        hy = hw['start'][1]
        hx1, hx2 = min(hw['start'][0], hw['end'][0]), max(hw['start'][0], hw['end'][0])
        vx = vw['start'][0]
        if hx1 - 25 <= vx <= hx2 + 25:
            if abs(vw['start'][1] - hy) <= 25:
                vw['start'][1] = hy
            if abs(vw['end'][1] - hy) <= 25:
                vw['end'][1] = hy

vis_walls = img.copy()
for w in candidate_walls:
    cv2.line(vis_walls, (w['start'][0], w['start'][1]), (w['end'][0], w['end'][1]), (0, 255, 0), 3)
    cv2.circle(vis_walls, (w['start'][0], w['start'][1]), 4, (0, 0, 255), -1)
    cv2.circle(vis_walls, (w['end'][0], w['end'][1]), 4, (0, 0, 255), -1)

scratch_dir = r'C:/Users/surjy/.gemini/antigravity/brain/2a9b51af-0336-4a18-9bc2-ffe4e7ff7e6e/scratch'
cv2.imwrite(os.path.join(scratch_dir, 'merged_candidate_walls.png'), vis_walls)
print(f'Candidate walls count: {len(candidate_walls)}. Saved merged_candidate_walls.png')

