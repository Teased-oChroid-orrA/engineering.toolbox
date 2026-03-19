export type SharedBushingProfileInput = {
  boreDia?: number;
  housingLen?: number;
  housingWidth?: number;
  idBushing?: number;
  bushingType?: 'straight' | 'flanged' | 'countersink' | string;
  idType?: 'straight' | 'countersink' | string;
  flangeOd?: number;
  flangeThk?: number;
  geometry?: {
    odBushing?: number;
    csExternal?: { dia?: number; depth?: number };
    csInternal?: { dia?: number; depth?: number };
  };
};

export type SharedBushingGeometryMode = 'solver' | 'render';

export type SharedBushingSectionParams = {
  D: number;
  L: number;
  housingW: number;
  ID: number;
  od: number;
  bushingType: NonNullable<SharedBushingProfileInput['bushingType']>;
  idType: NonNullable<SharedBushingProfileInput['idType']>;
  zTop: number;
  zBottom: number;
  rHousing: number;
  rOuter: number;
  rInner: number;
  wall: number;
  extTop: number;
  zExt: number;
  intTop: number;
  zInt: number;
  flangeT: number;
  flangeR: number;
  zFlangeTop: number;
  innerTopZ: number;
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function resolveBushingSectionParams(
  input: SharedBushingProfileInput,
  options: { mode?: SharedBushingGeometryMode } = {}
): SharedBushingSectionParams {
  const mode = options.mode ?? 'solver';
  const D = Math.max(1e-6, Number(input.boreDia ?? 0.5));
  const L = Math.max(1e-6, Number(input.housingLen ?? 0.5));
  const housingW = Math.max(D * 1.8, Number(input.housingWidth ?? 1.5));
  const ID = clamp(Number(input.idBushing ?? 0.375), D * 0.3, D * 0.98);
  const od = clamp(Number(input.geometry?.odBushing ?? input.boreDia ?? 0.5), D * 0.95, D * 1.15);
  const bushingType = (input.bushingType ?? 'straight') as NonNullable<SharedBushingProfileInput['bushingType']>;
  const idType = (input.idType ?? 'straight') as NonNullable<SharedBushingProfileInput['idType']>;
  const zTop = -L / 2;
  const zBottom = L / 2;
  const rHousing = housingW / 2;
  const rOuter = od / 2;
  const rInner = ID / 2;
  const wall = Math.max(rOuter - rInner, 1e-6);
  const flangeT = bushingType === 'flanged' ? clamp(Math.max(0, Number(input.flangeThk ?? 0)), 0, L * 0.35) : 0;
  const zFlangeTop = zTop - flangeT;
  const innerTopZ = bushingType === 'flanged' ? zFlangeTop : zTop;
  const flangeRaw = Math.max(rOuter, Number(input.flangeOd ?? od) / 2);
  const flangeR = bushingType === 'flanged'
    ? mode === 'render'
      ? clamp(flangeRaw, rOuter, rHousing * 0.96)
      : flangeRaw
    : rOuter;
  const extRaw = bushingType === 'countersink' ? Math.max(rOuter, (input.geometry?.csExternal?.dia ?? rOuter * 2) / 2) : rOuter;
  const extTop = bushingType === 'countersink'
    ? mode === 'render'
      ? clamp(extRaw, rOuter, rHousing * 0.96)
      : extRaw
    : rOuter;
  const extDepthRaw = bushingType === 'countersink' ? Math.max(0, input.geometry?.csExternal?.depth ?? 0) : 0;
  const extDepth = clamp(extDepthRaw, 0, L);
  const zExt = Math.min(zBottom, zTop + extDepth);
  const intRaw = idType === 'countersink' ? Math.max(rInner, (input.geometry?.csInternal?.dia ?? rInner * 2) / 2) : rInner;
  const topOuterRadius = bushingType === 'flanged' ? flangeR : extTop;
  const intTop = idType === 'countersink'
    ? mode === 'render'
      ? clamp(intRaw, rInner, Math.max(rInner, topOuterRadius - 1e-6))
      : intRaw
    : rInner;
  const intDepthRaw = idType === 'countersink' ? Math.max(0, input.geometry?.csInternal?.depth ?? 0) : 0;
  const maxIntDepth = Math.max(0, zBottom - innerTopZ);
  const intDepth = idType === 'countersink'
    ? clamp(intDepthRaw, Math.min(L * 0.04, D * 0.05), maxIntDepth)
    : clamp(intDepthRaw, 0, maxIntDepth);
  const zInt = Math.min(zBottom, innerTopZ + intDepth);
  return {
    D,
    L,
    housingW,
    ID,
    od,
    bushingType,
    idType,
    zTop,
    zBottom,
    rHousing,
    rOuter,
    rInner,
    wall,
    extTop,
    zExt,
    intTop,
    zInt,
    flangeT,
    flangeR,
    zFlangeTop,
    innerTopZ
  };
}

export function evaluateBushingOuterRadius(p: SharedBushingSectionParams, z: number): number {
  if (p.bushingType === 'flanged') {
    if (z <= p.zTop) return p.flangeR;
    return p.rOuter;
  }
  if (p.bushingType === 'countersink' && z <= p.zExt && p.zExt > p.zTop) {
    const t = clamp((z - p.zTop) / Math.max(p.zExt - p.zTop, 1e-9), 0, 1);
    return lerp(p.extTop, p.rOuter, t);
  }
  return p.rOuter;
}

export function evaluateBushingInnerRadius(p: SharedBushingSectionParams, z: number): number {
  if (p.idType === 'countersink' && z <= p.zInt && p.zInt > p.innerTopZ) {
    const t = clamp((z - p.innerTopZ) / Math.max(p.zInt - p.innerTopZ, 1e-9), 0, 1);
    return lerp(p.intTop, p.rInner, t);
  }
  return p.rInner;
}

export function computeMinimumBushingWall(p: SharedBushingSectionParams): number {
  const materialTop = p.bushingType === 'flanged' ? p.zFlangeTop : p.zTop;
  const rawPoints = [materialTop, p.zTop, p.zExt, p.innerTopZ, p.zInt, p.zBottom]
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  const points = rawPoints.filter((value, index) => index === 0 || Math.abs(value - rawPoints[index - 1]) > 1e-9);
  const samples = new Set<number>();
  for (const point of points) samples.add(point);
  for (let index = 0; index < points.length - 1; index += 1) {
    samples.add((points[index] + points[index + 1]) / 2);
  }
  let minimum = Infinity;
  for (const z of samples) {
    const wall = evaluateBushingOuterRadius(p, z) - evaluateBushingInnerRadius(p, z);
    if (wall < minimum) minimum = wall;
  }
  return Number.isFinite(minimum) ? minimum : 0;
}
