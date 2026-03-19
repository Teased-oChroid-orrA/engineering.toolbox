<script lang="ts">
  import type { BushingInputs, BushingOutput } from '$lib/core/bushing';

  let { form, results }: { form: BushingInputs; results: BushingOutput } = $props();

  const EPS = 1e-9;
  const fmt = (n: number | null | undefined, d = 4) => (!Number.isFinite(Number(n)) ? '---' : Number(n).toFixed(d));

  function rangeText(range: { lower: number; upper: number }, digits = 4) {
    return `${fmt(range.lower, digits)} to ${fmt(range.upper, digits)}`;
  }

  function makeInputRange(
    mode: 'limits' | 'nominal_tol' | undefined,
    nominal: number | undefined,
    plus: number | undefined,
    minus: number | undefined,
    lower: number | undefined,
    upper: number | undefined
  ) {
    if (mode === 'limits') {
      const lo = Number(lower ?? nominal ?? 0);
      const hi = Number(upper ?? nominal ?? lo);
      return { lower: Math.min(lo, hi), upper: Math.max(lo, hi) };
    }
    const nom = Number(nominal ?? 0);
    const tolPlus = Math.max(0, Number(plus ?? 0));
    const tolMinus = Math.max(0, Number(minus ?? 0));
    return { lower: nom - tolMinus, upper: nom + tolPlus };
  }

  function changed(a: { lower: number; upper: number }, b: { lower: number; upper: number }) {
    return Math.abs(a.lower - b.lower) > EPS || Math.abs(a.upper - b.upper) > EPS;
  }

  function reasonLabel(code: string) {
    const labels: Record<string, string> = {
      AUTO_ADJUST_BORE_WIDTH: 'Bore tolerance width was narrowed to preserve containment.',
      BLOCKED_BORE_LOCKED: 'Bore is locked, so the solver could not narrow the bore range.',
      BLOCKED_CAPABILITY_FLOOR: 'Process capability floor prevented the requested narrow bore range.',
      BLOCKED_INFEASIBLE_WIDTH: 'Requested width combination cannot satisfy full-range containment.',
      BLOCKED_NOMINAL_SHIFT_NO_EFFECT: 'Nominal shift was allowed, but width mismatch still prevents containment.',
      CONTAINMENT_SATISFIED: 'Final applied ranges satisfy the requested containment window.',
      ENFORCEMENT_DISABLED: 'Strict containment enforcement is disabled.'
    };
    return labels[code] ?? code;
  }

  let requestedBore = $derived(
    makeInputRange(
      form.boreTolMode,
      form.boreNominal ?? form.boreDia,
      form.boreTolPlus,
      form.boreTolMinus,
      form.boreLower,
      form.boreUpper
    )
  );
  let requestedTarget = $derived(
    makeInputRange(
      form.interferenceTolMode,
      form.interferenceNominal ?? form.interference,
      form.interferenceTolPlus,
      form.interferenceTolMinus,
      form.interferenceLower,
      form.interferenceUpper
    )
  );
  let appliedBore = $derived(results.tolerance.bore);
  let appliedTarget = $derived(results.tolerance.interferenceTarget);
  let achievedTarget = $derived(results.tolerance.achievedInterference);
  let boreChanged = $derived(changed(requestedBore, appliedBore));
  let targetAdjusted = $derived(changed(requestedTarget, appliedTarget));
  let achievedDiffers = $derived(changed(requestedTarget, achievedTarget));
  let showExpandedDeck = $derived(
    results.tolerance.status !== 'ok' ||
    results.tolerance.enforcement.blocked ||
    boreChanged ||
    targetAdjusted ||
    achievedDiffers ||
    results.tolerance.notes.length > 0
  );
  let showCompactTrace = $derived(results.tolerance.enforcement.enabled && !showExpandedDeck);

  let deckRows = $derived(
    [
      {
        label: 'Requested bore range',
        requested: rangeText(requestedBore),
        applied: rangeText(appliedBore),
        changed: boreChanged,
        detail: boreChanged ? 'Solver narrowed or shifted the bore range to maintain containment.' : 'Bore range carried through unchanged.'
      },
      {
        label: 'Requested interference window',
        requested: rangeText(requestedTarget),
        applied: rangeText(appliedTarget),
        changed: targetAdjusted,
        detail: targetAdjusted ? 'Requested target was adjusted before solving.' : 'Requested containment target.'
      },
      {
        label: 'Solved interference window',
        requested: rangeText(requestedTarget),
        applied: rangeText(achievedTarget),
        changed: achievedDiffers,
        detail: achievedDiffers ? 'Actual solved range differs from what was requested.' : 'Solved range matches the requested target.'
      },
      {
        label: 'Derived OD range',
        requested: 'Derived from bore + target',
        applied: rangeText(results.tolerance.odBushing),
        changed: true,
        detail: 'Final OD range computed from the applied bore and interference limits.'
      }
    ]
  );

  let deckTitle = $derived.by(() => {
    if (results.tolerance.enforcement.blocked) return 'Constraint Resolution Deck · Request Could Not Be Met';
    if (results.tolerance.status === 'clamped' || boreChanged || targetAdjusted || achievedDiffers) {
      return 'Constraint Resolution Deck · Solver Adjusted Inputs';
    }
    return 'Constraint Resolution Deck · Requested and Solved Values';
  });
</script>

{#if showCompactTrace}
  <div class="mt-3 rounded-xl border border-emerald-300/18 bg-emerald-500/8 px-3 py-2 text-[11px] text-emerald-100/88">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <div class="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/90">Constraint Resolution</div>
        <div class="mt-1 text-white/72">
          No solver corrections were required. The requested min/max limits already satisfy the containment rules.
        </div>
      </div>
      <div class="rounded-full border border-emerald-300/35 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-emerald-100">
        No correction
      </div>
    </div>
  </div>
{:else if showExpandedDeck}
  <div class="mt-3 rounded-xl border border-cyan-300/18 bg-cyan-500/8 p-3 text-[11px] text-white/80">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <div class="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200/90">{deckTitle}</div>
        <div class="mt-1 text-white/75">
          Shows the requested min/max ranges, the exact ranges the solver used, and why any limit had to move.
        </div>
      </div>
      <div class={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${
        results.tolerance.enforcement.blocked
          ? 'border-rose-300/40 text-rose-200'
          : results.tolerance.status === 'clamped' || boreChanged || targetAdjusted || achievedDiffers
            ? 'border-amber-300/40 text-amber-200'
            : 'border-emerald-300/40 text-emerald-200'
      }`}>
        {#if results.tolerance.enforcement.blocked}
          Blocked
        {:else if results.tolerance.status === 'clamped' || boreChanged || targetAdjusted || achievedDiffers}
          Adjusted
        {:else}
          Traced
        {/if}
      </div>
    </div>

    <div class="mt-3 overflow-hidden rounded-lg border border-white/10 bg-black/20">
      <div class="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 border-b border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white/45">
        <div>Measure</div>
        <div>Requested</div>
        <div>Applied Now</div>
      </div>
      <div class="divide-y divide-white/8">
        {#each deckRows as row}
          <div class="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 px-3 py-2">
            <div class="min-w-0">
              <div class="font-medium text-white/90">{row.label}</div>
              <div class="mt-0.5 text-[10px] text-white/55">{row.detail}</div>
            </div>
            <div class="font-mono tabular-nums text-cyan-100">{row.requested}</div>
            <div class={`font-mono tabular-nums ${row.changed ? 'text-amber-200' : 'text-emerald-200'}`}>{row.applied}</div>
          </div>
        {/each}
      </div>
    </div>

    <div class="mt-3 grid gap-3 xl:grid-cols-2">
      <div class="rounded-lg border border-white/10 bg-black/20 p-3">
        <div class="text-[10px] uppercase tracking-[0.16em] text-white/45">Why It Changed</div>
        <div class="mt-2 space-y-1">
          {#if results.tolerance.enforcement.blocked}
            <div class="rounded-md border border-rose-300/20 bg-rose-500/10 px-2 py-1 text-[10px] text-rose-100/90">
              The requested limits cannot all be satisfied simultaneously. The solver preserved physical feasibility and reports the closest valid range above.
            </div>
          {/if}
          {#each results.tolerance.enforcement.reasonCodes as code}
            <div class="rounded-md border border-white/8 bg-white/[0.03] px-2 py-1 text-[10px] text-white/72">
              {reasonLabel(code)}
            </div>
          {/each}
          {#if results.tolerance.enforcement.reasonCodes.length === 0}
            <div class="text-[10px] text-white/55">No enforcement reason codes were required.</div>
          {/if}
        </div>
      </div>

      <div class="rounded-lg border border-white/10 bg-black/20 p-3">
        <div class="text-[10px] uppercase tracking-[0.16em] text-white/45">Enforcement Metrics</div>
        <div class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono tabular-nums text-[10px]">
          <div class="text-white/55">Required bore width</div>
          <div class="text-right text-white/85">{fmt(results.tolerance.enforcement.requiredBoreTolWidth)}</div>
          <div class="text-white/55">Available bore width</div>
          <div class="text-right text-white/85">{fmt(results.tolerance.enforcement.availableBoreTolWidth)}</div>
          <div class="text-white/55">Target window width</div>
          <div class="text-right text-white/85">{fmt(results.tolerance.enforcement.targetInterferenceWidth)}</div>
          <div class="text-white/55">Lower violation</div>
          <div class="text-right text-white/85">{fmt(results.tolerance.enforcement.lowerViolation)}</div>
          <div class="text-white/55">Upper violation</div>
          <div class="text-right text-white/85">{fmt(results.tolerance.enforcement.upperViolation)}</div>
          <div class="text-white/55">Nominal bore shift</div>
          <div class="text-right text-white/85">{fmt(results.tolerance.enforcement.boreNominalShiftApplied)}</div>
        </div>
      </div>
    </div>

    {#if results.tolerance.notes.length > 0}
      <div class="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
        <div class="text-[10px] uppercase tracking-[0.16em] text-white/45">Solver Notes</div>
        <div class="mt-2 space-y-1">
          {#each results.tolerance.notes as note}
            <div class="text-[10px] text-white/72">{note}</div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}
