import type { BushingInputs, BushingOutput } from '$lib/core/bushing';

type BushingDraftMeta = {
  title: string;
  subtitle: string;
  drawingNo: string;
  sheet: string;
  scale: string;
  rev: string;
  date: string;
  units: string;
  assumptions: string[];
  payload: {
    inputs: BushingInputs;
    governing: BushingOutput['governing'];
    candidates: BushingOutput['candidates'] | null;
    lame: BushingOutput['lame'] | null;
  };
};

function escHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export function getBushingUnitsLabel(units: BushingInputs['units']): string {
  return units === 'metric' ? 'metric (mm, N, MPa)' : 'imperial (in, lbf, ksi)';
}

export function buildBushingAssumptions(form: BushingInputs): string[] {
  const assumptions: string[] = [];
  assumptions.push('Interference fit pressure computed with Lame thick-cylinder compatibility (finite plate equivalent OD).');
  assumptions.push('Pressure-to-bearing uplift uses Fbru_eff = Fbru + k*p with k = 0.8.');
  assumptions.push((form.dT ?? 0) !== 0 ? 'Thermal interference enabled (dT contributes to delta).' : 'Thermal interference not applied.');
  assumptions.push('Units are converted for display; internal base is imperial (in, lbf, psi).');
  return assumptions;
}

export function buildBushingDraftMeta(form: BushingInputs, results: BushingOutput): BushingDraftMeta {
  return {
    title: 'Structural Companion - Bushing Toolbox',
    subtitle: 'Bushing Section',
    drawingNo: 'SC-BUSHING',
    sheet: '1/1',
    scale: 'NTS',
    rev: 'A',
    date: new Date().toISOString().slice(0, 10),
    units: getBushingUnitsLabel(form.units),
    assumptions: buildBushingAssumptions(form),
    payload: {
      inputs: form,
      governing: results.governing,
      candidates: results.candidates ?? null,
      lame: results.lame ?? null
    }
  };
}

export function buildBushingReportHtml(svgText: string, form: BushingInputs, results: BushingOutput, title = 'Structural Companion - Bushing Report'): string {
  const assumptions = buildBushingAssumptions(form).map((x) => `<li>${escHtml(x)}</li>`).join('');
  const gov = results.governing?.name ?? '-';
  const ms = Number.isFinite(results.governing?.margin) ? results.governing.margin.toFixed(3) : '-';
  const p = results.lame?.pressureKsi;
  const date = new Date().toISOString().slice(0, 10);
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>${escHtml(title)}</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:24px;color:#111}
  h1{margin:0 0 8px 0;font-size:18px}
  .meta{font-size:12px;color:#333;margin-bottom:14px}
  .box{border:1px solid #bbb;padding:10px;border-radius:8px}
  .muted{color:#555}
  svg{max-width:100%;height:auto;border:1px solid #ddd;border-radius:8px}
</style>
</head>
<body>
  <h1>Structural Companion - Bushing Toolbox</h1>
  <div class="meta">Units: <b>${escHtml(getBushingUnitsLabel(form.units))}</b> - Date: ${escHtml(date)}</div>
  <div class="box">
    <div><b>Governing:</b> ${escHtml(gov)}</div>
    <div><b>Margin of Safety:</b> ${escHtml(ms)}</div>
    ${p ? `<div class="muted"><b>Contact Pressure:</b> ${escHtml(String(p))} ksi</div>` : ''}
  </div>
  <h2 style="font-size:14px;margin:16px 0 6px 0;">Assumptions</h2>
  <ul>${assumptions}</ul>
  <h2 style="font-size:14px;margin:16px 0 6px 0;">Drafting Sheet</h2>
  ${svgText}
</body>
</html>`;
}
