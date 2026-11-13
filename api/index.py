import os
import sys
import traceback

# Ensure repo root is on sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

try:
    from backend.app.main import app as backend_app
    app = backend_app
    application = app
    handler = app
except Exception as e:
    err_tb = traceback.format_exc()
    from fastapi import FastAPI
    from fastapi.responses import PlainTextResponse

    app = FastAPI(title="Sketch2Space Error Fallback")

    @app.api_route("/{rest_of_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
    def catch_all(rest_of_path: str = ""):
        return PlainTextResponse(f"FastAPI Startup Exception:\n{err_tb}", status_code=500)

    application = app
    handler = app

__all__ = ["app", "application", "handler"]
