import type { Point3D } from '../types';

export function bilerp(p00: Point3D, p10: Point3D, p11: Point3D, p01: Point3D, u: number, v: number): Point3D {
  const a = (1 - u) * (1 - v);
  const b = u * (1 - v);
  const c = u * v;
  const d = (1 - u) * v;
  return {
    x: a * p00.x + b * p10.x + c * p11.x + d * p01.x,
    y: a * p00.y + b * p10.y + c * p11.y + d * p01.y,
    z: a * p00.z + b * p10.z + c * p11.z + d * p01.z
  };
}

export function lerp3(a: Point3D, b: Point3D, t: number): Point3D {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t
  };
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function vecSub(a: Point3D, b: Point3D): Point3D {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function vecLen(v: Point3D) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function vecNorm(v: Point3D): Point3D {
  const L = vecLen(v) || 1;
  return { x: v.x / L, y: v.y / L, z: v.z / L };
}

export function deg(rad: number) {
  return (rad * 180) / Math.PI;
}

