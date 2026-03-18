<script lang="ts">
  import { Badge, Card, CardContent } from '$lib/components/ui';
  import type { BushingInputs, BushingOutput } from '$lib/core/bushing';
  import { formatToleranceRange, scaleValueToToleranceRange, splitToleranceRangeDisplay } from '$lib/core/bushing/tolerancePresentation';
  import { makeRange } from '$lib/core/bushing/solveMath';
  import BushingLameStressPlot from './BushingLameStressPlot.svelte';
  import BushingEnforcementDetails from './BushingEnforcementDetails.svelte';

  let { form, results, guidedMode = true }: { form: BushingInputs; results: BushingOutput; guidedMode?: boolean } = $props();
  let infoDialog = $state<'safety' | 'fit' | null>(null);

  const PSI_TO_MPA = 0.006894757;
  const LBF_TO_N = 4.4482216152605;
  const fmt = (n: number | null | undefined, d = 2) => (!Number.isFinite(Number(n)) ? '---' : Number(n).toFixed(d));
  const stressUnit = () => (form.units === 'metric' ? 'MPa' : 'ksi');
  const forceUnit = () => (form.units === 'metric' ? 'N' : 'lbf');
  const lengthUnit = () => (form.units === 'metric' ? 'mm' : 'in');
  const fmtBand = (v: number, d = 4) => (!Number.isFinite(v) ? '---' : Number(v).toFixed(d));
  const valOk = 'text-emerald-300';
  const valFail = 'text-rose-300';
  const valInfo = 'text-cyan-200';

  let failed = $derived(results.governing.margin < 0 || results.physics.marginHousing < 0 || results.physics.marginBushing < 0);
  let fitFailed = $derived(results.warningCodes.some((w) => w.code === 'TOLERANCE_INFEASIBLE' || w.code === 'NET_CLEARANCE_FIT'));
  let edgeFailed = $derived(results.warningCodes.some((w) => w.code.includes('EDGE_DISTANCE')));
  let wallFailed = $derived(results.warningCodes.some((w) => w.code.includes('WALL_BELOW_MIN')));
  let boreBandWidth = $derived(results.tolerance.bore.upper - results.tolerance.bore.lower);
  let targetBandWidth = $derived(results.tolerance.interferenceTarget.upper - results.tolerance.interferenceTarget.lower);
  let displayToleranceNotes = $derived((results.tolerance.notes ?? []).filter((n) => !(results.tolerance.status === 'clamped' && n.includes('OD nominal was clamped'))));
  let achievedWithinTarget = $derived(
    results.tolerance.achievedInterference.lower >= results.tolerance.interferenceTarget.lower - 1e-9 &&
      results.tolerance.achievedInterference.upper <= results.tolerance.interferenceTarget.upper + 1e-9
  );
  let positiveInterference = $derived(results.physics.deltaEffective > 0);
  let odContained = $derived(results.tolerance.status !== 'infeasible');
  let effectiveInterferenceRange = $derived(
    makeRange(
      'limits',
      results.tolerance.achievedInterference.lower + results.lame.deltaThermal,
      results.tolerance.achievedInterference.upper + results.lame.deltaThermal,
      results.tolerance.achievedInterference.nominal + results.lame.deltaThermal
    )
  );

  function scaledRange(value: number) {
    return scaleValueToToleranceRange(value, results.physics.deltaEffective, effectiveInterferenceRange);
  }

  function formatConvertedRange(
    lower: number,
    upper: number,
    nominal: number,
    converter: (value: number) => number,
    digits: number
  ) {
    return formatToleranceRange(
      makeRange('limits', converter(lower), converter(upper), converter(nominal)),
      digits
    );
  }

  function fmtStressTol(psi: number) {
    const range = scaledRange(psi);
    return formatConvertedRange(
      range.lower,
      range.upper,
      range.nominal,
      (value) => (form.units === 'metric' ? value * PSI_TO_MPA : value / 1000),
      form.units === 'metric' ? 1 : 2
    );
  }

  function fmtForceTol(lbf: number) {
    const range = scaledRange(lbf);
    return formatConvertedRange(
      range.lower,
      range.upper,
      range.nominal,
      (value) => (form.units === 'metric' ? value * LBF_TO_N : value),
      form.units === 'metric' ? 0 : 0
    );
  }

  function fmtFitTol(range: { lower: number; upper: number; nominal: number; tolPlus: number; tolMinus: number }) {
    return formatToleranceRange(makeRange('limits', range.lower, range.upper, range.nominal), 4);
  }

  function fmtMinMax(range: { lower: number; upper: number }) {
    return `${range.lower.toFixed(4)} to ${range.upper.toFixed(4)}`;
  }

  function splitTolText(range: { lower: number; upper: number; nominal: number; tolPlus: number; tolMinus: number }, digits = 4) {
    return splitToleranceRangeDisplay(makeRange('limits', range.lower, range.upper, range.nominal), digits);
  }

  function splitStressTol(psi: number) {
    const range = scaledRange(psi);
    return splitToleranceRangeDisplay(
      makeRange(
        'limits',
        form.units === 'metric' ? range.lower * PSI_TO_MPA : range.lower / 1000,
        form.units === 'metric' ? range.upper * PSI_TO_MPA : range.upper / 1000,
        form.units === 'metric' ? range.nominal * PSI_TO_MPA : range.nominal / 1000
      ),
      form.units === 'metric' ? 1 : 2
    );
  }

  function splitForceTol(lbf: number) {
    const range = scaledRange(lbf);
    return splitToleranceRangeDisplay(
      makeRange(
        'limits',
        form.units === 'metric' ? range.lower * LBF_TO_N : range.lower,
        form.units === 'metric' ? range.upper * LBF_TO_N : range.upper,
        form.units === 'metric' ? range.nominal * LBF_TO_N : range.nominal
      ),
      0
    );
  }

  function focusSection(id: string) {
    if (!id || id.trim() === '') return;
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-amber-300/80');
    setTimeout(() => el.classList.remove('ring-2', 'ring-amber-300/80'), 1500);
    infoDialog = null;
  }
</script>

<div class="space-y-3">
  <Card class="border border-cyan-300/20 bg-cyan-500/8 bushing-pop-card bushing-depth-1">
    <CardContent class="pt-4 text-sm">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div class="text-[10px] font-bold uppercase tracking-wide text-cyan-100/85">Decision Summary</div>
          <div class="mt-1 text-base font-semibold text-slate-100">{results.governing.name}</div>
        </div>
        <Badge variant="outline" class={failed ? 'border-amber-400/40 text-amber-200' : 'border-emerald-400/40 text-emerald-200'}>
          {failed ? 'Action Needed' : 'Within Limits'}
        </Badge>
      </div>
      <div class="mt-2 text-xs text-slate-200/82">
        Governing margin: <span class={failed ? valFail : valOk}>{fmt(results.governing.margin, 3)}</span>.
        {#if failed}
          Revisit geometry or profile inputs before relying on export.
        {:else}
          Review Drafting / Export, then open diagnostics only if you need deeper traceability.
        {/if}
      </div>
      {#if guidedMode}
        <div class="mt-2 rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-white/75">
          Guided workflow: confirm the governing reason first, then review fit windows and stresses separately below.
        </div>
      {/if}
    </CardContent>
  </Card>

  <div class="flex items-center justify-between">
    <h3 class="text-sm font-semibold text-slate-100">Results Summary</h3>
    <Badge variant="outline" class={failed ? 'border-amber-400/40 text-amber-200' : 'border-emerald-400/40 text-emerald-200'}>
      {failed ? 'ATTN' : 'PASS'}
    </Badge>
  </div>

  <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
    <div
      class="cursor-pointer"
      role="button"
      tabindex="0"
      onclick={() => (infoDialog = 'safety')}
      onkeydown={(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (infoDialog = 'safety')}>
      <Card
        id="bushing-safety-card"
        class={`bushing-results-card border-l-4 bushing-pop-card bushing-depth-2 ${failed ? 'border-amber-400 shadow-[0_0_0_1px_rgba(251,191,36,0.4)]' : 'border-emerald-500'}`}>
        <CardContent class="results-ruled pt-5 text-sm">
          <div class="text-[10px] mb-2 uppercase tracking-wide text-indigo-200/95 font-bold">Safety Margins (Yield)</div>
          <div class="space-y-1.5">
            <div class="results-row">
              <span class="results-label text-slate-100/95 font-medium">Housing</span>
              <span class={`results-nominal font-semibold ${results.physics.marginHousing >= 0 ? valOk : valFail}`}>{fmt(results.physics.marginHousing)}</span>
              <span class="results-tolerance"></span>
              <span class="results-unit"></span>
            </div>
            <div class="results-row">
              <span class="results-label text-slate-100/95 font-medium">Bushing</span>
              <span class={`results-nominal font-semibold ${results.physics.marginBushing >= 0 ? valOk : valFail}`}>{fmt(results.physics.marginBushing)}</span>
              <span class="results-tolerance"></span>
              <span class="results-unit"></span>
            </div>
            <div class="results-row">
              <span class="results-label text-slate-100/95 font-medium">Governing</span>
              <span class={`results-nominal font-semibold ${results.governing.margin >= 0 ? valOk : valFail}`}>{fmt(results.governing.margin)}</span>
              <span class="results-tolerance"></span>
              <span class="results-unit"></span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <div
      class="cursor-pointer"
      role="button"
      tabindex="0"
      onclick={() => (infoDialog = 'fit')}
      onkeydown={(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (infoDialog = 'fit')}>
      <Card class="bushing-results-card bushing-pop-card bushing-depth-2">
        <CardContent class="results-ruled pt-5 text-sm space-y-1.5">
          <div class="text-[10px] mb-2 uppercase tracking-wide text-indigo-200/95 font-bold">Stresses and Forces</div>
          <div class="space-y-2">
            <div class="results-row">
              <span class="results-label text-slate-100/95 font-medium">Contact Pressure</span>
              <span class="results-nominal text-slate-100 font-semibold">{splitStressTol(results.physics.contactPressure).nominal}</span>
              <span class="results-tolerance text-slate-300/88">{splitStressTol(results.physics.contactPressure).tolerance}</span>
              <span class="results-unit text-slate-100 font-semibold">{stressUnit()}</span>
            </div>
            <div class="results-row">
              <span class="results-label text-slate-100/95 font-medium">Axial Stress (housing)</span>
              <span class="results-nominal text-slate-100 font-semibold">{splitStressTol(results.physics.stressAxialHousing).nominal}</span>
              <span class="results-tolerance text-slate-300/88">{splitStressTol(results.physics.stressAxialHousing).tolerance}</span>
              <span class="results-unit text-slate-100 font-semibold">{stressUnit()}</span>
            </div>
            <div class="results-row">
              <span class="results-label text-slate-100/95 font-medium">Axial Stress (bushing)</span>
              <span class="results-nominal text-slate-100 font-semibold">{splitStressTol(results.physics.stressAxialBushing).nominal}</span>
              <span class="results-tolerance text-slate-300/88">{splitStressTol(results.physics.stressAxialBushing).tolerance}</span>
              <span class="results-unit text-slate-100 font-semibold">{stressUnit()}</span>
            </div>
            <div class="results-row">
              <span class="results-label text-slate-100/95 font-medium">Install Force</span>
              <span class="results-nominal text-slate-100 font-semibold">{splitForceTol(results.physics.installForce).nominal}</span>
              <span class="results-tolerance text-slate-300/88">{splitForceTol(results.physics.installForce).tolerance}</span>
              <span class="results-unit text-slate-100 font-semibold">{forceUnit()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>

  <div
    class="cursor-pointer"
    role="button"
    tabindex="0"
    onclick={() => (infoDialog = 'fit')}
    onkeydown={(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (infoDialog = 'fit')}>
      <Card
        id="bushing-fit-card"
        class={`bushing-results-card bushing-pop-card bushing-depth-2 ${fitFailed ? 'border border-amber-300/55' : ''}`}>
      <CardContent class="pt-5 text-sm space-y-1.5">
        <div class="text-[10px] mb-2 uppercase tracking-wide text-indigo-200/95 font-bold">Fit Physics</div>
        <div class="results-ruled min-w-0 space-y-2">
          <div class="results-row">
            <span class="results-label text-slate-100/95 font-medium">Effective Interference</span>
            <span class={`results-nominal text-[0.92rem] font-semibold ${positiveInterference ? valOk : valFail}`}>{splitTolText(effectiveInterferenceRange).nominal}</span>
            <span class="results-tolerance text-slate-300/88">{splitTolText(effectiveInterferenceRange).tolerance}</span>
            <span class="results-unit text-slate-100 font-semibold">{lengthUnit()}</span>
          </div>
          {#if results.tolerance.csExternalDia}
            <div class="results-row">
              <span class="results-label text-slate-100/95 font-medium">External CS Dia</span>
              <span class="results-nominal text-cyan-200 font-semibold">{splitTolText(results.tolerance.csExternalDia).nominal}</span>
              <span class="results-tolerance text-slate-300/88">{splitTolText(results.tolerance.csExternalDia).tolerance}</span>
              <span class="results-unit text-slate-100 font-semibold">{lengthUnit()}</span>
            </div>
          {/if}
          {#if results.tolerance.csInternalDia}
            <div class="results-row">
              <span class="results-label text-slate-100/95 font-medium">Internal CS Dia</span>
              <span class="results-nominal text-cyan-200 font-semibold">{splitTolText(results.tolerance.csInternalDia).nominal}</span>
              <span class="results-tolerance text-slate-300/88">{splitTolText(results.tolerance.csInternalDia).tolerance}</span>
              <span class="results-unit text-slate-100 font-semibold">{lengthUnit()}</span>
            </div>
          {/if}
          <div class="results-row">
            <span class="results-label text-slate-100/95 font-medium">Bushing OD</span>
            <span class={`results-nominal text-[0.92rem] font-semibold ${odContained ? valOk : valFail}`}>{splitTolText(results.tolerance.odBushing).nominal}</span>
            <span class="results-tolerance text-slate-300/88">{splitTolText(results.tolerance.odBushing).tolerance}</span>
            <span class="results-unit text-slate-100 font-semibold">{lengthUnit()}</span>
          </div>
          {#if results.tolerance.csExternalDepth}
            <div class="results-row">
              <span class="results-label text-slate-100/95 font-medium">External CS Depth</span>
              <span class="results-nominal text-cyan-200 font-semibold">{splitTolText(results.tolerance.csExternalDepth).nominal}</span>
              <span class="results-tolerance text-slate-300/88">{splitTolText(results.tolerance.csExternalDepth).tolerance}</span>
              <span class="results-unit text-slate-100 font-semibold">{lengthUnit()}</span>
            </div>
          {/if}
          {#if results.tolerance.csInternalDepth}
            <div class="results-row">
              <span class="results-label text-slate-100/95 font-medium">Internal CS Depth</span>
              <span class="results-nominal text-cyan-200 font-semibold">{splitTolText(results.tolerance.csInternalDepth).nominal}</span>
              <span class="results-tolerance text-slate-300/88">{splitTolText(results.tolerance.csInternalDepth).tolerance}</span>
              <span class="results-unit text-slate-100 font-semibold">{lengthUnit()}</span>
            </div>
          {/if}
          <div class="results-row results-row--range">
            <span class="results-label text-slate-100/95 font-medium">Interference Target</span>
            <span class={`results-range text-[0.92rem] font-semibold ${valInfo}`}>{fmtMinMax(results.tolerance.interferenceTarget)}</span>
            <span class="results-unit text-slate-100 font-semibold">{lengthUnit()}</span>
          </div>
          <div class="results-row results-row--range">
            <span class="results-label text-slate-100/95 font-medium">Interference Achieved</span>
            <span class={`results-range text-[0.92rem] font-semibold ${achievedWithinTarget ? valOk : valFail}`}>{fmtMinMax(results.tolerance.achievedInterference)}</span>
            <span class="results-unit text-slate-100 font-semibold">{lengthUnit()}</span>
          </div>
        </div>
        {#if results.tolerance.status === 'infeasible'}
          <div class="mt-2 rounded-md border border-amber-300/50 bg-amber-500/15 p-2 text-[11px] text-amber-100">
            <div class="font-semibold">What failed: tolerance bands are incompatible for full-range containment.</div>
            <div class="mt-1">Why: bore band width ({fmtBand(boreBandWidth)}) exceeds target interference width ({fmtBand(targetBandWidth)}), so no single OD band can satisfy every combination.</div>
            <div class="mt-1">Next: widen the target interference band or narrow the bore tolerance band.</div>
          </div>
        {:else if results.tolerance.status === 'clamped'}
          <div class="mt-2 rounded-md border border-cyan-300/40 bg-cyan-500/12 p-2 text-[11px] text-cyan-100">
            <div class="font-semibold">OD nominal was clamped to stay within the requested interference band.</div>
            <div class="mt-1">Next: confirm the shifted OD is acceptable, or revisit the target interference window.</div>
          </div>
        {/if}
        {#if displayToleranceNotes.length}
          <div class="mt-2 space-y-1">
            {#each displayToleranceNotes as n}
              <div class="rounded-md border border-white/10 bg-black/25 px-2 py-1 text-[10px] text-white/75">{n}</div>
            {/each}
          </div>
        {/if}
        <BushingEnforcementDetails {form} {results} />
      </CardContent>
    </Card>
  </div>

  <Card class="bushing-results-card bushing-pop-card bushing-depth-1">
    <CardContent class="pt-4 space-y-2 text-sm">
      <div class="text-[10px] uppercase tracking-wide text-indigo-200/95 font-bold">Lamé Stress Field (Full Distribution)</div>
      <div class="grid grid-cols-1 gap-2 text-[12px] text-white/85 md:grid-cols-2">
        <div class="rounded-md border border-white/10 bg-black/20 p-2">
          <div class="font-semibold text-emerald-200">Bushing Boundaries</div>
          <div class="results-ruled results-ruled--dense mt-2 space-y-1">
            <div class="results-row results-row--dense">
              <span class="results-label text-slate-100/92 font-medium">σr(inner)</span>
              <span class="results-nominal text-slate-100 font-semibold">{splitStressTol(results.lame.field.bushing.boundary.sigmaRInner).nominal}</span>
              <span class="results-tolerance text-slate-300/88">{splitStressTol(results.lame.field.bushing.boundary.sigmaRInner).tolerance}</span>
              <span class="results-unit text-slate-100 font-semibold">{stressUnit()}</span>
            </div>
            <div class="results-row results-row--dense">
              <span class="results-label text-slate-100/92 font-medium">σr(outer)</span>
              <span class="results-nominal text-slate-100 font-semibold">{splitStressTol(results.lame.field.bushing.boundary.sigmaROuter).nominal}</span>
              <span class="results-tolerance text-slate-300/88">{splitStressTol(results.lame.field.bushing.boundary.sigmaROuter).tolerance}</span>
              <span class="results-unit text-slate-100 font-semibold">{stressUnit()}</span>
            </div>
            <div class="results-row results-row--dense">
              <span class="results-label text-slate-100/92 font-medium">σθ(inner)</span>
              <span class="results-nominal text-slate-100 font-semibold">{splitStressTol(results.lame.field.bushing.boundary.sigmaThetaInner).nominal}</span>
              <span class="results-tolerance text-slate-300/88">{splitStressTol(results.lame.field.bushing.boundary.sigmaThetaInner).tolerance}</span>
              <span class="results-unit text-slate-100 font-semibold">{stressUnit()}</span>
            </div>
            <div class="results-row results-row--dense">
              <span class="results-label text-slate-100/92 font-medium">σθ(outer)</span>
              <span class="results-nominal text-slate-100 font-semibold">{splitStressTol(results.lame.field.bushing.boundary.sigmaThetaOuter).nominal}</span>
              <span class="results-tolerance text-slate-300/88">{splitStressTol(results.lame.field.bushing.boundary.sigmaThetaOuter).tolerance}</span>
              <span class="results-unit text-slate-100 font-semibold">{stressUnit()}</span>
            </div>
            <div class="results-row results-row--dense">
              <span class="results-label text-slate-100/92 font-medium">σz(inner)</span>
              <span class="results-nominal text-slate-100 font-semibold">{splitStressTol(results.lame.field.bushing.boundary.sigmaAxialInner).nominal}</span>
              <span class="results-tolerance text-slate-300/88">{splitStressTol(results.lame.field.bushing.boundary.sigmaAxialInner).tolerance}</span>
              <span class="results-unit text-slate-100 font-semibold">{stressUnit()}</span>
            </div>
            <div class="results-row results-row--dense">
              <span class="results-label text-slate-100/92 font-medium">σz(outer)</span>
              <span class="results-nominal text-slate-100 font-semibold">{splitStressTol(results.lame.field.bushing.boundary.sigmaAxialOuter).nominal}</span>
              <span class="results-tolerance text-slate-300/88">{splitStressTol(results.lame.field.bushing.boundary.sigmaAxialOuter).tolerance}</span>
              <span class="results-unit text-slate-100 font-semibold">{stressUnit()}</span>
            </div>
          </div>
        </div>
        <div class="rounded-md border border-white/10 bg-black/20 p-2">
          <div class="font-semibold text-blue-200">Housing Boundaries</div>
          <div class="results-ruled results-ruled--dense mt-2 space-y-1">
            <div class="results-row results-row--dense">
              <span class="results-label text-slate-100/92 font-medium">σr(inner)</span>
              <span class="results-nominal text-slate-100 font-semibold">{splitStressTol(results.lame.field.housing.boundary.sigmaRInner).nominal}</span>
              <span class="results-tolerance text-slate-300/88">{splitStressTol(results.lame.field.housing.boundary.sigmaRInner).tolerance}</span>
              <span class="results-unit text-slate-100 font-semibold">{stressUnit()}</span>
            </div>
            <div class="results-row results-row--dense">
              <span class="results-label text-slate-100/92 font-medium">σr(outer)</span>
              <span class="results-nominal text-slate-100 font-semibold">{splitStressTol(results.lame.field.housing.boundary.sigmaROuter).nominal}</span>
              <span class="results-tolerance text-slate-300/88">{splitStressTol(results.lame.field.housing.boundary.sigmaROuter).tolerance}</span>
              <span class="results-unit text-slate-100 font-semibold">{stressUnit()}</span>
            </div>
            <div class="results-row results-row--dense">
              <span class="results-label text-slate-100/92 font-medium">σθ(inner)</span>
              <span class="results-nominal text-slate-100 font-semibold">{splitStressTol(results.lame.field.housing.boundary.sigmaThetaInner).nominal}</span>
              <span class="results-tolerance text-slate-300/88">{splitStressTol(results.lame.field.housing.boundary.sigmaThetaInner).tolerance}</span>
              <span class="results-unit text-slate-100 font-semibold">{stressUnit()}</span>
            </div>
            <div class="results-row results-row--dense">
              <span class="results-label text-slate-100/92 font-medium">σθ(outer)</span>
              <span class="results-nominal text-slate-100 font-semibold">{splitStressTol(results.lame.field.housing.boundary.sigmaThetaOuter).nominal}</span>
              <span class="results-tolerance text-slate-300/88">{splitStressTol(results.lame.field.housing.boundary.sigmaThetaOuter).tolerance}</span>
              <span class="results-unit text-slate-100 font-semibold">{stressUnit()}</span>
            </div>
            <div class="results-row results-row--dense">
              <span class="results-label text-slate-100/92 font-medium">σz(inner)</span>
              <span class="results-nominal text-slate-100 font-semibold">{splitStressTol(results.lame.field.housing.boundary.sigmaAxialInner).nominal}</span>
              <span class="results-tolerance text-slate-300/88">{splitStressTol(results.lame.field.housing.boundary.sigmaAxialInner).tolerance}</span>
              <span class="results-unit text-slate-100 font-semibold">{stressUnit()}</span>
            </div>
            <div class="results-row results-row--dense">
              <span class="results-label text-slate-100/92 font-medium">σz(outer)</span>
              <span class="results-nominal text-slate-100 font-semibold">{splitStressTol(results.lame.field.housing.boundary.sigmaAxialOuter).nominal}</span>
              <span class="results-tolerance text-slate-300/88">{splitStressTol(results.lame.field.housing.boundary.sigmaAxialOuter).tolerance}</span>
              <span class="results-unit text-slate-100 font-semibold">{stressUnit()}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="text-[11px] text-cyan-100/80">
        Axial coupling: k<sub>constraint</sub>={results.physics.axialConstraintFactor.toFixed(2)}, k<sub>length</sub>={results.physics.axialLengthFactor.toFixed(2)}
      </div>
      <div class="text-[10px] text-white/55">
        Lamé boundary ranges follow the effective interference tolerance envelope shown above.
      </div>
      <BushingLameStressPlot field={results.lame.field} />
    </CardContent>
  </Card>
</div>

{#if infoDialog !== null}
  {#await import('./BushingResultInfoDialog.svelte') then mod}
    <mod.default
      open={infoDialog !== null}
      mode={infoDialog}
      {results}
      {edgeFailed}
      {wallFailed}
      {fitFailed}
      {fmt}
      {focusSection}
      onClose={() => (infoDialog = null)}
    />
  {/await}
{/if}

<style>
  .results-ruled {
    --rs-label-col: 22ch;
    --rs-nominal-col: 10ch;
    --rs-tolerance-col: 15ch;
    --rs-unit-col: 3.5ch;
    --rs-gap: 1rem;
    position: relative;
  }

  .results-ruled::before,
  .results-ruled::after {
    content: '';
    position: absolute;
    top: 2.1rem;
    bottom: 0.35rem;
    width: 1px;
    pointer-events: none;
    background: linear-gradient(to bottom, rgba(148, 163, 184, 0), rgba(148, 163, 184, 0.14), rgba(148, 163, 184, 0));
  }

  .results-ruled::before {
    right: calc(var(--rs-unit-col) + var(--rs-gap) + var(--rs-tolerance-col) + var(--rs-gap));
  }

  .results-ruled::after {
    right: calc(var(--rs-unit-col) + var(--rs-gap));
  }

  .results-row {
    display: grid;
    grid-template-columns: minmax(0, var(--rs-label-col)) var(--rs-nominal-col) var(--rs-tolerance-col) var(--rs-unit-col);
    align-items: baseline;
    column-gap: var(--rs-gap);
    min-width: 0;
    padding: 0.14rem 0;
    position: relative;
  }

  .results-row::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: -0.2rem;
    height: 1px;
    background: linear-gradient(to right, rgba(148, 163, 184, 0.07), rgba(148, 163, 184, 0.03), rgba(148, 163, 184, 0));
  }

  .results-row--range {
    grid-template-columns: minmax(0, var(--rs-label-col)) var(--rs-nominal-col) var(--rs-tolerance-col) var(--rs-unit-col);
  }

  .results-row--dense {
    padding: 0.1rem 0;
  }

  .results-row--dense::after {
    bottom: -0.12rem;
  }

  .results-label {
    min-width: 0;
    line-height: 1.2;
    max-width: var(--rs-label-col);
    padding-right: 0.5rem;
  }

  .results-nominal,
  .results-tolerance,
  .results-unit,
  .results-range {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    text-align: right;
  }

  .results-range {
    grid-column: 2 / 4;
  }

  @media (min-width: 1536px) {
    .results-ruled {
      --rs-label-col: 22ch;
      --rs-nominal-col: 10ch;
      --rs-tolerance-col: 15ch;
      --rs-unit-col: 4ch;
      --rs-gap: 1rem;
    }
  }
</style>
