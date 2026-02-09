import type { Layout } from './layout';
import type { TextAnchor } from './layout';
import { chooseBestCallout, leaderPath, type CalloutOpts } from './placement';

export type PlacedText = { x: number; y: number; text: string; anchor?: TextAnchor };
export type PlacedLeader = { d: string };

export function fmtNumber(n: number | null | undefined, digits = 4) {
  if (n == null || !Number.isFinite(n)) return '—';
  return Number(n).toFixed(digits);
}

export function dimLine(x1: number, y1: number, x2: number, y2: number) {
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

export function arcPath(cx: number, cy: number, r: number, a1: number, a2: number) {
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const x2 = cx + r * Math.cos(a2);
  const y2 = cy + r * Math.sin(a2);
  const large = Math.abs(a2 - a1) > Math.PI ? 1 : 0;
  const sweep = a2 > a1 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} ${sweep} ${x2} ${y2}`;
}

export function placeCallout(
  layout: Layout,
  anchorX: number,
  anchorY: number,
  text: string,
  opts?: CalloutOpts
): { text: PlacedText; leader: PlacedLeader } {
  const chosen = chooseBestCallout(layout, anchorX, anchorY, text, opts);
  const d = leaderPath(anchorX, anchorY, chosen.leaderEnd.x, chosen.leaderEnd.y, opts?.leader);
  return {
    text: { x: chosen.x, y: chosen.y, text, anchor: chosen.anchor },
    leader: { d }
  };
}
