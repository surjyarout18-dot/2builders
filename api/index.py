import os
import sys

# Ensure repo root is on sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.app.main import app as backend_app

# Top-level exports required by Vercel's Python runtime scanner
app = backend_app
application = app
handler = app

__all__ = ["app", "application", "handler"]
