# 2builders — Full App Engineering Plan

**Document type:** Product, architecture, implementation, and delivery specification  
**Product:** 2builders  
**Version:** 1.0  
**Date:** 16 November 2026  
**Status:** Proposed engineering baseline

---

## 1. Executive summary

2builders is a browser-based home-design platform that takes a user from an idea, sketch, or existing floor plan to an editable 2D plan, a dimensionally coherent 3D building, furnished interiors, exterior design, walkthroughs, and shareable/exportable project files.

The product combines two complementary workflows:

- **Sketch-to-model:** upload a sketch, photo, PDF, or supported CAD drawing; detect architectural elements; correct the detected geometry; build an editable 3D model.
- **Prompt-to-design:** describe the home, site, rooms, style, and constraints; generate one or more editable floor-plan concepts; refine them manually or with AI; convert the selected plan to 3D.

2builders must not be a thin wrapper around image generation. A generated picture is not an editable architectural model. The core asset is a structured building model with explicit dimensions, walls, openings, room boundaries, levels, materials, furniture, and provenance. Images and renders are derived from that model.

**Product principle:** geometry first, visualization second. A beautiful render must not silently change the plan, dimensions, doors, windows, or furniture layout.

### Product goals

1. Make house planning approachable for homeowners without CAD expertise.
2. Preserve precise, editable geometry for designers and builders.
3. Provide a complete 2D-to-3D workflow in one web application.
4. Keep a genuinely useful free tier, with transparent limits and no forced payment for basic editing.
5. Make the application usable on modern desktop browsers and practical on tablets.
6. Make AI outputs reviewable, editable, and clearly labelled when dimensions are estimated.

### Non-goals for the first release

- Replacing a licensed architect, structural engineer, surveyor, or local building approval process.
- Automatically producing permit-ready construction documents.
- Certifying structural, electrical, plumbing, fire, or code compliance.
- Full BIM authoring parity with Revit or Archicad.
- Guaranteeing exact geometry from an unscaled, low-quality photograph.
- Generating a construction-cost quote that represents a contractor's binding offer.

---

## 2. Product reference analysis and differentiation

Reference websites:

- https://sketch2space.com/
- https://floor-plan.ai/

Use these products as workflow references, not as sources for copied UI, text, branding, proprietary models, or assets.

### Capabilities to learn from the references

| Capability | 2builders product requirement |
|---|---|
| Sketch / image upload | Upload PNG, JPG, WebP, and PDF; validate file size and page count |
| Plan recognition | Detect walls, wall junctions, rooms, doors, windows, stairs, labels, and furniture where possible |
| AI floor-plan generation | Generate candidate layouts from natural-language requirements and structured constraints |
| Manual plan editor | Draw, select, move, split, join, resize, dimension, and delete architectural elements |
| Editable 3D | Generate a real scene from the structured plan, not a flattened illustration |
| Interior design | Place furniture, change finishes, configure lighting, and edit room styling |
| Exterior design | Configure facade, roof, doors, windows, exterior materials, site, paths, and landscape |
| Walkthrough | Orbit, first-person navigation, floor isolation, section/cutaway, and saved camera views |
| Rendering | Produce draft previews and higher-quality stills from the same model |
| Export | PNG, PDF, structured project JSON, and 3D exchange format; add CAD/BIM formats in later phases |
| Project management | Save versions, duplicate projects, share read-only links, and recover autosaved work |

### 2builders differentiation

- One coherent project model shared by 2D, 3D, interior, exterior, and export workflows.
- A manual correction step between AI detection and 3D generation.
- Dimension-aware layout generation with explicit hard constraints and soft preferences.
- Metric-first defaults with configurable imperial units.
- Region-aware defaults, including configurable room conventions, units, climate assumptions, and building-code reference packs.
- Clear confidence indicators for AI-detected or inferred geometry.
- A free core editor that does not watermark ordinary user-created plans.

---

## 3. Users and primary journeys

### User segments

1. **Homeowner:** wants to explore a new home or renovation before hiring professionals.
2. **Self-builder:** needs room layouts, dimensions, quantities, and design iterations.
3. **Interior designer:** needs room-level furniture, materials, lighting, and client presentation.
4. **Architect / draftsperson:** needs accurate editable geometry and export to established tools.
5. **Builder / contractor:** needs to understand the design, review dimensions, and create early-stage quantity estimates.
6. **Student / educator:** needs a low-friction learning and visualization tool.

### Journey A — Generate from a description

1. Create a project.
2. Enter plot size, units, desired built-up area, number of floors, rooms, and preferences.
3. Add optional constraints: road frontage, north direction, setbacks, accessibility, parking, budget band, and climate.
4. Generate multiple 2D concepts.
5. Compare room adjacency, area totals, circulation, and constraint violations.
6. Open one concept in the 2D editor.
7. Adjust walls, openings, and room sizes.
8. Approve the plan and build the 3D model.
9. Furnish, style, and render.
10. Save versions and export.

### Journey B — Convert an existing sketch

1. Upload an image or PDF.
2. Select the correct page and crop/rotate/deskew if needed.
3. Set scale using a known dimension or scale marker.
4. Run recognition.
5. Review detected walls, openings, rooms, and uncertain elements.
6. Correct the plan in the 2D editor.
7. Confirm units, wall thickness, ceiling height, and floor level.
8. Generate the 3D model.
9. Edit materials and furniture.
10. Export the model and images.

### Journey C — Design a house manually

1. Start with a blank canvas or template.
2. Set site boundary and drawing scale.
3. Draw exterior and interior walls.
4. Add doors, windows, stairs, and rooms.
5. Add dimensions and annotations.
6. Switch to 3D at any time.
7. Edit materials, furniture, and lighting in the 3D workspace.
8. Save snapshots and export.

### Journey D — Interior / exterior concept design

1. Select a room or exterior elevation.
2. Choose a style, such as contemporary, minimalist, traditional, industrial, or regional vernacular.
3. Set material and colour preferences.
4. Preview deterministic material changes in 3D.
5. Optionally request AI styling suggestions.
6. Render the selected camera.
7. Compare design alternatives without changing the underlying building geometry.

---

## 4. Functional scope

### 4.1 Authentication and onboarding

- Email/password authentication.
- Optional OAuth providers (Google and Apple) after the core flow is stable.
- Email verification and password reset.
- Guest/demo project mode with local persistence, if feasible.
- First-run guided tour.
- Unit selection: metric or imperial.
- Project templates and sample projects.
- Account deletion and project export before deletion.

### 4.2 Project dashboard

- Create, rename, duplicate, archive, and delete projects.
- Search and sort by name, modified date, and project type.
- Project thumbnails and last-edited timestamp.
- Autosave and save-state indicator.
- Version history with named checkpoints.
- Recover from failed AI jobs and interrupted uploads.
- Storage and free-tier usage indicators.

### 4.3 AI floor-plan generator

Inputs:

- Building type: detached house, townhouse, apartment, duplex, villa, small commercial space (later).
- Plot width and depth.
- Target built-up area and floor count.
- Room list and approximate target areas.
- Adjacency preferences (e.g. kitchen near dining).
- Privacy preferences (e.g. bedrooms away from entry).
- Orientation, road edge, north direction, and optional site constraints.
- Parking, balcony, terrace, garden, utility, and storage requirements.
- Style preferences and free-form prompt.

Outputs:

- 2–4 candidate 2D layouts.
- Room polygons and labels.
- Wall centre-lines and thickness.
- Door and window placements.
- Dimensions and room-area schedule.
- Constraint report and warnings.
- Generation metadata and editable model.

Engineering requirements:

- Use a constraint solver / layout algorithm for geometry, not an LLM alone.
- Use an LLM to parse natural language into a validated requirements object and explain alternatives.
- Reject or flag impossible requirements instead of inventing a plausible-looking layout.
- Keep random seed and generation parameters for reproducibility.
- Allow regeneration of selected rooms or zones without discarding the entire plan.
- Validate topology: closed room boundaries where expected, connected circulation, non-overlapping walls, valid openings, and sensible dimensions.

### 4.4 2D floor-plan editor

Core tools:

- Select, pan, zoom, fit-to-view, and grid toggle.
- Draw wall, polyline wall, rectangle room, and freeform room.
- Move, extend, trim, split, merge, and delete walls.
- Snap to grid, endpoint, midpoint, perpendicular, parallel, and alignment guides.
- Add doors, windows, openings, stairs, columns, and generic objects.
- Set wall thickness, height, and construction type.
- Set door/window width, height, sill height, swing direction, and offset.
- Add room names, room areas, dimensions, notes, and reference lines.
- Lock layers and objects.
- Undo/redo with command history.
- Multi-select and duplicate.
- Keyboard shortcuts.
- Contextual property inspector.
- Precision numeric input for dimensions.
- Background image layer with opacity and calibration.
- Layer visibility: walls, openings, furniture, dimensions, labels, site.

Editor behaviour:

- All geometry stored in real-world units, not screen pixels.
- Rendering coordinates derived from model coordinates and camera transform.
- Use a spatial index for hit-testing and snapping.
- Keep geometry operations deterministic and undoable.
- Avoid storing only SVG or canvas pixels as the source of truth.

### 4.5 Sketch / PDF recognition

Supported initial inputs:

- PNG, JPG/JPEG, WebP.
- PDF (rasterize selected page(s) for recognition).
- Later: DXF import/export; DWG support only after a viable licensed/technical conversion route is selected.

Recognition pipeline:

1. Upload and virus/file validation.
2. EXIF orientation correction.
3. PDF page selection and rasterization.
4. Deskew, crop, contrast normalization, and denoising.
5. Scale calibration from a known dimension, scale bar, or user-drawn reference.
6. Semantic segmentation / object detection for walls, doors, windows, stairs, text, dimensions, and furniture.
7. Vectorization of wall masks into centre-lines and boundaries.
8. Junction and topology reconstruction.
9. Room polygon extraction.
10. OCR for room labels and dimension strings.
11. Confidence scoring per detected element.
12. Human review and correction.
13. Persist the recognized result as the canonical editable model.

Important uncertainty rules:

- If scale is unknown, label all derived dimensions as estimated.
- If the source has no readable dimensions, do not claim construction accuracy.
- Show low-confidence detections for user review.
- Preserve the source image as a reference layer.
- Never silently snap uncertain geometry in a way that changes the apparent plan.

### 4.6 3D building generation

The 3D model is generated from the canonical building model.

Building elements:

- Site / ground plane.
- Foundation placeholder (conceptual only in MVP).
- Slabs and floor plates.
- Exterior and interior walls.
- Wall openings.
- Doors and windows with frames and swing/opening behaviour.
- Columns and beams as visual objects (not structural calculations).
- Stairs, landings, and railings.
- Ceilings and roofs.
- Balconies, terraces, porches, and parapets.
- Room surfaces and material assignments.
- Furniture and fixtures.
- Exterior landscaping objects.

Core 3D interactions:

- Orbit, pan, zoom, and fit model.
- First-person walkthrough.
- Walk speed and camera height controls.
- Collision against walls and major objects.
- Select an object and edit its properties.
- Hide/show floors, roof, walls, furniture, and layers.
- Floor-by-floor view.
- Exploded floor view.
- Cutaway / section view.
- Saved camera positions.
- Day/night and sun direction controls.
- Screenshot capture.

### 4.7 Interior design

- Room-by-room editing.
- Furniture library with dimensions and categories.
- Drag/drop placement, rotate, duplicate, align, and delete.
- Snap furniture to walls and floor.
- Collision / overlap warnings.
- Door and circulation clearance warnings.
- Material library: paint, tile, timber, stone, concrete, carpet, glass, metal.
- Custom colour and material parameters.
- Texture scale, rotation, roughness, normal map, and repeat.
- Ceiling, wall, skirting, and floor finish assignment.
- Lighting fixtures and light temperature.
- Saved style presets.
- User-uploaded texture images, subject to file validation and rights confirmation.

Furniture asset requirements:

- Each asset has a stable ID, category, dimensions, origin/pivot, thumbnail, LODs, collision proxy, and licensing metadata.
- Use optimized GLB/glTF assets.
- Prefer instancing repeated objects.
- Load assets on demand.
- Include a small, curated, licensed starter library rather than scraping proprietary catalogs.

### 4.8 Exterior design and site

- Site boundary and optional topography (later).
- Building footprint placement and rotation.
- Facade materials and colours.
- Roof type: flat, gable, hip, shed, and basic custom roof planes.
- Roof pitch and overhang parameters.
- Exterior doors and windows.
- Boundary wall, gate, driveway, parking, path, deck, and patio.
- Garden beds, lawn, trees, and simple planting objects.
- Exterior lighting.
- Daylight, sun direction, sky, and environment settings.
- Front, rear, side, and aerial camera presets.

MVP roof generation can use simple parametric roof types. Complex roof intersections should be explicitly marked as advanced functionality.

### 4.9 AI design assistant

The assistant must operate on structured model data and approved operations.

Example user requests:

- “Make the living room wider by 300 mm.”
- “Show all bedrooms.”
- “Replace the kitchen floor with light oak.”
- “Add a wardrobe to the main bedroom.”
- “What is the area of the ground floor?”
- “Create a contemporary facade using warm stone and timber.”

Architecture:

1. Convert request into a typed action proposal.
2. Validate the action against model constraints and permissions.
3. Show a preview/diff for geometry-changing operations.
4. Apply only after user confirmation where changes are consequential.
5. Record the operation in undo history.
6. Return a concise explanation and any warnings.

Do not allow the LLM to write arbitrary geometry or execute arbitrary code. Use a strict tool/action schema.

### 4.10 Analysis and quantity estimates

- Room area schedule.
- Floor area and approximate built-up area.
- Wall length totals.
- Door and window counts.
- Floor finish area by room/material.
- Paint area estimate with configurable assumptions.
- Tile / plank layout estimate with waste allowance.
- Basic furniture and fixture schedule.
- Export to CSV/XLSX later.

All estimates must display assumptions and exclusions. Do not present them as a construction bill of quantities without validated measurement rules and professional review.

### 4.11 Rendering and presentation

Three quality tiers:

1. **Interactive preview:** real-time WebGL viewport.
2. **High-quality browser render:** improved shadows, environment, anti-aliasing, and post-processing.
3. **Photorealistic render job:** optional server-side renderer or specialized rendering provider.

Render controls:

- Camera / saved view.
- Resolution and aspect ratio.
- Daylight, dusk, and night.
- Sun direction and intensity.
- Environment / sky.
- Quality and sample count where supported.
- Render queue, progress, retry, cancellation, and result history.

Critical consistency rule: AI image enhancement may improve lighting/material appearance, but must not invent or move architectural elements. If using image-to-image rendering, use strict geometry/reference conditioning and clearly label the output as a visualization, not a source model.

---

## 5. Information architecture and screens

### Main navigation

- Dashboard
- New Project
- Templates
- Asset Library
- Help / Tutorials
- Account / Settings

### Project workspace

Suggested layout:

- **Top bar:** project name, save state, undo/redo, units, share, export.
- **Left toolbar:** select, wall, room, door, window, stair, dimension, furniture, site.
- **Main viewport:** 2D plan or 3D scene.
- **Right inspector:** selected object properties, dimensions, materials, constraints.
- **Bottom panel:** floors, layers, warnings, room schedule, job status.
- **Mode switch:** 2D Plan / 3D Model / Interior / Exterior / Render.

### Required screens

1. Landing page.
2. Sign up / login.
3. Dashboard.
4. New project wizard.
5. Prompt-based plan generator.
6. Upload and calibration.
7. Recognition review.
8. 2D editor.
9. 3D editor.
10. Interior design workspace.
11. Exterior / site workspace.
12. Render queue and render viewer.
13. Export dialog.
14. Share / collaboration settings.
15. Account, billing, privacy, and data controls.
16. Help and onboarding.

### Responsive design

- Desktop is the primary precision-editing environment.
- Tablet supports most drawing, selection, and 3D interaction.
- Mobile supports dashboard, project review, walkthrough, and simple edits; do not promise full CAD-like precision on small screens in the first release.
- Use touch-aware hit targets and gesture arbitration for orbit vs. object selection.

---

## 6. Technical architecture

### Recommended stack

| Layer | Recommended technology | Purpose |
|---|---|---|
| Web application | Next.js + React + TypeScript | Routing, app shell, dashboards, server-rendered marketing pages |
| UI | Tailwind CSS + accessible component primitives | Consistent responsive UI |
| 2D editor | Konva or Fabric.js, with custom geometry model | Interactive 2D canvas and object selection |
| 3D engine | Three.js + React Three Fiber | WebGL 3D scene and interactions |
| 3D assets | glTF / GLB | Portable optimized models |
| API | Python FastAPI | Typed APIs, AI/CV integration, geometry services |
| Main database | PostgreSQL | Users, projects, model metadata, jobs, versions |
| Geometry storage | Versioned JSON initially; PostGIS where spatial queries justify it | Canonical building model and spatial operations |
| Object storage | S3-compatible object storage | Uploads, source plans, textures, renders, exports |
| Cache / queue | Redis-compatible service | Job queue, rate limits, transient state |
| Background workers | Python workers (Celery, Dramatiq, or RQ) | Recognition, generation, rendering, export |
| AI orchestration | Provider-agnostic service layer | LLM calls, vision models, embeddings if needed |
| CV / image processing | OpenCV, Pillow, OCR, PyTorch models | Preprocessing, detection, segmentation, OCR |
| Geometry | Shapely / GEOS and custom parametric operations | 2D topology, polygons, offsets, intersections |
| Export | glTF/GLB, PDF, PNG; DXF library after validation | User deliverables |
| Observability | OpenTelemetry + Sentry + structured logs | Tracing, errors, performance |
| Deployment | Docker + managed app platform / cloud services | Reproducible deployment |

The stack is a recommended baseline, not a requirement to use every library. Run a short technical spike before committing to the 2D canvas library and geometry kernel.

### High-level system diagram

```text
Browser (Next.js / React)
  ├── Dashboard and project workspace
  ├── 2D editor
  ├── 3D viewport (Three.js / R3F)
  └── Upload / review / export UI
          |
          | HTTPS / WebSocket or SSE
          v
API Gateway / FastAPI
  ├── Auth and authorization
  ├── Project and model API
  ├── Geometry validation service
  ├── AI orchestration service
  ├── Asset and render API
  └── Job status API
          |
          +------ PostgreSQL
          +------ Object storage
          +------ Redis / job queue
                         |
                         v
                   Worker pool
                    ├── File preprocessing
                    ├── OCR / CV recognition
                    ├── Plan generation
                    ├── Geometry validation
                    ├── 3D conversion / export
                    └── Render jobs
```

### Service boundaries

Start with a modular monolith plus background workers. Do not begin with many microservices. Split services only when scaling, team ownership, or isolation requirements justify it.

Suggested backend modules:

- `auth`
- `users`
- `projects`
- `building_model`
- `geometry`
- `uploads`
- `recognition`
- `plan_generation`
- `assets`
- `materials`
- `rendering`
- `exports`
- `collaboration`
- `billing_limits`
- `audit`

---

## 7. Canonical building model and geometry contract

This is the most important engineering decision.

The 2D editor, 3D renderer, AI assistant, measurement engine, and export system must all read and write the same versioned building model.

### Model principles

- Store dimensions in real-world units; use millimetres internally or metres with a clearly documented precision policy.
- Use stable IDs for every entity.
- Separate geometry from presentation/material metadata.
- Separate source observations from user-confirmed values.
- Keep level elevation and vertical dimensions explicit.
- Use a coordinate convention consistently (e.g. X east/right, Y north/up in plan, Z vertical in 3D; document conversion to Three.js coordinates).
- Keep a model schema version and migrations.
- Use integer or fixed-precision coordinates for robust 2D operations where practical.
- Store generated mesh data as a cache, not as the canonical source of truth.

### Core entities

- `Project`
- `Site`
- `Building`
- `Level`
- `Room`
- `Wall`
- `WallOpening`
- `Door`
- `Window`
- `Stair`
- `Slab`
- `Roof`
- `Column`
- `FurnitureInstance`
- `Fixture`
- `Material`
- `Light`
- `CameraView`
- `Annotation`
- `SourceDocument`
- `RecognitionResult`
- `ModelVersion`
- `GenerationJob`
- `RenderJob`

### Example JSON model (illustrative)

```json
{
  "schemaVersion": "1.0",
  "units": "mm",
  "projectId": "project_123",
  "building": {
    "id": "building_1",
    "levels": [
      {
        "id": "level_ground",
        "name": "Ground Floor",
        "elevation": 0,
        "wallHeight": 3000,
        "slabThickness": 150,
        "rooms": [
          {
            "id": "room_living",
            "name": "Living Room",
            "boundary": [[0, 0], [5000, 0], [5000, 4000], [0, 4000]],
            "targetUse": "living",
            "finish": {
              "floorMaterialId": "material_oak"
            }
          }
        ],
        "walls": [
          {
            "id": "wall_1",
            "start": [0, 0],
            "end": [5000, 0],
            "thickness": 230,
            "height": 3000,
            "kind": "exterior",
            "confidence": 1.0,
            "provenance": "user_confirmed"
          }
        ],
        "openings": []
      }
    ]
  }
}
```

This example is not a complete schema. Implement JSON Schema or Pydantic models, validation rules, and explicit migration tests before using it as a production contract.

### Geometry kernel responsibilities

- Wall centre-line and face construction.
- Wall intersections and junction resolution.
- Polygon offsetting for wall thickness.
- Room boundary extraction.
- Opening placement and wall segmentation.
- Slab generation from room/building footprints.
- Stair and floor-level relationship checks.
- Roof surface generation for supported roof types.
- Collision proxies and clearance zones.
- Area, perimeter, length, and volume calculations.
- Topology validation and repair suggestions.

Avoid ad hoc geometry calculations spread across React components. The geometry engine should be testable independently of the UI.

---

## 8. AI and computer-vision architecture

### 8.1 AI provider abstraction

Create internal interfaces such as:

- `TextModelProvider`
- `VisionModelProvider`
- `ImageGenerationProvider`
- `EmbeddingProvider` (only if semantic asset search is needed)

This avoids coupling the application to one model vendor. Store provider, model version, prompt/template version, latency, token/compute usage, and output validation result for each AI job.

### 8.2 Prompt-to-plan pipeline

```text
User prompt + structured inputs
          |
          v
Requirements parser (LLM)
          |
          v
Validated requirements JSON
          |
          v
Constraint / adjacency solver
          |
          v
Candidate room layout graph
          |
          v
Geometry construction
          |
          v
Topology + dimension validation
          |
          v
Candidate plans + warnings
          |
          v
User selects and edits
```

Use the LLM for interpreting intent and explaining trade-offs. Use deterministic algorithms for dimensions, geometry, adjacency, and validation.

### 8.3 Sketch recognition pipeline

```text
Upload
  -> preprocess image/PDF
  -> identify scale / ask user to calibrate
  -> detect semantic regions
  -> vectorize walls and openings
  -> OCR labels and dimensions
  -> reconstruct topology and rooms
  -> score confidence
  -> user correction UI
  -> canonical model
```

### 8.4 Training and evaluation data

- Use only licensed, public-domain, synthetic, or explicitly consented datasets.
- Record dataset source, license, permitted usage, and preprocessing.
- Create synthetic plans with known geometry for training and regression tests.
- Keep a held-out evaluation set covering hand sketches, scans, low contrast, varied line weights, rotated plans, and different architectural conventions.
- Do not train on private user uploads by default.
- Add explicit opt-in if user data is ever considered for model improvement.

### 8.5 Quality metrics

Recognition:

- Wall detection precision / recall.
- Wall centre-line deviation in calibrated units.
- Opening detection precision / recall.
- Room polygon intersection-over-union.
- OCR accuracy for dimensions and labels.
- Percentage of plans requiring manual correction.
- Confidence calibration.

Plan generation:

- Hard-constraint satisfaction rate.
- Room-area deviation.
- Adjacency satisfaction.
- Connectivity and circulation checks.
- Duplicate / overlapping room rate.
- User acceptance and edit distance.

---

## 9. API design

Use REST for durable resources and asynchronous jobs. Use WebSocket or Server-Sent Events for job progress and collaborative presence where required.

Example endpoints:

```text
POST   /api/v1/projects
GET    /api/v1/projects
GET    /api/v1/projects/{projectId}
PATCH  /api/v1/projects/{projectId}
DELETE /api/v1/projects/{projectId}

POST   /api/v1/projects/{projectId}/versions
GET    /api/v1/projects/{projectId}/versions
POST   /api/v1/projects/{projectId}/restore/{versionId}

POST   /api/v1/projects/{projectId}/uploads
POST   /api/v1/projects/{projectId}/recognition-jobs
GET    /api/v1/jobs/{jobId}
POST   /api/v1/jobs/{jobId}/cancel

POST   /api/v1/projects/{projectId}/plan-generations
POST   /api/v1/projects/{projectId}/model/validate
GET    /api/v1/projects/{projectId}/model
PUT    /api/v1/projects/{projectId}/model

GET    /api/v1/assets
GET    /api/v1/materials
POST   /api/v1/projects/{projectId}/render-jobs
GET    /api/v1/projects/{projectId}/renders

POST   /api/v1/projects/{projectId}/exports
GET    /api/v1/exports/{exportId}
POST   /api/v1/projects/{projectId}/share-links
```

API requirements:

- Version all public APIs.
- Validate every request and response with typed schemas.
- Enforce project ownership and role permissions on every resource.
- Use idempotency keys for upload completion, generation, render, and export requests.
- Use signed, short-lived URLs for object storage.
- Paginate list endpoints.
- Return stable machine-readable error codes.
- Apply rate limits and per-user quotas.
- Never expose storage credentials or model-provider API keys to the browser.

---

## 10. Database and storage design

### Core PostgreSQL tables

- `users`
- `user_settings`
- `projects`
- `project_members`
- `project_versions`
- `building_models`
- `generation_jobs`
- `recognition_jobs`
- `render_jobs`
- `export_jobs`
- `source_documents`
- `assets`
- `materials`
- `share_links`
- `usage_events`
- `audit_events`

### Storage rules

- Original uploaded files are immutable.
- Processed images and thumbnails are separate derived objects.
- Canonical model versions are stored as versioned JSON documents or normalized relational data; choose one canonical strategy and document it.
- Generated GLB meshes are reproducible caches linked to a model version.
- Renders and exports are immutable outputs tied to the exact model version and render settings.
- Use lifecycle policies for temporary files and abandoned uploads.
- Encrypt data in transit and at rest.
- Support user deletion across database records, object storage, caches, and queued jobs.

### Versioning

Each committed model version should contain:

- Model schema version.
- Parent version ID.
- Author / actor.
- Timestamp.
- Change summary.
- Model checksum.
- Source job / operation ID.
- Optional named checkpoint.

For the first release, snapshot-based versioning is simpler and safer than complex collaborative operational transforms. Add granular collaboration only after the model contract stabilizes.

---

## 11. 3D engine implementation details

### Scene construction

Build the scene from canonical entities:

- Extrude wall segments with openings.
- Generate floor slabs from validated footprints.
- Generate ceiling surfaces when enabled.
- Insert door/window frames and panels into wall openings.
- Build stairs from parametric runs and risers.
- Generate supported roof types from roof parameters.
- Add furniture GLBs with transform and material overrides.
- Use physically based materials (PBR).

### Performance

- Use instanced meshes for repeated furniture and vegetation.
- Use level of detail (LOD) for large scenes.
- Frustum cull objects.
- Lazy-load assets and textures.
- Compress GLB assets and textures.
- Use texture atlases where useful.
- Avoid rebuilding the entire scene after every property change.
- Separate scene graph updates from React state updates.
- Use worker threads for expensive geometry operations where supported.
- Set a target frame rate and test on integrated graphics, not only high-end GPUs.

### Coordinate and unit handling

- Keep canonical geometry in a documented world coordinate system.
- Convert to the rendering engine's axis convention at the adapter boundary.
- Use a single unit conversion utility.
- Test scale using known reference objects and dimensions.
- Avoid floating-point drift during repeated edit operations.

### Realism roadmap

MVP:
- PBR materials.
- Ambient and directional lighting.
- Soft shadow approximation.
- Sky / environment map.
- Basic glass, wood, stone, tile, paint, and metal.
- High-quality still screenshot.

Later:
- Higher-quality global illumination or server rendering.
- Better glass/reflection treatment.
- Interior light fixtures and emissive materials.
- Physically based sun/sky.
- Denoising and render queue.
- Realistic vegetation and outdoor environment.
- Video walkthrough export.

---

## 12. Export strategy

### Initial exports

- PNG floor-plan image.
- PDF plan sheet with scale, dimensions, room labels, and title block.
- GLB / glTF for 3D model exchange.
- JSON canonical model for developer / integration workflows.
- CSV room schedule and area summary.

### Later exports

- DXF for 2D CAD exchange.
- DAE / COLLADA if customer demand justifies it.
- IFC only after a proper BIM mapping and validation project.
- XLSX quantity schedule.
- MP4 walkthrough render.

Export correctness requirements:

- Include units and axis convention in metadata where supported.
- Preserve stable IDs where format allows.
- Include material and texture references.
- Validate exported files by re-importing into independent tools.
- Do not claim native SketchUp/Revit compatibility unless tested against those applications and versions.

---

## 13. Security, privacy, and legal

### Security

- Secure password hashing and session management.
- CSRF protection where applicable.
- Strict CORS policy.
- Content Security Policy.
- Input validation and output encoding.
- Upload MIME sniffing, file signature checks, size/page limits, and malware scanning.
- Sandboxed file conversion and document processing.
- Rate limiting and abuse detection.
- Signed download URLs.
- Secrets stored in managed secret storage.
- Least-privilege database and object-storage access.
- Audit logs for account, sharing, and destructive actions.
- Dependency scanning and regular patching.

### Privacy

- Private projects by default.
- Share links are opt-in, revocable, and can expire.
- Do not train on user uploads by default.
- Clear retention and deletion policy.
- Allow users to export their project data.
- Define data residency and subprocessors before launch.
- Provide consent controls for analytics and model improvement.

### Intellectual property

- Do not copy competitor logos, source code, UI artwork, text, proprietary furniture libraries, or model outputs.
- Use original 2builders branding and interface design.
- Verify every 3D asset and texture license.
- Document model-provider terms and output rights.
- Obtain legal review for terms, privacy policy, and user-upload rights.

### Architectural disclaimer

The app is a concept and visualization tool. It does not certify code compliance, structural safety, waterproofing, fire safety, electrical design, plumbing design, or permit readiness. Users must consult qualified local professionals before construction.

---

## 14. Free product and monetization strategy

The product request is for a free web application. Keep the essential workflow free and avoid artificial paywalls on basic editing.

### Suggested free tier

- Create and save projects.
- Manual 2D editor.
- Basic room, wall, door, and window tools.
- Basic 3D conversion.
- Core furniture and material library.
- Browser walkthrough.
- Standard PNG/PDF/GLB exports within reasonable limits.
- Limited AI generation and recognition credits to manage variable compute costs.
- Clear usage counters and fair-use limits.

### Optional paid capabilities later

- Higher AI and rendering quotas.
- Large projects and multi-building projects.
- Advanced CAD/BIM export.
- Team workspaces and collaboration.
- Premium licensed asset packs.
- High-resolution server renders and video.
- API access and batch processing.

Do not advertise “unlimited free AI” unless the compute budget and abuse controls support it. Make limits visible before a user starts an expensive job.

---

## 15. Delivery roadmap

A realistic delivery plan is phased. Dates depend on team size, model quality, and whether AI recognition uses an existing provider/model or a custom-trained system.

### Phase 0 — Discovery and technical spikes (1–2 weeks)

Deliverables:

- Confirm target users and MVP.
- User flows and low-fidelity wireframes.
- Technical decision records.
- Canonical model draft.
- Spike: 2D editor geometry.
- Spike: parametric wall/opening to Three.js.
- Spike: GLB import/export.
- Spike: PDF/image preprocessing.
- Infrastructure and cost estimate.

Exit criteria:

- A wall/room drawn in 2D appears at correct scale in 3D.
- A door opening is represented consistently in both views.
- Model can be saved, loaded, and exported.

### Phase 1 — Foundation and manual editor (3–5 weeks)

Deliverables:

- Authentication.
- Dashboard and project CRUD.
- Autosave and model version snapshots.
- 2D canvas with walls, rooms, openings, dimensions, snapping, undo/redo.
- Basic geometry validation.
- Basic 3D model generation.
- Wall, slab, door, and window editing.
- PNG and JSON export.

Exit criteria:

- A user can manually create a small single-storey house plan and view it in 3D.
- Project survives refresh and can be reopened.
- Core editing operations have automated tests.

### Phase 2 — Useful 3D home designer (3–5 weeks)

Deliverables:

- Furniture and fixture library.
- Material editor.
- Room finish assignment.
- Orbit and first-person walkthrough.
- Floor isolation and cutaway.
- Camera presets and screenshots.
- Basic exterior materials and simple roof types.
- GLB export.

Exit criteria:

- A user can furnish a house, change finishes, walk through it, and export a usable 3D model.

### Phase 3 — AI floor-plan generation (3–5 weeks)

Deliverables:

- Prompt intake form.
- Requirements parser.
- Constraint-based layout generator.
- Candidate plan comparison.
- Editable generated plan.
- Validation and warning report.
- Usage quotas and job tracking.

Exit criteria:

- Generated plans are editable and satisfy configured hard constraints, or clearly report why they cannot.

### Phase 4 — Sketch recognition (4–8+ weeks)

Deliverables:

- Image/PDF upload and page selection.
- Image preprocessing.
- Wall/opening/room detection baseline.
- OCR for labels and dimensions.
- Scale calibration.
- Confidence and review interface.
- Model reconstruction and 3D conversion.
- Evaluation dataset and regression suite.

Exit criteria:

- Supported test plans meet agreed detection metrics.
- Uncertain geometry is visible and correctable.
- No uncalibrated drawing is presented as dimensionally exact.

### Phase 5 — Photorealism and advanced design (4–8 weeks)

Deliverables:

- Improved materials, lighting, and environment.
- High-quality render jobs.
- Exterior scene enhancements.
- Roof improvements.
- AI styling assistant with preview/diff.
- Room schedules and basic quantity takeoffs.

Exit criteria:

- Render output is consistent with the canonical model.
- Geometry-changing AI actions are reviewable and undoable.

### Phase 6 — Production hardening and launch (2–4 weeks)

Deliverables:

- Load and browser compatibility tests.
- Security and privacy review.
- Monitoring and alerting.
- Backup/restore test.
- Billing/usage controls if required.
- Documentation and onboarding.
- Support and feedback workflow.
- Public beta launch.

### Overall estimate

A focused MVP (manual 2D editor + editable 3D + basic furniture/materials + save/export) is approximately **8–12 weeks** for a capable small team, assuming limited scope and reuse of mature libraries. A robust AI-enabled product with dependable sketch recognition and photorealistic rendering is a multi-phase effort, commonly **4–8+ months** depending on team size, model strategy, and quality bar. These are planning estimates, not guarantees.

---

## 16. Suggested team

Lean initial team:

- 1 product-minded full-stack lead.
- 1 frontend / 2D editor engineer.
- 1 3D / graphics engineer.
- 1 backend engineer.
- 1 ML / computer-vision engineer (part-time initially if using managed models).
- 1 product designer (part-time or full-time during early UX).
- QA support, initially shared across engineering.

If the team is smaller, reduce scope rather than attempting all AI, CAD, collaboration, and photorealistic rendering at once.

---

## 17. Testing and acceptance criteria

### Unit tests

- Unit conversions.
- Wall offsets and intersections.
- Polygon area and perimeter.
- Room boundary validation.
- Opening placement.
- Door/window dimensions.
- Slab and roof parameter validation.
- Model schema migrations.
- Permission checks.

### Integration tests

- Create project -> edit plan -> save -> reload.
- Create wall -> add opening -> generate 3D.
- Change wall height -> verify 3D update.
- Add furniture -> save -> reload.
- Upload PDF -> process -> review -> create model.
- Start render -> poll status -> retrieve result.
- Export GLB -> re-import and verify scale.

### End-to-end tests

- New user onboarding.
- Manual floor-plan creation.
- AI plan generation and correction.
- Sketch upload and recognition review.
- Multi-floor project editing.
- Interior design and walkthrough.
- Export and share link.
- Account deletion.

### Performance targets (initial goals)

- Dashboard interactive within 3 seconds on a typical modern broadband connection.
- Basic editor interaction remains responsive at 60 FPS on representative desktop hardware for modest house plans.
- 3D scene initial load under 8 seconds for a defined MVP asset budget.
- Autosave debounced and acknowledged within 2 seconds under normal network conditions.
- Background job progress visible within 2 seconds of state changes.
- No data loss on ordinary refresh or recoverable network interruption.

These are targets to measure, not assumed guarantees. Define representative device, network, and project-size test fixtures.

### Product metrics

- Time from signup to first saved floor plan.
- Time from upload to corrected editable model.
- Percentage of projects that reach 3D.
- Percentage of generated plans accepted or edited.
- Median number of manual corrections per recognized plan.
- Export completion rate.
- Weekly active projects.
- Project reopen rate.
- Crash-free sessions.
- Render success rate and average cost per render.
- Free-tier compute cost per active user.

---

## 18. Operational requirements

- Separate web/API, worker, and rendering workloads.
- Queue long-running recognition, generation, rendering, and export tasks.
- Support retry with bounded attempts and dead-letter handling.
- Make jobs idempotent.
- Provide cancellation where safe.
- Record job inputs, outputs, versions, and error details.
- Add per-user concurrency limits.
- Monitor queue depth, worker memory, CPU/GPU use, job duration, failure rate, and storage.
- Use database backups and periodically test restoration.
- Use object-storage lifecycle rules.
- Add alerting for API error rates, failed jobs, queue backlogs, and abnormal provider costs.
- Provide a feature flag system for risky or expensive capabilities.

---

## 19. Risks and mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| AI plan looks good but geometry is invalid | High | Constraint solver, geometry validator, editable output |
| Sketch has no scale | High | Calibration step; label dimensions as estimated |
| CV misses walls/openings | High | Confidence scores and human correction UI |
| 3D scene differs from 2D | High | Single canonical model and geometry regression tests |
| Browser performance degrades | High | LOD, instancing, lazy loading, scene profiling |
| Photorealistic render invents details | High | Geometry-conditioned workflow and explicit visualization label |
| AI / rendering costs exceed free-tier budget | High | Quotas, queue limits, caching, cost telemetry |
| CAD export interoperability issues | Medium | Validate with target applications and fixture files |
| Furniture licensing problems | High | Licensed, original, or user-provided assets with provenance |
| Scope becomes too broad | High | Phase gates; ship manual 2D-to-3D before advanced AI |
| Users mistake concept for construction drawings | High | Persistent disclaimers and professional review guidance |

---

## 20. Repository structure

Suggested monorepo:

```text
2builders/
├── apps/
│   ├── web/                    # Next.js frontend
│   └── api/                    # FastAPI application
├── workers/
│   ├── recognition/             # Image/PDF recognition jobs
│   ├── generation/              # Prompt-to-plan jobs
│   ├── rendering/               # Render jobs
│   └── exports/                 # PDF/GLB/DXF export jobs
├── packages/
│   ├── building-model/          # Shared model types and schema
│   ├── geometry/                # Geometry kernel and validators
│   ├── editor-2d/               # 2D editor components
│   ├── viewer-3d/               # Three.js scene and controls
│   ├── ui/                      # Shared UI primitives
│   └── api-client/              # Typed API client
├── assets/
│   ├── furniture/
│   ├── materials/
│   └── environments/
├── infra/
│   ├── docker/
│   ├── deployment/
│   └── monitoring/
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── model-schema/
│   └── decisions/
├── tests/
│   ├── fixtures/
│   ├── geometry/
│   └── e2e/
├── .env.example
├── docker-compose.yml
├── README.md
└── plan.md
```

Keep the model schema package independent from React and Three.js. The backend and frontend should validate against the same published schema.

---

## 21. Environment and deployment strategy

### Local development

- Docker Compose for PostgreSQL, Redis, object storage emulator, API, and workers.
- Web app runs with hot reload.
- Seed demo user and sample house project.
- `.env.example` documents required variables without real secrets.
- Fixtures include a simple plan, multi-room plan, two-floor plan, and difficult scanned plan.

### Staging

- Separate database and object bucket.
- Test AI provider credentials and quotas.
- Synthetic test data only.
- Preview deployments for frontend changes.
- Automated migrations and smoke tests.

### Production

- Managed PostgreSQL with backups.
- Private worker networking.
- Object storage with encryption and lifecycle policies.
- CDN for static assets and public thumbnails.
- Separate queue priorities for interactive and batch jobs.
- Centralized logs, traces, and error monitoring.
- Rate limits and budget alarms.
- Tested rollback and restore procedure.

---

## 22. Definition of MVP

The first public MVP should contain only the capabilities needed to prove the central value proposition.

### Must ship

- Landing page and authentication.
- Project dashboard.
- Manual 2D floor-plan editor.
- Walls, rooms, doors, windows, dimensions, snapping, undo/redo.
- Canonical versioned building model.
- Basic single-storey 3D generation.
- 3D orbit, zoom, and walkthrough.
- Basic furniture placement.
- Basic materials and floor finishes.
- Autosave and project reopen.
- PNG, PDF, and GLB export.
- Responsive project review.
- Usage limits, error reporting, and privacy controls.

### Should ship after MVP

- AI text-to-floor-plan generation.
- Sketch/PDF recognition.
- Multi-floor buildings.
- Exterior and roof designer.
- Photorealistic server rendering.
- AI design assistant.
- Quantity takeoffs.
- Collaboration and team workspaces.
- DXF / IFC workflows.

### Explicit MVP acceptance test

A new user can open 2builders, create a project, draw a dimensioned 3-bedroom single-storey floor plan, add doors and windows, switch to a correctly scaled 3D model, furnish the living room and bedrooms, change floor materials, walk through the model, save it, reopen it, and export a GLB plus a dimensioned PDF.

If this test is not reliable, do not add more AI features yet.

---

## 23. First 10 engineering tasks

1. Create the monorepo and local Docker development environment.
2. Define and validate the first canonical building-model schema.
3. Implement unit conversion and geometry primitives.
4. Build a 2D canvas proof of concept with walls, snapping, and dimensions.
5. Implement wall extrusion and openings in the 3D viewer.
6. Add project persistence and model version snapshots.
7. Add undo/redo using command-based model operations.
8. Implement furniture placement and basic PBR materials.
9. Implement GLB and PDF export.
10. Run the MVP acceptance test and benchmark a representative house model.

---

## 24. Key technical decisions to make before coding

| Decision | Recommended default | Decision trigger |
|---|---|---|
| Canonical units | Millimetres | Adopt another unit only with explicit precision and conversion rules |
| 2D rendering | Konva or custom SVG/canvas layer | Spike snapping, selection, large plans, and geometry editing |
| Geometry kernel | Shapely/GEOS in backend plus shared client validation | Need consistent operations and robust topology |
| 3D engine | Three.js / React Three Fiber | Browser-first interactive 3D |
| Model persistence | Versioned JSON snapshots in PostgreSQL initially | Normalize only when query patterns require it |
| Job system | Redis-backed Python worker queue | Long-running CV, generation, and render jobs |
| AI generation | LLM parser + deterministic layout engine | Do not use image generation as the geometry source |
| Sketch recognition | Evaluate pretrained CV models before custom training | Build custom dataset only after baseline evaluation |
| Rendering | Browser preview first; server renderer later | Add costly photorealism only after usage validation |
| Collaboration | Snapshot versions first | Add real-time collaboration after model operations stabilize |

---

## 25. Product quality principles

1. **Never confuse an image with a model.** A rendered picture is not editable geometry.
2. **Never claim unknown dimensions are exact.** Show source, confidence, and calibration state.
3. **Never let AI silently destroy user work.** Preview, confirm, undo, and version every consequential operation.
4. **Never duplicate business logic across 2D and 3D.** Both must use the same canonical model.
5. **Never make the free product unusable.** Basic manual planning, viewing, saving, and ordinary exports must remain useful.
6. **Never claim construction readiness without professional validation.**
7. **Optimize the core workflow before expanding feature count.**

---

## 26. Reference links

The following links informed the product capability analysis. They are references for feature discovery, not implementation specifications or permission to copy proprietary work.

- Sketch2Space: https://sketch2space.com/
- Sketch2Space documentation: https://sketch2space.com/docs/
- Sketch2Space sketch-to-3D workflow: https://sketch2space.com/docs/convert-sketch-to-3d/
- Sketch2Space multi-floor workflow: https://sketch2space.com/docs/multi-floor-buildings/
- Sketch2Space pricing / free-tier reference: https://sketch2space.com/pricing
- Floor Plan AI: https://floor-plan.ai/
- Floor Plan AI help / workflow: https://floor-plan.ai/help
- FloorPlan AI feature overview: https://www.floorplan-ai.com/features

---

## Final recommendation

Build 2builders in this order:

**Manual 2D editor → canonical geometry model → editable 3D house → furniture and materials → save/export → AI floor-plan generation → sketch recognition → photorealistic rendering → advanced collaboration and BIM.**

This order reduces the largest technical risk: building impressive AI demos that cannot produce dependable, editable architectural geometry.

The first milestone is not “AI can draw a house.” It is:

**A user can create or correct a dimensionally coherent floor plan, and 2builders can turn that exact plan into a consistent, editable 3D house.**
