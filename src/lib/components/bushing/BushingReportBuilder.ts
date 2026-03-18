import type { BushingInputs, BushingOutput } from '$lib/core/bushing';
import { formatToleranceRange, scaleValueToToleranceRange } from '$lib/core/bushing/tolerancePresentation';
import { makeRange } from '$lib/core/bushing/solveMath';

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

function fmt(value: number | null | undefined, digits = 4): string {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '---';
}

function stressUnit(units: BushingInputs['units']): string {
  return units === 'metric' ? 'MPa' : 'ksi';
}

function forceUnit(units: BushingInputs['units']): string {
  return units === 'metric' ? 'N' : 'lbf';
}

function convertStress(value: number, units: BushingInputs['units']): number {
  return units === 'metric' ? value * 0.006894757 : value / 1000;
}

function convertForce(value: number, units: BushingInputs['units']): number {
  return units === 'metric' ? value * 4.4482216152605 : value;
}

function effectiveInterferenceRange(results: BushingOutput) {
  return makeRange(
    'limits',
    results.tolerance.achievedInterference.lower + results.lame.deltaThermal,
    results.tolerance.achievedInterference.upper + results.lame.deltaThermal,
    results.tolerance.achievedInterference.nominal + results.lame.deltaThermal
  );
}

function scaledRangeString(value: number, results: BushingOutput, units: BushingInputs['units'], kind: 'stress' | 'force') {
  const range = scaleValueToToleranceRange(value, results.physics.deltaEffective, effectiveInterferenceRange(results));
  const converter = kind === 'stress'
    ? (v: number) => convertStress(v, units)
    : (v: number) => convertForce(v, units);
  return formatToleranceRange(
    makeRange('limits', converter(range.lower), converter(range.upper), converter(range.nominal)),
    units === 'metric' && kind === 'stress' ? 1 : 4
  );
}

function row(label: string, value: string): string {
  return `<tr><th>${escHtml(label)}</th><td>${escHtml(value)}</td></tr>`;
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
  const date = new Date().toISOString().slice(0, 10);
  const warnings = results.warningCodes.length
    ? `<ul>${results.warningCodes.map((warning) => `<li><strong>${escHtml(warning.code)}</strong>: ${escHtml(warning.message)}</li>`).join('')}</ul>`
    : '<div class="muted">No active warnings.</div>';
  const fitRows = [
    row('Effective interference', formatToleranceRange(effectiveInterferenceRange(results))),
    row('Bushing OD', formatToleranceRange(results.tolerance.odBushing)),
    row('Target interference', formatToleranceRange(results.tolerance.interferenceTarget)),
    row('Achieved interference', formatToleranceRange(results.tolerance.achievedInterference)),
    row(`Contact pressure (${stressUnit(form.units)})`, scaledRangeString(results.physics.contactPressure, results, form.units, 'stress')),
    row(`Housing axial stress (${stressUnit(form.units)})`, scaledRangeString(results.physics.stressAxialHousing, results, form.units, 'stress')),
    row(`Bushing axial stress (${stressUnit(form.units)})`, scaledRangeString(results.physics.stressAxialBushing, results, form.units, 'stress')),
    row(`Install force (${forceUnit(form.units)})`, scaledRangeString(results.physics.installForce, results, form.units, 'force'))
  ].join('');
  const toleranceRows = [
    row('Bore', formatToleranceRange(results.tolerance.bore)),
    row('OD', formatToleranceRange(results.tolerance.odBushing)),
    row('Target interference', formatToleranceRange(results.tolerance.interferenceTarget)),
    row('Achieved interference', formatToleranceRange(results.tolerance.achievedInterference)),
    ...(results.tolerance.csInternalDia ? [row('Internal CS dia', formatToleranceRange(results.tolerance.csInternalDia))] : []),
    ...(results.tolerance.csInternalDepth ? [row('Internal CS depth', formatToleranceRange(results.tolerance.csInternalDepth))] : []),
    ...(results.tolerance.csExternalDia ? [row('External CS dia', formatToleranceRange(results.tolerance.csExternalDia))] : []),
    ...(results.tolerance.csExternalDepth ? [row('External CS depth', formatToleranceRange(results.tolerance.csExternalDepth))] : [])
  ].join('');
  const inputRows = [
    row('Units', getBushingUnitsLabel(form.units)),
    row('Housing material', form.matHousing),
    row('Bushing material', form.matBushing),
    row('Housing thickness', fmt(form.housingLen)),
    row('Plate width', fmt(form.housingWidth)),
    row('Edge distance', fmt(form.edgeDist)),
    row('Bushing type', form.bushingType),
    row('ID type', form.idType),
    row('Internal CS mode', form.csMode),
    row('External CS mode', form.extCsMode)
  ].join('');
  const lameRows = [
    row('Housing hoop max', `${fmt(convertStress(results.hoop.housingSigma, form.units), form.units === 'metric' ? 1 : 2)} ${stressUnit(form.units)}`),
    row('Bushing hoop max', `${fmt(convertStress(results.hoop.bushingSigma, form.units), form.units === 'metric' ? 1 : 2)} ${stressUnit(form.units)}`),
    row('Axial coupling', `${fmt(results.physics.axialConstraintFactor, 2)} / ${fmt(results.physics.axialLengthFactor, 2)}`),
    row('Equivalent outer diameter', fmt(results.lame.effectiveODHousing)),
    row('Psi factor', fmt(results.lame.psi, 3))
  ].join('');
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>${escHtml(title)}</title>
<style>
  :root{color-scheme:light}
  body{font-family:"Segoe UI",Inter,Arial,sans-serif;margin:0;background:#edf4ff;color:#0f172a}
  .page{padding:28px 30px 36px 30px}
  .hero{padding:20px 22px;border-radius:16px;background:linear-gradient(135deg,#0f172a,#10284d 55%,#0b4f6c);color:#e2f3ff;box-shadow:0 18px 50px rgba(15,23,42,0.18)}
  h1{margin:0;font-size:22px;letter-spacing:0.02em}
  h2{margin:0 0 10px 0;font-size:13px;text-transform:uppercase;letter-spacing:0.12em;color:#164e63}
  .hero-meta{margin-top:10px;font-size:12px;opacity:0.88}
  .hero-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}
  .hero-card{padding:10px 12px;border:1px solid rgba(186,230,253,0.18);border-radius:12px;background:rgba(255,255,255,0.06)}
  .hero-card .label{font-size:10px;text-transform:uppercase;letter-spacing:0.12em;opacity:0.75}
  .hero-card .value{margin-top:6px;font-size:15px;font-weight:700}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}
  .panel{background:#ffffff;border:1px solid #cbd5e1;border-radius:16px;padding:16px 18px;box-shadow:0 10px 30px rgba(15,23,42,0.06)}
  .muted{color:#475569}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{padding:7px 0;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top}
  th{width:48%;font-weight:600;color:#334155}
  td{font-family:"SFMono-Regular",Consolas,monospace;color:#0f172a}
  ul{margin:8px 0 0 18px;padding:0}
  li{margin:0 0 6px 0}
  .wide{margin-top:18px}
  .sheet{background:#fff;border:1px solid #cbd5e1;border-radius:18px;padding:16px}
  svg{max-width:100%;height:auto;border:1px solid #dbe4f0;border-radius:12px;background:#f8fbff}
  @media print{
    body{background:#fff}
    .page{padding:0}
    .panel,.sheet,.hero{box-shadow:none}
  }
</style>
</head>
<body>
  <div class="page">
    <section class="hero">
      <h1>${escHtml(title)}</h1>
      <div class="hero-meta">Structural Companion · Bushing analysis report · ${escHtml(date)} · ${escHtml(getBushingUnitsLabel(form.units))}</div>
      <div class="hero-grid">
        <div class="hero-card">
          <div class="label">Governing</div>
          <div class="value">${escHtml(gov)}</div>
        </div>
        <div class="hero-card">
          <div class="label">Margin of Safety</div>
          <div class="value">${escHtml(ms)}</div>
        </div>
        <div class="hero-card">
          <div class="label">Tolerance Status</div>
          <div class="value">${escHtml(results.tolerance.status)}</div>
        </div>
      </div>
    </section>

    <div class="grid">
      <section class="panel">
        <h2>Fit Physics</h2>
        <table>${fitRows}</table>
      </section>
      <section class="panel">
        <h2>Tolerance Resolution</h2>
        <table>${toleranceRows}</table>
      </section>
      <section class="panel">
        <h2>Inputs</h2>
        <table>${inputRows}</table>
      </section>
      <section class="panel">
        <h2>Lamé Summary</h2>
        <table>${lameRows}</table>
      </section>
    </div>

    <section class="panel wide">
      <h2>Warnings</h2>
      ${warnings}
    </section>

    <section class="panel wide">
      <h2>Assumptions</h2>
      <ul>${assumptions}</ul>
    </section>

    <section class="sheet wide">
      <h2>Drafting Sheet</h2>
      ${svgText}
    </section>
  </div>
</body>
</html>`;
}
