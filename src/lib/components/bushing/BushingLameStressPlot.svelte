<script lang="ts">
  import type { BushingOutput } from '$lib/core/bushing';

  export let field: BushingOutput['lame']['field'];
  export let height = 220;

  const width = 760;
  const padL = 62;
  const padR = 24;
  const padT = 24;
  const padB = 48;

  $: all = [...field.bushing.samples, ...field.housing.samples];
  $: xMin = Math.min(...all.map((p) => p.r));
  $: xMax = Math.max(...all.map((p) => p.r));
  $: yMinRaw = Math.min(...all.map((p) => Math.min(p.sigmaR, p.sigmaTheta, p.sigmaAxial)));
  $: yMaxRaw = Math.max(...all.map((p) => Math.max(p.sigmaR, p.sigmaTheta, p.sigmaAxial)));
  $: ySpan = Math.max(1, yMaxRaw - yMinRaw);
  $: yMin = yMinRaw - ySpan * 0.08;
  $: yMax = yMaxRaw + ySpan * 0.08;
  $: chartW = width - padL - padR;
  $: chartH = height - padT - padB;

  function xScale(r: number): number {
    return padL + ((r - xMin) / Math.max(1e-9, xMax - xMin)) * chartW;
  }

  function yScale(v: number): number {
    return padT + ((yMax - v) / Math.max(1e-9, yMax - yMin)) * chartH;
  }

  function polylinePoints(
    data: Array<{ r: number; sigmaR: number; sigmaTheta: number; sigmaAxial: number }>,
    key: 'sigmaR' | 'sigmaTheta' | 'sigmaAxial'
  ): string {
    return data.map((p) => `${xScale(p.r).toFixed(2)},${yScale(p[key]).toFixed(2)}`).join(' ');
  }

  $: xInterface = xScale(field.bushing.outerRadius);
  $: yZero = yScale(0);
</script>

<div class="rounded-lg border border-white/10 bg-black/25 p-2">
  <svg viewBox={`0 0 ${width} ${height}`} class="h-auto w-full">
    <rect x={padL} y={padT} width={chartW} height={chartH} fill="rgba(5,10,20,0.65)" stroke="rgba(148,163,184,0.25)" />
    <line x1={padL} x2={padL + chartW} y1={yZero} y2={yZero} stroke="rgba(255,255,255,0.25)" stroke-dasharray="4,4" />
    <line x1={xInterface} x2={xInterface} y1={padT} y2={padT + chartH} stroke="rgba(250,204,21,0.55)" stroke-dasharray="3,3" />

    <polyline fill="none" stroke="rgba(52,211,153,0.95)" stroke-width="2" points={polylinePoints(field.bushing.samples, 'sigmaTheta')} />
    <polyline fill="none" stroke="rgba(52,211,153,0.55)" stroke-width="2" stroke-dasharray="6,4" points={polylinePoints(field.bushing.samples, 'sigmaR')} />
    <polyline fill="none" stroke="rgba(16,185,129,0.75)" stroke-width="2" stroke-dasharray="2,3" points={polylinePoints(field.bushing.samples, 'sigmaAxial')} />
    <polyline fill="none" stroke="rgba(96,165,250,0.95)" stroke-width="2" points={polylinePoints(field.housing.samples, 'sigmaTheta')} />
    <polyline fill="none" stroke="rgba(96,165,250,0.55)" stroke-width="2" stroke-dasharray="6,4" points={polylinePoints(field.housing.samples, 'sigmaR')} />
    <polyline fill="none" stroke="rgba(59,130,246,0.75)" stroke-width="2" stroke-dasharray="2,3" points={polylinePoints(field.housing.samples, 'sigmaAxial')} />

    <text x={padL + 6} y={padT + 12} fill="rgba(226,232,240,0.9)" font-size="11" font-family="ui-monospace">stress (psi)</text>
    <text x={padL + chartW / 2 - 30} y={height - 12} fill="rgba(226,232,240,0.9)" font-size="11" font-family="ui-monospace">radius (in)</text>
    <text x={xInterface + 6} y={padT + 12} fill="rgba(250,204,21,0.95)" font-size="11" font-family="ui-monospace">interface</text>

    <text x={padL} y={height - 24} fill="rgba(226,232,240,0.8)" font-size="10" font-family="ui-monospace">{xMin.toFixed(4)}</text>
    <text x={padL + chartW - 46} y={height - 24} fill="rgba(226,232,240,0.8)" font-size="10" font-family="ui-monospace">{xMax.toFixed(4)}</text>
    <text x={10} y={padT + chartH + 4} fill="rgba(226,232,240,0.8)" font-size="10" font-family="ui-monospace">{yMin.toFixed(0)}</text>
    <text x={10} y={padT + 24} fill="rgba(226,232,240,0.8)" font-size="10" font-family="ui-monospace">{yMax.toFixed(0)}</text>
  </svg>

  <div class="mt-2 grid grid-cols-2 gap-2 text-[11px] text-white/85 md:grid-cols-3">
    <div><span class="font-mono text-emerald-300">Bushing hoop</span> σθ</div>
    <div><span class="font-mono text-emerald-300/80">Bushing radial</span> σr</div>
    <div><span class="font-mono text-emerald-400/80">Bushing axial</span> σz</div>
    <div><span class="font-mono text-blue-300">Housing hoop</span> σθ</div>
    <div><span class="font-mono text-blue-300/80">Housing radial</span> σr</div>
    <div><span class="font-mono text-blue-400/80">Housing axial</span> σz</div>
  </div>
</div>
