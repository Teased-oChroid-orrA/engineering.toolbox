# Surface Toolbox Next Plan (v1)

## Scope
Implement six high-impact improvements with gate-based delivery and parallelizable tickets:
1. Canvas context actions (right-click point/line)
2. Multi-select delete with cascade preview + confirmation
3. Geometry integrity panel
4. Large-dataset performance mode
5. Command palette (Cmd/Ctrl+K)
6. D3/SVG rendering excellence and theme system expansion

## Delivery Gates

### Gate G0: Stability Baseline (blocking)
- Fix stale-index crashes for selection/deletion paths.
- Harden derived state reads for invalid entities.
- Acceptance:
  - No runtime crash when repeatedly deleting mixed points/lines.
  - svelte-check clean.

### Gate G1: Context Actions
- Add right-click context actions for point/line.
- Actions:
  - Point: delete point (cascade lines), connect from/to, isolate connected lines.
  - Line: delete line only, isolate endpoint neighborhood.
- Acceptance:
  - Context menu appears at cursor and actions operate on hovered entity.
  - Keyboard fallback available from selected entity panel.

### Gate G2: Multi-delete + Cascade Preview
- Add selection-based delete flow (Delete key + toolbar action).
- Preview panel shows:
  - selected points, selected lines
  - dependent lines to be deleted from point cascade
  - post-delete counts
- Confirmation required for destructive action.
- Acceptance:
  - Delete key opens preview modal when selection is non-empty.
  - Undo restores full pre-delete state.

### Gate G3: Integrity Panel
- Add geometry integrity analyzer with sections:
  - orphan points
  - duplicate lines (undirected edge duplicates)
  - non-manifold line incidents (configurable threshold)
- Add quick-fix actions where safe.
- Acceptance:
  - Panel updates after every geometry mutation.
  - Quick-fix operations are undoable.

### Gate G4: Performance Mode
- Add performance mode toggle with:
  - viewport decimation (adaptive point/line draw budget)
  - worker-based hit-testing for hover/selection candidate generation
  - runtime telemetry (frame time, hit-test latency)
- Acceptance:
  - 50k point synthetic dataset remains interactive under mode.
  - Selection correctness parity on sampled regression set.

### Gate G5: Command Palette
- Cmd/Ctrl+K opens palette.
- Include commands for geometry creation/deletion/isolation, datums, exports, integrity actions.
- Add fuzzy command search + shortcut hints.
- Acceptance:
  - Palette can execute all core create/delete actions without mouse.
  - Commands are discoverable and grouped by category.

### Gate G6: D3/SVG Render Core Hardening
- Keep D3/SVG as the only renderer path.
- Improve rendering organization with strict scene layering and visibility controls.
- Add renderer-state diagnostics in the UI (active theme, isolation state, draw-budget mode).
- Acceptance:
  - No runtime references to alternate renderer backends.
  - Stable rendering behavior during high-frequency edits and deletes.

### Gate G7: Creative Visual Upgrade (D3-native)
- Introduce modern visual language in D3/SVG path:
  - cinematic gradients and atmospheric backgrounds
  - expressive stroke systems and selection halos
  - staged transitions for geometry visibility changes
- Add theme profiles (Technical, Studio, High Contrast, Aurora).
- Acceptance:
  - Visual quality uplift is measurable in UX review snapshots.
  - 60 FPS target on representative desktop profile with default theme.

### Gate G8: Safety and Tuning
- Add telemetry for D3 render cost (visible points/lines, slice size, interaction latency).
- Add protective throttles for hover and selection under large datasets.
- Acceptance:
  - Crash-free burn-in run across deletion/create/edit flows.
  - No regression in selection accuracy or undo behavior.

## Test Gates
- `svelte-check` must pass at each gate.
- Rust build and Tauri integration checks must pass.
- Add or update tests:
  - deletion-cascade regression
  - context-action smoke
  - integrity analyzer unit tests
  - performance-mode guardrail test (synthetic dataset)
  - command palette keybinding smoke
  - D3 renderer layering snapshot checks

## Parallelization Strategy
- Track A: Context + command interaction (G1, G5 partial)
- Track B: Deletion engine + cascade preview (G2)
- Track C: Integrity analyzer + panel (G3)
- Track D: Perf infrastructure + worker hit-test (G4)
- Track E: D3 rendering quality + theme system + diagnostics (G6-G8)
- Integrate on each gate with conflict window limited to orchestrator wiring.
