# Implementation Plan: AI Floor-Plan to Editable 3D Application

**Document status:** Proposed delivery plan\
**Version:** 1.0\
**Date:** 2026-11-13\
**Planning assumption:** A Sketch2Space-style web application: upload a
2D floor-plan image/PDF, extract editable architectural elements,
generate a 3D model, and export GLB.

------------------------------------------------------------------------

## 1. Delivery strategy

Build a narrow, measurable MVP before attempting full automatic
architectural understanding.

**MVP promise:** For a clean, single-storey floor plan, the application
creates a useful editable 3D draft. The user confirms scale and can
correct AI-detected geometry.

Do not promise perfect automatic conversion. The product's
differentiator should be a fast AI-assisted workflow with transparent
uncertainty and effective editing.

### 1.1 MVP scope

Included: - authentication and project dashboard; - PNG/JPG and
single-page or selected-page PDF upload; - image preprocessing; -
initial wall/room detection; - assisted door/window detection; - scale
calibration; - canonical floor-plan JSON; - 2D correction editor; -
parametric 3D walls and floors; - basic doors/windows; - Three.js
viewer; - project revisions; - GLB export; - job progress and error
handling.

Deferred: - multi-storey linking; - automatic furniture layout; -
photorealistic rendering; - roof generation; - collaboration; -
mobile-native editor; - IFC/DWG/DXF round-trip; - code compliance and
structural analysis.

------------------------------------------------------------------------

## 2. Workstreams

1.  Product discovery and UX.
2.  Data acquisition and annotation.
3.  Backend and platform foundation.
4.  Computer vision and geometry pipeline.
5.  2D/3D frontend editor.
6.  Export and artifact validation.
7.  Security, quality, deployment, and beta operations.

These workstreams can overlap, but the canonical data contract must be
agreed early.

------------------------------------------------------------------------

## 3. Milestone plan

The estimates below assume a small experienced team: one frontend
engineer, one backend/geometry engineer, one ML/CV engineer, and
part-time product/design/QA. A smaller team should extend the calendar
rather than silently reduce testing.

### Phase 0 --- Discovery and technical validation (Week 1)

**Tasks** - Interview 5--8 target users. - Collect 30--50 representative
sample floor plans with permission. - Define supported input styles and
minimum image quality. - Choose initial element taxonomy. - Create a
clickable workflow prototype. - Benchmark one segmentation approach and
one detection approach. - Test conversion of a manually defined 2D wall
graph into GLB. - Confirm hosting, data residency, and storage
constraints.

**Deliverables** - Product requirements and acceptance criteria. -
Labeled sample dataset plan and rights checklist. - UX flow and editor
wireframes. - Technical proof of concept: JSON wall graph to 3D GLB. -
Risk register and revised estimates.

**Exit criteria** - Team can create a valid 3D model from canonical
JSON. - Input scope is constrained. - No unresolved blocker around data
rights or deployment.

### Phase 1 --- Platform foundation (Weeks 2--3)

**Backend** - Create FastAPI project and module structure. - Configure
PostgreSQL migrations. - Configure object storage and private signed
uploads. - Add authentication and project ownership checks. - Define
project, asset, job, revision schemas. - Add queue and worker
skeleton. - Add structured logs and correlation IDs.

**Frontend** - Create Next.js application and design system. - Implement
sign-in and project dashboard. - Implement project creation and upload
wizard. - Add upload progress and processing status page. - Establish
API client and error conventions.

**DevOps** - Dockerize frontend, API, and worker. - Set up local
development environment. - Create staging environment and CI pipeline. -
Configure secrets and environment-specific settings.

**Deliverables** - Authenticated project creation. - Secure upload and
asset record. - Asynchronous job can be enqueued and observed. - CI
passes lint, type checks, and basic tests.

**Exit criteria** - User can upload a file to private storage. - Worker
receives a job and reports status. - Unauthorized users cannot access
another user's project or asset.

### Phase 2 --- Image processing and AI extraction (Weeks 4--6)

**Data** - Define annotation guide. - Annotate initial gold set. - Split
train/validation/test by source project. - Record data provenance and
licenses.

**CV** - Implement image/PDF page extraction. - Implement deskew,
denoise, threshold, and coordinate transforms. - Train or fine-tune
wall/room segmentation model. - Implement door/window detector or begin
with assisted manual placement if training data is insufficient. - Add
OCR as an optional source of dimension/label hints. - Return masks,
detections, confidence, and model version.

**Pipeline** - Persist normalized image and overlay. - Add stage-level
job status. - Add retry handling and timeouts. - Add low-quality input
rejection/warnings.

**Deliverables** - AI inference worker. - Visual detection overlay. -
Evaluation report on held-out plans. - Versioned model output contract.

**Exit criteria** - Pipeline runs end-to-end on the agreed sample set. -
Model quality is measured, not assumed. - Low-confidence and unsupported
cases are surfaced to the user.

### Phase 3 --- Vectorization and canonical floor plan (Weeks 6--8)

**Tasks** - Convert segmentation masks into candidate wall geometry. -
Merge line fragments and snap endpoints. - Extract room polygons. -
Associate door/window detections with walls. - Implement topology
validation. - Implement scale calibration from user-entered reference
dimension. - Define and validate canonical FloorPlan JSON schema. -
Store AI provenance and confidence per element. - Build fixtures for
geometry regression tests.

**Deliverables** - Canonical plan JSON. - Geometry validation report. -
Scale calibration workflow. - API endpoint to retrieve structured plan
result.

**Exit criteria** - Sample plans produce valid or explicitly flagged
geometry. - Unit conversion and coordinate transforms pass tests. - No
unknown scale is silently presented as exact.

### Phase 4 --- 2D correction editor (Weeks 8--10)

**Tasks** - Render source raster with vector overlay. - Implement pan,
zoom, fit-to-view. - Implement select and inspect. - Add wall endpoint
editing and snapping. - Add create/delete wall. - Add room polygon
editing. - Add door/window placement and property editing. - Add
warnings and confidence visualization. - Add undo/redo. - Save edits as
a new revision.

**Deliverables** - Functional 2D review workspace. - Revision
save/load. - User can fix a deliberately incorrect wall and opening.

**Exit criteria** - A user can correct the model without editing raw
JSON. - Saved geometry survives reload. - Undo/redo does not corrupt
canonical state.

### Phase 5 --- 3D geometry and editor (Weeks 10--12)

**Tasks** - Generate wall solids from centerlines and thickness. -
Resolve corners and junctions. - Generate floor meshes from valid
polygons. - Generate wall openings and basic door/window meshes. - Add
wall height/thickness defaults and overrides. - Render scene with
Three.js. - Implement orbit, pan, zoom, fit model. - Implement selection
and property panel. - Synchronize selection between 2D and 3D. - Add
geometry validation before rendering.

**Deliverables** - Editable 3D scene. - Deterministic mesh generation. -
Basic architectural elements visible in 3D.

**Exit criteria** - A corrected 2D plan generates the expected 3D
layout. - Geometry tests pass for reference plans. - No NaN/invalid mesh
data in tested scenes.

### Phase 6 --- Export, hardening, and beta (Weeks 13--14)

**Tasks** - Generate GLB asynchronously. - Validate exported GLB by
reopening it in a test loader. - Add export history and expiring
download links. - Add project deletion and asset retention workflow. -
Run end-to-end, security, and load tests. - Test database
backup/restore. - Review privacy copy and accuracy disclaimer. - Run
beta with 5--10 users. - Collect correction counts, completion time, and
qualitative feedback. - Fix highest-impact defects.

**Deliverables** - Controlled beta release. - GLB export. - Operations
runbook. - Known limitations and model evaluation report.

**Exit criteria** - MVP definition of done in the Engineering
Specification is met. - Critical security and data-loss bugs are
closed. - Beta users can complete the main workflow.

------------------------------------------------------------------------

## 4. Suggested sprint backlog

### Sprint 0 --- Proof of concept

-   [ ] Agree supported plan types.
-   [ ] Collect permitted sample plans.
-   [ ] Define coordinate convention and units.
-   [ ] Build JSON-to-GLB proof of concept.
-   [ ] Choose first segmentation/detection baselines.
-   [ ] Draft UX flow and acceptance criteria.

### Sprint 1 --- Application foundation

-   [ ] Initialize frontend and backend repositories.
-   [ ] Configure local Docker environment.
-   [ ] Add auth and project CRUD.
-   [ ] Add database migrations.
-   [ ] Add private object storage.
-   [ ] Add upload validation.
-   [ ] Add queue and worker skeleton.
-   [ ] Add CI checks.

### Sprint 2 --- Processing foundation

-   [ ] Implement PDF page rasterization.
-   [ ] Implement image preprocessing.
-   [ ] Add job stage state machine.
-   [ ] Add job polling or server-sent events.
-   [ ] Save normalized image and preview.
-   [ ] Add worker retries and timeout behavior.

### Sprint 3 --- AI baseline

-   [ ] Finalize annotation schema.
-   [ ] Annotate first training/evaluation batch.
-   [ ] Train segmentation baseline.
-   [ ] Evaluate wall and room masks.
-   [ ] Implement door/window detection baseline.
-   [ ] Return confidence and model version.
-   [ ] Create visual overlay endpoint.

### Sprint 4 --- Vectorization

-   [ ] Extract wall candidates from masks.
-   [ ] Merge and snap line segments.
-   [ ] Extract room polygons.
-   [ ] Associate openings with host walls.
-   [ ] Add topology validation.
-   [ ] Add scale calibration.
-   [ ] Version canonical JSON schema.

### Sprint 5 --- 2D editor

-   [ ] Render source and vector overlay.
-   [ ] Add pan/zoom/selection.
-   [ ] Add wall editing and snapping.
-   [ ] Add room editing.
-   [ ] Add door/window editing.
-   [ ] Add undo/redo.
-   [ ] Save and reload revisions.

### Sprint 6 --- 3D generation

-   [ ] Generate wall solids.
-   [ ] Resolve wall intersections.
-   [ ] Generate floor meshes.
-   [ ] Add doors and windows.
-   [ ] Add geometry validation.
-   [ ] Render with Three.js.
-   [ ] Add 3D navigation and selection.

### Sprint 7 --- Export and release

-   [ ] Add GLB export job.
-   [ ] Validate generated GLB.
-   [ ] Add export download UI.
-   [ ] Add deletion and retention behavior.
-   [ ] Run end-to-end and security tests.
-   [ ] Verify backup/restore.
-   [ ] Run beta and prioritize fixes.

------------------------------------------------------------------------

## 5. Team responsibilities

  -----------------------------------------------------------------------
  Role                                Primary responsibility
  ----------------------------------- -----------------------------------
  Product manager / founder           Scope, user research, acceptance
                                      criteria, prioritization

  Product designer                    Upload flow, 2D/3D workspace,
                                      correction usability

  Frontend engineer                   Next.js, 2D editor, Three.js, API
                                      integration

  Backend engineer                    FastAPI, data model, auth, jobs,
                                      storage, exports

  ML/CV engineer                      Dataset, segmentation, detection,
                                      evaluation, inference

  Geometry engineer                   Vectorization, topology, parametric
                                      solids, mesh validation

  QA engineer                         Golden dataset, API/E2E tests,
                                      regression and release

  DevOps/platform engineer            CI/CD, secrets, environments,
                                      monitoring, backups
  -----------------------------------------------------------------------

In a small team, backend and geometry can be one role; ML and CV can be
one role. Do not omit product design or QA---manual correction is a
central part of the product.

------------------------------------------------------------------------

## 6. Acceptance criteria by capability

### Upload

-   Supported formats are explicit.
-   Invalid, oversized, or malformed files fail safely.
-   Source is stored privately.
-   User sees actionable error messages.

### AI extraction

-   Walls and rooms are returned in a documented schema.
-   Each inferred element includes confidence and provenance.
-   Unsupported/ambiguous cases are flagged.
-   Model and preprocessing versions are recorded.

### Scale

-   User can calibrate from a known dimension.
-   Unit conversion is consistent.
-   Estimated scale is visibly marked as estimated.
-   Dimensions update predictably when calibration changes.

### 2D editor

-   User can select, move, add, and delete supported elements.
-   Snap behavior is predictable and can be overridden.
-   Undo/redo works.
-   Edits persist as revisions.

### 3D

-   Wall height and thickness are editable.
-   Openings align to host walls.
-   2D and 3D selections stay synchronized.
-   Camera controls and fit-to-model work.
-   Geometry validation errors are visible.

### Export

-   GLB opens in a standards-compliant viewer.
-   Export contains expected scale and orientation.
-   Failed export does not mark the job successful.
-   Download URL is time-limited and access-controlled.

------------------------------------------------------------------------

## 7. Model evaluation and release gates

Create a held-out test set before selecting a production model.
Suggested metrics:

  Area                    Metric
  ----------------------- -------------------------------------------
  Wall segmentation       IoU, precision, recall
  Room segmentation       IoU and room-count accuracy
  Door/window detection   Precision, recall, mAP
  Wall geometry           Endpoint/centerline distance error
  Room geometry           Polygon IoU and area error
  Scale                   Relative dimension error
  Product usability       Correction count and time-to-usable-model

Do not set a model release threshold without reviewing the dataset and
use case. Define thresholds after baseline evaluation with
representative users. Release a model only when it improves the agreed
metrics without unacceptable regressions.

------------------------------------------------------------------------

## 8. Operational checklist

### Before beta

-   [ ] Authentication and authorization tested.
-   [ ] Private bucket and signed URLs verified.
-   [ ] Upload parser limits configured.
-   [ ] Queue retries and dead-letter behavior tested.
-   [ ] Worker concurrency bounded.
-   [ ] Logs include correlation/job IDs.
-   [ ] Errors do not expose secrets or source file contents.
-   [ ] Database backup and restore tested.
-   [ ] Project deletion and asset cleanup tested.
-   [ ] Model/data provenance documented.
-   [ ] User-facing accuracy limitations published.

### Before general availability

-   [ ] Load test representative upload and conversion volumes.
-   [ ] Cost per successful conversion measured.
-   [ ] Alerting configured for job failures and queue backlog.
-   [ ] Support workflow for failed conversions established.
-   [ ] Retention and privacy policy reviewed.
-   [ ] Disaster recovery procedure documented.
-   [ ] Security review completed.
-   [ ] Model drift and correction metrics monitored.

------------------------------------------------------------------------

## 9. Key risks and contingency plans

**AI detection is not good enough** - Ship assisted conversion: AI
proposes wall/room candidates, user traces or corrects them. - Narrow
supported input styles. - Improve data annotation before adding more
model complexity.

**Geometry output is unstable** - Keep a canonical parametric
representation. - Add topology repair and regression fixtures. - Do not
use raw generated meshes as the editable source of truth.

**Door/window detection is weak** - Allow manual placement in the 2D
editor. - Prioritize reliable walls and rooms first.

**Inference costs are high** - Resize images intelligently. - Use CPU
preprocessing and GPU only for model inference where needed. - Cache
outputs by immutable source asset and pipeline version. - Limit
free-tier job volume.

**Users expect construction-grade accuracy** - State clearly that output
is a visualization draft, not construction documentation. - Show
estimated dimensions and unresolved warnings. - Require professional
verification for construction use.

------------------------------------------------------------------------

## 10. First 10 engineering actions

1.  Create a repository and agree branch/review conventions.
2.  Write the canonical FloorPlan JSON schema and coordinate convention.
3.  Build a small deterministic JSON-to-GLB geometry prototype.
4.  Collect a legally usable set of representative plans.
5.  Annotate a small gold dataset and write annotation rules.
6.  Benchmark wall/room segmentation on that dataset.
7.  Stand up FastAPI, PostgreSQL, object storage, and queue locally.
8.  Implement secure upload and an asynchronous no-op processing job.
9.  Build the 2D overlay/review screen against mocked canonical JSON.
10. Run a vertical slice: upload → detect → review → 3D → GLB export.

**The first vertical slice is the most important milestone.** It proves
that AI output can become a usable editable model, rather than producing
only an attractive but structurally unreliable image.
