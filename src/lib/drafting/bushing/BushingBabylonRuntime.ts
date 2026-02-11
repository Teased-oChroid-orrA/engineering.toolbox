import type { CanonicalDraftScene } from './BushingDraftRenderer';
import { buildLoopPolygons, type BabylonLoopDiagnostic } from './BushingBabylonGeometry';

export type BabylonRenderDiagnostic = BabylonLoopDiagnostic;

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

type BabylonCallbackCtx = {
  onDiagnostics: (v: BabylonRenderDiagnostic[]) => void;
};

type BabylonCore = typeof import('@babylonjs/core');

type BabylonLoaded = {
  B: BabylonCore;
  earcut: (vertices: number[], holes: number[], dim: number) => number[];
};

type SceneBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

type SceneViewState = {
  centerX: number;
  centerZ: number;
  width: number;
  height: number;
  orthoScale: number;
  panX: number;
  panZ: number;
};

let babylonLoaded: Promise<BabylonLoaded> | null = null;

async function loadBabylon(): Promise<BabylonLoaded> {
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

function diagnosticsWithInfo(scene: CanonicalDraftScene, base: BabylonLoopDiagnostic[]): BabylonLoopDiagnostic[] {
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
      message: 'Drag pan, Shift/Rotate-Drag button rotates (3D), wheel/+/- zoom, click centers/realigns.'
    }
  ];
}

function createHatchTexture(
  B: BabylonCore,
  scene: InstanceType<BabylonCore['Scene']>,
  key: string,
  bg: string,
  stroke: string,
  spacing = 10
): InstanceType<BabylonCore['DynamicTexture']> {
  const tex = new B.DynamicTexture(`hatch_${key}`, { width: 128, height: 128 }, scene, true);
  tex.wrapU = B.Texture.WRAP_ADDRESSMODE;
  tex.wrapV = B.Texture.WRAP_ADDRESSMODE;
  const ctx = tex.getContext();
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  for (let i = -128; i <= 256; i += spacing) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i - 128, 128);
    ctx.stroke();
  }
  tex.update(false);
  return tex;
}

function createSectionMaterial(
  B: BabylonCore,
  scene: InstanceType<BabylonCore['Scene']>,
  component: CanonicalDraftScene['loops'][number]['component'],
  regionKind: CanonicalDraftScene['loops'][number]['regionKind']
): InstanceType<BabylonCore['StandardMaterial']> {
  const m = new B.StandardMaterial(`mat_${component}_${regionKind}`, scene);
  m.backFaceCulling = false;
  m.specularColor = new B.Color3(0.02, 0.02, 0.02);

  if (regionKind === 'void') {
    m.diffuseColor = new B.Color3(0.01, 0.03, 0.06);
    m.alpha = 0.9;
    return m;
  }

  if (component === 'housing') {
    m.diffuseColor = new B.Color3(0.49, 0.61, 0.76);
    m.diffuseTexture = createHatchTexture(B, scene, 'housing', 'rgba(85,118,150,0.96)', 'rgba(210,232,255,0.9)', 12);
    m.alpha = 0.98;
    return m;
  }

  if (component === 'bushing') {
    m.diffuseColor = new B.Color3(0.16, 0.78, 0.65);
    m.diffuseTexture = createHatchTexture(B, scene, 'bushing', 'rgba(26,128,104,0.98)', 'rgba(165,255,230,0.85)', 9);
    m.alpha = 0.98;
    return m;
  }

  if (component === 'bore') {
    m.diffuseColor = new B.Color3(0.56, 0.78, 0.95);
    m.diffuseTexture = createHatchTexture(B, scene, 'bore', 'rgba(78,124,168,0.95)', 'rgba(220,240,255,0.9)', 11);
    m.alpha = 0.94;
    return m;
  }

  m.diffuseColor = new B.Color3(0.78, 0.84, 0.9);
  m.alpha = 0.9;
  return m;
}

function createSolidMaterial(
  B: BabylonCore,
  scene: InstanceType<BabylonCore['Scene']>,
  component: CanonicalDraftScene['loops'][number]['component'],
  regionKind: CanonicalDraftScene['loops'][number]['regionKind']
): InstanceType<BabylonCore['StandardMaterial']> {
  const m = new B.StandardMaterial(`mat3d_${component}_${regionKind}`, scene);
  m.backFaceCulling = false;
  m.specularColor = new B.Color3(0.12, 0.12, 0.12);

  if (regionKind === 'void') {
    m.diffuseColor = new B.Color3(0.03, 0.06, 0.1);
    m.alpha = 0.08;
    return m;
  }

  if (component === 'housing') {
    m.diffuseColor = new B.Color3(0.6, 0.7, 0.8);
    m.alpha = 0.28;
    return m;
  }

  if (component === 'bushing') {
    m.diffuseColor = new B.Color3(0.16, 0.86, 0.78);
    m.alpha = 0.45;
    return m;
  }

  if (component === 'bore') {
    m.diffuseColor = new B.Color3(0.58, 0.82, 0.96);
    m.alpha = 0.18;
    return m;
  }

  m.diffuseColor = new B.Color3(0.78, 0.84, 0.9);
  m.alpha = 0.25;
  return m;
}

function clearLoopMeshes(B: BabylonCore, scene: InstanceType<BabylonCore['Scene']>): void {
  const existing = scene.meshes.filter((m) => m.name.startsWith('bushing_loop_') || m.name.startsWith('bushing_wire_') || m.name.startsWith('bushing_solid_'));
  for (const m of existing) m.dispose();
  const mats = scene.materials.filter((m) => m.name.startsWith('mat_') || m.name.startsWith('mat3d_'));
  for (const m of mats) m.dispose();
  const tex = scene.textures.filter((t) => t.name.startsWith('hatch_'));
  for (const t of tex) t.dispose();
}

function renderLoopMeshes(
  loaded: BabylonLoaded,
  scene: InstanceType<BabylonCore['Scene']>,
  sceneModel: CanonicalDraftScene,
  callbacks: BabylonCallbackCtx,
  solidMode: boolean
): SceneBounds {
  const { B, earcut } = loaded;
  clearLoopMeshes(B, scene);

  const { polygons, diagnostics } = buildLoopPolygons(sceneModel);
  callbacks.onDiagnostics(diagnosticsWithInfo(sceneModel, diagnostics));

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  const drawOrder = [...polygons].sort((a, b) => {
    const aVoid = a.loop.regionKind === 'void' ? 1 : 0;
    const bVoid = b.loop.regionKind === 'void' ? 1 : 0;
    if (aVoid !== bVoid) return aVoid - bVoid;
    return b.absArea - a.absArea;
  });

  const solidDepth = Math.max(sceneModel.height * 0.6, sceneModel.width * 0.35, 0.22);

  drawOrder.forEach((poly, idx) => {
    const shape = poly.points.map((p) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.y);
      maxZ = Math.max(maxZ, p.y);
      return new B.Vector3(p.x, 0, p.y);
    });

    if (!solidMode) {
      const mesh = B.MeshBuilder.CreatePolygon(
        `bushing_loop_${idx}`,
        { shape, sideOrientation: B.Mesh.DOUBLESIDE },
        scene,
        earcut
      );
      mesh.position.y = idx * 0.00045;
      mesh.isPickable = true;
      mesh.material = createSectionMaterial(B, scene, poly.loop.component, poly.loop.regionKind);

      const wire = B.MeshBuilder.CreateLines(`bushing_wire_${idx}`, { points: [...shape, shape[0]] }, scene);
      if (poly.loop.regionKind === 'void') {
        wire.color = new B.Color3(0.96, 0.98, 1);
      } else if (poly.loop.component === 'housing') {
        wire.color = new B.Color3(0.78, 0.9, 1.0);
      } else if (poly.loop.component === 'bushing') {
        wire.color = new B.Color3(0.28, 0.98, 0.9);
      } else {
        wire.color = new B.Color3(0.72, 0.9, 1.0);
      }
      wire.alpha = poly.loop.regionKind === 'void' ? 0.75 : 0.9;
      wire.position.y = mesh.position.y + 0.0012;
      wire.isPickable = false;
      return;
    }

    const top = B.MeshBuilder.CreatePolygon(`bushing_solid_top_${idx}`, { shape, sideOrientation: B.Mesh.DOUBLESIDE }, scene, earcut);
    top.position.y = solidDepth / 2;
    top.isPickable = true;
    top.material = createSolidMaterial(B, scene, poly.loop.component, poly.loop.regionKind);

    const bot = B.MeshBuilder.CreatePolygon(`bushing_solid_bot_${idx}`, { shape, sideOrientation: B.Mesh.DOUBLESIDE }, scene, earcut);
    bot.position.y = -solidDepth / 2;
    bot.rotation.x = Math.PI;
    bot.isPickable = true;
    bot.material = createSolidMaterial(B, scene, poly.loop.component, poly.loop.regionKind);

    const wallPts = [...shape, shape[0]];
    const solidLines = B.MeshBuilder.CreateLines(`bushing_solid_wire_${idx}`, { points: wallPts }, scene);
    solidLines.color = poly.loop.regionKind === 'void' ? new B.Color3(0.7, 0.85, 0.95) : new B.Color3(0.1, 0.2, 0.25);
    solidLines.alpha = 0.6;
    solidLines.isPickable = false;
    for (let i = 0; i < shape.length; i++) {
      const p = shape[i];
      const seg = B.MeshBuilder.CreateLines(`bushing_solid_edge_${idx}_${i}`, {
        points: [
          new B.Vector3(p.x, -solidDepth / 2, p.z),
          new B.Vector3(p.x, solidDepth / 2, p.z)
        ]
      }, scene);
      seg.color = solidLines.color;
      seg.alpha = 0.4;
      seg.isPickable = false;
    }
  });

  if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minZ) || !isFinite(maxZ)) {
    return {
      minX: -sceneModel.width / 2,
      maxX: sceneModel.width / 2,
      minZ: -sceneModel.height / 2,
      maxZ: sceneModel.height / 2
    };
  }

  return { minX, maxX, minZ, maxZ };
}

function makeViewState(bounds: SceneBounds): SceneViewState {
  const width = Math.max(1e-4, bounds.maxX - bounds.minX);
  const height = Math.max(1e-4, bounds.maxZ - bounds.minZ);
  return {
    centerX: (bounds.minX + bounds.maxX) / 2,
    centerZ: (bounds.minZ + bounds.maxZ) / 2,
    width,
    height,
    orthoScale: 1,
    panX: 0,
    panZ: 0
  };
}

function configureCamera(
  B: BabylonCore,
  engine: InstanceType<BabylonCore['Engine']>,
  camera: InstanceType<BabylonCore['ArcRotateCamera']>,
  view: SceneViewState
): void {
  const targetX = view.centerX + view.panX;
  const targetZ = view.centerZ + view.panZ;
  const halfW = Math.max(1e-4, view.width * 0.58 * view.orthoScale);
  const halfH = Math.max(1e-4, view.height * 0.58 * view.orthoScale);
  const ratio = engine.getRenderWidth() / Math.max(1, engine.getRenderHeight());
  const halfWAdj = Math.max(halfW, halfH * ratio);
  const halfHAdj = Math.max(halfH, halfW / Math.max(1e-6, ratio));

  camera.mode = B.Camera.ORTHOGRAPHIC_CAMERA;
  camera.orthoLeft = -halfWAdj;
  camera.orthoRight = halfWAdj;
  camera.orthoTop = halfHAdj;
  camera.orthoBottom = -halfHAdj;
  camera.setTarget(new B.Vector3(targetX, 0, targetZ));
}

function alignCameraToNormal(
  B: BabylonCore,
  camera: InstanceType<BabylonCore['ArcRotateCamera']>,
  normal: InstanceType<BabylonCore['Vector3']>
): void {
  const n = normal.normalize();
  const az = Math.atan2(n.z, n.x);
  const el = Math.atan2(n.y, Math.hypot(n.x, n.z));
  camera.alpha = az + Math.PI;
  camera.beta = Math.min(Math.PI - 0.1, Math.max(0.1, Math.PI / 2 - el));
  if (!Number.isFinite(camera.alpha) || !Number.isFinite(camera.beta)) {
    camera.alpha = -Math.PI / 2;
    camera.beta = 0.0001;
  }
}

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
    isRotating = solidMode && (rotateDragEnabled || ev.shiftKey);
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

    isRotating = solidMode && (rotateDragEnabled || ev.shiftKey);

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
