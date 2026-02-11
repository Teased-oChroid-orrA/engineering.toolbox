# BAB-04

Status: TODO
Owner: Unassigned

## Goal
Implement gate BAB-04 from /Users/nautilus/Desktop/StructuralCompanionDesktop/implementation/bushing-d3-to-babylon-plan-v1/PLAN.md.

## Acceptance
- Gate-specific exit criteria from PLAN.md are satisfied.
- No regression in [Bushing architecture] Checks: OK
[Bushing path integrity] sentinel: ${BUSHING_SCENE_MODULE_ID}@${BUSHING_SCENE_MODULE_VERSION}
[Bushing path integrity] PASS

Running 1 test using 1 worker

  ✓  1 tests/bushing-trace.spec.ts:9:3 › bushing trace logger › captures raw -> normalized -> solved -> rendered chain (8ms)

  1 passed (1.3s)

Running 3 tests using 1 worker

  ✓  1 tests/bushing-render-mode-contract.spec.ts:8:3 › bushing render mode contract › legacy and section mode produce intentionally different markup (6ms)
  ✓  2 tests/bushing-section-profile.spec.ts:9:3 › bushing section profile schema › builds closed loops with material + void region classification (4ms)
  ✓  3 tests/bushing-section-profile.spec.ts:26:3 › bushing section profile schema › supports dynamic variants without invalid topology (8ms)

  3 passed (1.3s)

Running 2 tests using 1 worker

  ✓  1 tests/bushing-formula-audit.spec.ts:6:3 › bushing formula audit › inventory is present and references solver locations (18ms)
  ✓  2 tests/bushing-formula-audit.spec.ts:15:3 › bushing formula audit › press-fit pressure is monotonic with interference in positive-fit regime (5ms)

  2 passed (888ms)

Running 2 tests using 1 worker

  ✓  1 tests/bushing-hoop-margin.spec.ts:10:3 › bushing hoop stress and margin verification › hoop margin tracks allowable/demand relation for housing and bushing (12ms)
  ✓  2 tests/bushing-hoop-margin.spec.ts:26:3 › bushing hoop stress and margin verification › increased interference lowers margins in same material regime (8ms)

  2 passed (1.0s)

Running 2 tests using 1 worker

  ✓  1 tests/bushing-edge-distance.spec.ts:6:3 › bushing edge-distance verification › governing mode is deterministic from minima comparison (5ms)
  ✓  2 tests/bushing-edge-distance.spec.ts:12:3 › bushing edge-distance verification › failing edge distance emits deterministic warning codes (2ms)

  2 passed (866ms)

Running 3 tests using 1 worker

  ✓  1 tests/bushing-countersink-consistency.spec.ts:5:3 › bushing countersink consistency › depth_angle <-> dia_angle round-trip consistency (3ms)
  ✓  2 tests/bushing-countersink-consistency.spec.ts:14:3 › bushing countersink consistency › dia_depth computes stable angle and reconstructs depth (2ms)
  ✓  3 tests/bushing-countersink-consistency.spec.ts:23:3 › bushing countersink consistency › dia_angle clamps negative depth solutions to zero (1ms)

  3 passed (875ms)

Running 2 tests using 1 worker

  ✓  1 tests/bushing-pipeline-cache.spec.ts:14:3 › bushing compute pipeline cache › returns cache hit for equivalent normalized inputs (15ms)
  ✓  2 tests/bushing-pipeline-cache.spec.ts:23:3 › bushing compute pipeline cache › invalidates cache on relevant input changes (2ms)

  2 passed (1.3s)
[golden:bushing] PASS: 3 cases match.
[golden:bushing:dataset-pack] wrote golden/bushing_dataset_pack/bushing_combined.csv and metadata

Running 3 tests using 1 worker

  ✓  1 tests/bushing-solver.spec.ts:6:3 › bushing solver regression › covers straight/flanged/countersink modes (6ms)
  ✓  2 tests/bushing-solver.spec.ts:24:3 › bushing solver regression › metric/imperial conversion stays physically consistent (4ms)
  ✓  3 tests/bushing-solver.spec.ts:49:3 › bushing solver regression › invalid input produces warning codes and best-effort output (1ms)

  3 passed (904ms)

Running 2 tests using 1 worker

  ✓  1 tests/bushing-drafting-parity.spec.ts:47:3 › bushing drafting parity › straight/flanged/countersink export contains live section geometry from same model (21ms)
  ✓  2 tests/bushing-drafting-parity.spec.ts:81:3 › bushing drafting parity › feature-shape checks catch regressions across profile modes (1ms)

  2 passed (1.3s)

Running 7 tests using 1 worker

  ✓  1 tests/visual/bushing-cards.spec.js:10:3 › bushing cards visual tokens › semantic card tokens are present and dark-text regressions are absent (9ms)
  ✓  2 tests/visual/bushing-figure.spec.ts:24:5 › bushing visual snapshots › snapshot:straight (5ms)
  ✓  3 tests/visual/bushing-figure.spec.ts:24:5 › bushing visual snapshots › snapshot:flanged (1ms)
  ✓  4 tests/visual/bushing-figure.spec.ts:24:5 › bushing visual snapshots › snapshot:countersink (2ms)
  ✓  5 tests/visual/bushing-section-baseline.spec.ts:21:5 › bushing section baseline snapshots › section-baseline:straight (1ms)
  ✓  6 tests/visual/bushing-section-baseline.spec.ts:21:5 › bushing section baseline snapshots › section-baseline:flanged (1ms)
  ✓  7 tests/visual/bushing-section-baseline.spec.ts:21:5 › bushing section baseline snapshots › section-baseline:countersink (1ms)

  7 passed (1.4s)

Running 1 test using 1 worker

  ✓  1 tests/bushing-render-stress.spec.ts:9:3 › bushing render stress › recompute and rerender loop stays stable (39ms)

  1 passed (1.5s)

Running 2 tests using 1 worker

  ✓  1 tests/bushing-smoke.spec.ts:8:3 › bushing smoke › compute + live render path are healthy (9ms)
  ✓  2 tests/bushing-smoke.spec.ts:17:3 › bushing smoke › export artifact path produces svg + report html (2ms)

  2 passed (1.5s)
Error: Process from config.webServer was not able to start. Exit code: 1 at batch boundaries.
