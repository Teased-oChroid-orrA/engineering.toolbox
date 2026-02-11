# Inspector UX Remediation Plan v1 (Namespaced Tickets)

Date: 2026-02-10  
Scope: Inspector-first fixes for window placement, query visibility, scroll jitter, and nested-card motion depth.  
Cross-tool consistency scope: Surface/Bushing card depth tuning parity.

## 1) Objectives
- Keep query tooling visible while users inspect and scroll datasets.
- Ensure utility windows (Shortcuts, Query Generator, etc.) open in visible viewport space.
- Eliminate row/cell jitter during scroll.
- Reduce nested-card over-tilt while preserving premium pop-card feel.

## 2) Ticket Namespace Mapping
- `INS-2xx`: Inspector UX remediation (primary scope).
- `STB-08x`: Surface toolbox parity for motion-depth policy.
- `BSH-12x`: Bushing toolbox parity for motion-depth policy.

## 3) Gate Plan

## Gate G0: Baseline + Diagnostics
Exit criteria:
- Repro steps captured for each issue.
- Root-cause hypotheses validated with logs/trace for placement and jitter.

### Tickets
1. `INS-200` Repro matrix for window placement failures (Shortcuts, Generator, Recipes, modals)
- Estimate: 2h
- Depends on: none
- Deliverable: matrix of trigger -> actual position -> viewport state -> expected position

2. `INS-201` Scroll jitter instrumentation for virtualized grid
- Estimate: 4h
- Depends on: none
- Deliverable: logs for row index, transform offsets, frame timings, overscan transitions

3. `INS-202` Motion stack audit for nested cards/wrappers
- Estimate: 2h
- Depends on: none
- Deliverable: map of components/classes applying tilt/lift/glow and stacking conflicts

---

## Gate G1: Window Placement Fix (Overlay Host)
Exit criteria:
- No utility window opens below table requiring scroll.
- All windows open fully visible and keyboard-accessible.

### Tickets
1. `INS-210` Add centralized overlay host (portal root, layer policy, safe z-index)
- Estimate: 5h
- Depends on: `INS-200`

2. `INS-211` Migrate Shortcuts window to overlay host with viewport-safe placement
- Estimate: 3h
- Depends on: `INS-210`

3. `INS-212` Migrate Query Generator and query-related helper windows to overlay host
- Estimate: 4h
- Depends on: `INS-210`

4. `INS-213` Add placement fallback policy (center default, anchored when possible, never offscreen)
- Estimate: 3h
- Depends on: `INS-210`

5. `INS-214` A11y hardening for overlays (ESC, focus trap, focus return, tab order)
- Estimate: 3h
- Depends on: `INS-211`, `INS-212`

---

## Gate G2: Sticky Query Layer Above Headers
Exit criteria:
- Query + multi-query chain always visible while dataset scrolls.
- Filtering feedback visible without scrolling away from controls.

### Tickets
1. `INS-220` Build sticky query bar shell above table headers
- Estimate: 6h
- Depends on: `INS-200`

2. `INS-221` Move query inputs and controls into sticky bar (no behavior regression)
- Estimate: 4h
- Depends on: `INS-220`

3. `INS-222` Inline multi-query chain compact/expanded states (no popup)
- Estimate: 3h
- Depends on: `INS-221`

4. `INS-223` Sync sticky query bar with dataset switches, recipe apply/reset, and scope mode
- Estimate: 4h
- Depends on: `INS-221`

5. `INS-224` Header offset and sticky stacking correction (query bar + headers + table body)
- Estimate: 3h
- Depends on: `INS-220`

---

## Gate G3: Scroll Jitter Elimination
Exit criteria:
- No visible up/down row jumps during normal and rapid scroll.
- Regression test coverage for jitter scenarios.

### Tickets
1. `INS-230` Stabilize row positioning (pixel-snapped translate strategy)
- Estimate: 4h
- Depends on: `INS-201`

2. `INS-231` Remove conflicting transitions during scroll (virtual rows/cells)
- Estimate: 3h
- Depends on: `INS-201`

3. `INS-232` Enforce fixed row-height contract and guard dynamic-height content in viewport rows
- Estimate: 4h
- Depends on: `INS-201`

4. `INS-233` Add scroll smoothness regression test (large dataset, wheel + trackpad behavior)
- Estimate: 5h
- Depends on: `INS-230`, `INS-231`, `INS-232`

---

## Gate G4: Motion Depth Refinement
Exit criteria:
- Inner cards no longer over-tilt.
- Outer cards retain branded pop-card identity.

### Tickets
1. `INS-240` Define motion depth tokens/classes (`depth-0`, `depth-1`, `depth-2`)
- Estimate: 3h
- Depends on: `INS-202`

2. `INS-241` Apply nested-card downgrade policy in Inspector
- Estimate: 4h
- Depends on: `INS-240`

3. `INS-242` Preserve rim glow/pop while reducing inner tilt/parallax
- Estimate: 3h
- Depends on: `INS-241`

4. `STB-085` Apply motion-depth token parity in Surface toolbox
- Estimate: 3h
- Depends on: `INS-240`

5. `BSH-122` Apply motion-depth token parity in Bushing toolbox
- Estimate: 3h
- Depends on: `INS-240`

---

## Gate G5: Hardening + Release Readiness
Exit criteria:
- E2E coverage passing for placement/visibility/scroll smoothness.
- Documented policy to prevent regressions.

### Tickets
1. `INS-250` E2E: utility windows always open inside viewport at any table scroll position
- Estimate: 4h
- Depends on: `INS-211`, `INS-212`, `INS-213`

2. `INS-251` E2E: sticky query bar remains visible and functional through scrolling/filtering
- Estimate: 4h
- Depends on: `INS-224`

3. `INS-252` E2E/perf: jitter-free scrolling benchmark with pass threshold
- Estimate: 5h
- Depends on: `INS-233`

4. `INS-253` UX standards doc update (overlay placement + sticky-query + motion-depth policy)
- Estimate: 3h
- Depends on: `INS-214`, `INS-242`, `STB-085`, `BSH-122`

5. `INS-254` Final QA checklist and release note
- Estimate: 2h
- Depends on: `INS-250`, `INS-251`, `INS-252`, `INS-253`

## 4) Dependency DAG (Condensed)
- `G0 -> G1, G2, G3, G4`
- `G1` and `G2` can run in parallel after `G0`
- `G3` starts after `INS-201` instrumentation findings
- `G4` starts after motion audit (`INS-202`)
- `G5` depends on all prior gate outcomes

## 5) Suggested Execution Sequence
1. `INS-200` -> `INS-201` -> `INS-202`
2. `INS-210` -> `INS-211` + `INS-212` -> `INS-213` -> `INS-214`
3. `INS-220` -> `INS-221` -> `INS-222` + `INS-223` -> `INS-224`
4. `INS-230` -> `INS-231` + `INS-232` -> `INS-233`
5. `INS-240` -> `INS-241` -> `INS-242` -> `STB-085` + `BSH-122`
6. `INS-250` -> `INS-251` -> `INS-252` -> `INS-253` -> `INS-254`

## 6) Capacity / Estimate Rollup
- Total estimate: 94 hours
- Suggested staffing:
  - 1 UI engineer (overlay/query/motion)
  - 1 data-grid engineer (virtualization/jitter/perf)
  - 1 QA/automation engineer (E2E + release checks)

## 7) Definition of Done (Global)
- Query controls and multi-query chain visible without scrolling the table.
- No utility feature opens outside user-visible viewport.
- Scroll jitter is not observable in acceptance scenarios.
- Nested-card motion is intentionally reduced while preserving visual quality.
- E2E checks and `npm run -s check` pass.
