<script lang="ts">
  import { Badge, Card, CardContent } from '$lib/components/ui';
  import type { BushingInputs, BushingOutput } from '$lib/core/bushing';
  import type { ReamerCatalogEntry } from '$lib/core/bushing/reamerCatalog';
  import { formatToleranceRange, scaleValueToToleranceRange, splitToleranceRangeDisplay } from '$lib/core/bushing/tolerancePresentation';
  import { makeRange } from '$lib/core/bushing/solveMath';
  import BushingLameStressPlot from './BushingLameStressPlot.svelte';
  import BushingEnforcementDetails from './BushingEnforcementDetails.svelte';
  import BushingServiceReviewPanel from './BushingServiceReviewPanel.svelte';
  import BushingGoverningBanner from './BushingGoverningBanner.svelte';
  import BushingDeltaStrip from './BushingDeltaStrip.svelte';
  import type { BushingWorkflowMode } from './BushingLayoutPersistence';

  type CompareCase = {
    id: string;
    name: string;
    results: BushingOutput;
    deltaMargin: number;
    deltaInstallForce: number;
    deltaContactPressure: number;
  };

  let {
    form,
    results,
    guidedMode = true,
    workflowMode = 'quick',
    compareCases = [],
    selectedReamer = null,
    selectedIdReamer = null,
    previousSnapshot = null
  }: {
    form: BushingInputs;
    results: BushingOutput;
    guidedMode?: boolean;
    workflowMode?: BushingWorkflowMode;
    compareCases?: CompareCase[];
    selectedReamer?: ReamerCatalogEntry | null;
    selectedIdReamer?: ReamerCatalogEntry | null;
    previousSnapshot?: { label: string; results: BushingOutput } | null;
  } = $props();
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
  <BushingGoverningBanner {form} {results} />
  <BushingDeltaStrip {form} current={results} previous={previousSnapshot} />

  {#key workflowMode}
    {#if workflowMode === 'review'}
      <BushingServiceReviewPanel {form} {results} />
    {:else}
      <Card class="border border-white/10 bg-black/25 bushing-pop-card bushing-depth-0">
        <CardContent class="pt-4 text-[11px] text-white/70">
          Quick Solve is showing fit, margin, and compare essentials only. Switch to `Engineering Review` for service envelope, duty screen, process approval, and Lamé field detail.
        </CardContent>
      </Card>
    {/if}
  {/key}

  {#if selectedReamer || selectedIdReamer || compareCases.length}
    <Card class="border border-white/10 bg-black/25 bushing-pop-card bushing-depth-1" data-testid="bushing-compare-summary">
      <CardContent class="pt-4 space-y-3 text-sm">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="text-[10px] font-bold uppercase tracking-wide text-cyan-100/85">Process Snapshot</div>
          <div class="flex flex-wrap gap-2">
            {#if selectedReamer}
              <Badge variant="outline" class="border-cyan-300/35 text-cyan-100">
                Bore {selectedReamer.sizeLabel}
              </Badge>
            {/if}
            {#if selectedIdReamer}
              <Badge variant="outline" class="border-amber-300/35 text-amber-100">
                ID {selectedIdReamer.sizeLabel}
              </Badge>
            {/if}
          </div>
        </div>
        {#if selectedReamer}
          <div class="rounded-md border border-cyan-300/20 bg-cyan-500/10 px-3 py-2 text-[11px] text-cyan-100/88">
            Bore reamer: {selectedReamer.sizeLabel} at {selectedReamer.nominalIn.toFixed(4)} in with +{selectedReamer.toolTolerancePlusIn.toFixed(4)}/-{selectedReamer.toolToleranceMinusIn.toFixed(4)} tooling tolerance.
          </div>
        {/if}
        {#if selectedIdReamer}
          <div class="rounded-md border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/88">
            ID reamer: {selectedIdReamer.sizeLabel} at {selectedIdReamer.nominalIn.toFixed(4)} in with +{selectedIdReamer.toolTolerancePlusIn.toFixed(4)}/-{selectedIdReamer.toolToleranceMinusIn.toFixed(4)} tooling tolerance.
          </div>
        {/if}
        {#if compareCases.length}
          <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {#each compareCases as entry (entry.id)}
              <div class="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-[11px] text-white/82">
                <div class="flex items-center justify-between gap-2">
                  <div class="font-semibold text-white/90">{entry.name}</div>
                  <Badge variant="outline" class={entry.results.governing.margin >= 0 ? 'border-emerald-400/30 text-emerald-200' : 'border-amber-400/30 text-amber-200'}>
                    {entry.results.governing.margin >= 0 ? 'PASS' : 'ATTN'}
                  </Badge>
                </div>
                <div class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>Margin: <span class={entry.results.governing.margin >= 0 ? valOk : valFail}>{fmt(entry.results.governing.margin, 3)}</span></div>
                  <div>Δ margin: <span class={entry.deltaMargin >= 0 ? valOk : valFail}>{fmt(entry.deltaMargin, 3)}</span></div>
                  <div>Install force: {fmtForceTol(entry.results.physics.installForce)}</div>
                  <div>Δ force: <span class={entry.deltaInstallForce <= 0 ? valOk : valInfo}>{fmt(entry.deltaInstallForce, 0)}</span> {forceUnit()}</div>
                  <div>Contact pressure: {fmtStressTol(entry.results.physics.contactPressure)}</div>
                  <div>Δ pressure: <span class={entry.deltaContactPressure <= 0 ? valOk : valInfo}>{fmt(entry.deltaContactPressure, form.units === 'metric' ? 1 : 2)}</span> {stressUnit()}</div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </CardContent>
    </Card>
  {/if}

  <div class="flex items-center justify-between">
    <h3 class="text-sm font-semibold text-slate-100">Results Summary</h3>
    <Badge variant="outline" class={failed ? 'border-amber-400/40 text-amber-200' : 'border-emerald-400/40 text-emerald-200'}>
      {failed ? 'ATTN' : 'PASS'}
    </Badge>
  </div>

  <div class="grid grid-cols-1 gap-4 2xl:grid-cols-2">
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

  <Card
    id="bushing-fit-card"
    class={`bushing-results-card bushing-pop-card bushing-depth-1 ${fitFailed ? 'border border-amber-300/35 bg-amber-500/[0.04]' : 'border border-white/10 bg-black/18'}`}>
    <CardContent class="pt-4 text-sm space-y-2.5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="text-[10px] uppercase tracking-wide text-indigo-200/92 font-bold">Fit Containment Notes</div>
        <Badge variant="outline" class={fitFailed ? 'border-amber-300/35 text-amber-200' : 'border-cyan-300/30 text-cyan-100'}>
          {results.tolerance.status.toUpperCase()}
        </Badge>
      </div>
      {#if results.tolerance.status === 'infeasible'}
        <div class="rounded-md border border-amber-300/50 bg-amber-500/15 p-2 text-[11px] text-amber-100">
          <div class="font-semibold">What failed: tolerance bands are incompatible for full-range containment.</div>
          <div class="mt-1">Why: bore band width ({fmtBand(boreBandWidth)}) exceeds target interference width ({fmtBand(targetBandWidth)}), so no single OD band can satisfy every combination.</div>
          <div class="mt-1">Next: widen the target interference band or narrow the bore tolerance band.</div>
        </div>
      {:else if results.tolerance.status === 'clamped'}
        <div class="rounded-md border border-cyan-300/40 bg-cyan-500/12 p-2 text-[11px] text-cyan-100">
          <div class="font-semibold">OD nominal was clamped to stay within the requested interference band.</div>
          <div class="mt-1">Next: confirm the shifted OD is acceptable, or revisit the target interference window.</div>
        </div>
      {:else}
        <div class="rounded-md border border-white/10 bg-black/22 p-2 text-[11px] text-white/74">
          Achieved fit remains inside the requested target window with the current containment settings.
        </div>
      {/if}
      {#if displayToleranceNotes.length}
        <div class="space-y-1">
          {#each displayToleranceNotes as n}
            <div class="rounded-md border border-white/10 bg-black/25 px-2 py-1 text-[10px] text-white/75">{n}</div>
          {/each}
        </div>
      {/if}
      <BushingEnforcementDetails {form} {results} />
    </CardContent>
  </Card>

  {#key `lame-${workflowMode}`}
    {#if workflowMode === 'review'}
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
    {/if}
  {/key}
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
  :global(.results-ruled) {
    --rs-label-col: 22ch;
    --rs-nominal-col: 10ch;
    --rs-tolerance-col: 15ch;
    --rs-unit-col: 3.5ch;
    --rs-gap: 1rem;
    position: relative;
  }

  :global(.results-ruled::before),
  :global(.results-ruled::after) {
    content: '';
    position: absolute;
    top: 2.1rem;
    bottom: 0.35rem;
    width: 1px;
    pointer-events: none;
    background: linear-gradient(to bottom, rgba(148, 163, 184, 0), rgba(148, 163, 184, 0.14), rgba(148, 163, 184, 0));
  }

  :global(.results-ruled::before) {
    right: calc(var(--rs-unit-col) + var(--rs-gap) + var(--rs-tolerance-col) + var(--rs-gap));
  }

  :global(.results-ruled::after) {
    right: calc(var(--rs-unit-col) + var(--rs-gap));
  }

  :global(.results-row) {
    display: grid;
    grid-template-columns: minmax(0, var(--rs-label-col)) var(--rs-nominal-col) var(--rs-tolerance-col) var(--rs-unit-col);
    align-items: baseline;
    column-gap: var(--rs-gap);
    min-width: 0;
    padding: 0.14rem 0;
    position: relative;
  }

  :global(.results-row::after) {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: -0.2rem;
    height: 1px;
    background: linear-gradient(to right, rgba(148, 163, 184, 0.07), rgba(148, 163, 184, 0.03), rgba(148, 163, 184, 0));
  }

  :global(.results-row--range) {
    grid-template-columns: minmax(0, var(--rs-label-col)) var(--rs-nominal-col) var(--rs-tolerance-col) var(--rs-unit-col);
  }

  :global(.results-row--dense) {
    padding: 0.1rem 0;
  }

  :global(.results-row--dense::after) {
    bottom: -0.12rem;
  }

  :global(.results-label) {
    min-width: 0;
    line-height: 1.2;
    max-width: var(--rs-label-col);
    padding-right: 0.5rem;
  }

  :global(.results-nominal),
  :global(.results-tolerance),
  :global(.results-unit),
  :global(.results-range) {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    text-align: right;
  }

  :global(.results-range) {
    grid-column: 2 / 4;
  }

  @media (min-width: 1536px) {
    :global(.results-ruled) {
      --rs-label-col: 22ch;
      --rs-nominal-col: 10ch;
      --rs-tolerance-col: 15ch;
      --rs-unit-col: 4ch;
      --rs-gap: 1rem;
    }
  }
</style>
