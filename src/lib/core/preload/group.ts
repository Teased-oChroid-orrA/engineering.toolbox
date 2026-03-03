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
};

export type FastenerGroupPatternResult = {
  geometryInfluenceMatrix: number[][];
  fasteners: FastenerGroupPatternFastenerResult[];
  criticalFastenerIndex: number;
  criticalEquivalentDemand: number;
  centroidX: number;
  centroidY: number;
  note: string;
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

export type FastenerGroupPatternCasesResult = {
  cases: FastenerGroupPatternCaseResult[];
  governingCaseId: string | null;
  governingCaseLabel: string | null;
  governingFastenerIndex: number | null;
  governingEquivalentDemand: number;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
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

export function solveFastenerGroupPattern(input: FastenerGroupPatternInput): FastenerGroupPatternResult {
  const rowCount = Math.max(1, Math.round(input.rowCount));
  const columnCount = Math.max(1, Math.round(input.columnCount));
  const rowPitch = Math.max(1e-6, Number(input.rowPitch));
  const columnPitch = Math.max(1e-6, Number(input.columnPitch));
  const edgeDistanceX = Math.max(1e-6, Number(input.edgeDistanceX));
  const edgeDistanceY = Math.max(1e-6, Number(input.edgeDistanceY));
  const transfer = clamp01(Number(input.transferEfficiency));
  const anisotropyX = Math.max(0.1, Number(input.plateStiffnessRatioX ?? 1));
  const anisotropyY = Math.max(0.1, Number(input.plateStiffnessRatioY ?? 1));
  const bypassLoadFactor = clamp01(Number(input.bypassLoadFactor ?? 0));
  const preload = Math.max(0, Number(input.preloadPerFastener));
  const externalAxial = Number(input.externalAxialLoad);
  const externalShearX = Number(input.externalShearX);
  const externalShearY = Number(input.externalShearY);
  const externalMomentZ = Number(input.externalMomentZ);
  const totalStiffness = Math.max(1e-6, Number(input.boltStiffness) + Number(input.memberStiffness));
  const stiffnessWeight = Number(input.boltStiffness) / totalStiffness;

  const raw = [];
  for (let r = 0; r < rowCount; r += 1) {
    for (let c = 0; c < columnCount; c += 1) {
      raw.push({
        row: r,
        column: c,
        x: edgeDistanceX + c * columnPitch,
        y: edgeDistanceY + r * rowPitch
      });
    }
  }
  const count = raw.length;
  const centroidX = raw.reduce((sum, point) => sum + point.x, 0) / count;
  const centroidY = raw.reduce((sum, point) => sum + point.y, 0) / count;
  const shifted = raw.map((point) => ({ ...point, rx: point.x - centroidX, ry: point.y - centroidY }));
  const polarDenominator = shifted.reduce((sum, point) => sum + point.rx * point.rx + point.ry * point.ry, 0) || 1;

  const geometryInfluenceMatrix = shifted.map((pointI) =>
    shifted.map((pointJ) => {
      const dx = pointI.x - pointJ.x;
      const dy = pointI.y - pointJ.y;
      const scaled = Math.hypot(dx / (columnPitch * anisotropyX), dy / (rowPitch * anisotropyY));
      return Math.exp(-scaled);
    })
  );

  const edgeBias = shifted.map((point) => {
    const xBias = 1 / (1 + point.x / edgeDistanceX);
    const yBias = 1 / (1 + point.y / edgeDistanceY);
    const eccentricBias = 1 + Math.max(0, point.rx * Number(input.eccentricityX) + point.ry * Number(input.eccentricityY)) / Math.max(columnPitch, rowPitch, 1e-6);
    const topLoadedBias = point.row === 0 ? 1 + bypassLoadFactor : 1;
    const leftLoadedBias = point.column === 0 ? 1 + bypassLoadFactor * 0.5 : 1;
    return xBias * yBias * eccentricBias * topLoadedBias * leftLoadedBias;
  });
  const edgeWeightSum = edgeBias.reduce((sum, value) => sum + value, 0) || 1;

  const fasteners = shifted.map((point, index) => {
    const loadShare = (edgeBias[index] / edgeWeightSum) * transfer;
    const axialLoad = Math.max(0, externalAxial) * loadShare;
    const directShearX = (externalShearX / count) * transfer * (0.6 + 0.4 * edgeBias[index] / Math.max(...edgeBias, 1e-6));
    const directShearY = (externalShearY / count) * transfer * (0.6 + 0.4 * edgeBias[index] / Math.max(...edgeBias, 1e-6));
    const momentScale = externalMomentZ / polarDenominator;
    const momentShearX = -momentScale * point.ry;
    const momentShearY = momentScale * point.rx;
    const totalShearX = directShearX + momentShearX;
    const totalShearY = directShearY + momentShearY;
    const totalTensionDemand = preload + axialLoad * (0.55 + 0.45 * stiffnessWeight);
    const equivalentDemand = Math.hypot(totalTensionDemand, totalShearX, totalShearY);
    return {
      index,
      row: point.row,
      column: point.column,
      x: point.x,
      y: point.y,
      edgeAmplification: edgeBias[index],
      stiffnessWeight,
      loadShare,
      axialLoad,
      shearX: directShearX,
      shearY: directShearY,
      momentShearX,
      momentShearY,
      totalShearX,
      totalShearY,
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
    centroidX,
    centroidY,
    note:
      '2D bolt-pattern solver uses explicit coordinates, edge-distance weighting, bypass-style loaded-edge bias, directional plate-stiffness scaling, and torsional distribution from the group polar denominator. It is a mechanics-based pattern screen, not a plate-FEA solution.'
  };
}

export function solveFastenerGroupPatternCases(
  baseInput: Omit<
    FastenerGroupPatternInput,
    'externalAxialLoad' | 'externalShearX' | 'externalShearY' | 'externalMomentZ'
  >,
  loadCases: FastenerGroupPatternLoadCaseInput[]
): FastenerGroupPatternCasesResult {
  const cases = loadCases.map((loadCase) => ({
    caseId: loadCase.id,
    label: loadCase.label,
    result: solveFastenerGroupPattern({
      ...baseInput,
      externalAxialLoad: loadCase.externalAxialLoad,
      externalShearX: loadCase.externalShearX,
      externalShearY: loadCase.externalShearY,
      externalMomentZ: loadCase.externalMomentZ
    })
  }));

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
    cases,
    governingCaseId,
    governingCaseLabel,
    governingFastenerIndex,
    governingEquivalentDemand
  };
}
