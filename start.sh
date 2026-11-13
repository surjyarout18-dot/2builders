#!/usr/bin/env bash
echo "Starting Sketch2Space Platform..."
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload &
cd frontend && npm run dev

