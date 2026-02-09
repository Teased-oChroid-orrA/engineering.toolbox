import type { Curve, Point3D } from '../types';

export function buildLoftSegments(
  curves: Curve[],
  points: Point3D[],
  loftA: number | null,
  loftB: number | null
): { segments: { a: Point3D; b: Point3D }[]; error: string | null } {
  if (loftA == null || loftB == null) return { segments: [], error: null };
  const a = curves[loftA];
  const b = curves[loftB];
  if (!a || !b) return { segments: [], error: null };
  if (a.pts.length < 2 || b.pts.length < 2) return { segments: [], error: null };
  if (a.pts.length !== b.pts.length) return { segments: [], error: 'Loft requires equal point counts (for now).' };

  const n = a.pts.length;
  const pa = a.pts.map((i) => points[i]).filter(Boolean);
  const pb = b.pts.map((i) => points[i]).filter(Boolean);
  if (pa.length !== n || pb.length !== n) return { segments: [], error: null };

  const segs: { a: Point3D; b: Point3D }[] = [];
  for (let i = 0; i < n - 1; i++) {
    segs.push({ a: pa[i], b: pa[i + 1] });
    segs.push({ a: pb[i], b: pb[i + 1] });
  }
  for (let i = 0; i < n; i++) segs.push({ a: pa[i], b: pb[i] });
  return { segments: segs, error: null };
}

