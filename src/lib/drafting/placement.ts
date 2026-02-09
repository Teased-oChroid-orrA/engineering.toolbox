import type { Box, TextAnchor } from './layout';
import { approxTextBox } from './layout';
import type { Layout } from './layout';

export type LeaderStyle = {
  shoulder?: number; // short horizontal shoulder length
  gap?: number; // gap between text box edge and leader endpoint
};

export type CalloutOpts = {
  fontSize?: number;
  anchor?: TextAnchor;
  // Candidate search radius (screen units)
  radius?: number;
  // Additional candidate Y offsets used for stacking
  stackOffsets?: number[];
  // Leader routing style
  leader?: LeaderStyle;
};

export type CalloutPlacement = {
  x: number;
  y: number;
  anchor: TextAnchor;
  box: Box;
  leaderEnd: { x: number; y: number };
  score: number;
};

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function leaderPath(fromX: number, fromY: number, toX: number, toY: number, style?: LeaderStyle) {
  const shoulder = style?.shoulder ?? 10;
  const dx = toX - fromX;
  const sx = dx >= 0 ? 1 : -1;
  const p1x = fromX + sx * shoulder;
  const p1y = fromY;
  return `M ${fromX} ${fromY} L ${p1x} ${p1y} L ${toX} ${toY}`;
}

function boxForLeader(fromX: number, fromY: number, toX: number, toY: number, style?: LeaderStyle): Box {
  // Bounding box of the two-segment leader.
  const shoulder = style?.shoulder ?? 10;
  const dx = toX - fromX;
  const sx = dx >= 0 ? 1 : -1;
  const p1x = fromX + sx * shoulder;
  const p1y = fromY;

  const xs = [fromX, p1x, toX];
  const ys = [fromY, p1y, toY];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = 2;
  return { x: minX - pad, y: minY - pad, w: (maxX - minX) + 2 * pad, h: (maxY - minY) + 2 * pad };
}

function nearestPointOnBox(ax: number, ay: number, b: Box) {
  const x = clamp(ax, b.x, b.x + b.w);
  const y = clamp(ay, b.y, b.y + b.h);
  return { x, y };
}

function defaultStackOffsets(fontSize: number) {
  // y offsets measured from the placement point (baseline).
  return [
    -6,
    14,
    14 + fontSize * 1.2,
    -22,
    14 + fontSize * 2.4
  ];
}

export function proposeCalloutPlacements(
  anchorX: number,
  anchorY: number,
  text: string,
  opts?: CalloutOpts
): Omit<CalloutPlacement, 'score'>[] {
  const fontSize = opts?.fontSize ?? 10;
  const anchor: TextAnchor = opts?.anchor ?? 'start';
  const R = opts?.radius ?? 26;
  const stack = opts?.stackOffsets ?? defaultStackOffsets(fontSize);

  // Candidate directions: right, left, above, below, diagonals.
  // We generate "stacked" variants by shifting y (or x) so repeated dims
  // have multiple deterministic options.
  const base = [
    { dx: +R, dy: 0 },
    { dx: -R, dy: 0 },
    { dx: 0, dy: -R },
    { dx: 0, dy: +R },
    { dx: +0.7 * R, dy: -0.7 * R },
    { dx: +0.7 * R, dy: +0.7 * R },
    { dx: -0.7 * R, dy: -0.7 * R },
    { dx: -0.7 * R, dy: +0.7 * R }
  ];

  const placements: Omit<CalloutPlacement, 'score'>[] = [];

  for (const dir of base) {
    // Stack offsets applied orthogonal-ish to direction.
    for (const so of stack) {
      const x = anchorX + dir.dx;
      const y = anchorY + dir.dy + so;
      const box = approxTextBox(x, y, text, fontSize, anchor);
      placements.push({ x, y, anchor, box, leaderEnd: { x: x, y: y } });
    }
  }

  return placements;
}

export function chooseBestCallout(
  layout: Layout,
  anchorX: number,
  anchorY: number,
  text: string,
  opts?: CalloutOpts
): CalloutPlacement {
  const fontSize = opts?.fontSize ?? 10;
  const leaderStyle = opts?.leader;
  const gap = leaderStyle?.gap ?? 6;

  const candidates = proposeCalloutPlacements(anchorX, anchorY, text, opts);

  let best: CalloutPlacement | null = null;
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];

    // Leader endpoint snaps to nearest edge of text box, with a small gap.
    const near = nearestPointOnBox(anchorX, anchorY, c.box);
    const toX = near.x + (anchorX < c.box.x ? -gap : anchorX > c.box.x + c.box.w ? +gap : 0);
    const toY = near.y;

    const leaderB = boxForLeader(anchorX, anchorY, toX, toY, leaderStyle);

    // Score:
    //  - Hard collisions from layout scoring (keepouts weighted higher in Layout)
    //  - Plus a small distance penalty (prefer closer)
    //  - Plus a small leader penalty
    const dx = c.x - anchorX;
    const dy = c.y - anchorY;
    const dist = Math.hypot(dx, dy);

    const score =
      layout.scoreBox(c.box) +
      0.25 * layout.scoreBox(leaderB) +
      0.03 * dist +
      // mild preference for right-side placement for readability (deterministic)
      (c.x < anchorX ? 0.8 : 0);

    const placed: CalloutPlacement = {
      ...c,
      leaderEnd: { x: toX, y: toY },
      score
    };

    if (!best || placed.score < best.score || (placed.score === best.score && i < candidates.length)) {
      best = placed;
      if (score === 0) break;
    }
  }

  const chosen = best ?? ({
    x: anchorX + 20,
    y: anchorY,
    anchor: 'start' as const,
    box: approxTextBox(anchorX + 20, anchorY, text, fontSize, 'start'),
    leaderEnd: { x: anchorX + 20, y: anchorY },
    score: 0
  } satisfies CalloutPlacement);

  // Reserve the chosen callout box so subsequent callouts avoid it.
  layout.reserve(chosen.box);
  return chosen;
}
