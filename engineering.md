# Engineering Specification --- No-AI Floor-Plan-to-3D Application

**Architecture decision:** Automatic extraction using deterministic
image processing and geometry algorithms. No AI, machine learning,
neural networks, hosted inference APIs, or paid third-party APIs are
used.

**Product objective:** Let a user upload a raster floor plan,
automatically extract a first-pass 2D plan using conventional computer
vision, correct the result in an editor, and generate an editable 3D
model.

## 1. Product principles

1.  **No AI at runtime or build time.** Do not use LLMs,
    image-generation systems, ML classifiers, neural networks,
    embeddings, or cloud AI APIs.
2.  **Free and open-source software first.** Use permissively or openly
    licensed libraries; verify each dependency's current license before
    distribution.
3.  **Deterministic processing.** The same image and settings should
    produce repeatable extraction results.
4.  **Human-correctable output.** Automatic extraction is a starting
    point, not a promise of perfect interpretation.
5.  **Local-first operation.** The core workflow should run on the
    user's device or self-hosted server without paid external services.
6.  **Editable geometry.** The final model must retain walls, openings,
    room boundaries, and dimensions as structured objects rather than a
    single baked mesh.

## 2. Scope

### In scope

-   Upload PNG, JPEG, and optionally TIFF floor-plan images.
-   Image preview, crop, rotate, deskew, contrast and threshold
    controls.
-   Scale calibration from a known dimension or user-entered drawing
    scale.
-   Automatic wall-line and wall-region extraction using OpenCV
    operations.
-   Candidate corner, junction, opening, and enclosed-region detection.
-   Conversion of detected geometry into editable 2D entities.
-   Manual correction tools for walls, corners, openings, and room
    boundaries.
-   3D generation from corrected 2D geometry.
-   Materials, wall height, floor thickness, door/window dimensions, and
    basic camera controls.
-   Export to GLB and OBJ; optional STL export for mesh-oriented
    workflows.
-   Project save/load and reproducible processing settings.

### Out of scope for the initial release

-   Semantic room understanding beyond geometric heuristics and user
    labels.
-   Guaranteed recognition of every architectural symbol or drawing
    convention.
-   Structural engineering, code compliance, quantity surveying, or
    construction-document certification.
-   Cloud collaboration, accounts, billing, and mobile-native
    applications.
-   AI-based recognition or generative design.

## 3. User workflow

1.  User creates a project and uploads a floor-plan image.
2.  The app normalizes orientation and provides crop/deskew controls.
3.  User calibrates scale using a known dimension or enters a scale
    ratio.
4.  User selects extraction settings and runs deterministic processing.
5.  The app overlays candidate walls, centerlines, corners, openings,
    and enclosed regions on the source image.
6.  User reviews confidence-like *heuristic scores* and corrects
    mistakes. These scores are geometric diagnostics, not probabilities
    from a trained model.
7.  The corrected 2D plan becomes the canonical source of truth.
8.  User sets wall height, thickness, floor thickness, door/window
    heights, and material defaults.
9.  The app generates a 3D model and lets the user inspect it.
10. User saves the project or exports GLB/OBJ/STL.

## 4. System architecture

``` text
Browser (React + Vite)
  ├── Image import / preprocessing controls
  ├── 2D plan editor (Konva)
  ├── 3D viewport (Three.js)
  └── Project and export UI
          │ REST / JSON
          ▼
Python API (FastAPI)
  ├── Project and file endpoints
  ├── Extraction orchestration
  ├── Scale and geometry validation
  └── Model/export endpoints
          │
          ▼
Deterministic processing modules
  ├── OpenCV preprocessing
  ├── Line / contour / morphology analysis
  ├── Geometry graph construction
  ├── Polygonization and topology repair (Shapely)
  └── Mesh generation / export (Trimesh)
          │
          ▼
SQLite (MVP) + local filesystem
```

For a single-user/local deployment, processing can run in-process
without Redis or a separate worker. For a multi-user self-hosted
deployment, introduce a queue only when jobs are demonstrably
long-running or concurrent.

## 5. Recommended stack

  -----------------------------------------------------------------------
  Layer                   Technology              Responsibility
  ----------------------- ----------------------- -----------------------
  Web UI                  React + Vite +          Application shell and
                          TypeScript              state

  2D editor               Konva.js / react-konva  Image overlay and
                                                  vector editing

  3D viewer               Three.js                Interactive rendering

  API                     Python + FastAPI        Project, processing,
                                                  and export APIs

  Image processing        OpenCV                  Thresholding,
                                                  morphology, edges,
                                                  contours, Hough lines

  Geometry                Shapely                 Polygon operations,
                                                  unions, intersections,
                                                  validity

  Mesh processing         Trimesh                 Extrusion, mesh
                                                  inspection, GLB/OBJ/STL
                                                  export

  Validation              Pydantic                Request and project
                                                  schema validation

  Database                SQLite initially;       Project metadata
                          PostgreSQL if needed    

  Storage                 Local filesystem        Source images and
                                                  project assets

  Tests                   pytest + Vitest +       Unit, integration, and
                          Playwright              browser tests
  -----------------------------------------------------------------------

Do not add PyTorch, TensorFlow, ONNX Runtime, hosted vision APIs, or
other ML dependencies.

## 6. Automatic extraction pipeline (non-AI)

### 6.1 Input normalization

-   Validate file type, file size, dimensions, and decode success.
-   Preserve the original image unchanged.
-   Create a working copy in a known color space.
-   Detect orientation only through deterministic image heuristics;
    always allow manual rotate/deskew.
-   Crop to the drawing region using user selection or simple
    border/foreground heuristics.

### 6.2 Preprocessing

-   Convert to grayscale.
-   Apply optional median or bilateral denoising.
-   Estimate background and normalize contrast.
-   Generate one or more binary masks using Otsu thresholding and
    adaptive thresholding.
-   Allow user adjustment of threshold and polarity.
-   Use morphological opening/closing to remove specks and bridge small
    gaps.
-   Keep preprocessing parameters in the project so results can be
    reproduced.

### 6.3 Wall candidate extraction

Use several deterministic signals rather than a single detector: -
Connected components and contour analysis on the binary mask. -
Morphological kernels at multiple orientations to identify long
horizontal and vertical strokes. - Canny edge detection for boundary
candidates. - Probabilistic Hough transform for straight-line
candidates. - Parallel-line pairing and thickness estimation to identify
likely double-line walls. - Skeletonization or medial-axis
approximation, where useful, to estimate wall centerlines. - Merge
near-collinear segments within configurable angular and distance
tolerances.

The algorithm should support arbitrary orientation eventually, but the
MVP may prioritize orthogonal and near-orthogonal plans with a
configurable angle tolerance.

### 6.4 Geometry graph construction

-   Convert line segments to a graph of vertices and edges.
-   Snap nearby endpoints within a scale-aware tolerance.
-   Split segments at intersections.
-   Remove duplicate and near-zero-length segments.
-   Resolve small gaps only when a deterministic rule and user-visible
    setting justify the connection.
-   Preserve original pixel coordinates alongside calibrated world
    coordinates.

### 6.5 Wall representation

Support two representations: 1. **Wall region:** polygonal area
extracted from thick raster strokes. 2. **Wall centerline plus
thickness:** line segments with a thickness attribute.

Use centerline-plus-thickness as the canonical editable wall
representation where reliable. Retain region polygons as evidence and
for irregular wall shapes. Do not silently discard ambiguous geometry.

### 6.6 Openings

Doors and windows are difficult to distinguish reliably without semantic
recognition. Use geometric heuristics only: - Find gaps in otherwise
continuous wall candidates. - Detect short perpendicular strokes, arcs,
and repeated parallel lines as possible symbols. - Compare gap width
against configurable door/window width ranges. - Present candidates as
**unclassified openings** by default. - Let the user assign door,
window, or generic opening and set dimensions. - Never claim a symbol
has been semantically recognized unless it is explicitly confirmed by
the user.

### 6.7 Room candidate extraction

-   Build a planar graph from wall boundaries.
-   Polygonize closed linework using Shapely.
-   Filter tiny sliver polygons and obvious artifacts using configurable
    area and shape thresholds.
-   Treat enclosed polygons as candidate spaces, not guaranteed rooms.
-   Let users merge, split, label, or discard candidates.
-   Handle open-plan layouts and incomplete boundaries without inventing
    walls.

### 6.8 Diagnostics and user correction

Display: - Source image and processed overlay. - Wall candidates,
centerlines, estimated thickness, junctions, gaps, and candidate
spaces. - Algorithm settings and processing warnings. - Heuristic
quality indicators such as segment length, continuity, and topology
validity. - A review checklist for disconnected endpoints, open
contours, duplicate walls, and unclassified openings.

A user must be able to undo/redo edits and rerun extraction without
losing the original image or manually confirmed geometry. Reruns should
create a new extraction revision.

## 7. Scale calibration and coordinate system

-   Store image geometry in pixel coordinates.
-   Require calibration before presenting physical dimensions or
    generating dimensionally meaningful exports.
-   Calibration options: user selects two points and enters their
    real-world distance; optionally enter a drawing scale.
-   Store `pixels_per_meter` (or a clearly documented unit conversion)
    and calibration provenance.
-   Use a single canonical world coordinate system, e.g. X/Y in meters
    for the plan and Z for elevation.
-   Define rounding tolerances in world units and convert to pixel
    tolerances through calibration.
-   If scale is unknown, allow a visually proportionate 3D preview but
    label dimensions as uncalibrated.

## 8. Canonical project data model

Keep source raster, extraction output, user edits, and generated mesh
separate. Suggested JSON shape:

``` json
{
  "schema_version": "1.0",
  "project": {
    "id": "project-id",
    "name": "Untitled plan",
    "units": "m",
    "pixels_per_meter": 120.0
  },
  "source": {
    "asset_id": "source-image",
    "width_px": 2400,
    "height_px": 1800,
    "rotation_degrees": 0
  },
  "settings": {
    "threshold_mode": "adaptive",
    "threshold_value": 0,
    "wall_angle_tolerance_degrees": 8,
    "snap_tolerance_m": 0.03
  },
  "walls": [
    {
      "id": "wall-1",
      "start": [0.0, 0.0],
      "end": [4.0, 0.0],
      "thickness": 0.15,
      "height": 2.7,
      "kind": "interior",
      "source": "automatic",
      "status": "reviewed"
    }
  ],
  "openings": [
    {
      "id": "opening-1",
      "wall_id": "wall-1",
      "offset": 1.2,
      "width": 0.9,
      "height": 2.1,
      "sill_height": 0.0,
      "kind": "unclassified",
      "source": "automatic",
      "status": "needs_review"
    }
  ],
  "spaces": [
    {
      "id": "space-1",
      "boundary": [[0,0],[4,0],[4,3],[0,3]],
      "label": "",
      "status": "candidate"
    }
  ]
}
```

Validate all imported and saved project data. Use stable IDs for
entities. Version the schema and provide migrations.

## 9. 2D editor requirements

-   Pan, zoom, fit-to-screen, and toggle source-image visibility.
-   Select, move, delete, split, merge, and draw walls.
-   Edit wall endpoints, thickness, and type.
-   Add, move, resize, and classify openings.
-   Create, split, merge, and label spaces.
-   Snap to endpoints, intersections, and orthogonal axes with
    configurable snapping.
-   Show dimensions and scale.
-   Undo/redo command history.
-   Lock the source image layer.
-   Clearly distinguish automatic candidates from user-confirmed
    entities.

## 10. 3D generation

-   Generate floor surfaces from valid space polygons.
-   Extrude wall centerlines by wall thickness and wall height, with
    correct junction handling.
-   Create openings by segmenting wall solids around opening intervals;
    avoid merely drawing door/window planes over solid walls.
-   Add simple door and window frames/panels as editable components.
-   Use configurable floor thickness, ceiling visibility, wall height,
    and material presets.
-   Generate meshes from the canonical 2D model, not from the source
    bitmap.
-   Validate mesh watertightness where required by the export format.
-   Keep object IDs and source entity IDs in metadata where the format
    permits.
-   Three.js handles browser visualization; Trimesh handles server-side
    mesh generation and export.

## 11. API outline

  ---------------------------------------------------------------------------------------------
  Method                  Route                                         Purpose
  ----------------------- --------------------------------------------- -----------------------
  POST                    `/api/projects`                               Create project

  GET                     `/api/projects/{id}`                          Read project

  PUT                     `/api/projects/{id}`                          Save canonical plan

  POST                    `/api/projects/{id}/source`                   Upload source image

  POST                    `/api/projects/{id}/preprocess`               Return preview/masks

  POST                    `/api/projects/{id}/extract`                  Run deterministic
                                                                        extraction

  GET                     `/api/projects/{id}/extractions/{revision}`   Read extraction
                                                                        revision

  POST                    `/api/projects/{id}/validate`                 Validate plan topology

  POST                    `/api/projects/{id}/model`                    Generate 3D model

  GET                     `/api/projects/{id}/export/{format}`          Export GLB/OBJ/STL
  ---------------------------------------------------------------------------------------------

Use explicit request schemas, size limits, timeouts, and structured
error responses. Long-running processing can later return a job ID and
expose a status endpoint.

## 12. Persistence and storage

MVP: - SQLite for project metadata and revision records. - Local
filesystem for original images, derived masks, project JSON, and
exports. - Store checksums and file sizes. - Never overwrite original
source assets. - Keep extraction revisions and user-edited canonical
revisions separate.

Scale-up: - PostgreSQL for concurrent multi-user deployments. -
S3-compatible object storage only if needed; self-hosted MinIO is an
option, but adds operational overhead. - Redis/Valkey and a worker queue
only when concurrency or processing duration requires it.

## 13. Security and privacy

-   Validate file signatures rather than trusting file extensions.
-   Enforce upload size and pixel-dimension limits to mitigate
    decompression bombs.
-   Decode images in a constrained process where practical.
-   Sanitize filenames and never use user-provided paths directly.
-   Apply per-project access controls if accounts are introduced.
-   Use CSRF protection for cookie-authenticated deployments and rate
    limits for public endpoints.
-   Keep uploaded floor plans private by default.
-   Provide project and source-file deletion.
-   Avoid telemetry containing floor-plan contents or precise project
    geometry.
-   Pin dependencies and scan for known vulnerabilities.

## 14. Performance targets

Initial targets on a typical modern laptop/server; validate with a
representative benchmark corpus: - UI remains responsive while image
processing runs. - 2--8 megapixel images supported in the MVP, with
configurable limits. - First extraction preview within a few seconds for
ordinary plans; report progress for larger images. - 2D editor remains
interactive for several thousand vector entities. - 3D preview handles
ordinary residential plans smoothly. - Avoid promising universal timing
until measured on target hardware.

## 15. Testing and evaluation

Build a consented, varied test corpus with: - Clean digital plans,
scanned plans, low-contrast images, skewed images, noisy images. -
Orthogonal and non-orthogonal walls. - Different line weights, scales,
and drawing conventions. - Plans with and without dimensions, symbols,
furniture, and annotations.

Metrics: - Wall centerline precision/recall within a physical or pixel
tolerance. - Wall thickness error. - Endpoint/junction localization
error. - Opening candidate recall and false-positive rate. - Space
polygon intersection-over-union. - Geometry validity and percentage of
plans requiring manual correction. - Processing time and peak memory.

Test layers: - Unit tests for image processing and geometric
operations. - Golden-image regression tests for deterministic
extraction. - Property tests for snapping, splitting, polygonization,
and mesh generation. - API integration tests. - Playwright end-to-end
tests for upload → extract → edit → 3D → export. - Export round-trip
checks in independent viewers where practical.

Do not optimize only for a single clean sample plan. Track failure
categories and preserve difficult test cases.

## 16. Deployment and cost model

The application can be run locally at no hosting cost, or self-hosted on
infrastructure the operator controls. A public hosted service may incur
costs for compute, storage, bandwidth, domain registration, and backups.
Free tiers have limits and can change; do not promise unlimited free
hosting.

Recommended rollout: 1. Local development and local single-user
deployment. 2. Optional self-hosted Docker Compose deployment. 3. Public
hosting only after measuring resource requirements and selecting a
sustainable free or low-cost provider.

No paid API keys or AI services are required by this design.

## 17. Key risks and mitigations

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  Dense annotations mistaken for      Multi-stage filtering, overlays,
  walls                               editable review

  Broken or faint wall lines          Configurable morphology and
                                      gap-bridging; never silently force
                                      uncertain joins

  Door/window symbols are ambiguous   Mark as unclassified openings and
                                      require user confirmation

  Non-orthogonal or curved plans      Support general segments
                                      progressively; prioritize
                                      orthogonal MVP

  Wrong physical scale                Require calibration and show
                                      calibration status prominently

  Bad topology creates invalid meshes Geometry validation and repair
                                      tools before 3D generation

  User expects perfect one-click      Set clear expectations; make
  conversion                          correction workflow central

  Free hosting limits                 Local-first and self-hosted
                                      deployment options
  -----------------------------------------------------------------------

## 18. Definition of done for MVP

-   A user can upload a supported floor-plan image.
-   Preprocessing options are visible and reproducible.
-   User can calibrate scale.
-   Deterministic OpenCV extraction produces editable wall and space
    candidates on the supported benchmark subset.
-   User can correct walls and openings in 2D with undo/redo.
-   Validated geometry generates a navigable 3D model.
-   GLB export opens in an independent viewer.
-   Project can be saved, reopened, and edited without losing source
    image or confirmed geometry.
-   No AI/ML dependencies or paid external services are present in the
    runtime dependency graph.
-   Known limitations and supported input assumptions are documented.

## 19. Architecture decisions

-   **ADR-001:** No AI/ML. All extraction is deterministic image
    processing and geometry.
-   **ADR-002:** User-confirmed canonical vector geometry is the source
    of truth for 3D generation.
-   **ADR-003:** Local-first MVP with SQLite and filesystem storage.
-   **ADR-004:** OpenCV + Shapely + Trimesh + Three.js form the
    processing/rendering core.
-   **ADR-005:** Automatic opening detection is heuristic; semantic
    classification is user-confirmed.
