import { esc, num } from '../core/svg';

type Viewport = { x: number; y: number; w: number; h: number };

// Deterministic, DOM-free SVG generator for bushing section geometry.
// This mirrors the logic in BushingDrafting.svelte but produces a standalone <g>.
// Inputs are treated as solver-authoritative (i.e., already normalized to internal units).
export function renderBushingSection(inputs: any, vp: Viewport): string {
  const bore = Number(inputs?.boreDia ?? 0.5);
  const L = Number(inputs?.housingLen ?? 0.5);
  const W = Number(inputs?.housingWidth ?? 1.5);
  const ID = Number(inputs?.idBushing ?? 0.375);
  const od = Number(inputs?.geometry?.odBushing ?? inputs?.boreDia ?? 0.5);

  const vbW = W * 1.6;
  const vbH = L * 3.4;

  // Map local model coords (centered) into viewport
  const scale = Math.min(vp.w / vbW, vp.h / vbH);
  const cx = vp.x + vp.w / 2;
  const cy = vp.y + vp.h / 2;
  const tx = cx;
  const ty = cy;

  const r_o = od / 2;
  const r_i = ID / 2;
  const topY = -L / 2;
  const botY = L / 2;

  function seg(side: 'left' | 'right') {
    const s = side === 'left' ? -1 : 1;
    const h_path = `M ${num(s * W / 2)} ${num(topY)} L ${num(s * W / 2)} ${num(botY)} L ${num(s * r_o)} ${num(botY)} L ${num(s * r_o)} ${num(topY)} Z`;

    let pts: Array<{ x: number; y: number }> = [];
    if (inputs?.bushingType === 'flanged') {
      const fr = Number(inputs?.flangeOd ?? od) / 2;
      const ft = Number(inputs?.flangeThk ?? 0);
      pts = [
        { x: s * fr, y: topY - ft },
        { x: s * fr, y: topY },
        { x: s * r_o, y: topY },
        { x: s * r_o, y: botY },
        { x: s * r_i, y: botY },
        { x: s * r_i, y: topY - ft },
      ];
    } else if (inputs?.bushingType === 'countersink' && inputs?.geometry?.csExternal) {
      const cs = inputs.geometry.csExternal;
      const csTop = Number(cs?.dia ?? od) / 2;
      const depth = Number(cs?.depth ?? 0);
      const csY = Math.min(botY, topY + depth);
      pts = [
        { x: s * csTop, y: topY },
        { x: s * r_o, y: csY },
        { x: s * r_o, y: botY },
        { x: s * r_i, y: botY },
        { x: s * r_i, y: topY },
      ];
    } else {
      pts = [
        { x: s * r_o, y: topY },
        { x: s * r_o, y: botY },
        { x: s * r_i, y: botY },
        { x: s * r_i, y: topY },
      ];
    }
    const b_path = `M ${pts.map((p) => `${num(p.x)},${num(p.y)}`).join(' L ')} Z`;
    return { h_path, b_path };
  }

  // Drafting patterns (hatches)
  const defs = `
    <defs>
      <pattern id="hatchH" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="4" stroke="rgba(255,255,255,0.18)" stroke-width="0.6" />
      </pattern>
      <pattern id="hatchB" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(135)">
        <line x1="0" y1="0" x2="0" y2="3" stroke="#2dd4bf" stroke-width="0.8" />
      </pattern>
    </defs>`;

  const left = seg('left');
  const right = seg('right');

  const labelSize = Math.max(2.5, bore * 0.18);
  const titleY = topY - bore * 0.6;

  return `
  <g transform="translate(${num(tx)} ${num(ty)}) scale(${num(scale)})">
    ${defs}

    <g>
      <path d="${left.h_path}" fill="url(#hatchH)" stroke="#94a3b8" stroke-width="0.9" />
      <path d="${right.h_path}" fill="url(#hatchH)" stroke="#94a3b8" stroke-width="0.9" />
    </g>
    <g>
      <path d="${left.b_path}" fill="url(#hatchB)" stroke="#2dd4bf" stroke-width="1.1" />
      <path d="${right.b_path}" fill="url(#hatchB)" stroke="#2dd4bf" stroke-width="1.1" />
    </g>

    <line x1="0" y1="${num(-L)}" x2="0" y2="${num(L)}" stroke="rgba(255,255,255,0.35)" stroke-dasharray="5,3" />
    <line x1="${num(-W / 2)}" y1="0" x2="${num(W / 2)}" y2="0" stroke="rgba(255,255,255,0.15)" stroke-dasharray="4,4" />

    <g font-family="ui-monospace, SFMono-Regular" font-size="${num(labelSize)}" fill="#cbd5e1">
      <text x="0" y="${num(titleY)}" text-anchor="middle">${esc('SECTION A-A')}</text>
      <text x="${num(-W / 2)}" y="${num(-L / 2 - bore * 0.2)}" text-anchor="middle" opacity="0.7">${esc('Housing')}</text>
      <text x="${num(-od / 2)}" y="${num(L / 2 + bore * 0.4)}" text-anchor="middle" fill="#2dd4bf">${esc('Bushing')}</text>
    </g>
  </g>`;
}
