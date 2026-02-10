import { esc, num } from '../core/svg';
import type { BushingRenderMode, BushingScene } from './bushingSceneModel';

export type SceneViewport = { x: number; y: number; w: number; h: number };

export function projectScene(scene: BushingScene, vp: SceneViewport) {
  const scale = Math.min(vp.w / scene.width, vp.h / scene.height);
  return {
    tx: vp.x + vp.w / 2,
    ty: vp.y + vp.h / 2,
    scale
  };
}

function regionVisual(regionComponent: string): { hatchId: string; stroke: string; fillLegacy: string } {
  if (regionComponent === 'housing') return { hatchId: 'hatchHousing', stroke: '#94a3b8', fillLegacy: 'rgba(148,163,184,0.18)' };
  if (regionComponent === 'bushing') return { hatchId: 'hatchBushing', stroke: '#2dd4bf', fillLegacy: 'rgba(45,212,191,0.18)' };
  return { hatchId: 'hatchHousing', stroke: '#94a3b8', fillLegacy: 'rgba(148,163,184,0.12)' };
}

function resolveAnnotationPositions(scene: BushingScene): { titleY: number; housingY: number; bushingY: number } {
  let titleY = scene.label.titleY;
  let housingY = scene.label.housingY;
  let bushingY = scene.label.bushingY;
  if (Math.abs(titleY - housingY) < scene.label.fontSize * 1.2) titleY -= scene.label.fontSize * 1.4;
  if (Math.abs(housingY - bushingY) < scene.label.fontSize * 1.2) bushingY += scene.label.fontSize * 1.4;
  return { titleY, housingY, bushingY };
}

function buildDefs(): string {
  return `
    <defs>
      <pattern id="hatchHousing" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="4" stroke="rgba(255,255,255,0.22)" stroke-width="0.7" />
      </pattern>
      <pattern id="hatchBushing" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(135)">
        <line x1="0" y1="0" x2="0" y2="4" stroke="rgba(45,212,191,0.78)" stroke-width="0.8" />
      </pattern>
    </defs>`;
}

function renderSectionLayers(scene: BushingScene): string {
  const materialPaths = scene.profile.regions
    .filter((r) => r.kind === 'material')
    .map((r) => {
      const visual = regionVisual(r.component);
      const loopPath = scene.profile.loops.find((l) => l.id === r.loop.id);
      const d = loopPath ? sceneForLoopPath(scene, loopPath.id) : '';
      return `<path d="${d}" fill="url(#${visual.hatchId})" stroke="${visual.stroke}" stroke-width="0.95" />`;
    })
    .join('');

  const voidPaths = scene.profile.regions
    .filter((r) => r.kind === 'void')
    .map((r) => {
      const loopPath = scene.profile.loops.find((l) => l.id === r.loop.id);
      const d = loopPath ? sceneForLoopPath(scene, loopPath.id) : '';
      return `<path d="${d}" fill="#06273a" stroke="rgba(186,230,253,0.25)" stroke-width="0.7" />`;
    })
    .join('');

  return `
    <g data-layer="section-material">${materialPaths}</g>
    <g data-layer="section-void">${voidPaths}</g>`;
}

function renderLegacyLayers(scene: BushingScene): string {
  return `
    <g data-layer="legacy-material">
      <path d="${scene.leftHousingPath}" fill="none" stroke="#94a3b8" stroke-width="1.1" />
      <path d="${scene.rightHousingPath}" fill="none" stroke="#94a3b8" stroke-width="1.1" />
      <path d="${scene.leftBushingPath}" fill="none" stroke="#2dd4bf" stroke-width="1.2" />
      <path d="${scene.rightBushingPath}" fill="none" stroke="#2dd4bf" stroke-width="1.2" />
      <path d="${scene.boreVoidPath}" fill="rgba(6,39,58,0.95)" stroke="rgba(148,163,184,0.35)" stroke-width="0.55" />
    </g>`;
}

function sceneForLoopPath(scene: BushingScene, loopId: string): string {
  if (loopId === 'left-housing-loop') return scene.leftHousingPath;
  if (loopId === 'right-housing-loop') return scene.rightHousingPath;
  if (loopId === 'left-bushing-loop') return scene.leftBushingPath;
  if (loopId === 'right-bushing-loop') return scene.rightBushingPath;
  if (loopId === 'bore-void-loop') return scene.boreVoidPath;
  return '';
}

export function renderBushingSceneGroup(scene: BushingScene, vp: SceneViewport, mode: BushingRenderMode = 'section'): string {
  const p = projectScene(scene, vp);
  const ann = resolveAnnotationPositions(scene);
  return `
  <g transform="translate(${num(p.tx)} ${num(p.ty)}) scale(${num(p.scale)})">
    ${buildDefs()}
    ${mode === 'legacy' ? renderLegacyLayers(scene) : renderSectionLayers(scene)}

    <g data-layer="centerlines">
      <path d="${scene.centerlineVerticalPath}" stroke="rgba(255,255,255,0.35)" stroke-dasharray="5,3" />
      <path d="${scene.centerlineHorizontalPath}" stroke="rgba(255,255,255,0.15)" stroke-dasharray="4,4" />
      <path d="${scene.sectionPlanePath}" stroke="rgba(255,190,130,0.48)" stroke-dasharray="6,4" />
    </g>

    <g data-layer="annotations" font-family="ui-monospace, SFMono-Regular" font-size="${num(scene.label.fontSize)}" fill="#cbd5e1">
      <text x="${num(scene.label.titleX)}" y="${num(ann.titleY)}" text-anchor="middle">${esc(scene.label.title)}</text>
      <text x="${num(scene.label.housingX)}" y="${num(ann.housingY)}" text-anchor="middle" opacity="0.78">${esc('Housing')}</text>
      <text x="${num(scene.label.bushingX)}" y="${num(ann.bushingY)}" text-anchor="middle" fill="#5eead4">${esc('Bushing')}</text>
    </g>
  </g>`;
}

