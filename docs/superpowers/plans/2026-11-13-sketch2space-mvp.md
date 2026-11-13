# Sketch2Space: AI 2D Floor Plan to Editable 3D Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, production-grade Sketch2Space application that converts 2D floor plan images (JPG/PNG/WEBP/PDF) into verified 2D architectural geometry and interactive, editable 3D models with synchronized 2D/3D editors, furniture layout, AI assistant, and free 3D/CAD exports.

**Architecture:** 
- **Backend:** FastAPI + Python 3.11 service hosting an AI/Computer Vision pipeline (OpenCV adaptive filtering, morphological thinning, Hough transform, contour vectorization, opening detection, Shapely polygon room discovery) and computational geometry engine producing canonical parametric JSON models.
- **Frontend:** Next-gen Vite + React 18/19 + TypeScript + Tailwind CSS application featuring dark CAD glassmorphism, synchronized 2D Canvas Editor, Three.js / React Three Fiber 3D parametric viewer with PBR materials, dollhouse cutaway, first-person walkthrough, furniture library, and free client/server exports (GLB, OBJ, DXF, SVG, PDF).

**Tech Stack:** 
- Backend: Python 3.11, FastAPI, Uvicorn, OpenCV (`cv2`), NumPy, Shapely, Pydantic v2, PyPDF2/pdf2image.
- Frontend: React, TypeScript, Vite, Tailwind CSS, Lucide React, Three.js, `@react-three/fiber`, `@react-three/drei`, Canvas2D, Zustand, jsPDF.

**Spec:** Referenced from Sketch2Space product requirements and architectural specification (33 modules, 100% Free Forever, dark precision CAD aesthetic, `robin` branch).

## Global Constraints
- **100% Free Forever:** No paywalls, subscription forms, or pricing tiers anywhere in the application.
- **Git Branch Protocol:** Work and commit on branch `robin`. Do not restore deleted legacy files.
- **Design Aesthetic:** Floordesign.ai CAD dark mode, sleek glassmorphism, responsive non-overlapping toolbars, sub-millimeter precision geometry.
- **Units:** Canonical unit is meters (SI), with automatic dual display in $m^2$ and $sqft$.

## Review Focus
1. **Broken or Incomplete Wall Lines:** Thresholded and noisy images can produce gaps; the geometry engine must merge collinear segments within Euclidean tolerance ($\le 15\text{px}$) and snap nearby endpoints.
2. **Door and Window Wall Hosting:** Openings must be topologically attached to the nearest wall centerline and subtracted cleanly from the 3D wall mesh without creating non-manifold geometry.
3. **Room Polygon Extraction:** Enclosed wall loops must form valid, non-self-intersecting Shapely polygons to calculate floor surface meshes and area metrics accurately.
4. **Scale Calibration Fallback:** If the user does not calibrate, the system must provide a sensible default scale ($0.02\text{ m/px}$) with clear visual indication that measurements are estimated.
5. **Bidirectional 2D/3D Synchronization:** Edits made in the 2D CAD canvas must immediately re-render in the 3D viewport without resetting the camera or causing memory leaks.

---

### Task 1: Environment Setup & Project Scaffolding

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/app/main.py`
- Create: `backend/app/schemas.py`
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `.gitignore`
- Test: `backend/tests/test_health.py`

**Interfaces:**
- Consumes: None (root configuration)
- Produces: Backend FastAPI server running on port 8000 (`/health`, `/api/v1`), Frontend Vite dev server running on port 5173.

- [ ] **Step 1: Write backend requirements and health check test**
  Add dependencies: `fastapi`, `uvicorn`, `opencv-python-headless`, `numpy`, `shapely`, `pydantic`, `python-multipart`, `pytest`. Write `test_health.py` verifying `GET /health` returns `{"status": "ok"}`.
- [ ] **Step 2: Run backend test to verify failure**
  Run: `python -m pytest backend/tests/test_health.py`
  Expected: FAIL (server/endpoint not implemented).
- [ ] **Step 3: Implement minimal FastAPI backend in `backend/app/main.py` and schemas in `backend/app/schemas.py`**
  Implement FastAPI app with CORS middleware enabled for `http://localhost:5173` and `/health` route.
- [ ] **Step 4: Run backend health test to verify it passes**
  Run: `python -m pytest backend/tests/test_health.py`
  Expected: PASS.
- [ ] **Step 5: Scaffold Frontend Vite + React + TypeScript + Tailwind setup in `frontend/`**
  Configure `package.json` with React, Three.js, `@react-three/fiber`, `@react-three/drei`, `lucide-react`, `zustand`, `tailwindcss`.
- [ ] **Step 6: Verify frontend build compiles cleanly**
  Run: `cd frontend && npm install && npm run build`
  Expected: Clean build exit code 0.
- [ ] **Step 7: Commit foundation**
  Run: `git add . && git commit -m "feat: scaffold fullstack Sketch2Space foundation"`

---

### Task 2: AI & Computer Vision Floor Plan Extraction Engine

**Files:**
- Create: `backend/app/ai_engine/preprocessor.py`
- Create: `backend/app/ai_engine/wall_detector.py`
- Create: `backend/app/ai_engine/opening_detector.py`
- Create: `backend/app/ai_engine/room_detector.py`
- Create: `backend/app/ai_engine/pipeline.py`
- Test: `backend/tests/test_cv_pipeline.py`

**Interfaces:**
- Consumes: Raw uploaded image bytes (PNG/JPG/WEBP).
- Produces: `FloorPlanDetectionResult` containing detected raw walls (start, end, thickness), doors (center, width, host_wall_id), windows (center, width), and enclosed room polygons.

- [ ] **Step 1: Write failing unit test for CV pipeline**
  Generate a synthetic 2D floor plan binary image (a 400x400 rectangle with walls and a door gap) in `test_cv_pipeline.py` and assert detected walls count $\ge 4$ and detected rooms count $\ge 1$.
- [ ] **Step 2: Run test to verify failure**
  Run: `python -m pytest backend/tests/test_cv_pipeline.py`
  Expected: FAIL.
- [ ] **Step 3: Implement image preprocessor in `backend/app/ai_engine/preprocessor.py`**
  Grayscale conversion, Gaussian blurring, Otsu + adaptive thresholding, morphological closing to fill drafting noise, deskew estimation.
- [ ] **Step 4: Implement wall detector in `backend/app/ai_engine/wall_detector.py`**
  Horizontal & vertical morphological kernel filtering, probabilistic Hough line transform (`cv2.HoughLinesP`), collinear line merging, endpoint snapping within threshold distance.
- [ ] **Step 5: Implement opening detector (doors & windows) in `backend/app/ai_engine/opening_detector.py`**
  Detect wall gaps and circular arc swings (`cv2.HoughCircles` / contour arc detection) to classify door swings vs straight window mullions.
- [ ] **Step 6: Implement room detector in `backend/app/ai_engine/room_detector.py`**
  Find closed inverted wall contours (`cv2.findContours`), convert to Shapely `Polygon`, filter exterior background, compute area and centroid.
- [ ] **Step 7: Wire unified pipeline in `backend/app/ai_engine/pipeline.py`**
  `process_floor_plan(image_bytes: bytes, scale_meters_per_pixel: float = 0.02) -> ArchitecturalModel`
- [ ] **Step 8: Run CV pipeline test to verify it passes**
  Run: `python -m pytest backend/tests/test_cv_pipeline.py`
  Expected: PASS.
- [ ] **Step 9: Commit CV engine**
  Run: `git add backend/app/ai_engine backend/tests && git commit -m "feat: implement CV floor plan vectorization engine"`

---

### Task 3: Computational Geometry & 3D Mesh Generation Engine

**Files:**
- Create: `backend/app/geometry_engine/topology.py`
- Create: `backend/app/geometry_engine/mesh_generator.py`
- Create: `backend/app/geometry_engine/glb_exporter.py`
- Test: `backend/tests/test_geometry_engine.py`

**Interfaces:**
- Consumes: 2D line segments, openings, and room polygons in metric space.
- Produces: 3D parametric meshes (vertices, normals, uvs, indices) for walls with cutouts, floors, ceilings, and exportable GLB/OBJ binary buffers.

- [ ] **Step 1: Write failing test for wall extrusion with opening cutout**
  Test in `test_geometry_engine.py` verifying that a 5-meter wall with a 1-meter door produces non-degenerate 3D mesh triangles and leaves an opening from $y=0$ to $y=2.1$m.
- [ ] **Step 2: Run test to verify failure**
  Run: `python -m pytest backend/tests/test_geometry_engine.py`
  Expected: FAIL.
- [ ] **Step 3: Implement topology cleaner in `backend/app/geometry_engine/topology.py`**
  Snap wall junctions (T-junctions, corner L-junctions), compute clean mitered corner polygon offsets for exterior/interior wall thicknesses.
- [ ] **Step 4: Implement 3D mesh generator in `backend/app/geometry_engine/mesh_generator.py`**
  Generate parametric 3D vertices, normals, and face indices:
  - Walls: Subdivide into left segment, right segment, and lintel above door/window.
  - Floors: Triangulate room polygons using Shapely/earcut.
  - Ceilings: Offset floor polygon vertically to wall height (e.g. 2.8m).
- [ ] **Step 5: Implement GLB / OBJ binary export generator in `backend/app/geometry_engine/glb_exporter.py`**
  Package generated meshes into standard GLTF 2.0 binary (`.glb`) buffer with materials (Wall, Floor, Ceiling, Glass) and OBJ string format.
- [ ] **Step 6: Run geometry test to verify it passes**
  Run: `python -m pytest backend/tests/test_geometry_engine.py`
  Expected: PASS.
- [ ] **Step 7: Commit geometry engine**
  Run: `git add backend/app/geometry_engine backend/tests && git commit -m "feat: implement 3D parametric mesh & GLB generation engine"`

---

### Task 4: FastAPI REST Endpoints & Storage

**Files:**
- Create: `backend/app/api/endpoints.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_api_endpoints.py`

**Interfaces:**
- Consumes: HTTP client requests (multipart file upload, JSON geometry updates, calibration requests).
- Produces: REST APIs:
  - `POST /api/v1/projects`: Create project.
  - `POST /api/v1/projects/{id}/upload`: Upload raster floor plan image.
  - `POST /api/v1/projects/{id}/analyze`: Run AI extraction pipeline with calibration.
  - `POST /api/v1/projects/{id}/calibrate`: Calculate and apply scale ($m/px$).
  - `GET /api/v1/projects/{id}/model`: Retrieve canonical architectural JSON.
  - `PUT /api/v1/projects/{id}/model`: Update architectural JSON from editor.
  - `GET /api/v1/projects/{id}/export/{format}`: Download GLB, OBJ, DXF, SVG.
  - `POST /api/v1/assistant/chat`: Natural-language architectural Q&A.

- [ ] **Step 1: Write test for API workflow**
  In `test_api_endpoints.py`, test creating a project, uploading a sample plan image, running analysis, updating model, and requesting GLB export.
- [ ] **Step 2: Run test to verify failure**
  Run: `python -m pytest backend/tests/test_api_endpoints.py`
  Expected: FAIL.
- [ ] **Step 3: Implement endpoints in `backend/app/api/endpoints.py`**
  Handle in-memory/file storage of projects, execution of CV pipeline, calibration recalculation, DXF generation, and AI assistant query handler.
- [ ] **Step 4: Register router in `backend/app/main.py`**
- [ ] **Step 5: Run API tests to verify pass**
  Run: `python -m pytest backend/tests/test_api_endpoints.py`
  Expected: PASS.
- [ ] **Step 6: Commit backend API**
  Run: `git add backend/ && git commit -m "feat: implement FastAPI project, analysis, and export endpoints"`

---

### Task 5: Frontend State Store & Canonical Model Types

**Files:**
- Create: `frontend/src/types/architectural.ts`
- Create: `frontend/src/store/useFloorPlanStore.ts`
- Create: `frontend/src/services/api.ts`
- Test: `frontend/src/test/store.test.ts`

**Interfaces:**
- Consumes: Backend REST APIs.
- Produces: Reactive Zustand store managing active project, canonical architectural model, UI mode (2D, 3D, Split, Walkthrough), selection state, tool active, undo/redo history.

- [ ] **Step 1: Define canonical TypeScript interfaces in `frontend/src/types/architectural.ts`**
  Define `Wall`, `Door`, `Window`, `Room`, `FurnitureItem`, `FloorPlanProject`, `ScaleCalibration`, `MaterialDefinition`.
- [ ] **Step 2: Implement Zustand store in `frontend/src/store/useFloorPlanStore.ts`**
  Actions: `setProject`, `updateWall`, `addWall`, `deleteWall`, `updateDoor`, `updateRoom`, `addFurniture`, `setMode`, `undo`, `redo`, `setCalibration`.
- [ ] **Step 3: Implement API client in `frontend/src/services/api.ts`**
  Axios / fetch wrappers for backend endpoints with fallback offline sample mode.
- [ ] **Step 4: Commit types and store**
  Run: `git add frontend/src && git commit -m "feat: define architectural types and Zustand project store"`

---

### Task 6: Precision 2D CAD Canvas & Calibration Tool

**Files:**
- Create: `frontend/src/components/canvas2d/Canvas2D.tsx`
- Create: `frontend/src/components/canvas2d/Toolbar2D.tsx`
- Create: `frontend/src/components/canvas2d/CalibrationModal.tsx`
- Create: `frontend/src/components/canvas2d/DetectionOverlay.tsx`

**Interfaces:**
- Consumes: Zustand store, raw floor plan image.
- Produces: Interactive HTML5 Canvas CAD editor supporting zoom, pan, snap-to-grid, wall drawing/dragging, door/window placement, and visual dimension scale calibration.

- [ ] **Step 1: Implement precision grid and coordinate transformation math**
  Viewport transformation: world-to-screen and screen-to-world conversion with zoom (10% to 1000%) and pan.
- [ ] **Step 2: Implement vector rendering in `Canvas2D.tsx`**
  Render underlay image, walls with thickness, door swing arcs, window double-lines, room label tags with area in $m^2$ and $sqft$.
- [ ] **Step 3: Implement CAD interaction tools in `Toolbar2D.tsx`**
  Select, Draw Wall (with angle snapping 0/45/90°), Insert Door, Insert Window, Add Room, Measure Distance.
- [ ] **Step 4: Implement interactive Scale Calibration tool**
  User clicks two reference points on drawing, enters real distance in meters/feet, system automatically computes scale ($px/m$) and updates all geometry.
- [ ] **Step 5: Implement AI Detection Overlay toggle**
  Toggle to inspect raw computer-vision detected edges vs reconstructed clean geometry.
- [ ] **Step 6: Commit 2D CAD canvas**
  Run: `git add frontend/src/components/canvas2d && git commit -m "feat: implement precision 2D CAD canvas and scale calibration tool"`

---

### Task 7: Interactive Three.js / React Three Fiber 3D Architectural Viewer

**Files:**
- Create: `frontend/src/components/viewer3d/BuildingScene.tsx`
- Create: `frontend/src/components/viewer3d/ParametricWallMesh.tsx`
- Create: `frontend/src/components/viewer3d/RoomFloorMesh.tsx`
- Create: `frontend/src/components/viewer3d/ParametricDoorMesh.tsx`
- Create: `frontend/src/components/viewer3d/ParametricWindowMesh.tsx`
- Create: `frontend/src/components/viewer3d/FirstPersonControls.tsx`
- Create: `frontend/src/components/viewer3d/LightingEnvironment.tsx`
- Create: `frontend/src/components/viewer3d/ViewerControls.tsx`

**Interfaces:**
- Consumes: Canonical model from Zustand store.
- Produces: Real-time 3D rendered building with orbit controls, dollhouse cutaway mode, first-person walkthrough, day/night lighting, and click-to-select inspector.

- [ ] **Step 1: Implement `ParametricWallMesh.tsx` with door/window openings**
  Generate 3D extruded geometry for each wall using Three.js `Shape` and `ExtrudeGeometry`, cutting out rectangular voids for doors and windows.
- [ ] **Step 2: Implement `RoomFloorMesh.tsx` and Ceilings**
  Triangulate room boundary coordinates into Three.js 2D Shape, extrude floor slab with PBR materials (Hardwood, Marble, Slate Tile, Polished Concrete).
- [ ] **Step 3: Implement parametric 3D Doors and Windows**
  Render wooden frames, panels, glass transoms, and metallic hardware.
- [ ] **Step 4: Implement `LightingEnvironment.tsx`**
  Directional sun light with soft shadow mapping, ambient fill, and day/night toggle.
- [ ] **Step 5: Implement Camera & View Modes in `ViewerControls.tsx`**
  - Orbit view.
  - Top-down orthographic plan view.
  - Dollhouse view (exterior walls clipped at 1.2m for interior visibility).
  - First-Person Walkthrough (WASD keys + mouse look + collision boundaries).
- [ ] **Step 6: Commit 3D viewer**
  Run: `git add frontend/src/components/viewer3d && git commit -m "feat: implement Three.js parametric 3D architectural viewer"`

---

### Task 8: 3D Furniture Library & Scene Placement

**Files:**
- Create: `frontend/src/components/furniture/FurnitureCatalog.tsx`
- Create: `frontend/src/components/furniture/ParametricFurnitureMesh.tsx`
- Create: `frontend/src/components/furniture/furniturePresets.ts`

**Interfaces:**
- Consumes: Selected room, user drag-and-drop or catalog click.
- Produces: Procedural/parametric 3D furniture models placed in room coordinates (Living Room: Sofas, Coffee Table, TV Console; Bedroom: Queen/King Bed, Wardrobe; Kitchen: Cabinets, Sink; Bathroom: Toilet, Vanity, Bathtub).

- [ ] **Step 1: Define comprehensive procedural furniture catalog in `furniturePresets.ts`**
  Dimensions, categories, default PBR colors/textures, bounding boxes.
- [ ] **Step 2: Implement `ParametricFurnitureMesh.tsx`**
  Render clean procedural 3D furniture models with rotation handle, scaling, and elevation.
- [ ] **Step 3: Implement `FurnitureCatalog.tsx` modal and drawer**
  Filter by category (Living, Bedroom, Dining, Kitchen, Bathroom, Office, Outdoor), click or drag to place into active room.
- [ ] **Step 4: Commit furniture library**
  Run: `git add frontend/src/components/furniture && git commit -m "feat: implement 3D furniture library and placement engine"`

---

### Task 9: Properties Inspector, Material Customizer & AI Assistant

**Files:**
- Create: `frontend/src/components/inspector/PropertiesPanel.tsx`
- Create: `frontend/src/components/inspector/MaterialPicker.tsx`
- Create: `frontend/src/components/assistant/AiAssistantDrawer.tsx`

**Interfaces:**
- Consumes: Selected entity ID (wall, room, door, window, furniture) and project metadata.
- Produces: Real-time property modification panel, material/color swatches, and natural-language AI architectural query drawer.

- [ ] **Step 1: Implement `PropertiesPanel.tsx`**
  Display selected entity properties: wall height/thickness, room name/floor area ($m^2$ and $sqft$), door swing direction, window sill height.
- [ ] **Step 2: Implement `MaterialPicker.tsx`**
  Interactive material palette for wall paints (White plaster, Charcoal, Warm beige) and flooring finishes (Oak herringbone, Carrara marble, Grey porcelain tile).
- [ ] **Step 3: Implement `AiAssistantDrawer.tsx`**
  Interactive chat interface answering architectural queries: calculates total area, room counts, recommends optimal layouts, and changes room finishes via conversational commands.
- [ ] **Step 4: Commit inspector and AI assistant**
  Run: `git add frontend/src/components/inspector frontend/src/components/assistant && git commit -m "feat: implement property inspector, materials customizer, and AI assistant"`

---

### Task 10: Multi-Format Free Export System & Project Management

**Files:**
- Create: `frontend/src/components/export/ExportModal.tsx`
- Create: `frontend/src/utils/exporter.ts`
- Create: `frontend/src/components/dashboard/ProjectDashboard.tsx`
- Create: `frontend/src/components/navbar/Navbar.tsx`
- Create: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: Active canonical architectural model.
- Produces: 100% Free one-click exports (GLB 3D scene, Wavefront OBJ, AutoCAD DXF, Scalable Vector Graphics SVG, Architectural Spec PDF, PNG render).

- [ ] **Step 1: Implement client-side export generator in `frontend/src/utils/exporter.ts`**
  - GLTF/GLB binary export using Three.js `GLTFExporter`.
  - Wavefront OBJ export with `.mtl` material definitions.
  - AutoCAD 2D DXF vector file generator from wall centerlines and room polygons.
  - Clean architectural 2D SVG export.
  - Architectural PDF project report with room schedule and area calculations via jsPDF.
- [ ] **Step 2: Implement `ExportModal.tsx`**
  Clean dark-mode modal displaying all export options with instant download buttons (100% Free Forever, no watermark, no signup wall).
- [ ] **Step 3: Implement `ProjectDashboard.tsx` and Sample Floor Plans**
  Project management screen with sample drawings ready to test (Modern 2BHK, Luxury Villa, Studio Apartment, Hand-Drawn Sketch).
- [ ] **Step 4: Integrate all components into `Navbar.tsx` and `App.tsx`**
  Smooth header navigation, split-view mode (2D on left, 3D on right), full 2D mode, full 3D mode, walkthrough mode.
- [ ] **Step 5: Commit export and dashboard**
  Run: `git add frontend/src && git commit -m "feat: implement free multi-format exports, dashboard, and unified App shell"`

---

### Task 11: End-to-End Verification, Performance & Release

**Files:**
- Test: `backend/tests/test_e2e_pipeline.py`
- Create: `start.bat` / `start.sh`
- Create: `README.md`
- Create: `env.example`

**Interfaces:**
- Consumes: Complete full-stack system.
- Produces: Passing test suites, production build validation, and single-click startup scripts.

- [ ] **Step 1: Run comprehensive backend tests**
  Run: `python -m pytest backend/tests -v`
  Expected: All tests PASS.
- [ ] **Step 2: Run frontend production build**
  Run: `cd frontend && npm run build`
  Expected: Clean build exit code 0.
- [ ] **Step 3: Create one-click startup scripts and updated README.md**
  Provide clear instructions and automated startup scripts.
- [ ] **Step 4: Final verification and commit on `robin` branch**
  Run: `git add . && git commit -m "chore: complete Sketch2Space AI 2D-to-3D application with verified test suite"`

