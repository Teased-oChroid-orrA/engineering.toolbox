export type Pt2 = { x: number; y: number };

export function pointInPoly(px: number, py: number, poly: Pt2[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const denom = (yj - yi) || 1e-12;
    const intersect = ((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / denom + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function hitsInRect(projected: Pt2[], r: { x0: number; y0: number; x1: number; y1: number }) {
  const xMin = Math.min(r.x0, r.x1);
  const xMax = Math.max(r.x0, r.x1);
  const yMin = Math.min(r.y0, r.y1);
  const yMax = Math.max(r.y0, r.y1);
  const hits: number[] = [];
  for (let i = 0; i < projected.length; i++) {
    const p = projected[i];
    if (p.x >= xMin && p.x <= xMax && p.y >= yMin && p.y <= yMax) hits.push(i);
  }
  return hits;
}

export function hitsInLasso(projected: Pt2[], poly: Pt2[]) {
  const hits: number[] = [];
  if (poly.length < 3) return hits;
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const q of poly) {
    xMin = Math.min(xMin, q.x); xMax = Math.max(xMax, q.x);
    yMin = Math.min(yMin, q.y); yMax = Math.max(yMax, q.y);
  }
  for (let i = 0; i < projected.length; i++) {
    const p = projected[i];
    if (p.x < xMin || p.x > xMax || p.y < yMin || p.y > yMax) continue;
    if (pointInPoly(p.x, p.y, poly)) hits.push(i);
  }
  return hits;
}

export function applySelectionFromHits(params: {
  current: number[];
  hits: number[];
  add: boolean;
  subtract: boolean;
}): number[] {
  const cur = new Set(params.current);
  if (!params.add && !params.subtract) cur.clear();
  if (params.subtract) {
    for (const i of params.hits) cur.delete(i);
  } else {
    for (const i of params.hits) cur.add(i);
  }
  return Array.from(cur).sort((a, b) => a - b);
}
