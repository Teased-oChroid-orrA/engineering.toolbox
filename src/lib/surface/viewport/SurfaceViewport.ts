import type { Point3D } from '../types';
import { clamp, vecNorm } from '../geom/points';

export type CameraRot = { alpha: number; beta: number };
export type CameraPan = { x: number; y: number };

export function projectPoint(p: Point3D, rot: CameraRot, zoomK: number, w: number, h: number, pan: CameraPan) {
  const ca = Math.cos(rot.alpha);
  const sa = Math.sin(rot.alpha);
  const cb = Math.cos(rot.beta);
  const sb = Math.sin(rot.beta);

  let x = p.x * ca - p.z * sa;
  let z = p.x * sa + p.z * ca;
  const y = p.y * cb - z * sb;
  z = p.y * sb + z * cb;

  return { x: x * zoomK + w / 2 + pan.x, y: y * zoomK + h / 2 + pan.y, z };
}

export function fitToScreen(points: Point3D[], rot: CameraRot, w: number, h: number) {
  if (points.length === 0) return null;
  const ca = Math.cos(rot.alpha);
  const sa = Math.sin(rot.alpha);
  const cb = Math.cos(rot.beta);
  const sb = Math.sin(rot.beta);

  let minX = Infinity; let minY = Infinity;
  let maxX = -Infinity; let maxY = -Infinity;
  for (const p of points) {
    const x = p.x * ca - p.z * sa;
    const z = p.x * sa + p.z * ca;
    const y = p.y * cb - z * sb;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) return null;

  const dx = Math.max(1e-6, maxX - minX);
  const dy = Math.max(1e-6, maxY - minY);
  const pad = 0.9;
  const kx = (w * pad) / dx;
  const ky = (h * pad) / dy;
  const zoomK = Math.max(0.5, Math.min(2000, Math.min(kx, ky)));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return { zoomK, pan: { x: -cx * zoomK, y: -cy * zoomK } };
}

export function depthOpacity(z: number, zRange: { min: number; max: number }) {
  const t = (z - zRange.min) / (zRange.max - zRange.min);
  return 0.18 + 0.82 * clamp(t, 0, 1);
}

export function computeCylinderAxisSegment(
  points: Point3D[],
  cylRes: { axisPoint: Point3D; axisDir: Point3D } | null,
  cylShowAxis: boolean
) {
  if (!cylRes || !cylShowAxis || points.length === 0) return null;
  const ap = cylRes.axisPoint;
  const ad = vecNorm(cylRes.axisDir);
  let minX = Infinity; let minY = Infinity; let minZ = Infinity;
  let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); minZ = Math.min(minZ, p.z);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); maxZ = Math.max(maxZ, p.z);
  }
  const dx = (maxX - minX) || 1;
  const dy = (maxY - minY) || 1;
  const dz = (maxZ - minZ) || 1;
  const L = Math.sqrt(dx * dx + dy * dy + dz * dz) * 0.8;
  return {
    a: { x: ap.x - ad.x * L, y: ap.y - ad.y * L, z: ap.z - ad.z * L },
    b: { x: ap.x + ad.x * L, y: ap.y + ad.y * L, z: ap.z + ad.z * L }
  };
}

