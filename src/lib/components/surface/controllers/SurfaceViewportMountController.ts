import type { Point3D } from '../../../surface/types';

type SurfaceViewportMountCtx = {
  viewportEl: HTMLDivElement | null;
  svgEl: SVGSVGElement | null;
  getSelectionMode: () => 'none' | 'box' | 'lasso';
  getZoomK: () => number;
  setZoomK: (v: number) => void;
  getPan: () => { x: number; y: number };
  setPan: (v: { x: number; y: number }) => void;
  getRot: () => { alpha: number; beta: number };
  setRot: (v: { alpha: number; beta: number }) => void;
  getW: () => number;
  getH: () => number;
  setW: (v: number) => void;
  setH: (v: number) => void;
  getRotateAnchor: () => { mx: number; my: number; pivot: Point3D } | null;
  setRotateAnchor: (v: { mx: number; my: number; pivot: Point3D } | null) => void;
  pickOrbitPivot: (mx: number, my: number) => Point3D;
  rotateForView: (p: Point3D, r: { alpha: number; beta: number }) => { x: number; y: number; z: number };
};

const ZOOM_MIN = 0.15;
const ZOOM_MAX = 12;
const ZOOM_WHEEL_GAIN = 0.0015;
const ZOOM_DELTA_CLAMP = 180;
const PAN_LIMIT = 250_000;

type DragState = {
  isDragging: boolean;
  dragMode: 'rotate' | 'pan';
  lastX: number;
  lastY: number;
};

function makePointerHandlers(ctx: SurfaceViewportMountCtx, state: DragState) {
  const onPointerDown = (event: PointerEvent) => {
    if (ctx.getSelectionMode() !== 'none') return;
    if (event.button !== 0 || !ctx.svgEl) return;
    state.isDragging = true;
    state.dragMode = event.shiftKey ? 'pan' : 'rotate';
    state.lastX = event.clientX;
    state.lastY = event.clientY;

    if (state.dragMode === 'rotate') {
      const rect = ctx.svgEl.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      const pivot = ctx.pickOrbitPivot(mx, my);
      const rotatedPivot = ctx.rotateForView(pivot, ctx.getRot());
      const zoomK = ctx.getZoomK();
      const pan = ctx.getPan();
      // Keep the chosen pivot at its current screen position during rotation.
      // This avoids the "snap-to-click" translation while preserving pivot-based orbit.
      const anchorX = rotatedPivot.x * zoomK + ctx.getW() / 2 + pan.x;
      const anchorY = rotatedPivot.y * zoomK + ctx.getH() / 2 + pan.y;
      ctx.setRotateAnchor({ mx: anchorX, my: anchorY, pivot });
    } else {
      ctx.setRotateAnchor(null);
    }

    ctx.svgEl.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!state.isDragging) return;
    const dx = event.clientX - state.lastX;
    const dy = event.clientY - state.lastY;
    state.lastX = event.clientX;
    state.lastY = event.clientY;

    if (state.dragMode === 'pan') {
      const pan = ctx.getPan();
      ctx.setPan({ x: pan.x + dx, y: pan.y + dy });
      return;
    }

    const rot = ctx.getRot();
    const nextRot = { alpha: rot.alpha + dx * 0.01, beta: rot.beta + dy * 0.01 };
    ctx.setRot(nextRot);

    const anchor = ctx.getRotateAnchor();
    if (!anchor) return;
    const r = ctx.rotateForView(anchor.pivot, nextRot);
    const zoomK = ctx.getZoomK();
    ctx.setPan({
      x: anchor.mx - (r.x * zoomK + ctx.getW() / 2),
      y: anchor.my - (r.y * zoomK + ctx.getH() / 2)
    });
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!state.isDragging || !ctx.svgEl) return;
    state.isDragging = false;
    ctx.setRotateAnchor(null);
    try {
      ctx.svgEl.releasePointerCapture(event.pointerId);
    } catch {
      // no-op
    }
  };

  return { onPointerDown, onPointerMove, onPointerUp };
}

function onWheelViewport(ctx: SurfaceViewportMountCtx, event: WheelEvent) {
  if (ctx.getSelectionMode() !== 'none' || !ctx.svgEl) return;
  event.preventDefault();

  const currentZoom = ctx.getZoomK();
  const modeScale = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? 120 : 1;
  const dy = Math.max(-ZOOM_DELTA_CLAMP, Math.min(ZOOM_DELTA_CLAMP, event.deltaY * modeScale));
  const factor = Math.exp(-dy * ZOOM_WHEEL_GAIN);
  const nextZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, currentZoom * factor));
  if (!Number.isFinite(nextZoom) || nextZoom === currentZoom) return;

  const rect = ctx.svgEl.getBoundingClientRect();
  const mx = event.clientX - rect.left;
  const my = event.clientY - rect.top;
  const pan = ctx.getPan();

  const wx = (mx - pan.x - ctx.getW() / 2) / currentZoom;
  const wy = (my - pan.y - ctx.getH() / 2) / currentZoom;

  ctx.setZoomK(nextZoom);
  const nextPanX = mx - (wx * nextZoom + ctx.getW() / 2);
  const nextPanY = my - (wy * nextZoom + ctx.getH() / 2);
  if (!Number.isFinite(nextPanX) || !Number.isFinite(nextPanY)) return;
  ctx.setPan({
    x: Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, nextPanX)),
    y: Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, nextPanY))
  });
}

export function mountSurfaceViewportInteraction(ctx: SurfaceViewportMountCtx): () => void {
  let roRAF = 0;
  const ro = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    const cr = entry.contentRect;
    if (cr.width < 32 || cr.height < 32) return;

    const nextW = Math.max(320, Math.floor(cr.width));
    const nextH = Math.max(240, Math.floor(cr.height));

    if (roRAF) cancelAnimationFrame(roRAF);
    roRAF = requestAnimationFrame(() => {
      if (nextW !== ctx.getW()) ctx.setW(nextW);
      if (nextH !== ctx.getH()) ctx.setH(nextH);
    });
  });

  if (ctx.viewportEl) ro.observe(ctx.viewportEl);

  if (!ctx.svgEl) {
    return () => {
      ro.disconnect();
      if (roRAF) cancelAnimationFrame(roRAF);
    };
  }

  const dragState: DragState = { isDragging: false, dragMode: 'rotate', lastX: 0, lastY: 0 };
  const { onPointerDown, onPointerMove, onPointerUp } = makePointerHandlers(ctx, dragState);
  const onWheel = (event: WheelEvent) => onWheelViewport(ctx, event);

  ctx.svgEl.addEventListener('pointerdown', onPointerDown);
  ctx.svgEl.addEventListener('pointermove', onPointerMove);
  ctx.svgEl.addEventListener('pointerup', onPointerUp);
  ctx.svgEl.addEventListener('pointercancel', onPointerUp);
  ctx.svgEl.addEventListener('wheel', onWheel, { passive: false });

  return () => {
    ro.disconnect();
    if (roRAF) cancelAnimationFrame(roRAF);
    ctx.svgEl?.removeEventListener('pointerdown', onPointerDown);
    ctx.svgEl?.removeEventListener('pointermove', onPointerMove);
    ctx.svgEl?.removeEventListener('pointerup', onPointerUp);
    ctx.svgEl?.removeEventListener('pointercancel', onPointerUp);
    ctx.svgEl?.removeEventListener('wheel', onWheel);
  };
}
