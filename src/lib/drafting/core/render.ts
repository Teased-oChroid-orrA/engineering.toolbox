import { esc, num } from './svg';
import { renderBushingSection } from '../bushing/generate';
import { renderShearSection } from '../shear/generate';

export type DraftKind = 'bushing' | 'shear';

export type DraftMeta = {
  title?: string;
  subtitle?: string;
  drawingNo?: string;
  sheet?: string;
  scale?: string;
  rev?: string;
  drafter?: string;
  date?: string; // YYYY-MM-DD

  // WP2.8 additions (auditability)
  units?: string;
  assumptions?: string[];
  payload?: any;
};

export type DraftSheetOptions = {
  width?: number;  // mm-like sheet units (arbitrary SVG units)
  height?: number;
  margin?: number;
  // Where to place the drawing viewport (inside margins)
  viewportPad?: number;
};

function safeJson(o: any): string {
  try { return JSON.stringify(o ?? null); } catch { return 'null'; }
}

// Drafting sheet template (border + title block) rendered to a standalone SVG string.
// This is intentionally DOM-free so it can be used in headless contexts.
export function renderDraftingSheetSvg(kind: DraftKind, inputs: any, meta: DraftMeta = {}, opts: DraftSheetOptions = {}): string {
  const width = opts.width ?? 420;
  const height = opts.height ?? 297;
  const margin = opts.margin ?? 18;
  const viewportPad = opts.viewportPad ?? 8;

  const title = meta.title ?? 'Structural Companion';
  const subtitle = meta.subtitle ?? (kind === 'bushing' ? 'Bushing Section' : 'Shear Joint Section');
  const drawingNo = meta.drawingNo ?? '—';
  const sheet = meta.sheet ?? '1/1';
  const scale = meta.scale ?? 'NTS';
  const rev = meta.rev ?? 'A';
  const drafter = meta.drafter ?? '';
  const date = meta.date ?? new Date().toISOString().slice(0, 10);

  const units = meta.units ?? '';
  const assumptions = Array.isArray(meta.assumptions) ? meta.assumptions : [];

  const metaBlob = {
    kind,
    generatedAt: new Date().toISOString(),
    meta: {
      title, subtitle, drawingNo, sheet, scale, rev, drafter, date, units,
      assumptions,
    },
    payload: meta.payload ?? null,
  };

  const metadataJson = safeJson(metaBlob);

  const TB_W = 150;
  const TB_H = 55;

  // Drawing viewport bounds (inside sheet border)
  const x0 = margin + viewportPad;
  const y0 = margin + viewportPad;
  const x1 = width - margin - viewportPad;
  const y1 = height - margin - TB_H - viewportPad - 6; // keep clear of title block
  const vpW = Math.max(10, x1 - x0);
  const vpH = Math.max(10, y1 - y0);

  const drawing = kind === 'bushing'
    ? renderBushingSection(inputs, { x: x0, y: y0, w: vpW, h: vpH })
    : renderShearSection(inputs, { x: x0, y: y0, w: vpW, h: vpH });

  const notes = (() => {
    if (!units && assumptions.length === 0) return '';
    const lines = [
      units ? `Units: ${units}` : '',
      ...assumptions.slice(0, 3).map(a => `• ${a}`),
    ].filter(Boolean);
    const x = margin + 6;
    const y = height - margin - 6;
    const lineH = 12;
    const startY = y - (lines.length - 1) * lineH;
    return `
    <g id="notes" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="10" fill="#e5e7eb" opacity="0.85">
      ${lines.map((t, i) => `<text x="${num(x)}" y="${num(startY + i * lineH)}">${esc(t)}</text>`).join('')}
    </g>`;
  })();

  const titleBlock = (() => {
    const tx = width - margin - TB_W;
    const ty = height - margin - TB_H;
    return `
    <g transform="translate(${num(tx)} ${num(ty)})" font-family="ui-sans-serif, system-ui, -apple-system" fill="#e5e7eb">
      <rect x="0" y="0" width="${num(TB_W)}" height="${num(TB_H)}" fill="rgba(255,255,255,0.02)" stroke="#e5e7eb" stroke-width="0.6" />
      <line x1="0" y1="18" x2="${num(TB_W)}" y2="18" stroke="#e5e7eb" stroke-width="0.4" />
      <line x1="0" y1="36" x2="${num(TB_W)}" y2="36" stroke="#e5e7eb" stroke-width="0.4" />
      <line x1="${num(TB_W * 0.6)}" y1="18" x2="${num(TB_W * 0.6)}" y2="${num(TB_H)}" stroke="#e5e7eb" stroke-width="0.4" />

      <text x="4" y="12" font-size="9" font-weight="600">${esc(title)}</text>
      ${subtitle ? `<text x="4" y="26" font-size="8" opacity="0.85">${esc(subtitle)}</text>` : ''}

      <text x="4" y="44" font-size="7">DWG: ${esc(drawingNo)}</text>
      <text x="${num(TB_W * 0.6 + 4)}" y="44" font-size="7">SHT: ${esc(sheet)}</text>

      <text x="4" y="52" font-size="7">SCL: ${esc(scale)}</text>
      <text x="${num(TB_W * 0.6 + 4)}" y="52" font-size="7">REV: ${esc(rev)}</text>

      ${drafter
        ? `<text x="4" y="34" font-size="7">DRWN: ${esc(drafter)}</text><text x="${num(TB_W * 0.6 + 4)}" y="34" font-size="7">${esc(date)}</text>`
        : `<text x="4" y="34" font-size="7">${esc(date)}</text>`}
    </g>`;
  })();

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${num(width)}" height="${num(height)}" viewBox="0 0 ${num(width)} ${num(height)}">
  <metadata>${esc(metadataJson)}</metadata>
  <rect x="${num(margin)}" y="${num(margin)}" width="${num(width - 2 * margin)}" height="${num(height - 2 * margin)}" fill="none" stroke="#e5e7eb" stroke-width="0.6" />
  ${drawing}
  ${titleBlock}
  ${notes}
</svg>`;
}
