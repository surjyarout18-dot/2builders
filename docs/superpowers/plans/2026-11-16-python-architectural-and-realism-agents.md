# Python AI Architectural & Realism Agents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two cooperating Python AI agents (`ArchitecturalAgent` and `RealismAgent`) that convert 2D floor plans into fully editable, dimensionally accurate, and photorealistic 3D houses with PBR materials, interior furniture staging, lighting, and a Blender rendering bridge.

**Architecture:** A two-agent decoupled architecture where the **Architectural Agent** deduces wall geometry, openings, and space topology from floor plans into an editable parametric model (`ArchitecturalModel`), and the **Realism Agent** applies PBR materials, interior layout rules, natural/artificial lighting, and Blender rendering assets under a strict **Geometry Invariance Constraint** (visual realism never mutates structural geometry without permission).

**Tech Stack:** Python 3.11+, FastAPI, OpenCV, Shapely 2.0+, NumPy, Trimesh, Blender Python API (bridge), React 18, Three.js / React Three Fiber.

**Spec:** User architecture specification for 2builders AI engine (Vision, OCR, Geometry, Architectural reasoning, Realistic 3D house pipeline with editable model preservation).

---

## Global Constraints

- **Editable Geometry First:** The model must always remain 100% editable parametric geometry (not static baking or AI hallucinations).
- **Geometry Invariance:** The Realism Agent must NEVER alter wall coordinates (`start`, `end`), room boundaries, door/window locations, or ceiling heights.
- **100% Free Forever:** No proprietary paid APIs or external credit-gated cloud services required for core operation.
- **Dual Unit Support:** Metric ($m, m^2$) as primary engineering reference with Imperial ($ft, sqft$) conversion.
- **Zero Console Errors:** All frontend integration and backend endpoints must pass tests with zero regressions.

---

## Review Focus

1. **Geometry Drift:** Realism Agent modifying wall coordinates or ceiling heights during styling (prevented by immutable validation check).
2. **Non-Manifold Polygons:** Complex hand-drawn floor plans creating self-intersecting room polygons (resolved with Shapely `buffer(0)` and polygon validation).
3. **Missing Openings In Walls:** Door/window locations falling outside wall segments (snapped to nearest collinear wall segment).
4. **Furniture Collision:** Furnishings placed across doorways or blocking stair entry (verified via bounding box clearance checks).
5. **Headless Blender Graceful Fallback:** If Blender binary is absent on host, fallback to WebGL Three.js PBR rendering and export script.

---

## Task Decomposition

### Task 1: Architectural Geometry & Space Topology Engine (`ArchitecturalAgent`)

**Files:**
- Create: `backend/app/agents/architectural_agent.py`
- Create: `backend/app/agents/space_topology.py`
- Test: `backend/tests/test_architectural_agent.py`

**Interfaces:**
- Consumes: Raw floor plan image bytes or existing `ArchitecturalModel`
- Produces: `ArchitecturalAgent.process_plan(image_bytes: bytes, scale_m_per_px: float) -> ArchitecturalModel` with classified walls (exterior $0.25\text{ m}$, interior $0.15\text{ m}$), snapped doors/windows, and closed room polygons.

- [ ] **Step 1: Write failing test for Architectural Agent**

```python
def test_architectural_agent_wall_classification_and_topology():
    agent = ArchitecturalAgent()
    # Synthetic 10m x 8m room with partition
    model = agent.synthesize_from_walls([
        {"start": {"x": 0, "z": 0}, "end": {"x": 10, "z": 0}},
        {"start": {"x": 10, "z": 0}, "end": {"x": 10, "z": 8}},
        {"start": {"x": 10, "z": 8}, "end": {"x": 0, "z": 8}},
        {"start": {"x": 0, "z": 8}, "end": {"x": 0, "z": 0}},
        {"start": {"x": 5, "z": 0}, "end": {"x": 5, "z": 8}},  # partition
    ])
    assert len(model.floors[0].walls) == 5
    ext_walls = [w for w in model.floors[0].walls if w.wall_type == 'exterior']
    int_walls = [w for w in model.floors[0].walls if w.wall_type == 'interior']
    assert len(ext_walls) == 4
    assert len(int_walls) == 1
    assert ext_walls[0].thickness >= 0.20
    assert int_walls[0].thickness <= 0.15
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_architectural_agent.py -v`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `ArchitecturalAgent` and `SpaceTopologyEngine` in `backend/app/agents/`**

Implement topological graph construction, wall thickness classification, cycle basis room extraction using Shapely polygonization, and opening alignment.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_architectural_agent.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/agents/architectural_agent.py backend/app/agents/space_topology.py backend/tests/test_architectural_agent.py
git commit -m "feat(ai-agent): implement ArchitecturalAgent for wall classification and space topology"
```

---

### Task 2: Realism Agent (`RealismAgent`) & Geometry Invariance Guard

**Files:**
- Create: `backend/app/agents/realism_agent.py`
- Create: `backend/app/agents/material_selector.py`
- Create: `backend/app/agents/interior_decorator.py`
- Create: `backend/app/agents/lighting_designer.py`
- Test: `backend/tests/test_realism_agent.py`

**Interfaces:**
- Consumes: `ArchitecturalModel`, `style: str = "contemporary_warm"`
- Produces: `RealismAgent.apply_realism(model: ArchitecturalModel, style: str) -> ArchitecturalModel` with PBR materials, contextual furniture clusters, light fixtures, and exterior landscape while asserting structural equality.

- [ ] **Step 1: Write failing test for Realism Agent and Invariance Guard**

```python
def test_realism_agent_enhances_without_mutating_geometry():
    agent = RealismAgent()
    base_model = get_sample_villa()
    original_walls = [(w.id, w.start.x, w.start.z, w.end.x, w.end.z) for w in base_model.floors[0].walls]
    
    realism_model = agent.apply_realism(base_model, style="scandinavian_modern")
    
    # Verify geometry invariance
    new_walls = [(w.id, w.start.x, w.start.z, w.end.x, w.end.z) for w in realism_model.floors[0].walls]
    assert original_walls == new_walls
    
    # Verify realistic material assignments
    assert realism_model.floors[0].rooms[0].floor_material in ["hardwood_oak", "parquet_herringbone", "concrete_polished", "tile_marble"]
    assert len(realism_model.floors[0].furniture) > 0
    assert realism_model.building.roof.visible is True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_realism_agent.py -v`
Expected: FAIL

- [ ] **Step 3: Implement `RealismAgent` and sub-modules**

Implement:
1. `material_selector.py`: Maps room types to cohesive PBR palettes (e.g. living room $\rightarrow$ herringbone oak & slate accent; bathroom $\rightarrow$ polished marble & matte black fixtures; exterior $\rightarrow$ cedar cladding & mineral stucco).
2. `interior_decorator.py`: Parametric clearance rules for seating, beds, dining sets, and bathroom fixtures with doorway clearance bounding boxes.
3. `lighting_designer.py`: Natural sun orientation, window daylight penetration zones, and artificial warm recessed downlights.
4. `geometry_guard.py`: Immutable assertion verifying no coordinate modification.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_realism_agent.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/agents/realism_agent.py backend/app/agents/material_selector.py backend/app/agents/interior_decorator.py backend/app/agents/lighting_designer.py backend/tests/test_realism_agent.py
git commit -m "feat(ai-agent): implement RealismAgent with PBR materials, furniture staging and geometry guard"
```

---

### Task 3: Blender Headless Rendering Bridge & Standalone Script Generator

**Files:**
- Create: `backend/app/agents/blender_bridge.py`
- Test: `backend/tests/test_blender_bridge.py`

**Interfaces:**
- Consumes: `ArchitecturalModel`
- Produces: `generate_blender_python_script(model: ArchitecturalModel) -> str` (valid standalone Python script for Blender 3.x/4.x containing camera setup, Cycles path-tracer settings, Principled BSDF shader networks, and lights).

- [ ] **Step 1: Write failing test for Blender Script Generation**

```python
def test_blender_script_generation():
    model = get_sample_villa()
    script = generate_blender_python_script(model)
    assert "import bpy" in script
    assert "CYCLES" in script or "BLENDER_EEVEE" in script
    assert "Principled BSDF" in script
    assert "bpy.ops.render.render" in script
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_blender_bridge.py -v`
Expected: FAIL

- [ ] **Step 3: Implement `blender_bridge.py`**

Generate a self-contained, executable Blender Python script that:
- Wipes default cube.
- Constructs wall solids, floor slabs, doors, windows, and roof geometry.
- Builds PBR material node trees (Diffuse, Roughness, Normal, Metallic).
- Configures Sun light with HDRI sky atmosphere + interior warm point lights.
- Positions architectural 35mm isometric / eye-level camera.
- Sets up 1080p rendering with denoiser.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_blender_bridge.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/agents/blender_bridge.py backend/tests/test_blender_bridge.py
git commit -m "feat(blender): implement automated Blender Python scene generator"
```

---

### Task 4: API Endpoints for Agent Pipeline & Blender Export

**Files:**
- Modify: `backend/app/api/endpoints.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_agent_api.py`

**Interfaces:**
- `POST /api/v1/agents/enhance-realism`: Takes project model and style, returns enhanced `ArchitecturalModel`.
- `POST /api/v1/projects/{id}/export/blender-script`: Returns downloadable `.py` file for Blender.

- [ ] **Step 1: Write failing API test**

```python
def test_agent_api_endpoints(client):
    res = client.post("/api/v1/agents/enhance-realism", json={
        "project_id": "test_proj",
        "style": "contemporary_warm"
    })
    assert res.status_code == 200
    data = res.json()
    assert "floors" in data
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_agent_api.py -v`
Expected: FAIL

- [ ] **Step 3: Implement endpoints in `backend/app/api/endpoints.py`**

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_agent_api.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/endpoints.py backend/tests/test_agent_api.py
git commit -m "feat(api): add endpoints for realism agent and blender export"
```

---

### Task 5: Frontend Realistic 3D Viewer & Realism Agent Controls

**Files:**
- Create: `frontend/src/components/viewer3d/RealismControlsModal.tsx`
- Modify: `frontend/src/components/viewer3d/LightingEnvironment.tsx`
- Modify: `frontend/src/components/viewer3d/RoomFloorMesh.tsx`
- Modify: `frontend/src/components/viewer3d/ParametricWallMesh.tsx`
- Modify: `frontend/src/components/navbar/Navbar.tsx`
- Modify: `frontend/src/services/api.ts`
- Test: `frontend/test-landing-and-plan.mjs`

**Interfaces:**
- Frontend trigger: "AI Realism Agent" button in Navbar & 3D viewport.
- Applies realistic PBR texture mapping, ambient occlusion, sun elevation slider, and one-click "Download Blender Scene Script (.py)".

- [ ] **Step 1: Write e2e test step in Playwright suite**

Verify clicking "AI Realism Agent", selecting style, applying realism, and confirming PBR materials without altering wall dimensions.

- [ ] **Step 2: Implement UI components & Three.js PBR shader updates**

Enhance Three.js materials with normal mapping, roughness gradients, physical glass transmission, and sun elevation shadow maps.

- [ ] **Step 3: Run Playwright test suite to verify 0 console errors**

Run: `node frontend/test-landing-and-plan.mjs`
Expected: PASS (0 errors)

- [ ] **Step 4: Production build check**

Run: `cd frontend; npm run build`
Expected: PASS with code 0

- [ ] **Step 5: Commit & Dual Branch Push (`main` and `robin`)**

```bash
git add frontend/
git commit -m "feat(frontend): integrate Realism Agent PBR shaders, sun controls and Blender script export"
git push origin main
git checkout robin; git merge main --ff-only; git push origin robin; git checkout main
```

---

## Plan Review & Approval Request

This plan establishes:
1. **Decoupled Two-Agent Architecture**: `ArchitecturalAgent` for structural geometry and `RealismAgent` for visual realism.
2. **Guaranteed Editable 3D Models**: Preserves the parametric `ArchitecturalModel` at all times.
3. **Headless Blender Integration**: Generates standalone production Blender scripts for high-end offline rendering, paired with browser-native Three.js PBR rendering.
4. **Strict Safety Constraint**: Realism Agent cannot modify wall coordinates, room dimensions, or structural layout.
