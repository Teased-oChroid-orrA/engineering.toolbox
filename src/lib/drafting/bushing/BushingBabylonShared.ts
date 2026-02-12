import type { CanonicalDraftScene } from './BushingDraftRenderer';
import type { BabylonLoopDiagnostic } from './BushingBabylonGeometry';

export type BabylonRenderDiagnostic = BabylonLoopDiagnostic;

export type BabylonCore = typeof import('@babylonjs/core');

export type BabylonLoaded = {
  B: BabylonCore;
  earcut: (vertices: number[], holes: number[], dim: number) => number[];
};

export type BabylonCallbackCtx = {
  onDiagnostics: (v: BabylonRenderDiagnostic[]) => void;
};

export type SceneBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type SceneViewState = {
  centerX: number;
  centerZ: number;
  width: number;
  height: number;
  orthoScale: number;
  panX: number;
  panZ: number;
};

let babylonLoaded: Promise<BabylonLoaded> | null = null;

export async function loadBabylon(): Promise<BabylonLoaded> {
  if (!babylonLoaded) {
    babylonLoaded = Promise.all([
      import('@babylonjs/core'),
      import('@babylonjs/loaders'),
      import('earcut')
    ]).then(([B, _loaders, earcutMod]) => {
      const maybeDefault = (earcutMod as { default?: unknown }).default;
      const raw = (maybeDefault ?? earcutMod) as unknown;
      if (typeof raw !== 'function') throw new Error('Failed to load earcut triangulator.');
      return {
        B,
        earcut: raw as (vertices: number[], holes: number[], dim: number) => number[]
      };
    });
  }
  return babylonLoaded;
}

export function diagnosticsWithInfo(scene: CanonicalDraftScene, base: BabylonLoopDiagnostic[]): BabylonLoopDiagnostic[] {
  return [
    ...base,
    {
      severity: 'info',
      code: 'BABYLON_RENDER_SUMMARY',
      message: `Babylon loops: ${scene.loops.length}`
    },
    {
      severity: 'info',
      code: 'BABYLON_INTERACTION_HINT',
      message: 'Drag pan, Rotate-Drag button rotates (3D), wheel/+/- zoom, click centers/realigns.'
    }
  ];
}
