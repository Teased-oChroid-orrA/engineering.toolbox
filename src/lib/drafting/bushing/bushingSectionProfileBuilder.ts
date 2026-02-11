import type { BushingSceneInputs } from './bushingSceneModel';
import {
  type SectionLoop,
  type SectionPoint,
  type SectionProfile,
  type SectionRegion,
  loopToPath,
  validateClosedLoop
} from './sectionProfile';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function loopFromPoints(id: string, points: SectionPoint[]): SectionLoop {
  const primitives = points.map((p, i) => ({
    kind: 'line' as const,
    from: p,
    to: points[(i + 1) % points.length]
  }));
  return { id, primitives };
}

export type BushingSectionBuild = {
  profile: SectionProfile;
  paths: Record<string, string>;
  dims: {
    width: number;
    height: number;
    rHousing: number;
    rOuter: number;
    rInner: number;
    zTop: number;
    zBottom: number;
  };
  labels: {
    title: string;
    titleX: number;
    titleY: number;
    housingX: number;
    housingY: number;
    bushingX: number;
    bushingY: number;
    sectionPlanePath: string;
  };
};

type SectionParams = {
  D: number;
  L: number;
  housingW: number;
  ID: number;
  od: number;
  bushingType: NonNullable<BushingSceneInputs['bushingType']>;
  idType: NonNullable<BushingSceneInputs['idType']>;
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
  zFlangeTop: number;
  innerTopZ: number;
};

function resolveSectionParams(input: BushingSceneInputs): SectionParams {
  const D = Math.max(1e-6, Number(input.boreDia ?? 0.5));
  const L = Math.max(1e-6, Number(input.housingLen ?? 0.5));
  const housingW = Math.max(D * 1.8, Number(input.housingWidth ?? 1.5));
  const ID = clamp(Number(input.idBushing ?? 0.375), D * 0.3, D * 0.98);
  const od = clamp(Number(input.geometry?.odBushing ?? input.boreDia ?? 0.5), D * 0.95, D * 1.15);
  const bushingType = (input.bushingType ?? 'straight') as NonNullable<BushingSceneInputs['bushingType']>;
  const idType = (input.idType ?? 'straight') as NonNullable<BushingSceneInputs['idType']>;
  const zTop = -L / 2;
  const zBottom = L / 2;
  const rHousing = housingW / 2;
  const rOuter = od / 2;
  const rInner = ID / 2;
  const wall = Math.max(rOuter - rInner, 1e-6);
  const flangeT = bushingType === 'flanged' ? clamp(Math.max(0, Number(input.flangeThk ?? 0)), 0, L * 0.35) : 0;
  const zFlangeTop = zTop - flangeT;
  const innerTopZ = bushingType === 'flanged' ? zFlangeTop : zTop;
  const extRaw = bushingType === 'countersink' ? Math.max(rOuter, (input.geometry?.csExternal?.dia ?? rOuter * 2) / 2) : rOuter;
  const extTop = bushingType === 'countersink' ? clamp(extRaw, rOuter, rOuter + wall * 0.35) : rOuter;
  const extDepthRaw = bushingType === 'countersink' ? Math.max(0, input.geometry?.csExternal?.depth ?? 0) : 0;
  const extDepth = clamp(extDepthRaw, 0, L * 0.45);
  const zExt = Math.min(zBottom, zTop + extDepth);
  const intRaw = idType === 'countersink' ? Math.max(rInner, (input.geometry?.csInternal?.dia ?? rInner * 2) / 2) : rInner;
  const intTop = idType === 'countersink' ? clamp(intRaw, rInner + wall * 0.06, rOuter * 0.98) : rInner;
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
    zFlangeTop,
    innerTopZ
  };
}

function buildHousingLoops(p: SectionParams): { leftHousing: SectionLoop; rightHousing: SectionLoop } {
  if (p.bushingType === 'countersink' && p.zExt > p.zTop + 1e-6) {
    const leftHousing = loopFromPoints('left-housing-loop', [
      { x: -p.rHousing, y: p.zTop },
      { x: -p.rHousing, y: p.zBottom },
      { x: -p.rOuter, y: p.zBottom },
      { x: -p.rOuter, y: p.zExt },
      { x: -p.extTop, y: p.zTop }
    ]);
    const rightHousing = loopFromPoints('right-housing-loop', [
      { x: p.rHousing, y: p.zTop },
      { x: p.rHousing, y: p.zBottom },
      { x: p.rOuter, y: p.zBottom },
      { x: p.rOuter, y: p.zExt },
      { x: p.extTop, y: p.zTop }
    ]);
    return { leftHousing, rightHousing };
  }

  const leftHousing = loopFromPoints('left-housing-loop', [
    { x: -p.rHousing, y: p.zTop },
    { x: -p.rHousing, y: p.zBottom },
    { x: -p.rOuter, y: p.zBottom },
    { x: -p.rOuter, y: p.zTop }
  ]);
  const rightHousing = loopFromPoints('right-housing-loop', [
    { x: p.rHousing, y: p.zTop },
    { x: p.rHousing, y: p.zBottom },
    { x: p.rOuter, y: p.zBottom },
    { x: p.rOuter, y: p.zTop }
  ]);
  return { leftHousing, rightHousing };
}

function buildBushingLoops(input: BushingSceneInputs, p: SectionParams): { leftBushing: SectionLoop; rightBushing: SectionLoop } {
  if (p.bushingType === 'flanged') {
    const flangeR = clamp(Math.max(p.rOuter, Number(input.flangeOd ?? p.od) / 2), p.rOuter, p.rHousing * 0.96);
    return {
      leftBushing: loopFromPoints('left-bushing-loop', [
        { x: -flangeR, y: p.zFlangeTop },
        { x: -flangeR, y: p.zTop },
        { x: -p.rOuter, y: p.zTop },
        { x: -p.rOuter, y: p.zBottom },
        { x: -p.rInner, y: p.zBottom },
        { x: -p.rInner, y: p.zInt },
        { x: -p.intTop, y: p.innerTopZ },
        { x: -p.intTop, y: p.zFlangeTop }
      ]),
      rightBushing: loopFromPoints('right-bushing-loop', [
        { x: flangeR, y: p.zFlangeTop },
        { x: flangeR, y: p.zTop },
        { x: p.rOuter, y: p.zTop },
        { x: p.rOuter, y: p.zBottom },
        { x: p.rInner, y: p.zBottom },
        { x: p.rInner, y: p.zInt },
        { x: p.intTop, y: p.innerTopZ },
        { x: p.intTop, y: p.zFlangeTop }
      ])
    };
  }
  return {
    leftBushing: loopFromPoints('left-bushing-loop', [
      { x: -p.extTop, y: p.zTop }, { x: -p.rOuter, y: p.zExt }, { x: -p.rOuter, y: p.zBottom },
      { x: -p.rInner, y: p.zBottom }, { x: -p.rInner, y: p.zInt }, { x: -p.intTop, y: p.innerTopZ }
    ]),
    rightBushing: loopFromPoints('right-bushing-loop', [
      { x: p.extTop, y: p.zTop }, { x: p.rOuter, y: p.zExt }, { x: p.rOuter, y: p.zBottom },
      { x: p.rInner, y: p.zBottom }, { x: p.rInner, y: p.zInt }, { x: p.intTop, y: p.innerTopZ }
    ])
  };
}

function ensureClosedLoops(loops: SectionLoop[], tolerance: number) {
  for (const loop of loops) {
    const valid = validateClosedLoop(loop, tolerance);
    if (!valid.ok) throw new Error(`section loop invalid: ${loop.id} (${valid.reason ?? 'unknown'})`);
  }
}

function buildLabels(width: number, p: SectionParams) {
  return {
    title: 'SECTION VIEW A-A',
    titleX: 0,
    titleY: p.zTop - p.L * 0.32,
    housingX: -(p.rHousing + p.D * 0.18),
    housingY: 0,
    bushingX: 0,
    bushingY: p.zBottom + p.L * 0.22,
    sectionPlanePath: `M ${(-width * 0.22).toFixed(6)} ${(p.zTop - p.L * 0.24).toFixed(6)} L ${(width * 0.22).toFixed(6)} ${(p.zTop - p.L * 0.24).toFixed(6)}`
  };
}

export function buildBushingSectionProfile(input: BushingSceneInputs, tolerance = 1e-4): BushingSectionBuild {
  const p = resolveSectionParams(input);

  const { leftHousing, rightHousing } = buildHousingLoops(p);
  const { leftBushing, rightBushing } = buildBushingLoops(input, p);

  const boreVoid = loopFromPoints('bore-void-loop', [
    { x: -p.intTop, y: p.innerTopZ },
    { x: -p.rInner, y: p.zInt },
    { x: -p.rInner, y: p.zBottom },
    { x: p.rInner, y: p.zBottom },
    { x: p.rInner, y: p.zInt },
    { x: p.intTop, y: p.innerTopZ }
  ]);

  const loops = [leftHousing, rightHousing, leftBushing, rightBushing, boreVoid];
  ensureClosedLoops(loops, tolerance);

  const regions: SectionRegion[] = [
    { id: 'region-housing-left', kind: 'material', component: 'housing', loop: leftHousing },
    { id: 'region-housing-right', kind: 'material', component: 'housing', loop: rightHousing },
    { id: 'region-bushing-left', kind: 'material', component: 'bushing', loop: leftBushing },
    { id: 'region-bushing-right', kind: 'material', component: 'bushing', loop: rightBushing },
    { id: 'region-bore-void', kind: 'void', component: 'bore', loop: boreVoid }
  ];

  const width = p.housingW * 1.8;
  const height = Math.max(p.L * 4.0, p.housingW * 0.75);

  return {
    profile: { loops, regions, tolerance },
    paths: {
      leftHousingPath: loopToPath(leftHousing),
      rightHousingPath: loopToPath(rightHousing),
      leftBushingPath: loopToPath(leftBushing),
      rightBushingPath: loopToPath(rightBushing),
      boreVoidPath: loopToPath(boreVoid)
    },
    dims: { width, height, rHousing: p.rHousing, rOuter: p.rOuter, rInner: p.rInner, zTop: p.zTop, zBottom: p.zBottom },
    labels: buildLabels(width, p)
  };
}
