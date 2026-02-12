# Bushing DnD Nested Reorder Plan V3 (Ground-Up Library Rebuild)

## 1. Objective
Replace the current custom drag/drop path with a deterministic, nested sortable implementation that supports:
- reliable top-level container reorder
- reliable nested card reorder (inside containers such as `Detailed Diagnostics`)
- smooth hover-driven live displacement while dragging
- strict parent/child lane isolation
- persistence and collapse compatibility

Primary success condition:
- no snap-back after drop
- parent containers and nested cards can both be reordered and remain reordered after reload

## 2. Decision
Adopt library-based DnD with `svelte-dnd-action`.

Why:
- mature pointer/mouse/touch handling
- native support for nested sortable zones
- live hover insertion behavior without custom race-prone DOM logic

## 3. Rejected Approaches
### A) Continue patching custom HTML5/pointer DnD
Rejected because repeated regressions indicate event-order races and non-deterministic drop commit.

### B) Build custom pointer state machine from scratch
Rejected because complexity/maintenance cost is high and accessibility parity is harder.

## 4. Scope
### In scope
- top-level lane reorder (`left`, `right`)
- nested diagnostics card reorder (`edge`, `wall`, `warnings`)
- hover insertion cue and animated reflow
- persistent order migration (`layout.v2` -> `layout.v3`)
- collapse sections compatible with reorder
- keyboard fallback controls

### Out of scope
- cross-tool shared DnD infrastructure
- broad mobile gesture customizations beyond library defaults
- major visual redesign outside drag affordances

## 5. Constraints
- preserve bushing architecture/file-size policy
- avoid growing orchestrator into a state-heavy monolith
- maintain deterministic e2e coverage for parent and nested lanes

## 6. Architecture
### 6.1 Lane model
Lanes:
- `bushing:left`
- `bushing:right`
- `bushing:diagnostics:cards`

Each lane owns:
- `ids[]` order
- accepted drag type(s)
- persistence key

### 6.2 Components
- `src/lib/components/bushing/BushingSortableLane.svelte` (new)
  - thin wrapper over `svelte-dnd-action`
  - emits `consider`/`finalize` reorder events
- `src/lib/components/bushing/BushingDraggableCard.svelte` (refactor)
  - drag handle UI + collapse header + keyboard move controls
- `src/lib/components/bushing/BushingDiagnosticsPanel.svelte` (refactor)
  - nested lane host, no parent-lane drag side effects
- `src/lib/components/bushing/BushingOrchestrator.svelte` (thin wiring)
  - lane state assembly, persistence hooks, no custom DnD engine

### 6.3 Persistence
- top-level key: `scd.bushing.layout.v3`
- nested key: `scd.bushing.layout.v3.diagnostics`
- collapse key(s): unchanged per card id

Migration:
1. read `v3` when present
2. else read `v2`, normalize ids, write `v3`
3. never write `v2` again

### 6.4 Accessibility
- drag handles focusable
- per-card `Move Up` / `Move Down` fallback controls
- ARIA labels include lane and card position
- post-move focus restoration

## 7. UX Contract
1. Drag handle starts reorder for the targeted item only.
2. Hovering another item displaces it immediately (live preview).
3. Drop commits the visual order.
4. Reload keeps that exact order.
5. Dragging child card never drags whole parent container.
6. Dragging parent container never mutates child card order.
7. Collapse state survives reorder and reload.

## 8. Gate Plan (Entry/Exit Criteria)
### Gate 0 - Repro Baseline + Instrumentation
Entry:
- current app exhibits snap-back/non-commit behavior
Exit:
- failing automated repro exists
- dev-only logs confirm event order for start/consider/finalize/cancel

### Gate 1 - Library Integration Skeleton
Entry:
- Gate 0 complete
Exit:
- `svelte-dnd-action` installed
- `BushingSortableLane.svelte` created and sorts a static lane reliably

### Gate 2 - Top-Level Lane Migration
Entry:
- Gate 1 complete
Exit:
- left/right lanes use library wrapper only
- dropping card commits and persists
- obsolete top-level custom drag code removed

### Gate 3 - Nested Diagnostics Lane Migration
Entry:
- Gate 2 complete
Exit:
- diagnostics child cards reorder within container
- no whole-container drag when dragging child card
- nested order persists

### Gate 4 - Hover and Transition Quality
Entry:
- Gate 3 complete
Exit:
- hovered target shifts into insertion preview position
- no snap-back, no flicker, no duplicate ghost artifacts

### Gate 5 - Accessibility + Collapse Robustness
Entry:
- Gate 4 complete
Exit:
- keyboard fallback reorder works
- collapse/expand remains correct before and after reorder

### Gate 6 - Migration + Safety Controls
Entry:
- Gate 5 complete
Exit:
- v2->v3 migration safe on stale/invalid ids
- feature flag rollback path documented and wired

### Gate 7 - Verification + Release
Entry:
- Gate 6 complete
Exit:
- `npm run -s check` green
- `npm run -s verify:bushing-e2e-smoke` green
- manual QA matrix complete
- release notes + rollback note complete

## 9. Testing Strategy
### Automated
- unit: normalization/migration helpers
- e2e:
  - top-level reorder commit + reload persistence
  - nested reorder commit + reload persistence
  - parent/child isolation assertions
  - collapse state survives reorder/reload
  - keyboard fallback controls

### Manual
- reorder first->last and last->first in all lanes
- reorder with page scroll
- reorder in collapsed and mixed collapse state
- run export and core calculations after reorder

## 10. Risk Register
- nested lane misconfiguration causing parent drag capture
- persistence key mismatch leading to apparent snap-back
- orchestrator size creep breaking file policy
- flake in DnD e2e due to timing

Mitigations:
- strict lane type guards
- shared reorder commit helper
- keep DnD logic isolated to lane component
- stable deterministic drag helpers in tests

## 11. Rollback Strategy
Feature flag:
- `scd.bushing.dnd.enabled`

Rollback behavior:
- when off, hide drag handles and keep keyboard move controls
- preserve stored order and collapse states

## 12. Deliverables
- library-backed lane component and migrations
- updated bushing components with parent/nested reorder support
- revised tests and QA matrix
- release and rollback documentation
