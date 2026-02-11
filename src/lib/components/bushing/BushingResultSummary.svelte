<script lang="ts">
  import { Badge, Card, CardContent } from '$lib/components/ui';
  import type { BushingInputs, BushingOutput } from '$lib/core/bushing';
  import BushingLameStressPlot from './BushingLameStressPlot.svelte';

  export let form: BushingInputs;
  export let results: BushingOutput;
  let infoDialog: 'safety' | 'fit' | null = null;

  const PSI_TO_MPA = 0.006894757;
  const LBF_TO_N = 4.4482216152605;

  const fmt = (n: number | null | undefined, d = 2) => (!Number.isFinite(Number(n)) ? '---' : Number(n).toFixed(d));
  const fmtTol = (lower: number, upper: number, nominal: number, d = 4) =>
    `${fmt(nominal, d)} (+${fmt(upper - nominal, d)}/-${fmt(nominal - lower, d)})`;
  const fmtStress = (psi: number) => (!Number.isFinite(psi) ? '---' : (form.units === 'metric' ? (psi * PSI_TO_MPA).toFixed(1) : (psi / 1000).toFixed(2)));
  const fmtForce = (lbf: number) => (!Number.isFinite(lbf) ? '---' : (form.units === 'metric' ? (lbf * LBF_TO_N).toFixed(0) : lbf.toFixed(0)));
  const stressUnit = () => (form.units === 'metric' ? 'MPa' : 'ksi');
  const forceUnit = () => (form.units === 'metric' ? 'N' : 'lbf');
  $: failed = results.governing.margin < 0 || results.physics.marginHousing < 0 || results.physics.marginBushing < 0;
  $: fitFailed = results.warningCodes.some((w) => w.code === 'TOLERANCE_INFEASIBLE' || w.code === 'NET_CLEARANCE_FIT');
  $: edgeFailed = results.warningCodes.some((w) => w.code.includes('EDGE_DISTANCE'));
  $: wallFailed = results.warningCodes.some((w) => w.code.includes('WALL_BELOW_MIN'));

  function focusSection(id: string) {
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
  <div class="grid grid-cols-1 gap-4 md:grid-cols-[0.78fr_1.22fr]">
    <div
      class="cursor-pointer"
      role="button"
      tabindex="0"
      on:click={() => (infoDialog = 'safety')}
      on:keydown={(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (infoDialog = 'safety')}>
    <Card
      id="bushing-safety-card"
      class={`bushing-results-card border-l-4 bushing-pop-card bushing-depth-2 ${failed ? 'border-amber-400 shadow-[0_0_0_1px_rgba(251,191,36,0.4)]' : 'border-emerald-500'}`}>
      <CardContent class="pt-5 text-sm">
        <div class="text-[10px] mb-2 uppercase tracking-wide text-indigo-200/95 font-bold">Safety Margins (Yield)</div>
        <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Housing</span><span class="font-mono text-emerald-300 font-semibold">{fmt(results.physics.marginHousing)}</span></div>
        <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Bushing</span><span class="font-mono text-emerald-300 font-semibold">{fmt(results.physics.marginBushing)}</span></div>
        <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Governing</span><span class="font-mono text-slate-100 font-semibold">{fmt(results.governing.margin)}</span></div>
      </CardContent>
    </Card>
    </div>
    <div
      class="cursor-pointer"
      role="button"
      tabindex="0"
      on:click={() => (infoDialog = 'fit')}
      on:keydown={(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (infoDialog = 'fit')}>
    <Card
      id="bushing-fit-card"
      class={`bushing-results-card bushing-pop-card bushing-depth-2 ${fitFailed ? 'border border-amber-300/55' : ''}`}>
      <CardContent class="pt-5 text-sm space-y-1">
        <div class="text-[10px] mb-2 uppercase tracking-wide text-indigo-200/95 font-bold">Fit Physics</div>
        <div class="grid grid-cols-[1fr_auto] gap-3"><span class="text-slate-100/95 font-medium">Contact Pressure</span><span class="font-mono text-right text-slate-100 font-semibold">{fmtStress(results.physics.contactPressure)} {stressUnit()}</span></div>
        <div class="grid grid-cols-[1fr_auto] gap-3"><span class="text-slate-100/95 font-medium">Axial Stress (housing)</span><span class="font-mono text-right text-slate-100 font-semibold">{fmtStress(results.physics.stressAxialHousing)} {stressUnit()}</span></div>
        <div class="grid grid-cols-[1fr_auto] gap-3"><span class="text-slate-100/95 font-medium">Axial Stress (bushing)</span><span class="font-mono text-right text-slate-100 font-semibold">{fmtStress(results.physics.stressAxialBushing)} {stressUnit()}</span></div>
        <div class="grid grid-cols-[1fr_auto] gap-3"><span class="text-slate-100/95 font-medium">Install Force</span><span class="font-mono text-right text-slate-100 font-semibold">{fmtForce(results.physics.installForce)} {forceUnit()}</span></div>
        <div class="grid grid-cols-[1fr_auto] gap-3"><span class="text-slate-100/95 font-medium">Interference (eff.)</span><span class="font-mono text-right text-amber-200 font-semibold">{fmt(results.physics.deltaEffective, 4)}</span></div>
        <div class="grid grid-cols-[1fr_auto] gap-3"><span class="text-slate-100/95 font-medium">OD (tol)</span><span class="font-mono text-right text-[0.92rem] text-cyan-200 font-semibold">{fmtTol(results.tolerance.odBushing.lower, results.tolerance.odBushing.upper, results.tolerance.odBushing.nominal)}</span></div>
        <div class="grid grid-cols-[1fr_auto] gap-3"><span class="text-slate-100/95 font-medium">Interference (target tol)</span><span class="font-mono text-right text-[0.92rem] text-cyan-200 font-semibold">{fmtTol(results.tolerance.interferenceTarget.lower, results.tolerance.interferenceTarget.upper, results.tolerance.interferenceTarget.nominal)}</span></div>
        <div class="grid grid-cols-[1fr_auto] gap-3"><span class="text-slate-100/95 font-medium">Interference (achieved tol)</span><span class="font-mono text-right text-[0.92rem] text-cyan-200 font-semibold">{fmtTol(results.tolerance.achievedInterference.lower, results.tolerance.achievedInterference.upper, results.tolerance.achievedInterference.nominal)}</span></div>
        {#if results.tolerance.csExternalDia}
          <div class="flex justify-between"><span class="text-slate-100/95 font-medium">External CS Dia (tol)</span><span class="font-mono text-cyan-200 font-semibold">{fmtTol(results.tolerance.csExternalDia.lower, results.tolerance.csExternalDia.upper, results.tolerance.csExternalDia.nominal)}</span></div>
        {/if}
        {#if results.tolerance.csInternalDia}
          <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Internal CS Dia (tol)</span><span class="font-mono text-cyan-200 font-semibold">{fmtTol(results.tolerance.csInternalDia.lower, results.tolerance.csInternalDia.upper, results.tolerance.csInternalDia.nominal)}</span></div>
        {/if}
      </CardContent>
    </Card>
    </div>
  </div>
</div>

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

{#if infoDialog}
  <div class="fixed inset-0 z-[120] grid place-items-center p-4">
    <button
      type="button"
      aria-label="Close dialog backdrop"
      class="absolute inset-0 bg-black/65"
      on:click={() => (infoDialog = null)}>
    </button>
    <div class="relative z-10 w-full max-w-[760px]">
    <Card class="border-cyan-300/35 bg-slate-950/95 text-slate-100 shadow-2xl">
      <CardContent class="space-y-3 pt-5 text-sm">
        {#if infoDialog === 'safety'}
          <div class="text-sm font-semibold text-cyan-100">Safety Margins (Yield)</div>
          <div class="text-white/80">These are hoop-yield margins from a thick-cylinder press-fit model. `Housing` compares predicted housing hoop stress to housing yield allowable; `Bushing` does the same for the bushing bore wall.</div>
          <div class="text-white/80">`Sequencing` in this tool is a geometry/process adequacy check: it verifies that edge ligament is sufficient for stable installation and progressive load transfer, so the joint does not localize damage before the intended bearing path is established.</div>
          <div class="text-white/80">`Governing` is not the average of these two. It is the minimum margin across all structural and geometry constraints in the active rule set. A negative governing value with positive yield margins means a different check controls failure, most commonly edge-distance sequencing or minimum-wall criteria.</div>
          <div class="text-white/80">Design implication: a yield-safe pair can still be configuration-unsafe if geometry/process constraints are violated.</div>
          <div class="rounded-md border border-cyan-300/25 bg-cyan-500/5 p-2 text-[12px] text-cyan-100/95">
            Active governing check: <span class="font-mono">{results.governing.name}</span>
          </div>
          {#if edgeFailed || wallFailed}
            <div class="rounded-md border border-amber-300/50 bg-amber-500/15 p-2 text-[12px] text-amber-100">
              Related failing checks:
              {#if edgeFailed}
                <button class="ml-1 underline underline-offset-2" on:click={() => focusSection('bushing-edge-distance-card')}>Edge Distance</button>
              {/if}
              {#if wallFailed}
                <button class="ml-2 underline underline-offset-2" on:click={() => focusSection('bushing-wall-thickness-card')}>Wall Thickness</button>
              {/if}
            </div>
          {/if}
        {:else}
          <div class="text-sm font-semibold text-cyan-100">Fit Physics</div>
          <div class="text-white/80">This panel quantifies the mechanics of assembly fit. Interference produces radial contact pressure through elastic compliance of both members; install force is then estimated from friction, pressure, and engagement length.</div>
          <div class="text-white/80">Tolerance entries describe interval behavior, not single-value behavior. `OD (tol)` is solver-selected to satisfy interference limits across bore variation. `Target tol` is the requested interference window, and `Achieved tol` is the resulting assembled window from the solved OD plus bore tolerance stack-up.</div>
          <div class="text-white/80">If achieved limits cannot fully remain inside target limits, the system is over-constrained by tolerance spread and should be resolved by tightening bore tolerance, widening interference window, or revising nominals.</div>
          <div class="rounded-md border border-cyan-300/25 bg-cyan-500/5 p-2 text-[12px] text-cyan-100/95">
            Current effective interference: <span class="font-mono">{fmt(results.physics.deltaEffective, 4)}</span>
          </div>
          {#if fitFailed}
            <div class="rounded-md border border-amber-300/50 bg-amber-500/15 p-2 text-[12px] text-amber-100">
              Fit constraint warnings are active.
              <button class="ml-1 underline underline-offset-2" on:click={() => focusSection('bushing-geometry-card')}>Open Geometry Inputs</button>
            </div>
          {/if}
        {/if}
        <div class="pt-2">
          <button class="rounded-md border border-cyan-300/40 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-500/20" on:click={() => (infoDialog = null)}>
            Close
          </button>
        </div>
      </CardContent>
    </Card>
    </div>
  </div>
{/if}
