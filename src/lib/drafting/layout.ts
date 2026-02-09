export type Box = { x: number; y: number; w: number; h: number };

export function padBox(b: Box, p: number): Box {
  return { x: b.x - p, y: b.y - p, w: b.w + 2 * p, h: b.h + 2 * p };
}

export function intersects(a: Box, b: Box): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

export function overlapArea(a: Box, b: Box): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const w = x2 - x1;
  const h = y2 - y1;
  return w > 0 && h > 0 ? w * h : 0;
}

// Deterministic, font-agnostic approximate text bounding box.
// Assumes ~0.62em per character and ~1.1em line height.
export type TextAnchor = 'start' | 'middle' | 'end';
export type TextBaseline = 'hanging' | 'middle' | 'alphabetic';

export type TextBoxOpts = {
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  anchor?: TextAnchor;
  baseline?: TextBaseline;
  padding?: number;
};

// Overloads:
//   approxTextBox({ x, y, text, ... })
//   approxTextBox(x, y, text, fontSize?, anchor?)  // legacy
export function approxTextBox(opts: TextBoxOpts): Box;
export function approxTextBox(x: number, y: number, text: string, fontSize?: number, anchor?: TextAnchor): Box;
export function approxTextBox(
  a: TextBoxOpts | number,
  b?: number,
  c?: string,
  d?: number,
  e?: TextAnchor
): Box {
  const opts: TextBoxOpts =
    typeof a === 'object'
      ? a
      : {
          x: a,
          y: b ?? 0,
          text: c ?? '',
          fontSize: d,
          anchor: e
        };

  const fontSize = opts.fontSize ?? 11;
  const padding = opts.padding ?? 3;
  const lines = String(opts.text).split('\n');
  const maxChars = Math.max(...lines.map((l) => l.length), 0);
  const w = maxChars * fontSize * 0.62 + padding * 2;
  const h = lines.length * fontSize * 1.1 + padding * 2;

  const anchor = opts.anchor ?? 'start';
  const baseline = opts.baseline ?? 'alphabetic';

  let x = opts.x;
  if (anchor === 'middle') x -= w / 2;
  else if (anchor === 'end') x -= w;

  let y = opts.y;
  if (baseline === 'middle') y -= h / 2;
  else if (baseline === 'hanging') {
    // y at top-ish, keep
  } else {
    // alphabetic baseline: shift up by ~0.8em
    y -= fontSize * 0.85;
  }

  return { x, y, w, h };
}

type Candidate = { box: Box; score: number };

export class Layout {
  private keepouts: Box[] = [];
  private placed: Box[] = [];
  padding: number;

  constructor(opts?: { padding?: number }) {
    this.padding = opts?.padding ?? 4;
  }

  reserve(box: Box) {
    const b = padBox(box, this.padding);
    this.placed.push(b);
  }

  reserveKeepout(box: Box) {
    this.keepouts.push(box);
  }

  /** Exposes the collision score for a box (lower is better). */
  scoreBox(box: Box): number {
    return this.score(box);
  }

  // Score candidate by overlap area with keepouts + placed boxes.
  private score(box: Box): number {
    const b = padBox(box, this.padding);
    let s = 0;
    for (const k of this.keepouts) s += overlapArea(b, k) * 10;
    for (const p of this.placed) s += overlapArea(b, p) * 1;
    return s;
  }

  private getBox<T extends Box | { box: Box }>(item: T): Box {
    // @ts-expect-error runtime check
    return (item && typeof item === 'object' && 'box' in item ? (item as any).box : item) as Box;
  }

  /**
   * Pick and reserve the best placement.
   * - If given plain Box[]: returns the chosen Box.
   * - If given objects that contain { box }: returns the chosen object.
   */
  pickBest<T extends Box | { box: Box }>(items: T[]): T {
    let best: { item: T; score: number } | null = null;
    for (const item of items) {
      const score = this.score(this.getBox(item));
      if (!best || score < best.score) best = { item, score };
      if (score === 0) break;
    }
    const chosen = best ? best.item : items[0];
    this.reserve(this.getBox(chosen));
    return chosen;
  }

  /** Back-compat alias. */
  place<T extends Box | { box: Box }>(items: T[]): T {
    return this.pickBest(items);
  }
}
