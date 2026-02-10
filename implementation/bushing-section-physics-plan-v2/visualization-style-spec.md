# Section Visualization Style Spec

## Objective
Render a true engineering-style section view for bushings/housings where only cut material is hatched, voids remain clear, and geometry is dynamically driven by solver output.

## Section semantics
1. Section plane defines the cut.
2. Any region intersected by the cut and containing material is a sectioned region.
3. Any internal bore/void/cavity is not sectioned and must remain unhatched.
4. Hidden internals should not be shown unless explicitly required by mode.

## Geometry contract
- Build scene from connected primitives only:
  - `Point`
  - `Line`
  - `Arc`
- Convert primitives to closed loops.
- Classify loops into:
  - outer material boundary
  - inner material boundary
  - void boundaries

## Rendering layers (fixed order)
1. Background/grid (low contrast).
2. Sectioned housing material (hatch style A).
3. Sectioned bushing material (hatch style B).
4. Bore/void mask (solid background color, no hatch).
5. Visible outlines (strong stroke).
6. Centerlines (dash pattern).
7. Labels/annotations.

## Drafting rules
- Section hatch orientation: default 45 degrees for primary region.
- Adjacent material regions use different hatch angle/spacing.
- Hatch lines must not continue across part boundaries.
- Labels should avoid hatch-heavy areas when possible.

## Dynamic update requirements
- Any change in `form` that affects geometry must update:
  - profile loops
  - region classification
  - hatch masks
  - annotation anchors
- No mode should render stale cached geometry.

## Export parity
- On-screen SVG and exported SVG/PDF must share one renderer pipeline.
- Export and viewport from same scene object for deterministic parity.
