# Surface Toolbox Execution Plan V4

## Purpose
This plan converts the current Surface toolbox improvement backlog into an execution roadmap with explicit gates, tickets, parallel work groups, and completion criteria.

## Progress Model
Each gate is tracked as one visible progress unit:
- `pending`
- `in_progress`
- `completed`

Parallel-capable tickets are grouped inside each gate so implementation can advance in batches while still keeping a simple visible gate-level progress tracker.

## Execution Order
1. G1 Offset Workflow Redesign
2. G2 Guided Viewport Builder
3. G3 Progressive Disclosure and Contextual UI
4. G4 Precision and Exact Geometry Control
5. G5 Viewport Navigation and Spatial Readability
6. G6 Beginner vs Expert UX
7. G7 Performance and Architecture
8. G8 Regression and Verification

---

## G1 Offset Workflow Redesign
Goal: replace the current abstract offset-intersection flow with an explicit geometry workflow.

### Tickets
- `G1-T1` State model redesign
  - Remove the single shared offset/intersection state model.
  - Add independent state for:
    - line A selection
    - support surface A selection
    - offset distance X
    - line B selection
    - support surface B selection
    - offset distance Y
    - computed crossing preview
    - final placed crossing point

- `G1-T2` Independent offset preview A
  - Offset line A along surface A normal by amount `X`.
  - Render preview with a distinct dotted style and color.

- `G1-T3` Independent offset preview B
  - Offset line B along surface B normal by amount `Y`.
  - Render preview with a different dash pattern and color.

- `G1-T4` Surface-direction logic and flipping
  - Support surface-normal direction selection.
  - Add independent `Flip` controls for A and B.

- `G1-T5` Crossing computation
  - Compute the crossing of the two independently offset lines.
  - Show live preview state for:
    - exact intersection
    - skew / near miss
    - parallel / invalid

- `G1-T6` Crossing-point commit
  - Add `Place Crossing Point`.
  - Insert the result into geometry as one undoable transaction.

- `G1-T7` Viewport-first interaction flow
  - Make the full flow work directly in the viewport:
    - pick line A
    - pick surface A
    - set X
    - pick line B
    - pick surface B
    - set Y
    - preview crossing
    - place point

### Parallel Groups
- Group A:
  - `G1-T1`
  - `G1-T2`
  - `G1-T3`
- Group B:
  - `G1-T4`
  - `G1-T5`
- Group C:
  - `G1-T6`
  - `G1-T7`

### Done Criteria
- Two independent offset preview lines are visible.
- Crossing preview is clear and reliable.
- Final point placement is undoable.
- Viewport flow works without requiring the right rail.

---

## G2 Guided Viewport Builder
Goal: make geometry creation obvious and sequential.

### Tickets
- `G2-T1` Persistent mode badge
  - Show a clear active badge for:
    - `Point Mode`
    - `Line Mode`
    - `Surface Mode`
    - `Offset Mode`

- `G2-T2` Step-by-step instruction strip
  - Show the exact next required action for the current tool.

- `G2-T3` Stronger line previews
  - Improve ghost line visibility.
  - Add endpoint snap indicator.

- `G2-T4` Stronger surface previews
  - Number boundary picks.
  - Show close-loop affordance.
  - Show invalid boundary warning before commit.

- `G2-T5` Finish/cancel controls
  - Standardize:
    - `Enter`
    - `Backspace`
    - `Escape`
    - explicit `Finish` / `Cancel`

- `G2-T6` Daisy-chain line UX refinement
  - Make daisy-chain mode visually obvious.
  - Show the carried endpoint as the next start anchor.

### Parallel Groups
- Group A:
  - `G2-T1`
  - `G2-T2`
- Group B:
  - `G2-T3`
  - `G2-T4`
- Group C:
  - `G2-T5`
  - `G2-T6`

### Done Criteria
- The next click is always obvious.
- Preview geometry is stronger than static chrome.
- Line and surface draft states are visually unambiguous.

---

## G3 Progressive Disclosure and Contextual UI
Goal: hide controls until they are relevant.

### Tickets
- `G3-T1` Audit always-visible controls
  - Identify controls that should stay hidden until prerequisites exist.

- `G3-T2` Builder progressive disclosure
  - Hide sub-settings until:
    - enough points exist
    - enough lines exist
    - a surface exists
    - an entity is selected

- `G3-T3` Context menu expansion
  - Right-click point:
    - delete
    - connect
    - begin surface
    - isolate
  - Right-click line:
    - delete
    - offset
    - duplicate
    - isolate
  - Right-click surface:
    - place point on surface
    - use as offset support
    - isolate
    - delete

- `G3-T4` Selection-driven inspector
  - Show contextual properties only when something is selected.

- `G3-T5` Destructive-action clarity
  - Add confirmation previews for cascade deletes and dependent geometry changes.

### Parallel Groups
- Group A:
  - `G3-T1`
  - `G3-T2`
- Group B:
  - `G3-T3`
  - `G3-T4`
- Group C:
  - `G3-T5`

### Done Criteria
- Idle UI is quieter.
- Users are not shown irrelevant settings.
- Context actions reduce panel hunting.

---

## G4 Precision and Exact Geometry Control
Goal: make the toolbox precise, not only visually interactive.

### Tickets
- `G4-T1` Snapping system expansion
  - Support snaps for:
    - points
    - midpoints
    - line projections
    - surface interiors
    - intersections

- `G4-T2` Snap mode toggles
  - Let users enable/disable snap classes explicitly.

- `G4-T3` Numeric transforms for selected geometry
  - Move by vector
  - Copy by vector
  - Rotate by angle
  - Scale from anchor

- `G4-T4` Exact-entry geometry commands
  - Create point from tuple
  - Create line from explicit point IDs
  - Create surface from ordered point list

- `G4-T5` Constraint helpers
  - Axis-locked move
  - Surface-normal move
  - Equal-distance / parallel helper prompts

### Parallel Groups
- Group A:
  - `G4-T1`
  - `G4-T2`
- Group B:
  - `G4-T3`
  - `G4-T4`
- Group C:
  - `G4-T5`

### Done Criteria
- Users can create/edit geometry exactly.
- Snapping is explicit and controllable.
- Numeric workflows do not require mouse-only precision.

---

## G5 Viewport Navigation and Spatial Readability
Goal: improve spatial orientation and reduce visual overload.

### Tickets
- `G5-T1` Navigation hint system
  - Small persistent hint for drag, pan, zoom, fit, and reset.

- `G5-T2` Orientation cube / view gizmo
  - Clickable views:
    - Top
    - Front
    - Right
    - Iso

- `G5-T3` Label discipline
  - Show labels only for:
    - hovered
    - selected
    - active edit targets

- `G5-T4` Depth cue refinement
  - Strengthen near/far differentiation for points, lines, surfaces, and previews.

- `G5-T5` Preview readability parity
  - Apply the same depth hierarchy to draft and offset previews.

### Parallel Groups
- Group A:
  - `G5-T1`
  - `G5-T2`
- Group B:
  - `G5-T3`
  - `G5-T4`
- Group C:
  - `G5-T5`

### Done Criteria
- View orientation is obvious.
- Labels no longer dominate the viewport.
- Draft geometry remains readable at all zoom levels.

---

## G6 Beginner vs Expert UX
Goal: make the toolbox usable for new users without limiting power users.

### Tickets
- `G6-T1` Introduce `Beginner` mode
  - Minimal controls
  - Guided actions
  - Reduced visual density

- `G6-T2` Introduce `Expert` mode
  - Dense controls
  - Advanced tools
  - Shortcut emphasis

- `G6-T3` Empty-state guidance
  - Replace dead controls with direct instructions.

- `G6-T4` Mode persistence
  - Remember the selected UX tier per workspace.

### Parallel Groups
- Group A:
  - `G6-T1`
  - `G6-T2`
- Group B:
  - `G6-T3`
  - `G6-T4`

### Done Criteria
- New users are not overwhelmed.
- Power users still have fast access to advanced operations.
- Empty states explain what is missing.

---

## G7 Performance and Architecture
Goal: keep the Surface route responsive as the feature set grows.

### Tickets
- `G7-T1` Surface route code splitting
  - Lazy-load heavy panels and advanced modals.

- `G7-T2` Right-rail modular loading
  - Defer advanced sections until they are opened.

- `G7-T3` Viewport render budget refinement
  - Tune large-scene interaction to prioritize responsiveness.

- `G7-T4` Performance telemetry cleanup
  - Keep diagnostics useful but non-intrusive.

- `G7-T5` Chunk-size reduction pass
  - Reduce oversized client chunks with better split points.

### Parallel Groups
- Group A:
  - `G7-T1`
  - `G7-T2`
- Group B:
  - `G7-T3`
  - `G7-T4`
- Group C:
  - `G7-T5`

### Done Criteria
- Surface route loads faster.
- Heavy UI is not eagerly loaded.
- Large scenes remain usable.

---

## G8 Regression and Verification
Goal: prevent interaction regressions.

### Tickets
- `G8-T1` Playwright point-flow tests
  - place on surface
  - off-surface XYZ popup
  - commit point

- `G8-T2` Playwright line-flow tests
  - line creation
  - daisy-chain off
  - daisy-chain on

- `G8-T3` Playwright surface-flow tests
  - chain boundary
  - close contour
  - cancel draft

- `G8-T4` Playwright offset workflow tests
  - both offset previews
  - crossing preview
  - crossing point placement

- `G8-T5` Failure-mode tests
  - invalid geometry
  - parallel lines
  - missing surface
  - delete cascade

### Parallel Groups
- Group A:
  - `G8-T1`
  - `G8-T2`
- Group B:
  - `G8-T3`
  - `G8-T4`
- Group C:
  - `G8-T5`

### Done Criteria
- Core viewport interactions are covered by end-to-end tests.
- Failure modes are explicit and test-protected.
- Behavior changes are less likely to regress silently.

---

## Global Definition of Done
A gate is complete only when:
- the target interaction works in the viewport-first flow
- irrelevant controls remain hidden until needed
- undo/redo remains coherent
- `npx svelte-check --tsconfig ./tsconfig.json` passes
- `npm run build` passes
- applicable Playwright coverage is added or updated

## Recommended Immediate Next Gate
Start with `G1: Offset Workflow Redesign`.
It addresses the most confusing geometry workflow and directly matches the current requested behavior.
