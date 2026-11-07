import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

img_path = r'C:/Users/surjy/.gemini/antigravity/brain/2a9b51af-0336-4a18-9bc2-ffe4e7ff7e6e/.user_uploaded/media_1794032952424_93a7f716.jpg'

with open(img_path, 'rb') as f:
    files = {'file': ('media_9x7.jpg', f, 'image/jpeg')}
    data = {'name': 'Floor Plan 9x7 Verified', 'unit': 'meters'}
    resp = client.post('/api/projects/convert-floorplan', files=files, data=data)

print('Status:', resp.status_code)
if resp.status_code == 200:
    proj = resp.json()
    print('Project ID:', proj['id'])
    print('Name:', proj['name'])
    print('Scale:', proj['scale'])
    fl = proj['floors'][0]
    print('Total Walls:', len(fl['walls']))
    print('Total Rooms:', len(fl['rooms']))
    
    # Calculate bounding box of walls
    xs = [w['start'][0] for w in fl['walls']] + [w['end'][0] for w in fl['walls']]
    ys = [w['start'][1] for w in fl['walls']] + [w['end'][1] for w in fl['walls']]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    print(f'Building Dimensions: Width = {max_x - min_x:.2f} m, Height = {max_y - min_y:.2f} m')
    print(f'Coordinates: X in [{min_x:.2f}, {max_x:.2f}], Y in [{min_y:.2f}, {max_y:.2f}]')
    
    print('\nExtracted Rooms:')
    for rm in fl['rooms']:
        print(f" - {rm['name']}: {rm['area']} m²")
else:
    print('Error:', resp.text)

