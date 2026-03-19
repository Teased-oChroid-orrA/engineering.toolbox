import type { BushingSceneInputs } from './bushingSceneModel';
import { resolveBushingSectionParams } from '../../core/shared/bushingProfileGeometry';
import {
  type SectionLoop,
  type SectionPoint,
  type SectionProfile,
  type SectionRegion,
  loopToPath,
  validateClosedLoop
} from './sectionProfile';

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

type SectionParams = ReturnType<typeof resolveBushingSectionParams>;

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
    return {
      leftBushing: loopFromPoints('left-bushing-loop', [
        { x: -p.flangeR, y: p.zFlangeTop },
        { x: -p.flangeR, y: p.zTop },
        { x: -p.rOuter, y: p.zTop },
        { x: -p.rOuter, y: p.zBottom },
        { x: -p.rInner, y: p.zBottom },
        { x: -p.rInner, y: p.zInt },
        { x: -p.intTop, y: p.innerTopZ },
        { x: -p.intTop, y: p.zFlangeTop }
      ]),
      rightBushing: loopFromPoints('right-bushing-loop', [
        { x: p.flangeR, y: p.zFlangeTop },
        { x: p.flangeR, y: p.zTop },
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
  const p = resolveBushingSectionParams(input, { mode: 'render' });

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
