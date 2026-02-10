import type { BushingOutput } from '$lib/core/bushing';
import type { BushingScene } from '$lib/drafting/bushing/bushingSceneModel';
import { validateClosedLoop } from '$lib/drafting/bushing/sectionProfile';

export type BushingVisualDiagnostic = {
  code: 'SCENE_INVALID' | 'SCENE_OUTLIER' | 'SCENE_LOOP_INVALID' | 'METRICS_LOW_CONTRAST_RISK';
  message: string;
  severity: 'info' | 'warning' | 'error';
};

export function runBushingVisualDiagnostics(scene: BushingScene, results: BushingOutput): BushingVisualDiagnostic[] {
  const diagnostics: BushingVisualDiagnostic[] = [];

  if (!Number.isFinite(scene.width) || !Number.isFinite(scene.height) || scene.width <= 0 || scene.height <= 0) {
    diagnostics.push({
      code: 'SCENE_INVALID',
      severity: 'error',
      message: 'Assembly scene bounds are invalid.'
    });
  }

  for (const loop of scene.profile.loops) {
    const valid = validateClosedLoop(loop, scene.profile.tolerance);
    if (!valid.ok) {
      diagnostics.push({
        code: 'SCENE_LOOP_INVALID',
        severity: 'error',
        message: `Section profile loop invalid (${loop.id}).`
      });
      break;
    }
  }

  if (scene.width / Math.max(scene.height, 1e-6) > 8 || scene.height / Math.max(scene.width, 1e-6) > 8) {
    diagnostics.push({
      code: 'SCENE_OUTLIER',
      severity: 'warning',
      message: 'Assembly scene aspect ratio is extreme; viewport may appear compressed.'
    });
  }

  if ((results.warningCodes?.length ?? 0) > 0) {
    diagnostics.push({
      code: 'METRICS_LOW_CONTRAST_RISK',
      severity: 'info',
      message: 'Warnings present; verify card emphasis colors remain readable.'
    });
  }

  return diagnostics;
}
