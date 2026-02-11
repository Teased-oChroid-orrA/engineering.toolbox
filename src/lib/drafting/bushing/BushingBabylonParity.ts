import type { CanonicalDraftScene } from './BushingDraftRenderer';
import { buildLoopPolygons } from './BushingBabylonGeometry';

export type BabylonParitySignature = {
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  centroid: { x: number; y: number };
  loopCount: number;
  polygonCount: number;
  edgeCount: number;
  areaTotal: number;
};

function round(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

export function canonicalSceneSignature(scene: CanonicalDraftScene): BabylonParitySignature {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let sx = 0;
  let sy = 0;
  let n = 0;
  let edgeCount = 0;

  for (const loop of scene.loops) {
    edgeCount += loop.primitives.length;
    for (const primitive of loop.primitives) {
      if (primitive.kind === 'line') {
        const pts = [primitive.from, primitive.to];
        for (const p of pts) {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
          sx += p.x;
          sy += p.y;
          n += 1;
        }
      } else {
        const candidates = [primitive.startDeg, primitive.endDeg, 0, 90, 180, 270]
          .map((deg) => (deg * Math.PI) / 180)
          .map((a) => ({
            x: primitive.center.x + primitive.radius * Math.cos(a),
            y: primitive.center.y + primitive.radius * Math.sin(a)
          }));
        for (const p of candidates) {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
          sx += p.x;
          sy += p.y;
          n += 1;
        }
      }
    }
  }

  if (!isFinite(minX)) {
    minX = minY = maxX = maxY = 0;
  }

  return {
    bbox: { minX: round(minX), minY: round(minY), maxX: round(maxX), maxY: round(maxY) },
    centroid: { x: round(n > 0 ? sx / n : 0), y: round(n > 0 ? sy / n : 0) },
    loopCount: scene.loops.length,
    polygonCount: 0,
    edgeCount,
    areaTotal: 0
  };
}

export function babylonSceneSignature(scene: CanonicalDraftScene): BabylonParitySignature {
  const base = canonicalSceneSignature(scene);
  const { polygons } = buildLoopPolygons(scene);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let sx = 0;
  let sy = 0;
  let n = 0;
  let edgeCount = 0;
  let areaTotal = 0;

  for (const poly of polygons) {
    edgeCount += poly.points.length;
    areaTotal += poly.absArea;
    for (const p of poly.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
      sx += p.x;
      sy += p.y;
      n += 1;
    }
  }

  if (!isFinite(minX)) {
    minX = minY = maxX = maxY = 0;
  }

  return {
    bbox: { minX: round(minX), minY: round(minY), maxX: round(maxX), maxY: round(maxY) },
    centroid: { x: round(n > 0 ? sx / n : 0), y: round(n > 0 ? sy / n : 0) },
    loopCount: base.loopCount,
    polygonCount: polygons.length,
    edgeCount,
    areaTotal: round(areaTotal)
  };
}

export function compareParitySignatures(
  svgSig: BabylonParitySignature,
  babylonSig: BabylonParitySignature,
  tol = 1e-3
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const near = (a: number, b: number, eps = tol) => Math.abs(a - b) <= eps;

  if (svgSig.loopCount !== babylonSig.loopCount) {
    reasons.push(`loop-count mismatch svg=${svgSig.loopCount} babylon=${babylonSig.loopCount}`);
  }
  if (babylonSig.polygonCount < 1) {
    reasons.push('babylon produced no polygons');
  }

  if (!near(svgSig.bbox.minX, babylonSig.bbox.minX, 1e-2)) reasons.push('bbox.minX drift');
  if (!near(svgSig.bbox.minY, babylonSig.bbox.minY, 1e-2)) reasons.push('bbox.minY drift');
  if (!near(svgSig.bbox.maxX, babylonSig.bbox.maxX, 1e-2)) reasons.push('bbox.maxX drift');
  if (!near(svgSig.bbox.maxY, babylonSig.bbox.maxY, 1e-2)) reasons.push('bbox.maxY drift');

  return { ok: reasons.length === 0, reasons };
}
