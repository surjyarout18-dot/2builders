@echo off
echo ========================================================
echo    Sketch2Space - AI Floor Plan to 3D Architecture
echo    100%% Free Forever - Precision CAD Platform
echo ========================================================

echo [1/2] Starting FastAPI Backend on http://localhost:8000...
start cmd /k "python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Starting Vite Frontend on http://localhost:5173...
cd frontend
npm run dev
