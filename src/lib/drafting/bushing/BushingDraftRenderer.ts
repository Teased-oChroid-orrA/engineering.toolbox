import { renderBushingSceneGroup, type SceneViewport } from './bushingSceneRenderer';
import type { BushingRenderMode, BushingScene } from './bushingSceneModel';
import type { SectionArcPrimitive, SectionLinePrimitive, SectionLoop } from './sectionProfile';

export type BushingDraftEngine = 'svg' | 'babylon';

export type CanonicalLoopPrimitive =
  | {
      kind: 'line';
      from: { x: number; y: number };
      to: { x: number; y: number };
    }
  | {
      kind: 'arc';
      center: { x: number; y: number };
      radius: number;
      startDeg: number;
      endDeg: number;
    };

export type CanonicalLoop = {
  id: string;
  primitives: CanonicalLoopPrimitive[];
  regionKind: 'material' | 'void' | 'unknown';
  component: 'housing' | 'bushing' | 'bore' | 'unknown';
};

export type CanonicalDraftScene = {
  width: number;
  height: number;
  loops: CanonicalLoop[];
};

function mapLine(p: SectionLinePrimitive): CanonicalLoopPrimitive {
  return {
    kind: 'line',
    from: { x: p.from.x, y: p.from.y },
    to: { x: p.to.x, y: p.to.y }
  };
}

function mapArc(p: SectionArcPrimitive): CanonicalLoopPrimitive {
  return {
    kind: 'arc',
    center: { x: p.center.x, y: p.center.y },
    radius: p.radius,
    startDeg: p.startDeg,
    endDeg: p.endDeg
  };
}

function mapLoop(scene: BushingScene, loop: SectionLoop): CanonicalLoop {
  const region = scene.profile.regions.find((r) => r.loop.id === loop.id);
  return {
    id: loop.id,
    primitives: loop.primitives.map((p) => (p.kind === 'line' ? mapLine(p) : mapArc(p))),
    regionKind: region?.kind ?? 'unknown',
    component: region?.component ?? 'unknown'
  };
}

export function toCanonicalDraftScene(scene: BushingScene): CanonicalDraftScene {
  // Canonical scene is derived from section profile primitives, not SVG path output.
  // Babylon migration uses this as independent input to avoid coupling to legacy section views.
  return {
    width: scene.width,
    height: scene.height,
    loops: scene.profile.loops.map((loop) => mapLoop(scene, loop))
  };
}

export function renderSvgDraft(scene: BushingScene, viewport: SceneViewport, mode: BushingRenderMode): string {
  return renderBushingSceneGroup(scene, viewport, mode);
}
