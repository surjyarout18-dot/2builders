# Testing Workflow

Comprehensive quality assurance pipeline for unit tests, canvas math, and browser verification.

## Associated Skills
- `test-driven-development`
- `webapp-testing`
- `playwright-cli`
- `verification-before-completion`

## Workflow Steps

1. **Geometry Engine & Mathematical Verification**:
   - Verify polygon centroid calculation for rooms.
   - Verify wall footprint extrusion geometry (`WallBuilder.computeFootprint`).
   - Validate Vastu 8-zone orientation math with arbitrary north rotation degrees.

2. **UI & Canvas Regression Testing**:
   - Test 2D Canvas under zoom levels (0.2x, 0.5x, 1.0x, 2.0x).
   - Ensure wall dimension strings do not render when wall screen length < 42px.
   - Ensure room badges remain centered and never overlap adjacent rooms.

3. **3D Viewport Interaction Testing**:
   - Verify Three.js scene initializes without WebGL context loss.
   - Test realistic vs CAD engineering shading toggles.
   - Test cutaway 900mm wall clipping and 360° cinematic tour transitions.

4. **Automated Verification Gate**:
   - Execute verification command before claiming completion:
     ```powershell
     npm --prefix frontend run build
     ```
   - Must output exit code 0.
