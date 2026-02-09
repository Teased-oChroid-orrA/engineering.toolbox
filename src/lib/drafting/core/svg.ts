// Tiny SVG string helpers for deterministic drafting output.

export function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function num(x: number, digits = 4): string {
  if (!Number.isFinite(x)) return '0';
  // Deterministic formatting: fixed then trim.
  const s = x.toFixed(digits);
  return s.replace(/\.0+$/, '').replace(/(\.\d+?)0+$/, '$1');
}

export function attrs(obj: Record<string, string | number | undefined | null>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    parts.push(`${k}="${typeof v === 'number' ? num(v) : esc(String(v))}"`);
  }
  return parts.join(' ');
}
