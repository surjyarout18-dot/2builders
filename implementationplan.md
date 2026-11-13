# Implementation Plan --- No-AI Floor-Plan-to-3D Application

**Delivery approach:** Build a deterministic, computer-vision-based
application. Do not introduce AI, ML models, LLMs, hosted inference
APIs, or paid third-party APIs.

**Indicative schedule:** 14 weeks for a small experienced team. A solo
developer should expect a longer schedule. Dates are estimates, not
commitments.

## 1. Delivery strategy

Build a vertical slice early: 1. Upload an image. 2. Calibrate scale. 3.
Extract simple wall candidates with OpenCV. 4. Correct them in a 2D
editor. 5. Generate a basic 3D model. 6. Export GLB.

Then improve extraction robustness, editing, persistence, and
deployment. The product should not wait for perfect automatic
recognition; user correction is a core capability.

## 2. Milestones

  ------------------------------------------------------------------------
  Phase                                        Weeks Outcome
  --------------------- ---------------------------- ---------------------
  0\. Discovery and                                1 Supported-plan
  benchmark                                          assumptions and test
                                                     corpus

  1\. Platform                                  2--3 Web app, API,
  foundation                                         projects, upload

  2\. Image                                     4--6 Deterministic
  preprocessing and                                  wall/line/space
  extraction                                         candidates

  3\. 2D editor and                             7--8 Editable canonical
  validation                                         plan

  4\. 3D generation and                        9--10 Editable 3D preview
  export                                             and GLB/OBJ

  5\. Hardening and                           11--14 Quality, performance,
  beta                                               documentation,
                                                     release
  ------------------------------------------------------------------------

## 3. Detailed work plan

### Phase 0 --- Discovery and benchmark (Week 1)

**Tasks** - Define supported input formats, image-size limits, and MVP
plan styles. - Assemble a legally usable benchmark corpus of
representative plans. - Annotate reference wall centerlines, wall
thicknesses, openings, and room boundaries for evaluation. - Decide
initial support for orthogonal plans and document non-orthogonal
limitations. - Define coordinate conventions, units, and calibration
interaction. - Confirm dependency licenses and create a software bill of
materials.

**Acceptance criteria** - Benchmark contains clean, scanned, noisy,
skewed, and varied line-weight examples. - Reference annotations and
evaluation tolerances are documented. - Product clearly states that
automatic extraction is a first pass requiring review.

### Phase 1 --- Platform foundation (Weeks 2--3)

**Tasks** - Create React + Vite + TypeScript frontend. - Create FastAPI
backend with Pydantic request models. - Add project create/read/update
endpoints. - Implement secure image upload and local filesystem
storage. - Add SQLite project metadata and schema versioning. - Build
image preview, zoom, pan, rotate, crop, and deskew controls. - Add a
simple project save/reopen flow. - Add automated linting, formatting,
and CI tests.

**Acceptance criteria** - User can create a project, upload an image,
and reopen the project. - Original image remains unchanged. - Invalid
files, oversized files, and malformed requests are rejected safely. - No
paid API credentials or AI/ML dependencies are needed.

### Phase 2 --- Preprocessing and deterministic extraction (Weeks 4--6)

**Week 4: preprocessing** - Grayscale conversion and contrast
normalization. - Median/bilateral denoising options. - Otsu and adaptive
thresholding. - Morphological open/close operations with adjustable
kernels. - Side-by-side preview of source and processed mask. - Persist
preprocessing settings.

**Week 5: line and wall candidates** - Connected components and contour
extraction. - Horizontal/vertical morphology passes. - Canny edge
detection and probabilistic Hough transform. - Segment filtering by
length and orientation. - Collinear segment merging and endpoint
snapping. - Estimate wall thickness where parallel boundaries are
detected. - Preserve ambiguous candidates instead of silently deleting
them.

**Week 6: graph and space candidates** - Build geometry graph and split
intersections. - Polygonize closed linework with Shapely. - Filter
sliver polygons and obvious artifacts. - Detect wall gaps as
unclassified opening candidates. - Produce extraction overlays and
diagnostics. - Add extraction revision history and deterministic
regression fixtures.

**Acceptance criteria** - Repeated runs with identical inputs/settings
produce stable results. - Extraction produces inspectable candidate
geometry for the supported benchmark subset. - Every automatic entity is
labeled as automatic/unreviewed. - Uncertain openings are unclassified
and never presented as confirmed doors/windows. - Processing warnings
identify common failure conditions.

### Phase 3 --- 2D editor and geometry validation (Weeks 7--8)

**Tasks** - Build Konva-based vector editing layer over locked source
image. - Add select, draw, move, delete, split, merge, and endpoint
editing for walls. - Add wall thickness/type editing. - Add opening
placement, resizing, and classification. - Add space polygon editing,
labels, merge, and split. - Add snapping to endpoints, intersections,
and orthogonal axes. - Add dimension display and scale calibration. -
Add undo/redo command history. - Add topology validation for
disconnected endpoints, overlaps, invalid polygons, duplicate walls, and
unsupported openings. - Separate automatic extraction revisions from
user-confirmed canonical plan state.

**Acceptance criteria** - User can fix a deliberately imperfect
extraction without restarting the project. - Undo/redo restores geometry
and attributes correctly. - User-confirmed geometry survives extraction
reruns. - Validation issues are actionable and visually highlighted.

### Phase 4 --- 3D generation and export (Weeks 9--10)

**Week 9: geometry** - Convert calibrated 2D geometry to world
coordinates. - Generate floor polygons. - Extrude wall segments with
thickness and height. - Resolve wall junction overlaps. - Cut openings
by segmenting wall solids around opening intervals. - Add basic door and
window components. - Add configurable materials, floor thickness, and
wall height.

**Week 10: viewer and export** - Build Three.js viewport with orbit,
pan, zoom, selection, and visibility controls. - Synchronize selected 3D
objects with source 2D entities where feasible. - Generate GLB and OBJ
exports using Trimesh. - Add optional STL export after mesh
validation. - Preserve entity metadata where format support allows. -
Test exports in independent viewers.

**Acceptance criteria** - A calibrated, validated plan generates a
dimensionally consistent 3D preview. - Openings are actual gaps in wall
geometry, not merely visual overlays. - GLB export opens in an
independent viewer. - Invalid geometry produces clear errors rather than
corrupt output.

### Phase 5 --- Hardening and beta (Weeks 11--14)

**Week 11: robustness** - Expand benchmark regression suite. - Improve
skew handling, line merging, and gap diagnostics. - Profile memory and
processing time. - Add cancellation and progress reporting for long
extraction jobs.

**Week 12: usability** - Add first-run guidance and example project. -
Explain scale calibration and extraction limitations. - Improve keyboard
shortcuts and editor affordances. - Add clear distinction between
candidates and reviewed geometry.

**Week 13: reliability and security** - Test upload limits and malformed
image handling. - Add project backup/export and deletion. - Add API
error handling and structured logs. - Test large projects and browser
compatibility. - Pin dependencies and run vulnerability checks.

**Week 14: beta release** - Package local deployment, optionally with
Docker Compose. - Write setup, user, troubleshooting, and limitations
documentation. - Run end-to-end acceptance tests. - Publish benchmark
results and known failure categories. - Tag a beta release and collect
feedback.

**Acceptance criteria** - Fresh environment can run the app from
documented instructions. - End-to-end upload → preprocess → extract →
edit → 3D → export passes. - No AI/ML or paid API dependency is
present. - Known limitations and benchmark scope are public and
accurate.

## 4. Backlog by subsystem

### Frontend

-   [ ] React/Vite project shell and routing
-   [ ] Project dashboard and project lifecycle
-   [ ] Upload and image preview
-   [ ] Preprocessing settings panel
-   [ ] Extraction overlay controls
-   [ ] 2D editor and command history
-   [ ] Scale/dimension UI
-   [ ] 3D viewport and model controls
-   [ ] Export and project download UI

### Backend

-   [ ] FastAPI app and API versioning
-   [ ] Pydantic project schemas
-   [ ] SQLite persistence and migrations
-   [ ] Safe file upload and storage
-   [ ] Extraction service interface
-   [ ] Extraction revision persistence
-   [ ] Geometry validation service
-   [ ] Mesh generation and export endpoints

### Computer vision and geometry

-   [ ] Grayscale/contrast normalization
-   [ ] Thresholding modes
-   [ ] Morphological operations
-   [ ] Contour and connected-component analysis
-   [ ] Hough line detection
-   [ ] Segment filtering and merging
-   [ ] Endpoint snapping and intersection splitting
-   [ ] Wall thickness estimation
-   [ ] Gap/opening candidates
-   [ ] Polygonization and space candidates
-   [ ] Geometry diagnostics and regression fixtures

### Quality

-   [ ] Benchmark corpus and annotation format
-   [ ] Unit tests for algorithms
-   [ ] Golden-image tests
-   [ ] Property tests for geometry
-   [ ] API integration tests
-   [ ] Browser end-to-end tests
-   [ ] GLB export validation
-   [ ] Performance and memory benchmarks

## 5. Roles and ownership

For a small team: - **Frontend engineer:** upload, image controls, 2D
editor, 3D viewer. - **Backend/geometry engineer:** API, persistence,
coordinate model, mesh generation. - **Computer-vision engineer:**
OpenCV pipeline, extraction diagnostics, benchmark metrics. -
**QA/product owner:** benchmark curation, usability, acceptance
criteria, release checks.

A solo developer can combine roles, but should preserve the phase gates
and avoid building all extraction logic before the editing workflow
exists.

## 6. Quality gates and metrics

Track performance against an annotated test set. Initial target
thresholds should be set only after a baseline run; do not invent
accuracy claims.

Metrics to record: - Wall centerline precision and recall within a
documented tolerance. - Endpoint and junction localization error. -
Estimated wall thickness error. - Opening candidate recall and
false-positive rate. - Space polygon intersection-over-union. -
Percentage of extracted entities requiring manual correction. - Geometry
validity rate before 3D generation. - Extraction duration and peak
memory by image size.

Release gates: 1. **Extraction gate:** supported examples produce stable
candidates and useful diagnostics. 2. **Editing gate:** user can correct
extraction defects and preserve edits. 3. **Geometry gate:** validated
plans generate consistent meshes. 4. **Export gate:** GLB opens in
independent viewers. 5. **Privacy/security gate:** files are private by
default and upload validation is tested.

## 7. Risks and contingency plans

  -----------------------------------------------------------------------
  Risk                                Response
  ----------------------------------- -----------------------------------
  OpenCV extraction is weak on        Narrow supported input profile,
  annotated scans                     improve preprocessing controls,
                                      keep manual correction fast

  Door/window symbols vary too much   Treat as generic opening
                                      candidates; require user
                                      classification

  Non-orthogonal plans are difficult  Deliver orthogonal support first;
                                      add general-angle support as a
                                      measured enhancement

  Geometry graph becomes fragmented   Add graph diagnostics, snap
                                      controls, and manual join tools

  Meshes fail at wall junctions       Validate and repair polygons before
                                      extrusion; add junction-specific
                                      tests

  Solo delivery takes longer than 14  Preserve vertical slice and defer
  weeks                               advanced recognition,
                                      collaboration, and deployment

  Public free hosting is insufficient Ship local-first and self-hosted
                                      options; state free-tier
                                      limitations honestly
  -----------------------------------------------------------------------

## 8. First 10 engineering actions

1.  Create the repository and frontend/backend workspace.
2.  Add dependency manifests and license inventory; exclude all AI/ML
    packages.
3.  Add a small, legally usable floor-plan benchmark set.
4.  Define and version the canonical project JSON schema.
5.  Implement image upload and immutable source asset storage.
6.  Implement scale calibration and pixel-to-world coordinate
    conversion.
7.  Build preprocessing previews with OpenCV.
8.  Implement a first wall-candidate detector using morphology and Hough
    lines.
9.  Render candidate lines over the source image and allow basic manual
    correction.
10. Extrude a manually corrected wall plan into a Three.js preview and
    export a first GLB.

## 9. Explicit non-AI dependency policy

Allowed core libraries: - OpenCV for deterministic image processing. -
Shapely for computational geometry. - Trimesh for mesh operations and
export. - Three.js and Konva.js for visualization/editing. - FastAPI,
Pydantic, SQLite/PostgreSQL, and standard Python/TypeScript tooling.

Not allowed: - LLM APIs or chat-completion APIs. - Vision-language
models or image-recognition APIs. - Neural-network inference runtimes or
pretrained model weights. - Hosted AI services or paid extraction
APIs. - Hidden ML-based features in third-party services.

Review transitive dependencies before release. A library being free to
download does not automatically mean every hosted service or deployment
tier is free.

## 10. Release definition

The beta is ready when a user can: - Upload a supported floor-plan
image. - Calibrate its scale. - Run deterministic extraction. - Inspect
and correct candidate walls and openings. - Validate the 2D geometry. -
Generate and navigate a 3D model. - Export a usable GLB. - Save and
reopen the project.

The release notes must state the supported input assumptions, known
extraction failure modes, and the fact that the application uses no AI.
