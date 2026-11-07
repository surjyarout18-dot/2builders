import sys
import os

# Ensure repo root is on python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.main import app

# Export app for Vercel
__all__ = ["app"]

