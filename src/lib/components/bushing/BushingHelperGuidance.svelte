<script lang="ts">
  import type { BushingInputs, BushingOutput } from '$lib/core/bushing';
  import { buildBushingWarningEntries } from './bushingWarningGuidance';

  let { form, results, uxMode = 'guided' }: { form: BushingInputs; results: BushingOutput; uxMode?: 'guided' | 'advanced' } = $props();
  let activeWarningIndex = $state(0);

  const scrollTo = (id: string) => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-cyan-300/80');
    setTimeout(() => el.classList.remove('ring-2', 'ring-cyan-300/80'), 1400);
  };
  const updateForm = (patch: Partial<BushingInputs>) => {
    form = { ...form, ...patch };
  };
  const updateInterferencePolicy = (patch: Partial<NonNullable<BushingInputs['interferencePolicy']>>) => {
    form = { ...form, interferencePolicy: { ...(form.interferencePolicy ?? {}), ...patch } };
  };
  const updateBoreCapability = (patch: Partial<NonNullable<BushingInputs['boreCapability']>>) => {
    form = { ...form, boreCapability: { ...(form.boreCapability ?? {}), ...patch } };
  };
  const applyAndFocus = (target: string | undefined, run: () => void) => () => {
    run();
    if (target) scrollTo(target);
  };

  let warningEntries = $derived.by(() =>
    buildBushingWarningEntries(form, results, {
      updateForm,
      updateInterferencePolicy,
      updateBoreCapability
    })
  );

  let guidance = $derived.by(() => {
    if (warningEntries.length) {
      return {
        tone: 'warning',
        title: 'Attention Required',
        lines: []
      };
    }
    if (uxMode === 'guided' && results.tolerance.status === 'infeasible') {
      return {
        tone: 'warning',
        title: 'Revisit Fit Intent',
        lines: [
          'The current bore and interference bands cannot both be satisfied.',
          'Narrow the bore tolerance or widen the interference target before continuing.'
        ]
      };
    }
    if (uxMode === 'guided' && results.tolerance.status === 'clamped') {
      return {
        tone: 'info',
        title: 'Review Normalized Fit',
        lines: [
          'The solver clamped the OD nominal to keep the fit inside the requested window.',
          'Confirm the resulting OD band is acceptable before changing advanced process controls.'
        ]
      };
    }
    if (form.idType === 'countersink' || form.bushingType === 'countersink') {
      return {
        tone: 'info',
        title: 'Countersink Active',
        lines: ['Check wall thickness and neck margin after changing countersink depth/angle.', 'Use Results details to confirm the governing check.']
      };
    }
    return {
      tone: 'ok',
      title: uxMode === 'guided' ? 'Next Step' : 'Core Flow',
      lines:
        uxMode === 'guided'
          ? [
              'Set units and materials first, then define bore and interference intent.',
              'Review the fit summary before opening advanced process overrides.'
            ]
          : ['Set Setup and Geometry first, then choose profile, then review results.', 'Use Drafting/Export once governing margin is positive.']
    };
  });
</script>

<div
  id="bushing-attention-card"
  class={`glass-card bushing-pop-card bushing-depth-1 rounded-xl border p-3 text-xs ${guidance.tone === 'warning' ? 'border-amber-400/30 bg-amber-500/10' : 'border-teal-400/25 bg-teal-500/10'}`}>
  <div class="flex items-center justify-between gap-2">
    <div class="font-semibold uppercase tracking-wide text-[10px]">{guidance.title}</div>
    <div class="text-[10px] text-white/60">Inline Guidance</div>
  </div>
  <div class="mt-2 space-y-1.5">
    {#if warningEntries.length}
      {#each warningEntries as entry, index}
        <button
          type="button"
          class={`w-full rounded-md border px-2 py-1.5 text-left transition-colors ${
            activeWarningIndex === index
              ? 'border-amber-300/35 bg-amber-500/12 text-white'
              : 'border-white/10 bg-black/20 text-white/80 hover:border-white/20 hover:bg-white/[0.04]'
          }`}
          onclick={() => (activeWarningIndex = index)}
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="font-medium">{entry.friendly.title}</div>
              <div class="mt-1 text-[11px] text-white/70">{entry.friendly.description}</div>
            </div>
            <div class="shrink-0 text-[10px] uppercase tracking-[0.16em] text-white/45">
              {entry.warning.severity}
            </div>
          </div>
        </button>
      {/each}
      {@const selected = warningEntries[Math.min(activeWarningIndex, warningEntries.length - 1)]}
      {#if selected}
        <div class="rounded-md border border-cyan-300/20 bg-cyan-500/10 px-3 py-2 text-[11px] text-cyan-100/88">
          <div class="font-semibold uppercase tracking-wide text-[10px] text-cyan-100">Possible Solutions</div>
          <div class="mt-1 text-white/78">{selected.friendly.suggestion}</div>
          <div class="mt-2 flex flex-wrap gap-2">
            {#each selected.actions as action}
              <button
                type="button"
                class="rounded-md border border-cyan-300/30 bg-black/20 px-2 py-1 text-[10px] text-cyan-100 transition-colors hover:bg-cyan-500/10"
                onclick={applyAndFocus(action.target, action.run)}
              >
                {action.label}
              </button>
            {/each}
            {#if selected.actions.length === 0 && selected.quickFix}
              <div class="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-white/75">
                Suggested direction: {selected.quickFix}
              </div>
            {/if}
          </div>
          <div class="mt-2 rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-white/70">
            Governing check: {results.governing.name} (margin {Number(results.governing.margin).toFixed(3)})
          </div>
        </div>
      {/if}
    {:else}
      {#each guidance.lines as line}
        <div class="rounded-md border border-white/10 bg-black/20 px-2 py-1.5 bushing-pop-sub bushing-depth-0 text-white/80">{line}</div>
      {/each}
    {/if}
  </div>
</div>
