import { esc, num } from '../core/svg';

type Viewport = { x: number; y: number; w: number; h: number };

export type ShearDraftInputs = {
  planes: 1 | 2;
  dia: number;
  t1: number;
  t2: number;
  t3: number;
  width: number;
  edgeDist: number;
};

// Deterministic, DOM-free SVG generator for shear joint section geometry.
// Mirrors ShearDrafting.svelte, but renders a static section view.
export function renderShearSection(rawInputs: any, vp: Viewport): string {
  const i: ShearDraftInputs = {
    planes: (rawInputs?.planes ?? 1) as 1 | 2,
    dia: Number(rawInputs?.dia ?? rawInputs?.d ?? 0.25),
    t1: Number(rawInputs?.t1 ?? 0.125),
    t2: Number(rawInputs?.t2 ?? 0.125),
    t3: Number(rawInputs?.t3 ?? 0),
    width: Number(rawInputs?.width ?? 1.0),
    edgeDist: Number(rawInputs?.edgeDist ?? 0.5),
  };

  const D = i.dia || 0.25;
  const T_stack = i.planes === 1 ? (i.t1 + i.t2) : (i.t1 + i.t2 + i.t3);
  const geomW = (i.edgeDist || D * 2) + D * 2.5;
  const geomH = (T_stack || D * 2) + D * 2;

  // Provide a little surrounding margin in model space
  const vbX = -D * 1.0;
  const vbY = -D * 1.5;
  const vbW = geomW + D * 2;
  const vbH = geomH + D * 3;

  const scale = Math.min(vp.w / vbW, vp.h / vbH);
  const tx = vp.x - vbX * scale;
  const ty = vp.y - vbY * scale;

  const nPlies = i.planes === 1 ? 2 : 3;
  const plies = Array.from({ length: nPlies }, (_, k) => {
    const thick = k === 0 ? i.t1 : (k === 1 ? i.t2 : i.t3);
    const yPos = k === 0 ? 0 : (k === 1 ? i.t1 : i.t1 + i.t2);
    return { thick, yPos, k };
  });

  const hatch = `
    <defs>
      <pattern id="hatch" width="1" height="1" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="1" stroke="#e5e7eb" stroke-width="0.05" opacity="0.25"/>
      </pattern>
      <mask id="holeMask">
        <rect x="${num(vbX)}" y="${num(vbY)}" width="${num(vbW)}" height="${num(vbH)}" fill="white"/>
        <rect x="${num(i.edgeDist - D / 2)}" y="${num(-D)}" width="${num(D)}" height="${num(geomH * 2)}" fill="black"/>
      </mask>
    </defs>`;

  const layers = plies
    .map(({ thick, yPos }) =>
      `<rect x="0" y="${num(yPos)}" width="${num(geomW)}" height="${num(thick)}" fill="url(#hatch)" stroke="#e5e7eb" stroke-width="${num(D * 0.02)}" />`
    )
    .join('\n');

  const bolt = `
    <g>
      <rect x="${num(i.edgeDist - D / 2)}" y="${num(-D * 0.5)}" width="${num(D)}" height="${num(T_stack + D)}" rx="${num(D * 0.05)}" fill="#ffffff" fill-opacity="0.08" stroke="#e5e7eb" stroke-width="${num(D * 0.02)}" />
      <rect x="${num(i.edgeDist - D * 0.8)}" y="${num(-D * 0.8)}" width="${num(D * 1.6)}" height="${num(D * 0.3)}" rx="${num(D * 0.05)}" fill="#111827" stroke="#e5e7eb" stroke-width="${num(D * 0.02)}" />
    </g>`;

  const dim = `
    <g opacity="0.6" font-family="ui-monospace, SFMono-Regular" fill="#e5e7eb">
      <line x1="0" y1="${num(T_stack + D * 0.5)}" x2="${num(i.edgeDist)}" y2="${num(T_stack + D * 0.5)}" stroke="#e5e7eb" stroke-width="${num(D * 0.01)}" />
      <line x1="${num(i.edgeDist)}" y1="${num(T_stack + D * 0.4)}" x2="${num(i.edgeDist)}" y2="${num(T_stack + D * 0.6)}" stroke="#e5e7eb" stroke-width="${num(D * 0.01)}" />
      <text x="${num(i.edgeDist / 2)}" y="${num(T_stack + D * 0.85)}" font-size="${num(D * 0.25)}" text-anchor="middle">${esc('e')}</text>
    </g>`;

  const title = `<text x="0" y="${num(-D * 0.8)}" font-size="${num(D * 0.25)}" fill="rgba(229,231,235,0.65)" font-family="ui-monospace, SFMono-Regular" letter-spacing="0.1em">${esc('SECTION A-A')}</text>`;

  return `
  <g transform="translate(${num(tx)} ${num(ty)}) scale(${num(scale)})" fill="none">
    ${hatch}
    ${title}
    <g mask="url(#holeMask)">
      ${layers}
    </g>
    ${bolt}
    ${dim}
  </g>`;
}
