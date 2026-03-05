<script lang="ts">
  import type { BushingOutput } from '$lib/core/bushing';

  export let field: BushingOutput['lame']['field'];
  export let height = 220;
  let yScaleMode: 'balanced' | 'linear' = 'balanced';

  const width = 760;
  const padL = 62;
  const padR = 24;
  const padT = 24;
  const padB = 48;
  const leftRegionWidthRatio = 0.52;

  $: all = [...field.bushing.samples, ...field.housing.samples];
  $: absAll = all.flatMap((p) => [Math.abs(p.sigmaR), Math.abs(p.sigmaTheta), Math.abs(p.sigmaAxial)]).filter((v) => Number.isFinite(v));
  $: absSorted = [...absAll].sort((a, b) => a - b);
  $: medianAbs = absSorted.length ? absSorted[Math.floor(absSorted.length / 2)] : 1;
  $: symlogK = Math.max(1, medianAbs);

  function symlog(v: number): number {
    const a = Math.abs(v);
    if (a <= 0) return 0;
    return Math.sign(v) * Math.log10(1 + a / symlogK);
  }
  function yValue(v: number): number {
    return yScaleMode === 'balanced' ? symlog(v) : v;
  }
  $: bushingInnerRadius = field.bushing.innerRadius;
  $: interfaceRadius = field.bushing.outerRadius;
  $: housingOuterRadius = field.housing.outerRadius;
  $: yMinLinear = Math.min(...all.map((p) => Math.min(p.sigmaR, p.sigmaTheta, p.sigmaAxial)));
  $: yMaxLinear = Math.max(...all.map((p) => Math.max(p.sigmaR, p.sigmaTheta, p.sigmaAxial)));
  $: yMinRaw = Math.min(...all.map((p) => Math.min(yValue(p.sigmaR), yValue(p.sigmaTheta), yValue(p.sigmaAxial))));
  $: yMaxRaw = Math.max(...all.map((p) => Math.max(yValue(p.sigmaR), yValue(p.sigmaTheta), yValue(p.sigmaAxial))));
  $: ySpan = Math.max(1, yMaxRaw - yMinRaw);
  $: yMin = yMinRaw - ySpan * 0.08;
  $: yMax = yMaxRaw + ySpan * 0.08;
  $: chartW = width - padL - padR;
  $: chartH = height - padT - padB;
  $: leftRegionW = chartW * leftRegionWidthRatio;
  $: rightRegionW = chartW - leftRegionW;
  $: bushingSpan = Math.max(1e-9, interfaceRadius - bushingInnerRadius);
  $: housingSpan = Math.max(1e-9, housingOuterRadius - interfaceRadius);

  function xScale(r: number): number {
    if (r <= interfaceRadius) {
      const t = (r - bushingInnerRadius) / bushingSpan;
      return padL + Math.min(1, Math.max(0, t)) * leftRegionW;
    }
    const t = (r - interfaceRadius) / housingSpan;
    return padL + leftRegionW + Math.min(1, Math.max(0, t)) * rightRegionW;
  }

  function yScale(v: number): number {
    return padT + ((yMax - v) / Math.max(1e-9, yMax - yMin)) * chartH;
  }

  function polylinePoints(
    data: Array<{ r: number; sigmaR: number; sigmaTheta: number; sigmaAxial: number }>,
    key: 'sigmaR' | 'sigmaTheta' | 'sigmaAxial'
  ): string {
    return data.map((p) => `${xScale(p.r).toFixed(2)},${yScale(yValue(p[key])).toFixed(2)}`).join(' ');
  }

  $: xInterface = padL + leftRegionW;
  $: yZero = yScale(0);
  $: rInnerLabel = bushingInnerRadius.toFixed(4);
  $: rInterfaceLabel = interfaceRadius.toFixed(4);
  $: rEffLabel = housingOuterRadius.toFixed(4);
</script>

<div class="rounded-lg border border-white/10 bg-black/25 p-2">
  <div class="mb-2 rounded border border-cyan-300/20 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-100/90">
    Domain mapping: bushing uses <span class="font-mono">r_i → r_interface</span>; housing uses equivalent plate radius
    <span class="font-mono">r_interface → r_eff</span>.
  </div>
  <div class="mb-2 flex flex-wrap items-center justify-between gap-2 text-[10px]">
    <div class="text-white/70">All stresses</div>
    <div class="flex items-center gap-2">
      <button
        class={`rounded border px-2 py-1 ${yScaleMode === 'balanced' ? 'border-cyan-300/50 bg-cyan-500/15 text-cyan-100' : 'border-white/20 bg-white/[0.04] text-white/70'}`}
        on:click={() => (yScaleMode = 'balanced')}
      >
        Balanced scale
      </button>
      <button
        class={`rounded border px-2 py-1 ${yScaleMode === 'linear' ? 'border-cyan-300/50 bg-cyan-500/15 text-cyan-100' : 'border-white/20 bg-white/[0.04] text-white/70'}`}
        on:click={() => (yScaleMode = 'linear')}
      >
        Linear scale
      </button>
    </div>
  </div>
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

    <text x={padL + 6} y={padT + 12} fill="rgba(226,232,240,0.9)" font-size="11" font-family="ui-monospace">
      stress (psi){yScaleMode === 'balanced' ? ' · balanced view' : ''}
    </text>
    <text x={padL + chartW / 2 - 86} y={height - 12} fill="rgba(226,232,240,0.9)" font-size="11" font-family="ui-monospace">radius domain (r_i → r_interface → r_eff)</text>
    <text x={xInterface + 6} y={padT + 12} fill="rgba(250,204,21,0.95)" font-size="11" font-family="ui-monospace">interface</text>

    <text x={padL} y={height - 24} fill="rgba(226,232,240,0.8)" font-size="10" font-family="ui-monospace">r_i {rInnerLabel}</text>
    <text x={xInterface - 46} y={height - 24} fill="rgba(226,232,240,0.85)" font-size="10" font-family="ui-monospace">r_interface {rInterfaceLabel}</text>
    <text x={padL + chartW - 72} y={height - 24} fill="rgba(226,232,240,0.8)" font-size="10" font-family="ui-monospace">r_eff {rEffLabel}</text>
    <text x={10} y={padT + chartH + 4} fill="rgba(226,232,240,0.8)" font-size="10" font-family="ui-monospace">{yMinLinear.toFixed(0)}</text>
    <text x={10} y={padT + 24} fill="rgba(226,232,240,0.8)" font-size="10" font-family="ui-monospace">{yMaxLinear.toFixed(0)}</text>
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
