import os
import sys

# Ensure repo root is on sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

try:
    from backend.app.main import app as _app
except Exception as e:
    import traceback
    err_tb = traceback.format_exc()
    from fastapi import FastAPI
    from fastapi.responses import PlainTextResponse

    _app = FastAPI(title="Sketch2Space Error Fallback")

    @_app.api_route("/{rest_of_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
    def _catch_all(rest_of_path: str = ""):
        return PlainTextResponse(f"FastAPI Startup Exception on Vercel:\n{err_tb}", status_code=500)

# Explicit top-level assignments at module body level for Vercel's AST scanner
app = _app
application = app
handler = app

__all__ = ["app", "application", "handler"]
