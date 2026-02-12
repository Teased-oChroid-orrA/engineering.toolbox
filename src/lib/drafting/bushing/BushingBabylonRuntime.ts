import type { CanonicalDraftScene } from './BushingDraftRenderer';
import { renderLoopMeshes } from './BushingBabylonSceneMeshes';
import { alignCameraToNormal, configureCamera, makeViewState } from './BushingBabylonView';
import { loadBabylon, type BabylonCallbackCtx, type BabylonRenderDiagnostic } from './BushingBabylonShared';

export type { BabylonRenderDiagnostic };

export type BabylonRenderState = {
  dispose: () => void;
  renderOnce: () => void;
  updateScene: (scene: CanonicalDraftScene) => void;
  updateViewport: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  setSolidMode: (enabled: boolean) => void;
  setRotateDragEnabled: (enabled: boolean) => void;
};

export async function mountBushingBabylonCanvas(
  canvas: HTMLCanvasElement,
  sceneModel: CanonicalDraftScene,
  callbacks: BabylonCallbackCtx
): Promise<BabylonRenderState> {
  const loaded = await loadBabylon();
  const { B } = loaded;

  const engine = new B.Engine(canvas, true, {
    antialias: true,
    preserveDrawingBuffer: true,
    stencil: true
  });

  const scene = new B.Scene(engine);
  scene.clearColor = new B.Color4(0.0, 0.06, 0.11, 1);

  const camera = new B.ArcRotateCamera('bushingCam', -Math.PI / 2, 0.0001, 8, B.Vector3.Zero(), scene);
  camera.lowerRadiusLimit = 2;
  camera.upperRadiusLimit = 20;
  camera.inertia = 0;

  const hemi = new B.HemisphericLight('bushingHemi', new B.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.95;
  hemi.groundColor = new B.Color3(0.02, 0.06, 0.09);

  const fill = new B.DirectionalLight('bushingFill', new B.Vector3(-0.2, -1, -0.12), scene);
  fill.position = new B.Vector3(0, 6, 0);
  fill.intensity = 0.42;

  let solidMode = false;
  let rotateDragEnabled = false;
  let bounds = renderLoopMeshes(loaded, scene, sceneModel, callbacks, solidMode);
  let view = makeViewState(bounds);

  const renderOnce = () => {
    if (scene.isDisposed) return;
    scene.render();
  };

  const updateViewport = () => {
    engine.resize();
    configureCamera(B, engine, camera, view);
    renderOnce();
  };

  const resetView = () => {
    view = { ...makeViewState(bounds), orthoScale: 1 };
    camera.alpha = -Math.PI / 2;
    camera.beta = solidMode ? 1.05 : 0.0001;
    configureCamera(B, engine, camera, view);
    renderOnce();
  };

  const zoomIn = () => {
    view = { ...view, orthoScale: Math.max(0.25, view.orthoScale * 0.93) };
    configureCamera(B, engine, camera, view);
    renderOnce();
  };

  const zoomOut = () => {
    view = { ...view, orthoScale: Math.min(8, view.orthoScale * 1.07) };
    configureCamera(B, engine, camera, view);
    renderOnce();
  };

  const rerender = () => {
    bounds = renderLoopMeshes(loaded, scene, sceneModel, callbacks, solidMode);
    view = makeViewState(bounds);
    camera.beta = solidMode ? 1.05 : 0.0001;
    camera.alpha = -Math.PI / 2;
    configureCamera(B, engine, camera, view);
    renderOnce();
  };

  const updateScene = (nextScene: CanonicalDraftScene) => {
    sceneModel = nextScene;
    rerender();
  };

  const setSolidMode = (enabled: boolean) => {
    solidMode = enabled;
    if (!solidMode) rotateDragEnabled = false;
    rerender();
  };
  const setRotateDragEnabled = (enabled: boolean) => {
    rotateDragEnabled = enabled;
  };

  let isPanning = false;
  let isRotating = false;
  let activePointerId = -1;
  let moved = false;
  let moveDistance = 0;
  let downX = 0;
  let downY = 0;
  let lastX = 0;
  let lastY = 0;

  const onPointerDown = (ev: PointerEvent) => {
    if (ev.button !== 0) return;
    if (activePointerId !== -1 && activePointerId !== ev.pointerId) return;
    activePointerId = ev.pointerId;
    isPanning = true;
    isRotating = solidMode && rotateDragEnabled;
    moved = false;
    moveDistance = 0;
    downX = ev.clientX;
    downY = ev.clientY;
    lastX = ev.clientX;
    lastY = ev.clientY;
    canvas.setPointerCapture(ev.pointerId);
  };

  const onPointerMove = (ev: PointerEvent) => {
    if (!isPanning || ev.pointerId !== activePointerId) return;
    const dx = ev.clientX - lastX;
    const dy = ev.clientY - lastY;
    moveDistance += Math.hypot(dx, dy);
    if (moveDistance > 0.75 || Math.hypot(ev.clientX - downX, ev.clientY - downY) > 2) moved = true;

    isRotating = solidMode && rotateDragEnabled;

    if (isRotating) {
      const rotSpeed = 0.006;
      camera.alpha -= dx * rotSpeed;
      camera.beta = Math.min(Math.PI - 0.08, Math.max(0.08, camera.beta - dy * rotSpeed));
      lastX = ev.clientX;
      lastY = ev.clientY;
      configureCamera(B, engine, camera, view);
      renderOnce();
      return;
    }

    const worldPerPxX = (Math.abs(camera.orthoRight ?? 1) + Math.abs(camera.orthoLeft ?? 1)) / Math.max(1, engine.getRenderWidth());
    const worldPerPxY = (Math.abs(camera.orthoTop ?? 1) + Math.abs(camera.orthoBottom ?? 1)) / Math.max(1, engine.getRenderHeight());

    view = {
      ...view,
      panX: view.panX - dx * worldPerPxX,
      panZ: view.panZ + dy * worldPerPxY
    };
    lastX = ev.clientX;
    lastY = ev.clientY;
    configureCamera(B, engine, camera, view);
    renderOnce();
  };

  const onPointerUp = (ev: PointerEvent) => {
    if (!isPanning || ev.pointerId !== activePointerId) return;
    isPanning = false;
    isRotating = false;
    activePointerId = -1;
    try {
      canvas.releasePointerCapture(ev.pointerId);
    } catch {}

    if (moved) return;
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const pick = scene.pick(x, y, (m) => m.name.startsWith('bushing_loop_') || m.name.startsWith('bushing_solid_'));
    if (pick?.hit && pick.pickedPoint) {
      view = {
        ...view,
        panX: pick.pickedPoint.x - view.centerX,
        panZ: pick.pickedPoint.z - view.centerZ,
        orthoScale: Math.max(0.45, view.orthoScale)
      };
      if (solidMode) {
        const n = pick.getNormal(true, true);
        if (n) alignCameraToNormal(B, camera, n);
      } else {
        camera.alpha = -Math.PI / 2;
        camera.beta = 0.0001;
      }
      configureCamera(B, engine, camera, view);
      renderOnce();
    }
  };

  const onWheel = (ev: WheelEvent) => {
    ev.preventDefault();
    const direction = ev.deltaY < 0 ? -1 : 1;
    const magnitude = Math.min(1.8, Math.max(0.15, Math.abs(ev.deltaY) / 160));
    const factor = direction < 0 ? 1 / (1 + magnitude * 0.08) : 1 + magnitude * 0.08;
    view = { ...view, orthoScale: Math.min(8, Math.max(0.25, view.orthoScale * factor)) };
    configureCamera(B, engine, camera, view);
    renderOnce();
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  resetView();
  engine.runRenderLoop(renderOnce);

  return {
    dispose: () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    },
    renderOnce,
    updateScene,
    updateViewport,
    zoomIn,
    zoomOut,
    resetView,
    setSolidMode,
    setRotateDragEnabled
  };
}
