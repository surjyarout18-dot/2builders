# Engineering Specification: AI Floor-Plan to Editable 3D Application

**Document status:** Proposed architecture\
**Version:** 1.0\
**Date:** 2026-11-13\
**Product scope:** Web application that accepts 2D floor-plan
images/PDFs, extracts architectural structure, creates an editable 3D
model, and allows export.

------------------------------------------------------------------------

## 1. Executive summary

Build a browser-based application that converts an uploaded floor-plan
image into a **structured, editable 3D building model**. The system must
not rely on image generation as the source of geometry. It should use
computer vision to infer a 2D architectural representation, convert that
representation into parametric geometry, and render the result in a
browser-based 3D editor.

The core pipeline is:

1.  Upload and validate a plan.
2.  Preprocess and normalize the image.
3.  Detect architectural elements and their geometry.
4.  Convert detections into a normalized 2D floor-plan graph.
5.  Resolve scale and dimensions, with explicit uncertainty when
    unknown.
6.  Generate parametric 3D geometry.
7.  Present the result in an interactive editor for correction.
8.  Save project versions and export supported formats.

**Product principle:** AI proposes; deterministic geometry code
constructs; the user verifies and corrects.

### 1.1 MVP outcome

A user can upload a clean, single-storey, top-down floor-plan image,
confirm or enter one known dimension, review detected
walls/rooms/openings, correct errors in a 2D editor, and view a
dimensionally consistent 3D model with adjustable wall height and
thickness.

### 1.2 Explicit non-goals for MVP

-   Guaranteed construction-document accuracy.
-   Automatic structural engineering or code compliance.
-   Reliable reconstruction from perspective photos of paper plans.
-   Multi-storey stair connectivity and complex roof generation.
-   Photorealistic rendering as a substitute for accurate geometry.
-   Fully automatic interpretation of every architectural convention.
-   Native BIM authoring or IFC round-trip fidelity.

------------------------------------------------------------------------

## 2. Product requirements

### 2.1 User journeys

**Journey A --- Upload and convert** 1. User creates a project. 2. User
uploads PNG, JPG, or PDF. 3. Application checks file size, type, page
count, and image quality. 4. User selects the page (for PDF) and
confirms plan orientation. 5. User enters a known measurement or chooses
a clearly marked estimate. 6. User starts conversion and sees job
progress. 7. System presents a 2D detection overlay and confidence
indicators. 8. User accepts or corrects walls, rooms, doors, and
windows. 9. User opens the generated 3D model.

**Journey B --- Correct the plan** 1. User selects an element in 2D or
3D. 2. User adjusts endpoints, dimensions, thickness, type, or position.
3. Related geometry updates. 4. Validation identifies gaps, overlaps,
invalid polygons, and unsupported topology. 5. User saves a new project
revision.

**Journey C --- Export** 1. User chooses GLB as the initial 3D export.
2. System generates the export asynchronously. 3. User downloads the
artifact. 4. Later releases may add OBJ, STL, DXF, and IFC, with
format-specific limitations documented.

### 2.2 Functional requirements

  ID      Requirement                                    MVP
  ------- ---------------------------------------------- ---------------
  FR-01   Register/sign in and manage projects           Yes
  FR-02   Upload PNG/JPG/PDF with validation             Yes
  FR-03   Deskew, crop, denoise, normalize plan          Yes
  FR-04   Detect wall lines/regions                      Yes
  FR-05   Detect room regions                            Yes
  FR-06   Detect doors and windows                       Yes, assisted
  FR-07   Calibrate pixels to real-world units           Yes
  FR-08   Edit 2D geometry and element properties        Yes
  FR-09   Generate editable 3D walls/floors/openings     Yes
  FR-10   Orbit, pan, zoom, select in 3D                 Yes
  FR-11   Save revisions and restore previous revision   Yes
  FR-12   Export GLB                                     Yes
  FR-13   Furniture recognition and auto-placement       Later
  FR-14   Multi-floor buildings                          Later
  FR-15   Photorealistic rendering                       Later

### 2.3 Non-functional requirements

-   **Correctness:** Geometry generation must be deterministic for a
    given normalized plan and parameter set.
-   **Transparency:** Mark inferred values separately from
    user-confirmed values.
-   **Recoverability:** A failed AI job must not corrupt the project or
    source upload.
-   **Performance target:** For a typical clean plan up to 3000 × 3000
    pixels, aim for an initial conversion in under 90 seconds on the
    selected worker hardware. Benchmark before promising this as an SLA.
-   **Responsiveness:** 2D/3D editing should remain interactive for a
    typical residential plan.
-   **Security:** Private-by-default projects, signed download URLs,
    tenant authorization, upload scanning, and strict file validation.
-   **Accessibility:** Keyboard-accessible core controls, labels,
    contrast, and non-color confidence indicators.
-   **Observability:** Correlated request/job IDs, structured logs,
    traces, metrics, and model-version tracking.

------------------------------------------------------------------------

## 3. System architecture

### 3.1 High-level components

``` text
Browser (Next.js / React)
  ├── Authentication and project UI
  ├── 2D plan editor (SVG/Canvas)
  ├── 3D editor (Three.js)
  └── Upload / job progress / export UI
          |
          v
API layer (FastAPI)
  ├── Auth and authorization
  ├── Projects and revisions
  ├── Upload orchestration
  ├── Job status and results
  └── Export orchestration
          |
          +------ PostgreSQL
          |         ├── users / projects
          |         ├── revisions / elements
          |         └── jobs / audit events
          |
          +------ Object storage
          |         ├── source images
          |         ├── normalized images
          |         ├── overlays / previews
          |         └── exports
          |
          +------ Queue (Redis-compatible)
                    |
                    v
              AI / geometry workers
                ├── image preprocessing
                ├── model inference
                ├── vectorization
                ├── topology repair
                ├── scale calibration
                ├── 3D mesh generation
                └── export generation
```

### 3.2 Recommended stack

  -------------------------------------------------------------------------
  Layer                    Recommended choice       Reason
  ------------------------ ------------------------ -----------------------
  Web app                  Next.js + TypeScript     Mature React
                                                    application framework

  UI                       Tailwind CSS + component Consistent product UI
                           library                  

  2D editor                SVG or Konva             Precise selectable
                                                    vector elements

  3D viewport              Three.js / React Three   Browser 3D rendering
                           Fiber                    and interaction

  API                      Python + FastAPI         Python AI ecosystem and
                                                    typed APIs

  Validation               Pydantic                 Strict request and
                                                    domain schemas

  CV                       OpenCV                   Image preprocessing and
                                                    classical vision

  ML                       PyTorch                  Training and inference

  Detection/segmentation   Fine-tuned               Plan-specific element
                           segmentation/detection   extraction
                           models                   

  Geometry                 Shapely + custom         2D polygon operations
                           geometry layer           and validation

  Mesh                     Trimesh or custom mesh   Mesh creation and
                           builder                  export

  Database                 PostgreSQL               Relational project and
                                                    geometry metadata

  Queue/cache              Redis-compatible queue   Async processing and
                                                    job state

  Object storage           S3-compatible storage    Durable source and
                                                    generated files

  Deployment               Docker on managed        Reproducible services
                           container hosting        

  Monitoring               OpenTelemetry + error    End-to-end diagnosis
                           tracking + metrics       
  -------------------------------------------------------------------------

The stack is a recommendation, not a claim about Sketch2Space's private
implementation.

### 3.3 Service boundaries

Start with a **modular monolith plus separate workers**, not many
microservices. Keep clear internal modules so they can be split if load
or team ownership later justifies it.

-   `api`: HTTP endpoints, auth, validation, orchestration.
-   `domain`: project, floor-plan, element, revision, and unit models.
-   `vision`: preprocessing and ML inference.
-   `vectorization`: raster-to-vector conversion.
-   `topology`: graph construction and geometric repair.
-   `geometry3d`: parametric solids and mesh generation.
-   `exports`: GLB generation and artifact validation.
-   `worker`: queue consumers and retry handling.

------------------------------------------------------------------------

## 4. AI and geometry pipeline

### 4.1 Pipeline stages

``` text
Original upload
   |
   v
File validation and page extraction
   |
   v
Image normalization
   |
   v
Architectural element inference
   |
   v
Raster masks + object detections
   |
   v
Vectorization (lines, polygons, openings)
   |
   v
Topology and constraint validation
   |
   v
Scale calibration + unit normalization
   |
   v
Canonical FloorPlan JSON
   |
   v
Parametric 3D geometry
   |
   v
GLB + browser scene
```

Persist intermediate artifacts. This makes failures diagnosable and
allows geometry improvements without rerunning inference.

### 4.2 Image ingestion and preprocessing

Inputs: - PNG/JPEG images. - PDF pages rendered to images. - Optional
later: SVG/DXF imports.

Validation: - MIME type and file signature must agree. - Enforce maximum
file size, page count, and pixel dimensions. - Reject encrypted PDFs
unless a supported password flow is implemented. - Scan uploads and
store outside the application web root. - Never trust filenames or
client-supplied MIME types.

Preprocessing: - Convert to grayscale while preserving original. -
Estimate skew and rotate. - Detect/crop page boundary where possible. -
Normalize contrast and thresholding. - Produce multiple image scales for
inference. - Preserve transform metadata so model coordinates can be
mapped back to original pixels.

### 4.3 Model strategy

Do not assume one generic object detector solves floor-plan
reconstruction. Use a staged model strategy:

**MVP model tasks** 1. Semantic segmentation: wall pixels, room regions,
background, symbols/annotation where feasible. 2. Object detection: door
symbols, window symbols, stairs, and selected fixtures. 3. OCR: room
labels and dimension strings, treated as hints rather than ground truth.

**Model selection** - Establish a labeled evaluation dataset before
choosing an architecture. - Benchmark U-Net/DeepLab-style segmentation
and transformer-based segmentation approaches. - Benchmark object
detectors for discrete symbols. - Use pretrained weights as a starting
point; fine-tune on licensed, representative floor-plan data. - Track
model version, preprocessing version, confidence, and evaluation metrics
for each result.

**Training data** - Obtain data with clear licensing and permission. -
Include varied drawing styles, scan quality, line weights, scale,
languages, and residential/commercial layouts. - Label walls, wall
junctions, room masks, doors, windows, stairs, dimensions, text, and
uncertain symbols. - Split train/validation/test by source/project, not
random image crops, to avoid leakage. - Maintain a human-reviewed gold
set.

### 4.4 Vectorization and topology

The model output is not yet a usable floor plan. Convert masks and
detections into vector geometry.

Recommended operations: - Skeletonize wall masks where appropriate. -
Detect line segments and merge collinear fragments. - Snap endpoints
within a configurable tolerance. - Infer junctions and build a wall
graph. - Extract room polygons from enclosed regions. - Associate
doors/windows with host walls. - Preserve confidence and provenance on
every inferred element. - Flag ambiguous geometry for user review rather
than silently inventing it.

Topology checks: - Wall endpoints should connect or be explicitly marked
as free ends. - Room polygons must be closed and
non-self-intersecting. - Openings must lie on a host wall and fit within
its length. - Adjacent room boundaries should not create impossible
overlaps. - Geometry must use a single coordinate convention and unit
system.

### 4.5 Scale calibration

Pixel dimensions alone do not establish real-world dimensions.

Preferred calibration order: 1. User selects a known dimension line and
enters its real measurement. 2. OCR proposes a dimension value; user
confirms it. 3. User selects two points and enters their distance. 4. If
no reference exists, offer an explicitly labeled approximate scale and
show that dimensions are estimates.

Store: - `pixels_per_meter` - calibration source (`user`,
`ocr_confirmed`, `estimated`) - confidence - calibration points - unit
system

Never present estimated dimensions as measured facts.

------------------------------------------------------------------------

## 5. Canonical data model

Use a versioned JSON schema as the contract between AI, geometry,
editor, and export code.

### 5.1 Coordinate convention

Adopt: - 2D plan: X/Y in meters, origin at a stable plan origin. - 3D
scene: X/Z for plan coordinates and Y for height. - SI units internally;
convert for display. - Angles in radians internally.

### 5.2 Example FloorPlan JSON

``` json
{
  "schema_version": "1.0",
  "project_id": "uuid",
  "revision": 1,
  "units": "m",
  "calibration": {
    "pixels_per_meter": 120.0,
    "source": "user",
    "confidence": 1.0
  },
  "defaults": {
    "wall_height": 3.0,
    "wall_thickness": 0.15,
    "floor_thickness": 0.12
  },
  "levels": [
    {
      "id": "level-1",
      "name": "Ground Floor",
      "elevation": 0.0,
      "walls": [
        {
          "id": "wall-1",
          "start": [0.0, 0.0],
          "end": [5.0, 0.0],
          "thickness": 0.15,
          "height": 3.0,
          "type": "interior",
          "confidence": 0.96,
          "source": "model"
        }
      ],
      "rooms": [],
      "openings": [],
      "fixtures": []
    }
  ]
}
```

### 5.3 Core entities

-   `Project`: owner, name, timestamps, active revision.
-   `FloorPlanRevision`: immutable snapshot of normalized plan data.
-   `Level`: floor elevation and associated elements.
-   `Wall`: endpoints, thickness, height, material, confidence, source.
-   `Room`: closed polygon, label, area, optional finish properties.
-   `Opening`: door/window type, host wall, offset, width, height, sill
    height, swing.
-   `Fixture`: optional furniture or plumbing fixture with transform and
    dimensions.
-   `ProcessingJob`: state, stage, progress, errors, worker/model
    versions.
-   `Asset`: source image, overlays, preview, mesh, export.

Use immutable revisions for editing history. A save creates a new
revision or a controlled revision update; do not mutate the original AI
output without retaining provenance.

------------------------------------------------------------------------

## 6. 3D geometry generation

### 6.1 Parametric representation first

Store architectural objects as parameters, not only as a triangle mesh.
Meshes are derived artifacts.

A wall is defined by: - start and end points, - thickness, - height, -
base elevation, - material, - optional openings.

Generate wall solids from the centerline and thickness. Resolve wall
intersections and corners consistently to avoid gaps or duplicate faces.

### 6.2 Openings

Doors and windows should be cut into host wall geometry or generated as
wall segments around an opening. For MVP, segmented wall construction
can be easier to validate than arbitrary boolean mesh operations.

Door properties: - width, height, offset along host wall, - swing
direction and hinge side, - optional door leaf mesh.

Window properties: - width, height, offset, - sill height, - frame and
glazing as later visual detail.

### 6.3 Floors and ceilings

-   Create floor polygons from valid room or building boundary polygons.
-   Handle holes and disconnected regions explicitly.
-   MVP can omit ceilings or provide a toggleable ceiling plane.
-   Avoid assuming every enclosed region is a room; support manual
    classification.

### 6.4 Mesh validation

Before rendering/export: - no NaN or infinite coordinates; - no
zero-area faces; - expected winding and normals; - no unintended open
boundaries for closed solids; - valid transforms; - opening dimensions
fit host walls; - mesh bounds are plausible; - exported GLB reopens in a
test viewer.

------------------------------------------------------------------------

## 7. Frontend architecture

### 7.1 Main application screens

1.  Authentication.
2.  Project dashboard.
3.  New project / upload wizard.
4.  Processing progress.
5.  2D review and correction workspace.
6.  3D editor.
7.  Export and revision history.

### 7.2 Editor layout

Suggested workspace: - Left: element tree and layers. - Center:
switchable 2D/3D canvas. - Right: selected-element properties. - Top:
save status, undo/redo, units, export. - Bottom: warnings and AI
confidence/review queue.

### 7.3 2D editor

Requirements: - pan/zoom and fit-to-view; - select/multi-select; - draw
wall, room, door, and window; - move endpoints and snap; - edit numeric
dimensions; - undo/redo; - show source raster underneath vector
geometry; - toggle AI confidence overlay; - highlight unresolved
warnings.

Use SVG for vector interaction where feasible. Canvas/Konva may be
better for large scenes. Keep geometry state independent of rendering
state.

### 7.4 3D editor

Requirements: - orbit, pan, zoom; - select objects and highlight; -
toggle floors, walls, openings, fixtures; - isolate or hide levels; -
adjust wall height/thickness; - show dimensions and grid; - reset camera
and fit model; - synchronize selection with 2D editor.

Avoid making the 3D viewport the only way to correct geometry. Numeric
and 2D controls are essential.

### 7.5 State management

-   Server state: query/cache library.
-   Local editor state: dedicated state store with undo/redo history.
-   Persist domain changes through revision APIs.
-   Do not store large binary assets in client state.
-   Debounce property updates; use explicit save or autosave with
    conflict handling.

------------------------------------------------------------------------

## 8. API design

Prefix endpoints with `/api/v1`.

### 8.1 Projects

  Method   Endpoint           Purpose
  -------- ------------------ ------------------------
  POST     `/projects`        Create project
  GET      `/projects`        List user's projects
  GET      `/projects/{id}`   Project detail
  PATCH    `/projects/{id}`   Rename/update metadata
  DELETE   `/projects/{id}`   Soft-delete project

### 8.2 Upload and processing

  --------------------------------------------------------------------------
  Method                  Endpoint                   Purpose
  ----------------------- -------------------------- -----------------------
  POST                    `/projects/{id}/uploads`   Request signed upload
                                                     URL or upload session

  POST                    `/projects/{id}/process`   Start conversion job

  GET                     `/jobs/{id}`               Read job status

  GET                     `/jobs/{id}/result`        Read structured
                                                     detection result

  POST                    `/jobs/{id}/retry`         Retry eligible failed
                                                     job
  --------------------------------------------------------------------------

Use object-storage signed uploads for larger files. Verify the uploaded
object before processing.

### 8.3 Revisions and exports

  Method   Endpoint                           Purpose
  -------- ---------------------------------- ---------------------------------------
  GET      `/projects/{id}/revisions`         List revisions
  GET      `/projects/{id}/revisions/{rev}`   Read revision
  POST     `/projects/{id}/revisions`         Save corrected plan
  POST     `/projects/{id}/exports`           Start export
  GET      `/exports/{id}`                    Export status and signed download URL

### 8.4 Example job state

`queued -> validating -> preprocessing -> detecting -> vectorizing -> calibrating -> generating_3d -> packaging -> succeeded`

Terminal alternatives: - `failed`: retryable or non-retryable error with
safe user-facing message. - `cancelled`: user or system cancelled.

Progress must reflect actual pipeline stages, not arbitrary percentage
increments.

### 8.5 API principles

-   Validate all inputs with typed schemas.
-   Enforce ownership/tenant authorization on every project, job,
    revision, and asset access.
-   Use idempotency keys for job creation and export requests.
-   Return stable error codes and correlation IDs.
-   Use pagination for project/revision lists.
-   Use optimistic concurrency or revision IDs to prevent lost updates.
-   Never expose internal object-storage credentials or unrestricted
    bucket paths.

------------------------------------------------------------------------

## 9. Database and storage

### 9.1 PostgreSQL tables

Suggested tables: - `users` - `projects` - `project_members` (only if
collaboration is planned) - `floor_plan_revisions` - `processing_jobs` -
`assets` - `exports` - `audit_events`

Store canonical JSON in a JSONB column initially, with relational
columns for ownership, IDs, revision, status, and frequently queried
metadata. Normalize high-volume element tables only when query patterns
justify it.

### 9.2 Object storage layout

Example logical keys:

``` text
users/{user_id}/projects/{project_id}/source/{asset_id}.png
users/{user_id}/projects/{project_id}/intermediate/{job_id}/normalized.png
users/{user_id}/projects/{project_id}/intermediate/{job_id}/overlay.png
users/{user_id}/projects/{project_id}/revisions/{revision}/preview.glb
users/{user_id}/projects/{project_id}/exports/{export_id}/model.glb
```

Use opaque IDs, private buckets, encryption at rest, short-lived signed
URLs, lifecycle rules, and deletion workflows.

------------------------------------------------------------------------

## 10. Background processing and reliability

AI inference and mesh generation must not run in the web request
process.

Worker requirements: - queue-based processing; - bounded concurrency
based on CPU/GPU memory; - retry with exponential backoff for transient
errors; - dead-letter handling for repeated failures; - stage-level
timeouts; - cancellation checks between stages; - idempotent stage
outputs; - job leases/heartbeats; - cleanup of abandoned temporary
files.

Separate CPU-heavy preprocessing/vectorization from GPU inference if
profiling shows contention. Begin with one worker image and split queues
by workload as needed.

------------------------------------------------------------------------

## 11. Security, privacy, and compliance

-   Authenticate users and authorize every object access.
-   Validate file signatures, size, dimensions, PDF page count, and
    decompression limits.
-   Scan uploads; isolate PDF/image parsing from the public API process.
-   Protect against path traversal, parser exploits, oversized images,
    and decompression bombs.
-   Rate-limit uploads and expensive processing jobs.
-   Use private object storage and expiring signed URLs.
-   Encrypt traffic and storage.
-   Keep secrets in the hosting platform's secret manager.
-   Log metadata, not raw floor-plan contents or sensitive user data.
-   Define retention, export, and deletion policies.
-   Obtain rights to all training/evaluation data.
-   Do not use customer floor plans for training unless the user has
    clearly consented and the policy permits it.
-   Maintain audit records for access and project deletion.

Floor plans can reveal sensitive information about homes and workplaces;
treat them as confidential user content.

------------------------------------------------------------------------

## 12. Testing and quality strategy

### 12.1 Test layers

**Unit tests** - coordinate transforms; - scale calibration; - wall
offset/solid generation; - polygon validation; - opening placement; -
serialization and schema migration.

**Integration tests** - upload to object storage; - job
enqueue/consume; - model inference contract; - database revision
creation; - export creation and download authorization.

**Golden-image/model tests** - fixed labeled floor-plan dataset; -
segmentation IoU/F1; - wall centerline precision/recall; - door/window
detection precision/recall; - room polygon accuracy; - calibration
error.

**Geometry tests** - wall length and thickness invariants; - room area
and perimeter tolerances; - no invalid polygons; - no mesh NaNs or
zero-area faces; - known sample plans produce expected bounds and
volumes.

**End-to-end tests** - upload a sample plan; - calibrate scale; -
correct one wall; - verify 3D updates; - save revision; - export GLB; -
reopen and verify artifact.

### 12.2 Human review metrics

Track: - percentage of elements accepted without edits; - average
corrections per plan; - conversion completion rate; - time from upload
to usable 3D; - failed-job rate; - scale calibration error; -
user-reported geometry defects.

Model accuracy alone is insufficient. Measure whether users can reach a
usable model with reasonable correction effort.

------------------------------------------------------------------------

## 13. Deployment and environments

Recommended environments: - `local`: Docker Compose for API, PostgreSQL,
queue, object storage emulator. - `staging`: production-like services
with test data. - `production`: private networking, managed database,
private object storage, worker services.

Deployable units: 1. Web frontend. 2. API web service. 3. CPU worker. 4.
GPU worker, only if the selected model requires it and cost is
justified. 5. PostgreSQL. 6. Redis-compatible queue. 7. Object storage.

CI/CD: - lint, type-check, unit tests; - build immutable container
images; - run database migrations as a controlled release step; - run
integration and smoke tests; - deploy staging; - promote to production
with rollback strategy.

Backups: - managed PostgreSQL backups and tested restore procedure; -
object-storage versioning or backup policy; - documented retention and
deletion behavior.

------------------------------------------------------------------------

## 14. Risks and mitigations

  -----------------------------------------------------------------------
  Risk                    Impact                  Mitigation
  ----------------------- ----------------------- -----------------------
  Poor-quality or unusual Low extraction accuracy Quality checks,
  plans                                           confidence flags,
                                                  manual correction

  Missing scale           Incorrect dimensions    Require calibration or
                                                  label estimates

  Wall junction ambiguity Broken 3D geometry      Topology rules and
                                                  review UI

  Door/window symbol      Incorrect openings      Assisted placement and
  variation                                       editable detections

  Model data licensing    Legal and product risk  Dataset provenance and
                                                  license review

  GPU cost                High operating cost     Benchmark smaller
                                                  models, batch
                                                  inference, queue limits

  Huge/hostile uploads    Security/availability   Limits, scanning,
                                                  isolated parsers

  Mesh artifacts          Bad exports             Parametric geometry and
                                                  automated mesh
                                                  validation

  User assumes            Safety/liability risk   Clear disclaimers and
  construction accuracy                           no code-compliance
                                                  claims
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 15. Decisions to make before implementation

1.  Target users: homeowners, interior designers, architects, or
    real-estate teams?
2.  Input quality: clean digital plans only, or scans and hand sketches
    too?
3.  Units: metric only initially, or metric and imperial?
4.  Accuracy target and acceptable manual correction effort?
5.  Single-floor MVP or multi-floor from day one?
6.  Export requirement: GLB only initially, or CAD/BIM formats?
7.  Hosting region, data residency, and retention requirements?
8.  Is model training data available and licensed?

**Recommended default:** Start with clean single-floor plans, metric
units, one user-confirmed scale reference, editable 2D correction, 3D
GLB preview/export, and no construction-certification claims.

------------------------------------------------------------------------

## 16. Definition of done for MVP

The MVP is ready for controlled beta when: - users can create projects
and upload supported plan files; - uploads are validated and stored
privately; - asynchronous processing produces a versioned canonical
plan; - walls and rooms are editable in 2D; - scale source and
uncertainty are visible; - 3D walls, floors, and basic openings are
generated deterministically; - users can inspect and correct the 3D
model; - revisions can be saved and restored; - GLB export passes
automated validation; - access control, deletion, logging, monitoring,
and backup procedures are tested; - evaluation results are documented on
a held-out test set.
