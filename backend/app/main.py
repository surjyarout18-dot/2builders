"""
Sketch2Space FastAPI Main Application.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any

app = FastAPI(
    title="Sketch2Space API",
    description="AI-powered 2D architectural floor plan to editable 3D model conversion engine.",
    version="1.0.0"
)

# Enable CORS for local development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check() -> Dict[str, Any]:
    return {
        "status": "ok",
        "service": "Sketch2Space Engine",
        "version": "1.0.0",
        "free_forever": True
    }

