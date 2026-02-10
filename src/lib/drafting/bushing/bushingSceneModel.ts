import { buildLinePath } from '../core/d3Primitives';
import { buildBushingSectionProfile } from './bushingSectionProfileBuilder';
import type { SectionProfile } from './sectionProfile';

export const BUSHING_SCENE_MODULE_ID = 'scd/bushing/scene-model';
export const BUSHING_SCENE_MODULE_VERSION = '2026-02-10.v2';
export const BUSHING_SCENE_MODULE_SENTINEL = `${BUSHING_SCENE_MODULE_ID}@${BUSHING_SCENE_MODULE_VERSION}`;

declare global {
  var __SCD_BUSHING_SCENE_SENTINEL__: string | undefined;
}

if (typeof globalThis !== 'undefined') {
  const previous = globalThis.__SCD_BUSHING_SCENE_SENTINEL__;
  if (previous && previous !== BUSHING_SCENE_MODULE_SENTINEL) {
    console.error('[SC][Bushing][stale-module]', { previous, next: BUSHING_SCENE_MODULE_SENTINEL });
  }
  globalThis.__SCD_BUSHING_SCENE_SENTINEL__ = BUSHING_SCENE_MODULE_SENTINEL;
}

export type BushingRenderMode = 'section' | 'legacy';

export type BushingSceneInputs = {
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

export type BushingScene = {
  width: number;
  height: number;
  minX: number;
  minY: number;
  leftHousingPath: string;
  rightHousingPath: string;
  leftBushingPath: string;
  rightBushingPath: string;
  boreVoidPath: string;
  centerlineVerticalPath: string;
  centerlineHorizontalPath: string;
  sectionPlanePath: string;
  profile: SectionProfile;
  label: {
    title: string;
    titleX: number;
    titleY: number;
    housingX: number;
    housingY: number;
    bushingX: number;
    bushingY: number;
    fontSize: number;
  };
};

export function buildBushingScene(input: BushingSceneInputs): BushingScene {
  const build = buildBushingSectionProfile(input, 1e-4);
  const minX = -build.dims.width / 2;
  const minY = -build.dims.height / 2;
  const labelFont = Math.max(0.06, Math.min(build.dims.width, build.dims.height) * 0.028);

  return {
    width: build.dims.width,
    height: build.dims.height,
    minX,
    minY,
    leftHousingPath: build.paths.leftHousingPath,
    rightHousingPath: build.paths.rightHousingPath,
    leftBushingPath: build.paths.leftBushingPath,
    rightBushingPath: build.paths.rightBushingPath,
    boreVoidPath: build.paths.boreVoidPath,
    centerlineVerticalPath: buildLinePath({ x: 0, y: build.dims.zTop }, { x: 0, y: build.dims.zBottom }),
    centerlineHorizontalPath: buildLinePath({ x: -build.dims.rHousing, y: 0 }, { x: build.dims.rHousing, y: 0 }),
    sectionPlanePath: build.labels.sectionPlanePath,
    profile: build.profile,
    label: {
      title: build.labels.title,
      titleX: build.labels.titleX,
      titleY: build.labels.titleY,
      housingX: build.labels.housingX,
      housingY: build.labels.housingY,
      bushingX: build.labels.bushingX,
      bushingY: build.labels.bushingY,
      fontSize: labelFont
    }
  };
}

