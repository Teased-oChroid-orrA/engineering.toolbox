import type { Edge, Point3D } from '../../../surface/types';
import { vecSub } from '../../../surface/geom/points';

export type IntersectionSeverity = 'info' | 'warning' | 'error' | null;

export type IntersectionRecommendation = {
  label: string;
  confidence: number;
  rationale: string;
};

export type IntersectionDiagnostics = {
  severity: IntersectionSeverity;
  message: string | null;
  angleDeg: number | null;
  skew: number | null;
  recommendations: IntersectionRecommendation[];
};

function vecLen(v: Point3D) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function vecDot(a: Point3D, b: Point3D) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function edgeAngleDeg(a: Edge, b: Edge, points: Point3D[]) {
  const da = vecSub(points[a[1]], points[a[0]]);
  const db = vecSub(points[b[1]], points[b[0]]);
  const la = vecLen(da);
  const lb = vecLen(db);
  if (la < 1e-12 || lb < 1e-12) return null;
  const c = Math.abs(vecDot(da, db) / (la * lb));
  const rad = Math.acos(Math.max(-1, Math.min(1, c)));
  return (rad * 180) / Math.PI;
}

export function precheckIntersectionInputs(args: {
  selEdgeA: number | null;
  selEdgeB: number | null;
  edges: Edge[];
  points: Point3D[];
}) {
  const { selEdgeA, selEdgeB, edges, points } = args;
  if (selEdgeA == null || selEdgeB == null) {
    return { ok: false, diagnostics: { severity: 'error', message: 'Select both edges first.', angleDeg: null, skew: null, recommendations: [] } as IntersectionDiagnostics };
  }
  if (selEdgeA === selEdgeB) {
    return {
      ok: false,
      diagnostics: {
        severity: 'error',
        message: 'Edge A and Edge B must be different.',
        angleDeg: null,
        skew: null,
        recommendations: [
          { label: 'Pick distinct edges', confidence: 0.99, rationale: 'Self-intersection of the same edge is undefined for this operation.' }
        ]
      } as IntersectionDiagnostics
    };
  }
  const ea = edges[selEdgeA];
  const eb = edges[selEdgeB];
  if (!ea || !eb) {
    return { ok: false, diagnostics: { severity: 'error', message: 'Selected edge index is out of range.', angleDeg: null, skew: null, recommendations: [] } as IntersectionDiagnostics };
  }
  const lenA = vecLen(vecSub(points[ea[1]], points[ea[0]]));
  const lenB = vecLen(vecSub(points[eb[1]], points[eb[0]]));
  if (lenA < 1e-8 || lenB < 1e-8) {
    return {
      ok: false,
      diagnostics: {
        severity: 'error',
        message: 'One or both edges are too short/degenerate.',
        angleDeg: null,
        skew: null,
        recommendations: [
          { label: 'Rebuild edge geometry', confidence: 0.95, rationale: 'Near-zero edge length destabilizes the intersection solve.' }
        ]
      } as IntersectionDiagnostics
    };
  }
  const angle = edgeAngleDeg(ea, eb, points);
  if (angle != null && angle < 0.5) {
    return {
      ok: false,
      diagnostics: {
        severity: 'error',
        message: `Edges are nearly parallel (${angle.toFixed(3)}°).`,
        angleDeg: angle,
        skew: null,
        recommendations: [
          { label: 'Choose less parallel edges', confidence: 0.97, rationale: 'Parallel lines have no stable unique offset intersection in this formulation.' },
          { label: 'Increase edge angular separation', confidence: 0.92, rationale: 'Larger angle improves numerical conditioning.' }
        ]
      } as IntersectionDiagnostics
    };
  }
  return {
    ok: true,
    diagnostics: {
      severity: angle != null && angle < 2 ? 'warning' : null,
      message: angle != null && angle < 2 ? `Small crossing angle (${angle.toFixed(3)}°) may increase skew.` : null,
      angleDeg: angle,
      skew: null,
      recommendations: angle != null && angle < 2
        ? [{ label: 'Increase angular separation', confidence: 0.85, rationale: 'Shallow angles amplify intersection uncertainty.' }]
        : []
    } as IntersectionDiagnostics
  };
}

export function diagnoseIntersectionResult(args: {
  skew: number;
  offsetDistance: number;
  angleDeg: number | null;
  existing?: IntersectionDiagnostics | null;
}): IntersectionDiagnostics {
  const scale = Math.max(1e-9, Math.abs(args.offsetDistance));
  const rel = Math.abs(args.skew) / scale;
  const out: IntersectionDiagnostics = args.existing
    ? { ...args.existing, skew: args.skew, recommendations: [...args.existing.recommendations] }
    : { severity: null, message: null, angleDeg: args.angleDeg, skew: args.skew, recommendations: [] };

  if (!Number.isFinite(args.skew)) {
    out.severity = 'error';
    out.message = 'Intersection solve returned non-finite skew.';
    out.recommendations.unshift(
      { label: 'Re-run with cleaner geometry', confidence: 0.96, rationale: 'Non-finite skew indicates unstable solve state.' }
    );
    return out;
  }

  if (rel > 0.2) {
    out.severity = 'error';
    out.message = `High skew detected (Δ=${args.skew.toExponential(2)}).`;
    out.recommendations.unshift(
      { label: 'Reduce offset distance', confidence: clamp01(0.70 + rel * 0.2), rationale: 'Large offsets amplify skew in non-ideal line configurations.' },
      { label: 'Use better-conditioned edge pair', confidence: 0.91, rationale: 'Skew reduces when edge pair is less parallel and less noisy.' },
      { label: 'Extend/source longer edges', confidence: 0.78, rationale: 'Longer edge baselines improve line-fit stability.' }
    );
    return out;
  }

  if (rel > 0.02) {
    out.severity = out.severity === 'error' ? 'error' : 'warning';
    out.message = `Moderate skew detected (Δ=${args.skew.toExponential(2)}).`;
    out.recommendations.unshift(
      { label: 'Inspect local deviation', confidence: 0.82, rationale: 'Moderate skew may still be acceptable depending on tolerance.' },
      { label: 'Lower offset or refine edges', confidence: 0.76, rationale: 'Small geometry cleanup can improve intersection quality.' }
    );
    return out;
  }

  out.severity = out.severity ?? 'info';
  out.message = out.message ?? 'Intersection is stable.';
  out.recommendations.unshift(
    { label: 'Accept current result', confidence: 0.94, rationale: 'Skew is low relative to requested offset distance.' }
  );
  return out;
}

