<script lang="ts">
  import { Badge, Card, CardContent } from '$lib/components/ui';
  import type { BushingInputs, BushingOutput } from '$lib/core/bushing';
  import { makeRange } from '$lib/core/bushing/solveMath';

  let { form, results }: { form: BushingInputs; results: BushingOutput } = $props();

  type SketchDimensionTarget = 'od' | 'id' | 'flangeOd' | 'flangeThk' | 'extCsDia' | 'extCsDepth' | 'intCsDia' | 'intCsDepth';

  const fmt = (value: number | null | undefined, digits = 3) =>
    Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '---';
  const forceValue = (valueLbf: number) => (form.units === 'metric' ? valueLbf * 4.4482216152605 : valueLbf);
  const forceUnit = () => (form.units === 'metric' ? 'N' : 'lbf');
  const lengthUnit = () => (form.units === 'metric' ? 'mm' : 'in');
  const convertLength = (value: number) => (form.units === 'metric' ? value * 25.4 : value);
  const fmtLength = (value: number, digits = 4) => fmt(convertLength(value), digits);
  const fmtMinMax = (lower: number, upper: number, digits = 4) => `${fmtLength(lower, digits)} / ${fmtLength(upper, digits)}`;
  const toFixedRange = (value: number) => makeRange('limits', value, value, value);
  const effectiveInterference = $derived({
    lower: results.tolerance.achievedInterference.lower + results.lame.deltaThermal,
    upper: results.tolerance.achievedInterference.upper + results.lame.deltaThermal
  });
  const achievedWithinTarget = $derived(
    results.tolerance.achievedInterference.lower >= results.tolerance.interferenceTarget.lower - 1e-9 &&
      results.tolerance.achievedInterference.upper <= results.tolerance.interferenceTarget.upper + 1e-9
  );
  const effectiveWithinTarget = $derived(
    effectiveInterference.lower >= results.tolerance.interferenceTarget.lower - 1e-9 &&
      effectiveInterference.upper <= results.tolerance.interferenceTarget.upper + 1e-9
  );
  const measuredLines = $derived([
    results.inputBasis.bore === 'measured' ? 'Bore from measured part' : null,
    results.inputBasis.id === 'measured' ? 'ID from measured part' : null
  ].filter((entry): entry is string => Boolean(entry)));
  const outerProfileLabel = $derived(
    form.bushingType === 'straight' ? 'Straight OD' : form.bushingType === 'flanged' ? 'Flanged OD' : 'Countersunk OD'
  );
  const innerProfileLabel = $derived(form.idType === 'straight' ? 'Straight ID' : 'Countersunk ID');
  const idRange = $derived.by(() => {
    if (results.inputBasis.id === 'measured' && Number.isFinite(form.measuredPart?.id?.actual)) {
      const actual = Number(form.measuredPart?.id?.actual);
      return { ...makeRange('limits', actual - Number(form.measuredPart?.id?.tolMinus ?? 0), actual + Number(form.measuredPart?.id?.tolPlus ?? 0), actual), basis: 'Measured ID' };
    }
    return { ...toFixedRange(form.idBushing), basis: 'Design ID' };
  });
  const geometryDetails = $derived.by(() => {
    const details: Array<{
      label: string;
      rangeText: string;
      note: string;
      tone?: 'cyan' | 'indigo' | 'emerald';
      showUnit?: boolean;
      target: SketchDimensionTarget;
    }> = [
      {
        label: 'Bore Diameter',
        rangeText: fmtMinMax(results.tolerance.bore.lower, results.tolerance.bore.upper),
        note: `${results.inputBasis.bore === 'measured' ? 'as-measured' : 'design-intent'} bore band`,
        tone: 'cyan',
        showUnit: true,
        target: 'od'
      },
      {
        label: 'Bushing ID',
        rangeText: fmtMinMax(idRange.lower, idRange.upper),
        note: `${idRange.basis.toLowerCase()} • ${innerProfileLabel}`,
        tone: 'cyan',
        showUnit: true,
        target: 'id'
      },
      {
        label: 'Bushing OD Band',
        rangeText: fmtMinMax(results.tolerance.odBushing.lower, results.tolerance.odBushing.upper),
        note: `${outerProfileLabel} solved fit band`,
        tone: 'indigo',
        showUnit: true,
        target: 'od'
      },
      {
        label: 'Straight Wall',
        rangeText: fmtMinMax(toFixedRange(results.geometry.wallStraight).lower, toFixedRange(results.geometry.wallStraight).upper),
        note: 'minimum straight wall thickness in the active profile',
        tone: 'indigo',
        showUnit: true,
        target: 'od'
      }
    ];
    if (form.bushingType === 'flanged') {
      details.push(
        {
          label: 'Flange OD',
          rangeText: fmtMinMax(toFixedRange(Number(form.flangeOd ?? 0)).lower, toFixedRange(Number(form.flangeOd ?? 0)).upper),
          note: 'active flanged profile feature',
          tone: 'emerald',
          showUnit: true,
          target: 'flangeOd'
        },
        {
          label: 'Flange Thickness',
          rangeText: fmtMinMax(toFixedRange(Number(form.flangeThk ?? 0)).lower, toFixedRange(Number(form.flangeThk ?? 0)).upper),
          note: 'axial flange seat thickness',
          tone: 'emerald',
          showUnit: true,
          target: 'flangeThk'
        }
      );
    }
    if (form.bushingType === 'countersink') {
      const extCsDia = results.tolerance.csExternalDia ?? toFixedRange(results.geometry.csExternal.dia);
      const extCsDepth = results.tolerance.csExternalDepth ?? toFixedRange(results.geometry.csExternal.depth);
      details.push(
        {
          label: 'External CS Dia',
          rangeText: fmtMinMax(extCsDia.lower, extCsDia.upper),
          note: `${fmt(Number(results.geometry.csExternal.angleDeg), 1)} deg included angle`,
          tone: 'emerald',
          showUnit: true,
          target: 'extCsDia'
        },
        {
          label: 'External CS Depth',
          rangeText: fmtMinMax(extCsDepth.lower, extCsDepth.upper),
          note: 'external countersink depth band',
          tone: 'emerald',
          showUnit: true,
          target: 'extCsDepth'
        }
      );
    }
    if (form.idType === 'countersink') {
      const intCsDia = results.tolerance.csInternalDia ?? toFixedRange(results.geometry.csInternal.dia);
      const intCsDepth = results.tolerance.csInternalDepth ?? toFixedRange(results.geometry.csInternal.depth);
      details.push(
        {
          label: 'Internal CS Dia',
          rangeText: fmtMinMax(intCsDia.lower, intCsDia.upper),
          note: `${fmt(Number(results.geometry.csInternal.angleDeg), 1)} deg included angle`,
          tone: 'emerald',
          showUnit: true,
          target: 'intCsDia'
        },
        {
          label: 'Internal CS Depth',
          rangeText: fmtMinMax(intCsDepth.lower, intCsDepth.upper),
          note: 'internal countersink depth band',
          tone: 'emerald',
          showUnit: true,
          target: 'intCsDepth'
        }
      );
    }
    if (results.geometry.wallNeck < results.geometry.wallStraight - 1e-9) {
      details.push({
        label: 'Neck Wall',
        rangeText: fmtMinMax(toFixedRange(results.geometry.wallNeck).lower, toFixedRange(results.geometry.wallNeck).upper),
        note: 'minimum necked wall thickness through the countersunk section',
        tone: 'emerald',
        showUnit: true,
        target: form.bushingType === 'countersink' ? 'extCsDepth' : form.idType === 'countersink' ? 'intCsDepth' : 'od'
      });
    }
    return details;
  });

  function emitSketchHover(target: SketchDimensionTarget | null) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('bushing-sketch-hover', { detail: { target } }));
  }

  function emitSketchSelect(target: SketchDimensionTarget) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('bushing-sketch-select', { detail: { target } }));
  }
  const decisionTone = $derived(
    results.review.decision === 'hold'
      ? 'border-rose-300/35 text-rose-200'
      : results.review.decision === 'review'
        ? 'border-amber-300/35 text-amber-200'
        : 'border-emerald-300/35 text-emerald-200'
  );
</script>

<Card class="border border-cyan-300/20 bg-cyan-500/8 bushing-pop-card bushing-depth-1">
  <CardContent class="space-y-3 pt-4 text-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div class="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-100/85">Governing Case</div>
        <div class="mt-1 text-base font-semibold text-slate-100">{results.governing.name}</div>
        <div class="mt-1 text-xs text-slate-200/78">
          Margin <span class={results.governing.margin >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{fmt(results.governing.margin, 3)}</span>
          . Install force {fmt(forceValue(results.physics.installForce), 0)} {forceUnit()}.
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <Badge variant="outline" class={decisionTone}>{results.review.decision.toUpperCase()}</Badge>
        <Badge variant="outline" class={results.governing.margin >= 0 ? 'border-emerald-300/35 text-emerald-200' : 'border-amber-300/35 text-amber-200'}>
          {results.governing.margin >= 0 ? 'Within Limits' : 'Action Needed'}
        </Badge>
      </div>
    </div>
    <div class="grid grid-cols-1 gap-2 md:grid-cols-3">
      <div class="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/74">
        <div class="font-semibold uppercase tracking-wide text-[9px] text-cyan-100/80">Why It Governs</div>
        <div class="mt-1">Current decision is driven by the lowest available margin and the active approval state.</div>
      </div>
      <div class="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/74">
        <div class="font-semibold uppercase tracking-wide text-[9px] text-cyan-100/80">Workflow Focus</div>
        <div class="mt-1">{results.review.decision === 'pass' ? 'Confirm export / report and capture the selected route.' : 'Use the focused warnings and compare strips below to decide the next geometry or process move.'}</div>
      </div>
      <div class="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/74">
        <div class="font-semibold uppercase tracking-wide text-[9px] text-cyan-100/80">Input Basis</div>
        <div class="mt-1">
          {#if measuredLines.length}
            {measuredLines.join(' • ')}
          {:else if results.measuredPartSummary.applied}
            As-measured inspection data is active outside the fit-defining dimensions.
          {:else}
            Nominal/design-intent geometry governs this case.
          {/if}
        </div>
      </div>
    </div>
    <div class="rounded-2xl border border-cyan-300/16 bg-gradient-to-br from-cyan-500/[0.10] to-slate-900/30 px-3 py-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-100/82">Fit Envelope</div>
        <div class="text-[10px] text-white/58">Min / Max envelope in {lengthUnit()}</div>
      </div>
      <div class="mt-3 grid grid-cols-1 gap-2 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] xl:items-stretch">
        <div class="rounded-2xl border border-cyan-300/18 bg-slate-950/55 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div class="flex items-center justify-between gap-2">
            <div class="text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-100/76">Requested</div>
            <Badge variant="outline" class="border-cyan-300/25 text-[9px] text-cyan-100/78">Target</Badge>
          </div>
          <div class="mt-2 text-lg font-semibold text-cyan-100">
            {fmtMinMax(results.tolerance.interferenceTarget.lower, results.tolerance.interferenceTarget.upper)}
          </div>
          <div class="mt-1 text-[10px] text-white/56">requested containment window</div>
        </div>
        <div class="hidden xl:flex items-center justify-center px-1 text-cyan-200/40" aria-hidden="true">
          <div class="rounded-full border border-cyan-300/16 bg-cyan-500/[0.06] px-2 py-1 text-[10px] font-semibold tracking-[0.14em]">→</div>
        </div>
        <div class="rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div class="flex items-center justify-between gap-2">
            <div class="text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-100/76">Achieved</div>
            <Badge
              variant="outline"
              class={achievedWithinTarget ? 'border-emerald-300/28 text-[9px] text-emerald-200' : 'border-amber-300/28 text-[9px] text-amber-200'}
            >
              {achievedWithinTarget ? 'Contained' : 'Shifted'}
            </Badge>
          </div>
          <div class={`mt-2 text-lg font-semibold ${achievedWithinTarget ? 'text-emerald-200' : 'text-amber-200'}`}>
            {fmtMinMax(results.tolerance.achievedInterference.lower, results.tolerance.achievedInterference.upper)}
          </div>
          <div class="mt-1 text-[10px] text-white/56">raw achieved fit before thermal correction</div>
        </div>
        <div class="hidden xl:flex items-center justify-center px-1 text-cyan-200/40" aria-hidden="true">
          <div class="rounded-full border border-cyan-300/16 bg-cyan-500/[0.06] px-2 py-1 text-[10px] font-semibold tracking-[0.14em]">→</div>
        </div>
        <div class="rounded-2xl border border-emerald-300/14 bg-emerald-500/[0.06] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div class="flex items-center justify-between gap-2">
            <div class="text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-100/76">Settled</div>
            <Badge
              variant="outline"
              class={effectiveWithinTarget ? 'border-emerald-300/28 text-[9px] text-emerald-200' : 'border-amber-300/28 text-[9px] text-amber-200'}
            >
              {results.lame.deltaThermal === 0 ? 'Current State' : 'Thermal-Corrected'}
            </Badge>
          </div>
          <div class={`mt-2 text-lg font-semibold ${results.physics.deltaEffective > 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
            {fmtMinMax(effectiveInterference.lower, effectiveInterference.upper)}
          </div>
          <div class="mt-1 text-[10px] text-white/56">effective fit after current thermal correction</div>
        </div>
      </div>
      <div class="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
        <div class="rounded-xl border border-white/10 bg-black/24 px-3 py-2">
          <div class="text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-100/76">Bushing OD Band</div>
          <div class={`mt-1 text-sm font-semibold ${results.tolerance.status !== 'infeasible' ? 'text-slate-100' : 'text-rose-200'}`}>
            {fmtMinMax(results.tolerance.odBushing.lower, results.tolerance.odBushing.upper)}
          </div>
          <div class="mt-1 text-[10px] text-white/54">solved OD required to hit the fit window</div>
        </div>
        <div class="rounded-xl border border-white/10 bg-black/24 px-3 py-2">
          <div class="text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-100/76">Fit State</div>
          <div class="mt-1 flex flex-wrap gap-1">
            <Badge
              variant="outline"
              class={results.tolerance.status === 'infeasible'
                ? 'border-rose-300/28 text-rose-200'
                : results.tolerance.status === 'clamped'
                  ? 'border-amber-300/28 text-amber-200'
                  : 'border-emerald-300/28 text-emerald-200'}
            >
              {results.tolerance.status.toUpperCase()}
            </Badge>
            <Badge
              variant="outline"
              class={results.physics.deltaEffective > 0 ? 'border-emerald-300/28 text-emerald-200' : 'border-rose-300/28 text-rose-200'}
            >
              {results.physics.deltaEffective > 0 ? 'INTERFERENCE' : 'CLEARANCE'}
            </Badge>
          </div>
          <div class="mt-2 text-[10px] text-white/54">
            {results.tolerance.status === 'ok'
              ? 'Target, achieved, and settled states are aligned for the current case.'
              : results.tolerance.status === 'clamped'
                ? 'Solver clamped the OD band to stay as close as possible to the requested fit window.'
                : 'Current geometry cannot realize the requested fit window.'}
          </div>
        </div>
      </div>
      <div class="mt-3 rounded-2xl border border-white/10 bg-slate-950/38 px-3 py-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-100/82">Defining Geometry</div>
          <div class="flex flex-wrap gap-1">
            <Badge variant="outline" class="border-indigo-300/25 text-[9px] text-indigo-100/80">{outerProfileLabel}</Badge>
            <Badge variant="outline" class="border-indigo-300/25 text-[9px] text-indigo-100/80">{innerProfileLabel}</Badge>
          </div>
        </div>
        <div class="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2 2xl:grid-cols-3">
          {#each geometryDetails as detail}
            <button
              type="button"
              class={detail.tone === 'emerald'
                ? 'rounded-xl border border-emerald-300/14 bg-emerald-500/[0.04] px-3 py-2 text-left transition-colors hover:bg-emerald-500/[0.09]'
                : detail.tone === 'indigo'
                  ? 'rounded-xl border border-indigo-300/14 bg-indigo-500/[0.04] px-3 py-2 text-left transition-colors hover:bg-indigo-500/[0.09]'
                  : 'rounded-xl border border-cyan-300/14 bg-cyan-500/[0.04] px-3 py-2 text-left transition-colors hover:bg-cyan-500/[0.09]'}
              onmouseenter={() => emitSketchHover(detail.target)}
              onmouseleave={() => emitSketchHover(null)}
              onfocus={() => emitSketchHover(detail.target)}
              onblur={() => emitSketchHover(null)}
              onclick={() => emitSketchSelect(detail.target)}
            >
              <div class="text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-100/76">{detail.label}</div>
              <div class="mt-1 text-sm font-semibold text-slate-100">{detail.rangeText}{#if detail.showUnit !== false} <span class="text-white/50">{lengthUnit()}</span>{/if}</div>
              <div class="mt-1 text-[10px] text-white/54">{detail.note}</div>
            </button>
          {/each}
        </div>
      </div>
    </div>
  </CardContent>
</Card>
