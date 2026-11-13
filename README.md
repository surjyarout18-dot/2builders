# Sketch2Space — AI 2D Floor Plan to Editable 3D Architecture

> **100% Free Forever** — Open architectural design platform with zero paywalls, zero subscription tiers, and unwatermarked 3D & CAD exports.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![OpenCV](https://img.shields.io/badge/OpenCV-4.9+-5C3EE8.svg?style=flat&logo=opencv)](https://opencv.org)
[![Three.js](https://img.shields.io/badge/Three.js-0.163+-black.svg?style=flat&logo=three.js)](https://threejs.org)
[![React](https://img.shields.io/badge/React-18.2+-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org)

---

## 🏛️ What is Sketch2Space?

**Sketch2Space** is an AI-powered architectural platform that converts ordinary 2D architectural drawings (hand-drawn sketches, scans, JPG, PNG, WEBP, and PDF floor plans) into **mathematically accurate, editable 2D geometry and interactive 3D architectural models**.

Rather than outputting static AI-generated pictures of houses, Sketch2Space decouples **AI image understanding & computer vision** from the **computational geometry engine** and the **Three.js 3D WebGL renderer**. The result is a parametric, watertight 3D building model that you can measure, orbit, walk through in first-person, customize with PBR materials, furnish, and export directly to CAD and 3D formats.

---

## ✨ Key Features

1. **AI & Computer Vision Pipeline:**
   - **Image Preprocessing:** Grayscale conversion, bilateral edge-preserving smoothing, Otsu & adaptive thresholding, and morphological deskewing.
   - **Wall Vectorization:** Directional morphological kernel filtering, probabilistic Hough line transform (`cv2.HoughLinesP`), collinear segment merging, corner endpoint snapping, and thickness estimation.
   - **Opening Detection:** Automated identification of door openings, door swing circular arcs, and window mullions with host wall assignment.
   - **Room Boundary Discovery:** Closed wall loop polygon extraction using Shapely topology, automatic floor area calculation ($m^2$ and $sqft$), and intelligent room labeling.

2. **Interactive Scale Calibration:**
   - Click two points on the drawing, enter the real-world distance (in meters or feet), and the system calibrates pixel-to-meter scaling ($\text{Scale} = \frac{\text{Real Distance}}{\text{Pixel Distance}}$).

3. **Precision 2D CAD Canvas:**
   - Sub-millimeter dark CAD grid with zoom (10% to 1000%), pan, and snap-to-grid.
   - Live rubber-band wall drawing with real-time length ($m$) and angle ($^\circ$) HUD.
   - Door, window, and room boundary tools with dimension readouts.
   - Multi-level Undo & Redo.

4. **Three.js / React Three Fiber 3D Scene:**
   - Physically-Based Rendering (PBR) materials for drywalls, hardwood oak, herringbone parquet, marble, slate tile, and reflective architectural glass.
   - **Dollhouse Cutaway Mode:** Intelligently clips upper wall heights to provide an isometric dollhouse view into every room.
   - **Camera Modes:** Orbit controls, Top-Down Orthographic plan, Isometric view, and First-Person Walkthrough (WASD + mouse look).
   - **Day & Night Architectural Lighting:** Crisp daytime sunlight with soft contact shadows; night mode with warm interior recessed ceiling lights.

5. **Parametric Furniture Asset Library:**
   - Curated procedural 3D furniture models across Living Room, Bedroom, Dining, Kitchen, Bathroom, Office, and Decor.
   - Drag, place, rotate (0°–360°), and customize in real time.

6. **Conversational AI Design Assistant:**
   - Natural-language architectural Q&A: query wall counts, total living area, room dimensions, and request material modifications directly in chat.

7. **Multi-Format Free Exports:**
   - **3D Binary glTF (`.glb`):** Industry-standard format for Blender, Unity, Unreal Engine.
   - **Wavefront OBJ (`.obj`):** Universal 3D mesh with materials and face normals.
   - **AutoCAD DXF (`.dxf`):** Vector CAD format for AutoCAD, Revit, and ArchiCAD.
   - **Vector SVG (`.svg`):** Scalable 2D blueprint diagram.
   - **Architectural Specification PDF (`.pdf`):** Project report with room schedules and area breakdowns.

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.11+**
- **Node.js 18+ & npm**

### 1. One-Click Launch (Windows)
```bash
start.bat
```

### 2. Manual Startup

#### Start the Backend (FastAPI):
```bash
# From repository root
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be available at: [http://localhost:8000/docs](http://localhost:8000/docs)

#### Start the Frontend (Vite + React):
```bash
cd frontend
npm install
npm run dev
```
Open your browser at: [http://localhost:5173](http://localhost:5173)

---

## 🧪 Running Tests

### Backend Automated Test Suite:
```bash
python -m pytest backend/tests -v
```
Verifies health checks, CV pipeline extraction, 3D mesh generation with door cutouts, GLB/OBJ export integrity, REST API endpoints, and complete E2E lifecycles.

### Frontend Production Build Verification:
```bash
cd frontend
npm run build
```

---

## 📐 Project Structure

```
2builders/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI entrypoint & CORS
│   │   ├── schemas.py                  # Canonical architectural Pydantic models
│   │   ├── api/
│   │   │   └── endpoints.py            # Projects, upload, CV, calibration & export APIs
│   │   ├── ai_engine/
│   │   │   ├── preprocessor.py         # Image smoothing & adaptive thresholding
│   │   │   ├── wall_detector.py        # Morphological wall & Hough vectorization
│   │   │   ├── opening_detector.py     # Door swings & window gap detection
│   │   │   ├── room_detector.py        # Shapely topological room extraction
│   │   │   └── pipeline.py             # End-to-end CV analysis pipeline
│   │   └── geometry_engine/
│   │       ├── topology.py             # Endpoint snapping & mitered footprints
│   │       ├── mesh_generator.py       # Parametric 3D wall cutouts & floor triangulation
│   │       └── glb_exporter.py         # Pure-Python GLB & OBJ binary generator
│   ├── tests/
│   │   ├── test_health.py
│   │   ├── test_cv_pipeline.py
│   │   ├── test_geometry_engine.py
│   │   ├── test_api_endpoints.py
│   │   └── test_e2e_pipeline.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── canvas2d/               # HTML5 Canvas CAD Editor & Calibration
│   │   │   ├── viewer3d/               # Three.js / R3F 3D Architectural Scene
│   │   │   ├── furniture/              # 3D Furniture models & catalog
│   │   │   ├── inspector/              # Entity properties & PBR material picker
│   │   │   ├── assistant/              # Natural-language AI Assistant drawer
│   │   │   ├── dashboard/              # File upload & sample plan selector
│   │   │   ├── export/                 # 100% Free Multi-Format Export Modal
│   │   │   └── navbar/                 # Precision CAD header & mode switcher
│   │   ├── services/api.ts             # Backend API client
│   │   ├── store/useFloorPlanStore.ts  # Reactive Zustand architectural store
│   │   ├── types/architectural.ts      # TypeScript interfaces
│   │   └── utils/exporter.ts           # Client-side GLB, OBJ, DXF, SVG, PDF generator
│   └── vite.config.ts
├── docs/superpowers/plans/             # Implementation plan & architecture spec
├── start.bat                           # One-click Windows startup script
├── start.sh                            # One-click Linux/macOS startup script
└── README.md
```

---

## 🔒 License & Free Guarantee

This application is built under an open architectural standard:
- **100% Free Forever** — No subscriptions, no credits, no paywalls.
- Commercial & Personal usage permitted.
