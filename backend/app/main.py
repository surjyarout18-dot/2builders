import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import engine, Base
from .api import projects, files, calibration, extraction, geometry, exports, propli_api

# Initialize database schema safely
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Database schema init warning: {e}")

app = FastAPI(
    title="2builders API",
    description="Deterministic Architectural 2D-to-3D Geometry & Modeling Engine (Non-AI)",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(projects.router)
app.include_router(files.router)
app.include_router(calibration.router)
app.include_router(extraction.router)
app.include_router(geometry.router)
app.include_router(exports.router)
app.include_router(propli_api.router)

from .paths import UPLOAD_DIR, EXPORT_DIR

try:
    app.mount("/static/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
    app.mount("/static/exports", StaticFiles(directory=EXPORT_DIR), name="exports")
except Exception as e:
    print(f"Static directories mount warning: {e}")

@app.get("/")
@app.get("/api")
@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "app": "2builders Engine",
        "version": "1.0.0",
        "database": "sqlite"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)

