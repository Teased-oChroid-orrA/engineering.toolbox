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

export function buildBushingSectionProfile(input: BushingSceneInputs, tolerance = 1e-4): BushingSectionBuild {
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

  const extRaw = bushingType === 'countersink' ? Math.max(rOuter, (input.geometry?.csExternal?.dia ?? rOuter * 2) / 2) : rOuter;
  const extTop = bushingType === 'countersink' ? clamp(extRaw, rOuter, rOuter + wall * 0.35) : rOuter;
  const extDepthRaw = bushingType === 'countersink' ? Math.max(0, input.geometry?.csExternal?.depth ?? 0) : 0;
  const extDepth = clamp(extDepthRaw, 0, L * 0.45);
  const zExt = Math.min(zBottom, zTop + extDepth);

  const intRaw = idType === 'countersink' ? Math.max(rInner, (input.geometry?.csInternal?.dia ?? rInner * 2) / 2) : rInner;
  const intTop = idType === 'countersink' ? clamp(intRaw, rInner, rInner + wall * 0.45) : rInner;
  const intDepthRaw = idType === 'countersink' ? Math.max(0, input.geometry?.csInternal?.depth ?? 0) : 0;
  const intDepth = clamp(intDepthRaw, 0, L * 0.45);
  const zInt = Math.min(zBottom, zTop + intDepth);

  const leftHousing = loopFromPoints('left-housing-loop', [
    { x: -rHousing, y: zTop },
    { x: -rHousing, y: zBottom },
    { x: -rOuter, y: zBottom },
    { x: -rOuter, y: zTop }
  ]);
  const rightHousing = loopFromPoints('right-housing-loop', [
    { x: rHousing, y: zTop },
    { x: rHousing, y: zBottom },
    { x: rOuter, y: zBottom },
    { x: rOuter, y: zTop }
  ]);

  let leftBushing: SectionLoop;
  let rightBushing: SectionLoop;
  if (bushingType === 'flanged') {
    const flangeR = clamp(Math.max(rOuter, Number(input.flangeOd ?? od) / 2), rOuter, rHousing * 0.96);
    const flangeT = clamp(Math.max(0, Number(input.flangeThk ?? 0)), 0, L * 0.35);
    const zFlangeTop = zTop - flangeT;
    leftBushing = loopFromPoints('left-bushing-loop', [
      { x: -flangeR, y: zFlangeTop },
      { x: -flangeR, y: zTop },
      { x: -rOuter, y: zTop },
      { x: -rOuter, y: zBottom },
      { x: -rInner, y: zBottom },
      { x: -rInner, y: zInt },
      { x: -intTop, y: zTop },
      { x: -intTop, y: zFlangeTop }
    ]);
    rightBushing = loopFromPoints('right-bushing-loop', [
      { x: flangeR, y: zFlangeTop },
      { x: flangeR, y: zTop },
      { x: rOuter, y: zTop },
      { x: rOuter, y: zBottom },
      { x: rInner, y: zBottom },
      { x: rInner, y: zInt },
      { x: intTop, y: zTop },
      { x: intTop, y: zFlangeTop }
    ]);
  } else {
    leftBushing = loopFromPoints('left-bushing-loop', [
      { x: -extTop, y: zTop },
      { x: -rOuter, y: zExt },
      { x: -rOuter, y: zBottom },
      { x: -rInner, y: zBottom },
      { x: -rInner, y: zInt },
      { x: -intTop, y: zTop }
    ]);
    rightBushing = loopFromPoints('right-bushing-loop', [
      { x: extTop, y: zTop },
      { x: rOuter, y: zExt },
      { x: rOuter, y: zBottom },
      { x: rInner, y: zBottom },
      { x: rInner, y: zInt },
      { x: intTop, y: zTop }
    ]);
  }

  const boreVoid = loopFromPoints('bore-void-loop', [
    { x: -intTop, y: zTop },
    { x: -rInner, y: zInt },
    { x: -rInner, y: zBottom },
    { x: rInner, y: zBottom },
    { x: rInner, y: zInt },
    { x: intTop, y: zTop }
  ]);

  const loops = [leftHousing, rightHousing, leftBushing, rightBushing, boreVoid];
  for (const loop of loops) {
    const valid = validateClosedLoop(loop, tolerance);
    if (!valid.ok) throw new Error(`section loop invalid: ${loop.id} (${valid.reason ?? 'unknown'})`);
  }

  const regions: SectionRegion[] = [
    { id: 'region-housing-left', kind: 'material', component: 'housing', loop: leftHousing },
    { id: 'region-housing-right', kind: 'material', component: 'housing', loop: rightHousing },
    { id: 'region-bushing-left', kind: 'material', component: 'bushing', loop: leftBushing },
    { id: 'region-bushing-right', kind: 'material', component: 'bushing', loop: rightBushing },
    { id: 'region-bore-void', kind: 'void', component: 'bore', loop: boreVoid }
  ];

  const width = housingW * 1.8;
  const height = Math.max(L * 4.0, housingW * 0.75);

  return {
    profile: { loops, regions, tolerance },
    paths: {
      leftHousingPath: loopToPath(leftHousing),
      rightHousingPath: loopToPath(rightHousing),
      leftBushingPath: loopToPath(leftBushing),
      rightBushingPath: loopToPath(rightBushing),
      boreVoidPath: loopToPath(boreVoid)
    },
    dims: { width, height, rHousing, rOuter, rInner, zTop, zBottom },
    labels: {
      title: 'SECTION VIEW A-A',
      titleX: 0,
      titleY: zTop - L * 0.32,
      housingX: -(rHousing + D * 0.18),
      housingY: 0,
      bushingX: 0,
      bushingY: zBottom + L * 0.22,
      sectionPlanePath: `M ${(-width * 0.22).toFixed(6)} ${(zTop - L * 0.24).toFixed(6)} L ${(width * 0.22).toFixed(6)} ${(zTop - L * 0.24).toFixed(6)}`
    }
  };
}

