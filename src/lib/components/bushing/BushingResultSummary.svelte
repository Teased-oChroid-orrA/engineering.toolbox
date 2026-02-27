<script lang="ts">
  import { onMount } from 'svelte';
  import { Badge, Card, CardContent } from '$lib/components/ui';
  import type { BushingInputs, BushingOutput } from '$lib/core/bushing';
  import BushingLameStressPlot from './BushingLameStressPlot.svelte';
  import BushingEnforcementDetails from './BushingEnforcementDetails.svelte';
  import BushingResultInfoDialog from './BushingResultInfoDialog.svelte';
  import NativeDragLane from './NativeDragLane.svelte';
  import { bushingLogger } from '$lib/utils/loggers';
  let { form, results }: { form: BushingInputs; results: BushingOutput } = $props();
  let infoDialog = $state<'safety' | 'fit' | null>(null);
  type SectionId = 'metrics' | 'lame';
  const SECTION_ORDER_KEY = 'scd.bushing.resultsSummary.sectionOrder.v1';
  let sectionOrder = $state<SectionId[]>(['metrics', 'lame']);
  let sectionItems = $derived(sectionOrder.map(id => ({ id })));
  onMount(() => {
    try {
      const saved = localStorage.getItem(SECTION_ORDER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SectionId[];
        if (Array.isArray(parsed) && parsed.length === 2) {
          sectionOrder = parsed;
        }
      }
    } catch (e) {
      bushingLogger.warn('Failed to load section order', e);
    }
  });
  function handleReorder(ev: CustomEvent<{ items: Array<{ id: string }> }>) {
    const newOrder = ev.detail.items.map(i => i.id as SectionId);
    if (JSON.stringify(newOrder) !== JSON.stringify(sectionOrder)) {
      sectionOrder = newOrder;
      try {
        localStorage.setItem(SECTION_ORDER_KEY, JSON.stringify(newOrder));
      } catch (e) {
        bushingLogger.warn('Failed to save section order', e);
      }
    }
  }
  const PSI_TO_MPA = 0.006894757;
  const LBF_TO_N = 4.4482216152605;
  const fmt = (n: number | null | undefined, d = 2) => (!Number.isFinite(Number(n)) ? '---' : Number(n).toFixed(d));
  const fmtTol = (lower: number, upper: number, nominal: number, d = 4) =>
    `${fmt(nominal, d)} (+${fmt(upper - nominal, d)}/-${fmt(nominal - lower, d)})`;
  const fmtTolWithShift = (lower: number, upper: number, nominal: number, shift: number, d = 4) =>
    fmtTol(lower + shift, upper + shift, nominal + shift, d);
  const fmtStress = (psi: number) => (!Number.isFinite(psi) ? '---' : (form.units === 'metric' ? (psi * PSI_TO_MPA).toFixed(1) : (psi / 1000).toFixed(2)));
  const fmtForce = (lbf: number) => (!Number.isFinite(lbf) ? '---' : (form.units === 'metric' ? (lbf * LBF_TO_N).toFixed(0) : lbf.toFixed(0)));
  const stressUnit = () => (form.units === 'metric' ? 'MPa' : 'ksi');
  const forceUnit = () => (form.units === 'metric' ? 'N' : 'lbf');
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
  <div class="flex items-center justify-between">
    <h3 class="text-sm font-semibold text-slate-100">Results Summary</h3>
    <Badge variant="outline" class={failed ? 'border-amber-400/40 text-amber-200' : 'border-emerald-400/40 text-emerald-200'}>
      {failed ? 'ATTN' : 'PASS'}
    </Badge>
  </div>
  
  <NativeDragLane
    listClass="space-y-3"
    items={sectionItems}
    enabled={true}
    flipDurationMs={200}
    on:finalize={handleReorder}>
    {#snippet children(item)}
      {#if item.id === 'metrics'}
      <div class="grid grid-cols-1 gap-4 md:grid-cols-[0.78fr_1.22fr]">
        <div
          class="cursor-pointer"
          role="button"
          tabindex="0"
          onclick={() => (infoDialog = 'safety')}
          onkeydown={(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (infoDialog = 'safety')}>
        <Card
          id="bushing-safety-card"
          class={`bushing-results-card border-l-4 bushing-pop-card bushing-depth-2 ${failed ? 'border-amber-400 shadow-[0_0_0_1px_rgba(251,191,36,0.4)]' : 'border-emerald-500'}`}>
          <CardContent class="pt-5 text-sm">
            <div class="text-[10px] mb-2 uppercase tracking-wide text-indigo-200/95 font-bold">Safety Margins (Yield)</div>
            <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Housing</span><span class={`font-mono font-semibold ${results.physics.marginHousing >= 0 ? valOk : valFail}`}>{fmt(results.physics.marginHousing)}</span></div>
            <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Bushing</span><span class={`font-mono font-semibold ${results.physics.marginBushing >= 0 ? valOk : valFail}`}>{fmt(results.physics.marginBushing)}</span></div>
            <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Governing</span><span class={`font-mono font-semibold ${results.governing.margin >= 0 ? valOk : valFail}`}>{fmt(results.governing.margin)}</span></div>
          </CardContent>
        </Card>
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
          <CardContent class="pt-5 text-sm space-y-1">
            <div class="text-[10px] mb-2 uppercase tracking-wide text-indigo-200/95 font-bold">Fit Physics</div>
            <div class="grid grid-cols-[1fr_auto] gap-3"><span class="text-slate-100/95 font-medium">Contact Pressure</span><span class="font-mono text-right text-slate-100 font-semibold">{fmtStress(results.physics.contactPressure)} {stressUnit()}</span></div>
            <div class="grid grid-cols-[1fr_auto] gap-3"><span class="text-slate-100/95 font-medium">Axial Stress (housing)</span><span class="font-mono text-right text-slate-100 font-semibold">{fmtStress(results.physics.stressAxialHousing)} {stressUnit()}</span></div>
            <div class="grid grid-cols-[1fr_auto] gap-3"><span class="text-slate-100/95 font-medium">Axial Stress (bushing)</span><span class="font-mono text-right text-slate-100 font-semibold">{fmtStress(results.physics.stressAxialBushing)} {stressUnit()}</span></div>
            <div class="grid grid-cols-[1fr_auto] gap-3"><span class="text-slate-100/95 font-medium">Install Force</span><span class="font-mono text-right text-slate-100 font-semibold">{fmtForce(results.physics.installForce)} {forceUnit()}</span></div>
            <div class="grid grid-cols-[1fr_auto] gap-3"><span class="text-slate-100/95 font-medium">Interference (eff.)</span><span class={`font-mono text-right font-semibold ${positiveInterference ? valOk : valFail}`}>{fmt(results.physics.deltaEffective, 4)}</span></div>
            <div class="grid grid-cols-[1fr_auto] gap-3"><span class="text-slate-100/95 font-medium">OD (tol)</span><span class={`font-mono text-right text-[0.92rem] font-semibold ${odContained ? valOk : valFail}`}>{fmtTol(results.tolerance.odBushing.lower, results.tolerance.odBushing.upper, results.tolerance.odBushing.nominal)}</span></div>
            <div class="grid grid-cols-[1fr_auto] gap-3"><span class="text-slate-100/95 font-medium">Interference (target tol)</span><span class={`font-mono text-right text-[0.92rem] font-semibold ${valInfo}`}>{fmtTol(results.tolerance.interferenceTarget.lower, results.tolerance.interferenceTarget.upper, results.tolerance.interferenceTarget.nominal)}</span></div>
            <div class="grid grid-cols-[1fr_auto] gap-3"><span class="text-slate-100/95 font-medium">Interference (achieved tol)</span><span class={`font-mono text-right text-[0.92rem] font-semibold ${achievedWithinTarget ? valOk : valFail}`}>{fmtTol(results.tolerance.achievedInterference.lower, results.tolerance.achievedInterference.upper, results.tolerance.achievedInterference.nominal)}</span></div>
            {#if Math.abs(results.lame.deltaThermal) > 1e-10}
              <div class="grid grid-cols-[1fr_auto] gap-3">
                <span class="text-slate-100/95 font-medium">Interference (effective @ dT)</span>
                <span class="font-mono text-right text-[0.92rem] text-amber-200 font-semibold">
                  {fmtTolWithShift(
                    results.tolerance.achievedInterference.lower,
                    results.tolerance.achievedInterference.upper,
                    results.tolerance.achievedInterference.nominal,
                    results.lame.deltaThermal
                  )}
                </span>
              </div>
            {/if}
            {#if results.tolerance.csExternalDia}
              <div class="flex justify-between"><span class="text-slate-100/95 font-medium">External CS Dia (tol)</span><span class="font-mono text-cyan-200 font-semibold">{fmtTol(results.tolerance.csExternalDia.lower, results.tolerance.csExternalDia.upper, results.tolerance.csExternalDia.nominal)}</span></div>
            {/if}
            {#if results.tolerance.csInternalDia}
              <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Internal CS Dia (tol)</span><span class="font-mono text-cyan-200 font-semibold">{fmtTol(results.tolerance.csInternalDia.lower, results.tolerance.csInternalDia.upper, results.tolerance.csInternalDia.nominal)}</span></div>
            {/if}
            {#if results.tolerance.status === 'infeasible'}
              <div class="mt-2 rounded-md border border-amber-300/50 bg-amber-500/15 p-2 text-[11px] text-amber-100">
                Tolerance bands are incompatible for full-range containment. Bore band width ({fmtBand(boreBandWidth)}) exceeds target interference width ({fmtBand(targetBandWidth)}), so solver collapses OD tolerance to a single value.
              </div>
            {:else if results.tolerance.status === 'clamped'}
              <div class="mt-2 rounded-md border border-cyan-300/40 bg-cyan-500/12 p-2 text-[11px] text-cyan-100">
                OD nominal is clamped to keep interference within requested tolerance band.
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
      </div>
    {:else if item.id === 'lame'}
      <Card class="bushing-results-card bushing-pop-card bushing-depth-1">
        <CardContent class="pt-4 space-y-2 text-sm">
          <div class="text-[10px] uppercase tracking-wide text-indigo-200/95 font-bold">Lamé Stress Field (Full Distribution)</div>
          <div class="grid grid-cols-1 gap-2 text-[12px] text-white/85 md:grid-cols-2">
            <div class="rounded-md border border-white/10 bg-black/20 p-2">
              <div class="font-semibold text-emerald-200">Bushing Boundaries</div>
              <div class="font-mono">σr(inner) = {fmt(results.lame.field.bushing.boundary.sigmaRInner, 2)} psi</div>
              <div class="font-mono">σr(outer) = {fmt(results.lame.field.bushing.boundary.sigmaROuter, 2)} psi</div>
              <div class="font-mono">σθ(inner) = {fmt(results.lame.field.bushing.boundary.sigmaThetaInner, 2)} psi</div>
              <div class="font-mono">σθ(outer) = {fmt(results.lame.field.bushing.boundary.sigmaThetaOuter, 2)} psi</div>
              <div class="font-mono">σz(inner/outer) = {fmt(results.lame.field.bushing.boundary.sigmaAxialInner, 2)} / {fmt(results.lame.field.bushing.boundary.sigmaAxialOuter, 2)} psi</div>
            </div>
            <div class="rounded-md border border-white/10 bg-black/20 p-2">
              <div class="font-semibold text-blue-200">Housing Boundaries</div>
              <div class="font-mono">σr(inner) = {fmt(results.lame.field.housing.boundary.sigmaRInner, 2)} psi</div>
              <div class="font-mono">σr(outer) = {fmt(results.lame.field.housing.boundary.sigmaROuter, 2)} psi</div>
              <div class="font-mono">σθ(inner) = {fmt(results.lame.field.housing.boundary.sigmaThetaInner, 2)} psi</div>
              <div class="font-mono">σθ(outer) = {fmt(results.lame.field.housing.boundary.sigmaThetaOuter, 2)} psi</div>
              <div class="font-mono">σz(inner/outer) = {fmt(results.lame.field.housing.boundary.sigmaAxialInner, 2)} / {fmt(results.lame.field.housing.boundary.sigmaAxialOuter, 2)} psi</div>
            </div>
          </div>
          <div class="text-[11px] text-cyan-100/80">
            Axial coupling: k<sub>constraint</sub>={results.physics.axialConstraintFactor.toFixed(2)}, k<sub>length</sub>={results.physics.axialLengthFactor.toFixed(2)}
          </div>
          <BushingLameStressPlot field={results.lame.field} />
        </CardContent>
      </Card>
    {/if}
    {/snippet}
  </NativeDragLane>
</div>

<BushingResultInfoDialog
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
