import { path as d3Path } from 'd3';

export type SectionPoint = { x: number; y: number };

export type SectionLinePrimitive = {
  kind: 'line';
  from: SectionPoint;
  to: SectionPoint;
};

export type SectionArcPrimitive = {
  kind: 'arc';
  center: SectionPoint;
  radius: number;
  startDeg: number;
  endDeg: number;
};

export type SectionPrimitive = SectionLinePrimitive | SectionArcPrimitive;

export type SectionLoop = {
  id: string;
  primitives: SectionPrimitive[];
};

export type SectionRegionKind = 'material' | 'void';
export type SectionRegionComponent = 'housing' | 'bushing' | 'bore' | 'unknown';

export type SectionRegion = {
  id: string;
  kind: SectionRegionKind;
  component: SectionRegionComponent;
  loop: SectionLoop;
};

export type SectionProfile = {
  loops: SectionLoop[];
  regions: SectionRegion[];
  tolerance: number;
};

function pointDistance(a: SectionPoint, b: SectionPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function arcEndpoints(a: SectionArcPrimitive): { start: SectionPoint; end: SectionPoint } {
  const s = (a.startDeg * Math.PI) / 180;
  const e = (a.endDeg * Math.PI) / 180;
  return {
    start: { x: a.center.x + a.radius * Math.cos(s), y: a.center.y + a.radius * Math.sin(s) },
    end: { x: a.center.x + a.radius * Math.cos(e), y: a.center.y + a.radius * Math.sin(e) }
  };
}

function primitiveEndpoints(p: SectionPrimitive): { start: SectionPoint; end: SectionPoint } {
  if (p.kind === 'line') return { start: p.from, end: p.to };
  return arcEndpoints(p);
}

export function validateClosedLoop(loop: SectionLoop, tolerance = 1e-6): { ok: boolean; reason?: string } {
  if (!loop.primitives.length) return { ok: false, reason: 'loop has no primitives' };

  for (let i = 1; i < loop.primitives.length; i += 1) {
    const prev = primitiveEndpoints(loop.primitives[i - 1]);
    const cur = primitiveEndpoints(loop.primitives[i]);
    if (pointDistance(prev.end, cur.start) > tolerance) {
      return { ok: false, reason: `primitive connection break at index ${i}` };
    }
  }

  const first = primitiveEndpoints(loop.primitives[0]);
  const last = primitiveEndpoints(loop.primitives[loop.primitives.length - 1]);
  if (pointDistance(last.end, first.start) > tolerance) {
    return { ok: false, reason: 'loop is not closed' };
  }

  return { ok: true };
}

export function loopToPath(loop: SectionLoop): string {
  const p = d3Path();
  if (!loop.primitives.length) return '';
  const first = primitiveEndpoints(loop.primitives[0]);
  p.moveTo(first.start.x, first.start.y);

  for (const primitive of loop.primitives) {
    if (primitive.kind === 'line') {
      p.lineTo(primitive.to.x, primitive.to.y);
      continue;
    }
    const end = arcEndpoints(primitive).end;
    // Canonical schema supports arcs; renderer currently linearizes arc endpoints.
    p.lineTo(end.x, end.y);
  }

  p.closePath();
  return p.toString();
}

export function pathFromPolyline(points: SectionPoint[]): string {
  if (!points.length) return '';
  const p = d3Path();
  p.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) p.lineTo(points[i].x, points[i].y);
  p.closePath();
  return p.toString();
}
