export type Point3D = { x: number; y: number; z: number };
export type Rot = { alpha: number; beta: number };
export type Pan = { x: number; y: number };

export function projectPoint(p: Point3D, opts: { rot: Rot; pan: Pan; zoomK: number; w: number; h: number }) {
  const { rot, pan, zoomK, w, h } = opts;
  const ca = Math.cos(rot.alpha);
  const sa = Math.sin(rot.alpha);
  const cb = Math.cos(rot.beta);
  const sb = Math.sin(rot.beta);

  // yaw about Y
  let x = p.x * ca - p.z * sa;
  let z = p.x * sa + p.z * ca;
  // pitch about X
  let y = p.y * cb - z * sb;
  z = p.y * sb + z * cb;

  const sx = x * zoomK + w / 2 + pan.x;
  const sy = y * zoomK + h / 2 + pan.y;
  return { x: sx, y: sy, z };
}

export function computeDepthOpacity(z: number, zMin: number, zMax: number) {
  const t = (z - zMin) / Math.max(1e-12, (zMax - zMin));
  const a = 0.25 + 0.75 * (1 - t);
  return Math.max(0.10, Math.min(1.0, a));
}
