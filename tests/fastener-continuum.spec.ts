import { expect, test } from '@playwright/test';
import { buildNumericExample } from '../src/lib/core/fastener';
import {
  buildContinuumModelFromFastener,
  runMeshRefinementStudy,
  solveContinuumModel
} from '../src/lib/core/fastener/continuum';

test.describe('fastener continuum axisymmetric solver', () => {
  test('builds solvable continuum model from fastener input', async () => {
    const fastener = buildNumericExample('imperial').input;
    const model = buildContinuumModelFromFastener(fastener);
    const out = solveContinuumModel(model);

    expect(out.errors).toEqual([]);
    expect(out.mesh.nodeCount).toBeGreaterThan(0);
    expect(out.mesh.elementCount).toBeGreaterThan(0);
    expect(Number.isFinite(out.solved.residualNorm)).toBeTruthy();
  });

  test('produces integrated layer transfer outputs for all layers', async () => {
    const fastener = buildNumericExample('metric').input;
    const model = buildContinuumModelFromFastener(fastener);
    const out = solveContinuumModel(model);

    expect(out.layers.length).toBe(model.layers.length);
    expect(out.layers.every((l) => Number.isFinite(l.boltForce))).toBeTruthy();
    expect(out.layers.every((l) => Number.isFinite(l.outerForce))).toBeTruthy();
  });

  test('assumption ledger explicitly declares no pressure cone shortcuts', async () => {
    const fastener = buildNumericExample('imperial').input;
    const out = solveContinuumModel(buildContinuumModelFromFastener(fastener));

    expect(out.assumptions.some((a) => a.toLowerCase().includes('no pressure-cone'))).toBeTruthy();
  });

  test('contact-enabled continuum path solves with active-set proxy', async () => {
    const fastener = buildNumericExample('imperial').input;
    const model = buildContinuumModelFromFastener(fastener);
    model.contact.enabled = true;
    const out = solveContinuumModel(model);

    expect(out.errors).toEqual([]);
    expect(Number.isFinite(out.solved.residualNorm)).toBeTruthy();
    expect(out.contact.enabled).toBeTruthy();
    expect(out.contact.activePairs + out.contact.openPairs).toBeGreaterThan(0);
    expect(out.contact.activePairs + out.contact.openPairs).toBe(
      out.contact.stickPairs + out.contact.slipPairs + out.contact.openPairs
    );
    expect(out.contact.iterations).toBeGreaterThan(0);
    expect(out.contact.complementarityResidual).toBeGreaterThanOrEqual(0);
    expect(out.contact.normalResultant).toBeGreaterThanOrEqual(0);
    expect(out.contact.tangentialResultant).toBeGreaterThanOrEqual(0);
  });

  test('initial radial gap opens interface pairs as expected', async () => {
    const fastener = buildNumericExample('imperial').input;
    const modelClosed = buildContinuumModelFromFastener(fastener);
    modelClosed.contact.enabled = true;
    modelClosed.contact.initialRadialGap = 0;
    const closed = solveContinuumModel(modelClosed);

    const modelOpen = buildContinuumModelFromFastener(fastener);
    modelOpen.contact.enabled = true;
    modelOpen.contact.initialRadialGap = 0.005;
    const opened = solveContinuumModel(modelOpen);

    expect(opened.contact.openPairs).toBeGreaterThanOrEqual(closed.contact.openPairs);
  });

  test('mesh refinement study yields decreasing solution deltas at finer levels', async () => {
    const fastener = buildNumericExample('imperial').input;
    const model = buildContinuumModelFromFastener(fastener);
    const study = runMeshRefinementStudy(model, [1, 2, 3]);

    expect(study.levels.length).toBe(3);
    expect(study.levels[2].nodeCount).toBeGreaterThan(study.levels[1].nodeCount);
    expect(study.levels[1].nodeCount).toBeGreaterThan(study.levels[0].nodeCount);
    expect(study.deltaTopForceLastStep).toBeLessThan(0.2);
    expect(study.deltaReactionLastStep).toBeLessThan(0.2);
  });
});
