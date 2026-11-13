import sys
import os

# Add root directory to sys.path so backend.app modules are discoverable in Vercel Serverless
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.app.main import app
