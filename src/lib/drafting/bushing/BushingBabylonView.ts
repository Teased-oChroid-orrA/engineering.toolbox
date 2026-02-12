import type { BabylonCore, SceneBounds, SceneViewState } from './BushingBabylonShared';

export function makeViewState(bounds: SceneBounds): SceneViewState {
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

export function configureCamera(
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

export function alignCameraToNormal(
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
