import { buildBushingScene, type BushingRenderMode } from './bushingSceneModel';
import { renderBushingSceneGroup } from './bushingSceneRenderer';

type Viewport = { x: number; y: number; w: number; h: number };

// Deterministic, DOM-free SVG generator for bushing section geometry.
// Inputs are solver-authoritative view model inputs.
export function renderBushingSection(inputs: any, vp: Viewport, mode: BushingRenderMode = 'section'): string {
  const scene = buildBushingScene(inputs);
  return renderBushingSceneGroup(scene, vp, mode);
}
