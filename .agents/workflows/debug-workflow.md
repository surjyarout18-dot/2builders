# Debugging Workflow

Standardized procedure for root-cause diagnosis, UI overlapping fixes, rendering glitches, and runtime issues.

## Associated Skills
- `systematic-debugging`
- `chrome-devtools`
- `memory-leak-debugging`
- `debug-optimize-lcp`

## Workflow Steps

1. **Reproduce & Capture**:
   - Inspect user logs, screenshots, and browser console output.
   - Locate specific component tree and viewport mode (`split`, `2d`, `3d`).

2. **Formulate Falsifiable Hypothesis**:
   - Trace CSS hierarchy, absolute positioning (`top`, `left`, `right`), z-indexes, and flex bounding boxes.
   - Verify container width in split mode (`w-1/2` vs `w-full`).

3. **Instrument & Verify Root Cause**:
   - Use non-destructive logging or visual borders (`outline`) to confirm collision points.
   - Identify uncoordinated floating toolbars or overlapping canvas rendering routines.

4. **Apply Minimal Targeted Fix**:
   - Re-architect layout into unified flex containers or collision-safe pill badges.
   - Enforce `overflow-hidden` on parent panels.

5. **Regression Verification**:
   - Verify on both desktop and mobile resolutions.
   - Confirm with `npm run build`.
