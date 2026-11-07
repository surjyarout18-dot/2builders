import sys
import os
sys.path.insert(0, os.path.abspath('.'))

import io
from fastapi import UploadFile
from backend.app.database import SessionLocal
from backend.app.api.projects import convert_floorplan

img_path = r'C:/Users/surjy/.gemini/antigravity/brain/2a9b51af-0336-4a18-9bc2-ffe4e7ff7e6e/.user_uploaded/media_1794032952424_93a7f716.jpg'

db = SessionLocal()
try:
    with open(img_path, 'rb') as f:
        file_bytes = f.read()
    
    upload = UploadFile(
        file=io.BytesIO(file_bytes),
        filename='media_9x7.jpg'
    )
    
    proj = convert_floorplan(
        file=upload,
        name='Floor Plan 9x7 Direct Test',
        unit='meters',
        realWidth=9.0,
        db=db
    )
    
    print('Project ID:', proj['id'])
    print('Project Name:', proj['name'])
    print('Calculated Scale:', proj['scale'])
    fl = proj['floors'][0]
    print('Total Walls:', len(fl['walls']))
    print('Total Rooms:', len(fl['rooms']))
    
    xs = [w['start'][0] for w in fl['walls']] + [w['end'][0] for w in fl['walls']]
    ys = [w['start'][1] for w in fl['walls']] + [w['end'][1] for w in fl['walls']]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    print(f'Building Dimensions: Width = {max_x - min_x:.2f} m, Height = {max_y - min_y:.2f} m')
    print(f'Coordinates: X in [{min_x:.2f}, {max_x:.2f}], Y in [{min_y:.2f}, {max_y:.2f}]')
    
    print('\nExtracted Rooms:')
    for rm in fl['rooms']:
        print(f" - {rm['name']}: {rm['area']} m²")

finally:
    db.close()

