import type { FastenerSolverInput, FastenerSolverOutput } from './types';

function positive(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function computeDeterministicChecks(
  input: FastenerSolverInput,
  output: Pick<FastenerSolverOutput, 'contact'>
): FastenerSolverOutput['checks'] {
  const checks: FastenerSolverOutput['checks'] = [];

  const boltThreadSegments = input.elements.filter((e) => e.kind === 'bolt-thread');
  const totalThreadArea = boltThreadSegments.reduce((sum, e) => sum + Number(e.tensileStressArea ?? e.area), 0);
  const minBoltYield = boltThreadSegments.reduce<number | null>((acc, e) => {
    const ys = positive(e.material.yieldStrength);
    if (ys === null) return acc;
    if (acc === null) return ys;
    return Math.min(acc, ys);
  }, null);

  if (totalThreadArea > 0 && minBoltYield !== null) {
    const stress = output.contact.boltForceAfterContact / totalThreadArea;
    const margin = minBoltYield / stress - 1;
    checks.push({
      id: 'bolt-thread-tension',
      label: 'Bolt Thread Tension Stress',
      value: stress,
      limit: minBoltYield,
      margin,
      pass: stress <= minBoltYield,
      unit: input.units === 'metric' ? 'MPa' : 'psi',
      context: 'sigma = F_bolt / A_t'
    });
  }

  const memberSegments = input.elements.filter((e) => e.kind === 'joint-member');
  memberSegments.forEach((seg) => {
    const bearingAllow = positive(seg.material.bearingStrength);
    if (bearingAllow === null) return;
    const bearingStress = output.contact.clampForceAfterContact / Math.max(seg.area, 1e-12);
    const margin = bearingAllow / bearingStress - 1;
    checks.push({
      id: `member-bearing-${seg.id}`,
      label: `Member Bearing Proxy (${seg.label})`,
      value: bearingStress,
      limit: bearingAllow,
      margin,
      pass: bearingStress <= bearingAllow,
      unit: input.units === 'metric' ? 'MPa' : 'psi',
      context: 'sigma_proxy = F_clamp / A_segment'
    });
  });

  checks.push({
    id: 'clamp-retention',
    label: 'Clamp Retention',
    value: output.contact.clampForceAfterContact,
    limit: 0,
    margin: output.contact.clampForceAfterContact,
    pass: output.contact.clampForceAfterContact > 0,
    unit: input.units === 'metric' ? 'N' : 'lbf',
    context: 'Clamp force after all enabled effects'
  });

  return checks;
}

export function modelAssumptions(): string[] {
  return [
    'Linear-elastic small-strain stack formulation with continuum-axisymmetric option.',
    'Segment compliance uses exact C_i = L_i / (E_i A_i).',
    'No pressure-cone/frustum/effective-area assumptions.',
    'All areas are explicit user inputs or selected catalog values.',
    'External load sharing uses exact compatibility-equilibrium split between bolt and clamped groups.'
  ];
}
