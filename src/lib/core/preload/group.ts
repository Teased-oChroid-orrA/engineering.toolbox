export type FastenerGroupMode = 'screening' | 'joint_interaction';

export type FastenerGroupRowInput = {
  fastenerCount: number;
  pitch: number;
  edgeDistance: number;
  transferEfficiency: number;
  boltStiffness: number;
  memberStiffness: number;
  preloadPerFastener: number;
  externalAxialLoad: number;
  externalTransverseLoad: number;
};

export type FastenerGroupFastenerResult = {
  index: number;
  positionFromLoadedEdge: number;
  edgeAmplification: number;
  stiffnessWeight: number;
  loadShare: number;
  axialLoad: number;
  transverseLoad: number;
  totalTensionDemand: number;
  equivalentDemand: number;
};

export type FastenerGroupRowResult = {
  geometryInfluenceMatrix: number[][];
  fasteners: FastenerGroupFastenerResult[];
  criticalFastenerIndex: number;
  criticalEquivalentDemand: number;
  note: string;
};

export type FastenerGroupPatternInput = {
  mode?: FastenerGroupMode;
  rowCount: number;
  columnCount: number;
  rowPitch: number;
  columnPitch: number;
  edgeDistanceX: number;
  edgeDistanceY: number;
  eccentricityX: number;
  eccentricityY: number;
  plateStiffnessRatioX?: number;
  plateStiffnessRatioY?: number;
  bypassLoadFactor?: number;
  transferEfficiency: number;
  boltStiffness: number;
  memberStiffness: number;
  preloadPerFastener: number;
  preloadVariationPercent?: number;
  localMemberStiffnessVariationPercent?: number;
  progressionStepLimit?: number;
  externalAxialLoad: number;
  externalShearX: number;
  externalShearY: number;
  externalMomentZ: number;
};

export type FastenerGroupPatternFastenerResult = {
  index: number;
  row: number;
  column: number;
  x: number;
  y: number;
  edgeAmplification: number;
  stiffnessWeight: number;
  loadShare: number;
  axialLoad: number;
  shearX: number;
  shearY: number;
  momentShearX: number;
  momentShearY: number;
  totalShearX: number;
  totalShearY: number;
  totalTensionDemand: number;
  equivalentDemand: number;
  preloadFactor?: number;
  memberStiffnessFactor?: number;
  effectivePreload?: number;
  effectiveMemberStiffness?: number;
  boltLoadIncrement?: number;
  active?: boolean;
};

export type FastenerGroupProgressionStep = {
  step: number;
  removedFastenerIndices: number[];
  activeFastenerCount: number;
  criticalFastenerIndex: number;
  criticalEquivalentDemand: number;
  note: string;
};

export type FastenerGroupPatternResult = {
  mode: FastenerGroupMode;
  geometryInfluenceMatrix: number[][];
  fasteners: FastenerGroupPatternFastenerResult[];
  criticalFastenerIndex: number;
  criticalEquivalentDemand: number;
  centroidX: number;
  centroidY: number;
  note: string;
  progression: FastenerGroupProgressionStep[];
};

export type FastenerGroupPatternLoadCaseInput = {
  id: string;
  label: string;
  externalAxialLoad: number;
  externalShearX: number;
  externalShearY: number;
  externalMomentZ: number;
};

export type FastenerGroupPatternCaseResult = {
  caseId: string;
  label: string;
  result: FastenerGroupPatternResult;
};

export type FastenerGroupCaseRankingEntry = {
  rank: number;
  caseId: string;
  label: string;
  criticalFastenerIndex: number;
  criticalEquivalentDemand: number;
};

export type FastenerGroupEnvelopeFastenerResult = {
  index: number;
  row: number;
  column: number;
  x: number;
  y: number;
  governingCaseId: string;
  governingCaseLabel: string;
  equivalentDemand: number;
};

export type FastenerGroupPatternCasesResult = {
  mode: FastenerGroupMode;
  cases: FastenerGroupPatternCaseResult[];
  governingCaseId: string | null;
  governingCaseLabel: string | null;
  governingFastenerIndex: number | null;
  governingEquivalentDemand: number;
  caseRanking: FastenerGroupCaseRankingEntry[];
  envelopeFasteners: FastenerGroupEnvelopeFastenerResult[];
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function clampSignedRatio(value: number, limit = 0.75) {
  return Math.max(-limit, Math.min(limit, value));
}

function buildInteractionMatrix(
  positions: Array<{ x: number; y: number }>,
  rowPitch: number,
  columnPitch: number,
  anisotropyX: number,
  anisotropyY: number
) {
  return positions.map((pointI) =>
    positions.map((pointJ) => {
      const dx = pointI.x - pointJ.x;
      const dy = pointI.y - pointJ.y;
      const scaled = Math.hypot(dx / (columnPitch * anisotropyX), dy / (rowPitch * anisotropyY));
      return Math.exp(-scaled);
    })
  );
}

export function solveFastenerGroupRow(input: FastenerGroupRowInput): FastenerGroupRowResult {
  const count = Math.max(1, Math.round(input.fastenerCount));
  const pitch = Math.max(1e-6, Number(input.pitch));
  const edgeDistance = Math.max(1e-6, Number(input.edgeDistance));
  const transfer = clamp01(Number(input.transferEfficiency));
  const preload = Math.max(0, Number(input.preloadPerFastener));
  const externalAxial = Math.max(0, Number(input.externalAxialLoad));
  const externalTransverse = Math.max(0, Number(input.externalTransverseLoad));
  const totalStiffness = Math.max(1e-6, Number(input.boltStiffness) + Number(input.memberStiffness));
  const stiffnessWeight = Number(input.boltStiffness) / totalStiffness;

  const positions = Array.from({ length: count }, (_, index) => edgeDistance + index * pitch);
  const geometryInfluenceMatrix = positions.map((x_i) =>
    positions.map((x_j) => Math.exp(-Math.abs(x_i - x_j) / pitch))
  );
  const edgeBias = positions.map((x_i) => 1 / (1 + x_i / edgeDistance));
  const combinedWeights = edgeBias.map((bias, index) => {
    const interaction = geometryInfluenceMatrix[index].reduce((sum, value) => sum + value, 0) / count;
    return bias * (0.45 + 0.55 * interaction) * (0.55 + 0.45 * stiffnessWeight) * transfer;
  });
  const weightSum = combinedWeights.reduce((sum, value) => sum + value, 0) || 1;
  const fasteners = combinedWeights.map((weight, index) => {
    const loadShare = weight / weightSum;
    const axialLoad = externalAxial * loadShare;
    const transverseLoad = externalTransverse * loadShare;
    const totalTensionDemand = preload + axialLoad;
    const equivalentDemand = Math.hypot(totalTensionDemand, transverseLoad);
    return {
      index,
      positionFromLoadedEdge: positions[index],
      edgeAmplification: edgeBias[index],
      stiffnessWeight,
      loadShare,
      axialLoad,
      transverseLoad,
      totalTensionDemand,
      equivalentDemand
    };
  });
  let criticalFastenerIndex = 0;
  let criticalEquivalentDemand = fasteners[0]?.equivalentDemand ?? 0;
  fasteners.forEach((fastener) => {
    if (fastener.equivalentDemand > criticalEquivalentDemand) {
      criticalEquivalentDemand = fastener.equivalentDemand;
      criticalFastenerIndex = fastener.index;
    }
  });

  return {
    geometryInfluenceMatrix,
    fasteners,
    criticalFastenerIndex,
    criticalEquivalentDemand,
    note:
      'Row solver uses an explicit pitch/edge-distance influence matrix plus stiffness weighting. It is a fastener-row mechanics screen, not a full continuum plate solution.'
  };
}

type InternalFastenerPoint = {
  index: number;
  row: number;
  column: number;
  x: number;
  y: number;
  rx: number;
  ry: number;
};

function buildPatternGeometry(input: FastenerGroupPatternInput) {
  const rowCount = Math.max(1, Math.round(input.rowCount));
  const columnCount = Math.max(1, Math.round(input.columnCount));
  const rowPitch = Math.max(1e-6, Number(input.rowPitch));
  const columnPitch = Math.max(1e-6, Number(input.columnPitch));
  const edgeDistanceX = Math.max(1e-6, Number(input.edgeDistanceX));
  const edgeDistanceY = Math.max(1e-6, Number(input.edgeDistanceY));
  const raw: InternalFastenerPoint[] = [];
  for (let r = 0; r < rowCount; r += 1) {
    for (let c = 0; c < columnCount; c += 1) {
      raw.push({
        index: raw.length,
        row: r,
        column: c,
        x: edgeDistanceX + c * columnPitch,
        y: edgeDistanceY + r * rowPitch,
        rx: 0,
        ry: 0
      });
    }
  }
  const count = raw.length;
  const centroidX = raw.reduce((sum, point) => sum + point.x, 0) / count;
  const centroidY = raw.reduce((sum, point) => sum + point.y, 0) / count;
  const shifted = raw.map((point) => ({ ...point, rx: point.x - centroidX, ry: point.y - centroidY }));
  const polarDenominator = shifted.reduce((sum, point) => sum + point.rx * point.rx + point.ry * point.ry, 0) || 1;
  return { shifted, centroidX, centroidY, rowPitch, columnPitch, edgeDistanceX, edgeDistanceY, polarDenominator };
}

function solvePatternForActiveSet(input: FastenerGroupPatternInput, activeSet?: Set<number>): FastenerGroupPatternResult {
  const mode: FastenerGroupMode = input.mode ?? 'screening';
  const transfer = clamp01(Number(input.transferEfficiency));
  const anisotropyX = Math.max(0.1, Number(input.plateStiffnessRatioX ?? 1));
  const anisotropyY = Math.max(0.1, Number(input.plateStiffnessRatioY ?? 1));
  const bypassLoadFactor = clamp01(Number(input.bypassLoadFactor ?? 0));
  const preload = Math.max(0, Number(input.preloadPerFastener));
  const externalAxial = Number(input.externalAxialLoad);
  const externalShearX = Number(input.externalShearX);
  const externalShearY = Number(input.externalShearY);
  const externalMomentZ = Number(input.externalMomentZ);
  const baseBoltStiffness = Math.max(1e-6, Number(input.boltStiffness));
  const baseMemberStiffness = Math.max(1e-6, Number(input.memberStiffness));
  const preloadVariation = Math.max(0, Number(input.preloadVariationPercent ?? 0)) / 100;
  const memberVariation = Math.max(0, Number(input.localMemberStiffnessVariationPercent ?? 0)) / 100;

  const { shifted, centroidX, centroidY, rowPitch, columnPitch, edgeDistanceX, edgeDistanceY, polarDenominator } = buildPatternGeometry(input);
  const active = shifted.filter((point) => !activeSet || activeSet.has(point.index));
  const count = Math.max(1, active.length);
  const geometryInfluenceMatrix = buildInteractionMatrix(active, rowPitch, columnPitch, anisotropyX, anisotropyY);
  const maxBias = Math.max(
    ...active.map((point) => {
      const xBias = 1 / (1 + point.x / edgeDistanceX);
      const yBias = 1 / (1 + point.y / edgeDistanceY);
      const eccentricBias = 1 + Math.max(0, point.rx * Number(input.eccentricityX) + point.ry * Number(input.eccentricityY)) / Math.max(columnPitch, rowPitch, 1e-6);
      const topLoadedBias = point.row === 0 ? 1 + bypassLoadFactor : 1;
      const leftLoadedBias = point.column === 0 ? 1 + bypassLoadFactor * 0.5 : 1;
      return xBias * yBias * eccentricBias * topLoadedBias * leftLoadedBias;
    }),
    1e-6
  );

  const edgeBias = active.map((point) => {
    const xBias = 1 / (1 + point.x / edgeDistanceX);
    const yBias = 1 / (1 + point.y / edgeDistanceY);
    const eccentricBias = 1 + Math.max(0, point.rx * Number(input.eccentricityX) + point.ry * Number(input.eccentricityY)) / Math.max(columnPitch, rowPitch, 1e-6);
    const topLoadedBias = point.row === 0 ? 1 + bypassLoadFactor : 1;
    const leftLoadedBias = point.column === 0 ? 1 + bypassLoadFactor * 0.5 : 1;
    return xBias * yBias * eccentricBias * topLoadedBias * leftLoadedBias;
  });

  const fasteners = active.map((point, index) => {
    const normalizedBias = maxBias > 0 ? edgeBias[index] / maxBias : 1;
    const edgeCentered = clampSignedRatio((normalizedBias - 0.5) * 2);
    const preloadFactor = mode === 'joint_interaction' ? 1 + preloadVariation * edgeCentered : 1;
    const memberStiffnessFactor = mode === 'joint_interaction' ? 1 + memberVariation * edgeCentered : 1;
    const effectivePreload = preload * preloadFactor;
    const effectiveMemberStiffness = baseMemberStiffness * memberStiffnessFactor;
    const totalStiffness = Math.max(1e-6, baseBoltStiffness + effectiveMemberStiffness);
    const stiffnessWeight = baseBoltStiffness / totalStiffness;
    const interaction = geometryInfluenceMatrix[index].reduce((sum, value) => sum + value, 0) / count;
    const combinedWeight = edgeBias[index] * (0.42 + 0.58 * interaction) * (0.52 + 0.48 * stiffnessWeight) * transfer;
    return {
      point,
      edgeAmplification: edgeBias[index],
      stiffnessWeight,
      preloadFactor,
      memberStiffnessFactor,
      effectivePreload,
      effectiveMemberStiffness,
      combinedWeight
    };
  });

  const weightSum = fasteners.reduce((sum, item) => sum + item.combinedWeight, 0) || 1;
  const mappedFasteners: FastenerGroupPatternFastenerResult[] = fasteners.map((item, index) => {
    const loadShare = item.combinedWeight / weightSum;
    const axialLoad = Math.max(0, externalAxial) * loadShare;
    const directShearX = (externalShearX / count) * transfer * (0.6 + 0.4 * edgeBias[index] / maxBias);
    const directShearY = (externalShearY / count) * transfer * (0.6 + 0.4 * edgeBias[index] / maxBias);
    const momentScale = externalMomentZ / polarDenominator;
    const momentShearX = -momentScale * item.point.ry;
    const momentShearY = momentScale * item.point.rx;
    const totalShearX = directShearX + momentShearX;
    const totalShearY = directShearY + momentShearY;
    const boltLoadIncrement = axialLoad * (0.55 + 0.45 * item.stiffnessWeight);
    const totalTensionDemand = item.effectivePreload + boltLoadIncrement;
    const equivalentDemand = Math.hypot(totalTensionDemand, totalShearX, totalShearY);
    return {
      index: item.point.index,
      row: item.point.row,
      column: item.point.column,
      x: item.point.x,
      y: item.point.y,
      edgeAmplification: item.edgeAmplification,
      stiffnessWeight: item.stiffnessWeight,
      loadShare,
      axialLoad,
      shearX: directShearX,
      shearY: directShearY,
      momentShearX,
      momentShearY,
      totalShearX,
      totalShearY,
      totalTensionDemand,
      equivalentDemand,
      preloadFactor: item.preloadFactor,
      memberStiffnessFactor: item.memberStiffnessFactor,
      effectivePreload: item.effectivePreload,
      effectiveMemberStiffness: item.effectiveMemberStiffness,
      boltLoadIncrement,
      active: true
    };
  });

  let criticalFastenerIndex = mappedFasteners[0]?.index ?? 0;
  let criticalEquivalentDemand = mappedFasteners[0]?.equivalentDemand ?? 0;
  mappedFasteners.forEach((fastener) => {
    if (fastener.equivalentDemand > criticalEquivalentDemand) {
      criticalEquivalentDemand = fastener.equivalentDemand;
      criticalFastenerIndex = fastener.index;
    }
  });

  const note =
    mode === 'joint_interaction'
      ? 'Joint-interaction mode includes preload variation by fastener, local member-stiffness variation, edge shielding/bypass bias, and redistribution-friendly ranking. It is still a mechanics-based joint model, not a plate-FEA solution.'
      : '2D bolt-pattern solver uses explicit coordinates, edge-distance weighting, bypass-style loaded-edge bias, directional plate-stiffness scaling, and torsional distribution from the group polar denominator. It is a mechanics-based pattern screen, not a plate-FEA solution.';

  return {
    mode,
    geometryInfluenceMatrix,
    fasteners: mappedFasteners,
    criticalFastenerIndex,
    criticalEquivalentDemand,
    centroidX,
    centroidY,
    note,
    progression: []
  };
}

function buildFailureProgression(input: FastenerGroupPatternInput, initial: FastenerGroupPatternResult): FastenerGroupProgressionStep[] {
  const steps: FastenerGroupProgressionStep[] = [];
  const maxSteps = Math.max(1, Math.min(Number(input.progressionStepLimit ?? 3), Math.max(1, initial.fasteners.length - 1)));
  const activeSet = new Set(initial.fasteners.map((fastener) => fastener.index));
  const removed: number[] = [];
  let current = initial;

  for (let step = 1; step <= maxSteps; step += 1) {
    removed.push(current.criticalFastenerIndex);
    activeSet.delete(current.criticalFastenerIndex);
    if (!activeSet.size) break;
    current = solvePatternForActiveSet(input, activeSet);
    steps.push({
      step,
      removedFastenerIndices: [...removed],
      activeFastenerCount: activeSet.size,
      criticalFastenerIndex: current.criticalFastenerIndex,
      criticalEquivalentDemand: current.criticalEquivalentDemand,
      note: `After removing ${removed.map((index) => `F${index + 1}`).join(', ')}, the next governing fastener is F${current.criticalFastenerIndex + 1}.`
    });
  }

  return steps;
}

export function solveFastenerGroupPattern(input: FastenerGroupPatternInput): FastenerGroupPatternResult {
  const initial = solvePatternForActiveSet(input);
  return {
    ...initial,
    progression: buildFailureProgression(input, initial)
  };
}

export function solveFastenerGroupPatternCases(
  baseInput: Omit<
    FastenerGroupPatternInput,
    'externalAxialLoad' | 'externalShearX' | 'externalShearY' | 'externalMomentZ'
  >,
  loadCases: FastenerGroupPatternLoadCaseInput[]
): FastenerGroupPatternCasesResult {
  const mode: FastenerGroupMode = baseInput.mode ?? 'screening';
  const cases = loadCases.map((loadCase) => ({
    caseId: loadCase.id,
    label: loadCase.label,
    result: solveFastenerGroupPattern({
      ...baseInput,
      mode,
      externalAxialLoad: loadCase.externalAxialLoad,
      externalShearX: loadCase.externalShearX,
      externalShearY: loadCase.externalShearY,
      externalMomentZ: loadCase.externalMomentZ
    })
  }));
  const caseRanking = [...cases]
    .sort((left, right) => right.result.criticalEquivalentDemand - left.result.criticalEquivalentDemand)
    .map((entry, index) => ({
      rank: index + 1,
      caseId: entry.caseId,
      label: entry.label,
      criticalFastenerIndex: entry.result.criticalFastenerIndex,
      criticalEquivalentDemand: entry.result.criticalEquivalentDemand
    }));

  const envelopeFasteners = cases.length
    ? cases[0].result.fasteners.map((fastener) => {
        let governingCaseId = cases[0].caseId;
        let governingCaseLabel = cases[0].label;
        let equivalentDemand = cases[0].result.fasteners.find((candidate) => candidate.index === fastener.index)?.equivalentDemand ?? 0;

        for (const entry of cases.slice(1)) {
          const match = entry.result.fasteners.find((candidate) => candidate.index === fastener.index);
          if (match && match.equivalentDemand > equivalentDemand) {
            equivalentDemand = match.equivalentDemand;
            governingCaseId = entry.caseId;
            governingCaseLabel = entry.label;
          }
        }

        return {
          index: fastener.index,
          row: fastener.row,
          column: fastener.column,
          x: fastener.x,
          y: fastener.y,
          governingCaseId,
          governingCaseLabel,
          equivalentDemand
        };
      })
    : [];

  let governingCaseId: string | null = null;
  let governingCaseLabel: string | null = null;
  let governingFastenerIndex: number | null = null;
  let governingEquivalentDemand = 0;

  for (const entry of cases) {
    if (entry.result.criticalEquivalentDemand > governingEquivalentDemand) {
      governingEquivalentDemand = entry.result.criticalEquivalentDemand;
      governingCaseId = entry.caseId;
      governingCaseLabel = entry.label;
      governingFastenerIndex = entry.result.criticalFastenerIndex;
    }
  }

  return {
    mode,
    cases,
    governingCaseId,
    governingCaseLabel,
    governingFastenerIndex,
    governingEquivalentDemand,
    caseRanking,
    envelopeFasteners
  };
}
