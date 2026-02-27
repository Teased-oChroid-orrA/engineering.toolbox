type Point2 = { x: number; y: number };

type Incoming =
  | { type: 'setGeometry'; points: Point2[]; edges: Array<[number, number]> }
  | { type: 'nearest'; reqId: number; x: number; y: number; radius: number }
  | { type: 'nearestEdge'; reqId: number; x: number; y: number; radius: number }
  | { type: 'rect'; reqId: number; x0: number; y0: number; x1: number; y1: number }
  | { type: 'lasso'; reqId: number; lasso: Point2[] };

type Outgoing =
  | { type: 'nearest'; reqId: number; idx: number | null }
  | { type: 'nearestEdge'; reqId: number; edgeIdx: number | null; t: number; d: number }
  | { type: 'hits'; reqId: number; ids: number[] };

let points: Point2[] = [];
let edges: Array<[number, number]> = [];

const pointInPolygon = (x: number, y: number, poly: Point2[]) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersects = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

self.onmessage = (event: MessageEvent<Incoming>) => {
  const message = event.data;
  if (message.type === 'setGeometry') {
    points = Array.isArray(message.points) ? message.points : [];
    edges = Array.isArray(message.edges) ? message.edges : [];
    return;
  }

  if (message.type === 'nearest') {
    let bestIdx: number | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < points.length; i++) {
      const dx = points[i].x - message.x;
      const dy = points[i].y - message.y;
      const d = Math.hypot(dx, dy);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const payload: Outgoing = { type: 'nearest', reqId: message.reqId, idx: bestDist <= message.radius ? bestIdx : null };
    self.postMessage(payload);
    return;
  }

  if (message.type === 'nearestEdge') {
    let best: { edgeIdx: number; t: number; d: number } | null = null;
    for (let ei = 0; ei < edges.length; ei++) {
      const [a, b] = edges[ei];
      const p0 = points[a];
      const p1 = points[b];
      if (!p0 || !p1) continue;
      const vx = p1.x - p0.x;
      const vy = p1.y - p0.y;
      const len2 = vx * vx + vy * vy;
      if (len2 < 1e-9) continue;
      const t = clamp(((message.x - p0.x) * vx + (message.y - p0.y) * vy) / len2, 0, 1);
      const cx = p0.x + t * vx;
      const cy = p0.y + t * vy;
      const d = Math.hypot(message.x - cx, message.y - cy);
      if (!best || d < best.d) best = { edgeIdx: ei, t, d };
    }
    const payload: Outgoing = best && best.d <= message.radius
      ? { type: 'nearestEdge', reqId: message.reqId, edgeIdx: best.edgeIdx, t: best.t, d: best.d }
      : { type: 'nearestEdge', reqId: message.reqId, edgeIdx: null, t: 0, d: Number.POSITIVE_INFINITY };
    self.postMessage(payload);
    return;
  }

  if (message.type === 'rect') {
    const minX = Math.min(message.x0, message.x1);
    const maxX = Math.max(message.x0, message.x1);
    const minY = Math.min(message.y0, message.y1);
    const maxY = Math.max(message.y0, message.y1);
    const ids: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) ids.push(i);
    }
    const payload: Outgoing = { type: 'hits', reqId: message.reqId, ids };
    self.postMessage(payload);
    return;
  }

  if (message.type === 'lasso') {
    const ids: number[] = [];
    if (message.lasso.length >= 3) {
      for (let i = 0; i < points.length; i++) {
        if (pointInPolygon(points[i].x, points[i].y, message.lasso)) ids.push(i);
      }
    }
    const payload: Outgoing = { type: 'hits', reqId: message.reqId, ids };
    self.postMessage(payload);
  }
};
