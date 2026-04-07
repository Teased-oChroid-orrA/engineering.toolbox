<script lang="ts">
  import { Badge, Card, CardContent } from '$lib/components/ui';
  import type { BushingInputs, BushingOutput } from '$lib/core/bushing';
  import { BUSHING_CONTAMINATION_HINTS, BUSHING_CRITICALITY_HINTS, BUSHING_LUBRICATION_HINTS } from '$lib/core/bushing/processLibrary';

  let { form, results }: { form: BushingInputs; results: BushingOutput } = $props();

  const PSI_TO_MPA = 0.006894757;
  const IN_TO_MM = 25.4;
  const MPS_TO_FPS = 3.280839895013123;
  const UM_TO_UIN = 39.37007874015748;
  const fmt = (value: number | null | undefined, digits = 3) =>
    Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '---';
  const lengthUnit = () => (form.units === 'metric' ? 'mm' : 'in');
  const pressureUnit = () => (form.units === 'metric' ? 'MPa' : 'ksi');
  const forceUnit = () => (form.units === 'metric' ? 'N' : 'lbf');
  const convertLength = (value: number) => (form.units === 'metric' ? value * IN_TO_MM : value);
  const convertPressure = (valuePsi: number) => (form.units === 'metric' ? valuePsi * PSI_TO_MPA : valuePsi / 1000);
  const convertForce = (valueLbf: number) => (form.units === 'metric' ? valueLbf * 4.4482216152605 : valueLbf);
  const convertVelocity = (valueMps: number) => (form.units === 'metric' ? valueMps : valueMps * MPS_TO_FPS);
  const velocityUnit = () => (form.units === 'metric' ? 'm/s' : 'ft/s');
  const convertSurfaceFinish = (valueUm: number) => (form.units === 'metric' ? valueUm : valueUm * UM_TO_UIN);
  const finishUnit = () => (form.units === 'metric' ? 'um' : 'uin');
  const convertPv = (value: number) => (form.units === 'metric' ? value : value * MPS_TO_FPS);
  const pvUnit = () => (form.units === 'metric' ? 'MPa·m/s' : 'psi·ft/s');
  const formatPsiLike = (valuePsi: number) => {
    if (form.units === 'metric') {
      return { value: fmt(valuePsi * PSI_TO_MPA, 2), unit: 'MPa' };
    }
    if (Math.abs(valuePsi) >= 1000) {
      return { value: fmt(valuePsi / 1000, 2), unit: 'ksi' };
    }
    return { value: fmt(valuePsi, 0), unit: 'psi' };
  };

  let reviewTone = $derived.by(() => {
    if (results.review.decision === 'hold') return 'rose';
    if (results.review.decision === 'review') return 'amber';
    return 'emerald';
  });

  let riskBadge = $derived.by(() => {
    if (results.dutyScreen.wearRisk === 'severe') return 'SEVERE';
    if (results.dutyScreen.wearRisk === 'high') return 'HIGH';
    if (results.dutyScreen.wearRisk === 'moderate') return 'MOD';
    return 'LOW';
  });

  let uniqueTraceabilityRefs = $derived.by(() => [...new Set(results.review.traceabilityRefs)]);
  let primaryProcessNote = $derived.by(() => results.process.notes[0] ?? null);
</script>

<div class="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
  <Card class="border border-sky-300/20 bg-[linear-gradient(135deg,rgba(10,30,50,0.82),rgba(7,23,45,0.95))] bushing-pop-card bushing-depth-1">
    <CardContent class="space-y-4 pt-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="text-[10px] font-bold uppercase tracking-[0.22em] text-sky-100/80">Service Envelope</div>
          <div class="mt-1 text-sm font-semibold text-white">Read this as the fit lifecycle: free-state reference, as-installed fit, hot/cold service, post-machining, then worn-limit behavior.</div>
          <div class="mt-2 max-w-3xl text-[11px] leading-relaxed text-sky-100/68">
            Use it to answer one question: does the bushing still behave acceptably after real service changes the fit, or does a state drift toward transition/clearance and require a route change or review?
          </div>
        </div>
        <Badge variant="outline" class="border-sky-300/30 text-sky-100">
          Governing: {results.serviceEnvelope.governingStateLabel}
        </Badge>
      </div>
      <div class="rounded-xl border border-white/10 bg-slate-950/28 px-3 py-2 text-[10px] text-white/68">
        `Free state` is the uninstalled reference. `Installed` is the as-pressed condition. `Hot` and `Cold` apply service temperature. `Finish reamed` applies any post-install machining allowance. `Worn` applies the end-of-life wear allowance. Service load and failure-plane assumptions are screened elsewhere.
      </div>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {#each results.serviceEnvelope.states as state (state.id)}
          <div class={`min-w-0 rounded-2xl border px-3 py-3 text-[11px] ${
            state.id === results.serviceEnvelope.governingStateId
              ? 'border-amber-300/40 bg-amber-500/10 text-amber-50'
              : 'border-white/10 bg-white/[0.04] text-white/78'
          }`}>
            <div class="flex flex-col items-start gap-2 min-w-0 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0 text-[9px] font-semibold uppercase leading-tight tracking-[0.12em] text-white/92">{state.label}</div>
              <Badge
                variant="outline"
                class={`shrink-0 ${
                  state.fitClass === 'interference'
                    ? 'border-emerald-300/35 text-emerald-200'
                    : state.fitClass === 'transition'
                      ? 'border-cyan-300/35 text-cyan-200'
                      : 'border-rose-300/35 text-rose-200'
                }`}>
                {state.fitClass}
              </Badge>
            </div>
            <div class="mt-3 space-y-1.5">
              <div>Interference: <span class="font-mono break-all">{fmt(convertLength(state.effectiveInterference), form.units === 'metric' ? 3 : 4)} {lengthUnit()}</span></div>
              <div>Contact p: <span class="font-mono break-all">{fmt(convertPressure(state.contactPressure), form.units === 'metric' ? 1 : 2)} {pressureUnit()}</span></div>
              <div>Projected ID: <span class="font-mono break-all">{fmt(convertLength(state.projectedId), form.units === 'metric' ? 3 : 4)} {lengthUnit()}</span></div>
              <div>ID shift: <span class="font-mono break-all">{fmt(convertLength(state.idChangeFromFree), form.units === 'metric' ? 3 : 4)} {lengthUnit()}</span></div>
            </div>
            <div class="mt-3 break-words text-[10px] leading-relaxed opacity-80">{state.note}</div>
          </div>
        {/each}
      </div>
      {#if results.process.finishMachiningRequired}
        <div class="rounded-xl border border-amber-300/35 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/88">
          Process route indicates post-install ID recovery should be planned before final acceptance.
        </div>
      {/if}
    </CardContent>
  </Card>

  <div class="grid grid-cols-1 gap-4">
    <Card class="border border-white/10 bg-black/25 bushing-pop-card bushing-depth-1">
      <CardContent class="space-y-3 pt-4 text-sm">
        <div class="flex items-center justify-between gap-2">
          <div class="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-100/80">Duty Screen</div>
          <Badge
            variant="outline"
            class={
              results.dutyScreen.wearRisk === 'severe'
                ? 'border-rose-300/35 text-rose-200'
                : results.dutyScreen.wearRisk === 'high'
                  ? 'border-amber-300/35 text-amber-200'
                  : results.dutyScreen.wearRisk === 'moderate'
                    ? 'border-cyan-300/35 text-cyan-200'
                    : 'border-emerald-300/35 text-emerald-200'
            }>
            {riskBadge}
          </Badge>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] text-white/68">
          This is a wear-risk screen, not a certification life model. Use it to catch cases where the fit installs fine but service load, motion, finish, or contamination likely make the bearing behavior questionable.
        </div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-white/82">
          <div>Service bearing load: <span class="font-mono">{formatPsiLike(results.dutyScreen.specificLoadPsi).value} {formatPsiLike(results.dutyScreen.specificLoadPsi).unit}</span></div>
          <div>Sliding speed: <span class="font-mono">{fmt(convertVelocity(results.dutyScreen.slidingVelocityMps), 3)} {velocityUnit()}</span></div>
          <div>Wear PV: <span class="font-mono">{fmt(convertPv(results.dutyScreen.pv), form.units === 'metric' ? 3 : 1)} {pvUnit()}</span></div>
          <div>Screening PV limit: <span class="font-mono">{fmt(convertPv(results.dutyScreen.pvLimit), form.units === 'metric' ? 3 : 1)} {pvUnit()}</span></div>
          <div>Utilization: <span class="font-mono">{fmt(results.dutyScreen.pvUtilization * 100, 0)}%</span></div>
          <div>Life estimate: <span class="font-mono">{results.dutyScreen.lifeEstimateHours ? `${Math.round(results.dutyScreen.lifeEstimateHours)} h` : 'n/a'}</span></div>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] text-white/68">
          {BUSHING_LUBRICATION_HINTS[results.dutyScreen.lubricationMode]} {BUSHING_CONTAMINATION_HINTS[results.dutyScreen.contaminationLevel]}
        </div>
        {#if results.dutyScreen.dominantDrivers.length}
          <div class="space-y-1">
            {#each results.dutyScreen.dominantDrivers as driver}
              <div class="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-white/72">{driver}</div>
            {/each}
          </div>
        {/if}
      </CardContent>
    </Card>

    <Card class="border border-white/10 bg-black/25 bushing-pop-card bushing-depth-1">
      <CardContent class="space-y-3 pt-4 text-sm">
        <div class="flex items-center justify-between gap-2">
          <div class="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-100/80">Process + Approval</div>
          <Badge
            variant="outline"
            class={
              reviewTone === 'rose'
                ? 'border-rose-300/35 text-rose-200'
                : reviewTone === 'amber'
                  ? 'border-amber-300/35 text-amber-200'
                  : 'border-emerald-300/35 text-emerald-200'
            }>
            {results.review.decision.toUpperCase()}
          </Badge>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] text-white/68">
          This block explains what the selected process route is doing to the result and whether the case should be treated as pass, review, or hold in the export trail.
        </div>
        {#if primaryProcessNote}
          <div class="rounded-xl border border-cyan-300/18 bg-cyan-500/8 px-3 py-2 text-[10px] text-cyan-100/82">
            {primaryProcessNote}
          </div>
        {/if}
        {#if results.process.thermalAssistRecommended}
          <div class="rounded-xl border border-amber-300/25 bg-amber-500/8 px-3 py-2 text-[10px] leading-relaxed text-amber-100/84">
            `Thermal Assist Install` means the planned assembly route uses temperature to reduce press effort, typically by cooling the bushing, warming the housing, or both. In this toolbox entered assembly temperatures reduce install-state interference and install pressure directly; the retained fit after temperatures equalize is still evaluated separately.
          </div>
        {/if}
        {#if results.process.assemblyThermalAssistActive}
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl border border-cyan-300/18 bg-cyan-500/8 px-3 py-2 text-[10px] text-cyan-100/82">
            <div>Assembly thermal delta: <span class="font-mono">{fmt(convertLength(results.physics.assemblyThermalDelta), form.units === 'metric' ? 3 : 4)} {lengthUnit()}</span></div>
            <div>Install-state interference: <span class="font-mono">{fmt(convertLength(results.physics.installDeltaEffective), form.units === 'metric' ? 3 : 4)} {lengthUnit()}</span></div>
            <div>Install contact pressure: <span class="font-mono">{fmt(convertPressure(results.physics.installContactPressure), form.units === 'metric' ? 1 : 2)} {pressureUnit()}</span></div>
            <div>Retained removal basis: <span class="font-mono">{fmt(convertForce(results.physics.retainedInstallForce), 0)} {forceUnit()}</span></div>
          </div>
        {/if}
        <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-white/82">
          <div>Route: <span class="font-medium text-white/90">{results.process.routeLabel}</span></div>
          <div>Tolerance class: <span class="font-mono">{results.process.toleranceClass}</span></div>
          <div>Recommended Ra: <span class="font-mono">{fmt(convertSurfaceFinish(results.process.recommendedRaUm), form.units === 'metric' ? 1 : 0)} {finishUnit()}</span></div>
          <div>Roundness: <span class="font-mono">{fmt(convertSurfaceFinish(results.process.roundnessTargetUm), 0)} {finishUnit()}</span></div>
          <div>Expected install force: <span class="font-mono">{fmt(convertForce(results.process.installForceBand.low), 0)}-{fmt(convertForce(results.process.installForceBand.high), 0)} {forceUnit()}</span></div>
          <div>Estimated removal force: <span class="font-mono">{fmt(convertForce(results.process.removalForce), 0)} {forceUnit()}</span></div>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] text-white/68">
          {BUSHING_CRITICALITY_HINTS[results.review.criticality]}
        </div>
        <div class="space-y-1 text-[11px] text-white/82">
          <div>Basis: <span class="font-medium text-white/90">{results.review.standardsBasis}</span> {results.review.standardsRevision}</div>
          <div>Process spec: <span class="font-medium text-white/90">{results.review.processSpec}</span></div>
        </div>
        {#if uniqueTraceabilityRefs.length}
          <div class="space-y-1">
            {#each uniqueTraceabilityRefs as ref}
              <div class="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-white/72">{ref}</div>
            {/each}
          </div>
        {/if}
      </CardContent>
    </Card>
  </div>
</div>
