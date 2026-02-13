import autoAnimate from '@formkit/auto-animate';
import { motionMs } from './SurfaceOrchestratorDeps';

export function setupAutoAnimateEffects(
  actionsBarEl: HTMLElement | null,
  datumsModalPanelEl: HTMLElement | null,
  createGeomModalPanelEl: HTMLElement | null,
  surfCurveModalPanelEl: HTMLElement | null,
  healingModalPanelEl: HTMLElement | null
) {
  if (actionsBarEl) autoAnimate(actionsBarEl, { duration: motionMs('fast') });
  if (datumsModalPanelEl) autoAnimate(datumsModalPanelEl, { duration: motionMs('standard') });
  if (createGeomModalPanelEl) autoAnimate(createGeomModalPanelEl, { duration: motionMs('standard') });
  if (surfCurveModalPanelEl) autoAnimate(surfCurveModalPanelEl, { duration: motionMs('standard') });
  if (healingModalPanelEl) autoAnimate(healingModalPanelEl, { duration: motionMs('standard') });
}

export function setupDatumPlaneIndexClamping(
  datumPlaneChoicesLength: number,
  currentIdx: number
): number {
  const maxIdx = Math.max(0, datumPlaneChoicesLength - 1);
  return Math.max(0, Math.min(currentIdx, maxIdx));
}
