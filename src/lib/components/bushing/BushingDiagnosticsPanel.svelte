<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, CardContent } from '$lib/components/ui';
  import type { BushingInputs, BushingOutput } from '$lib/core/bushing';
  import { buildBushingWarningEntries } from './bushingWarningGuidance';
  import { normalizeOrder, reorderList } from './BushingCardLayoutController';
  import { loadNestedDiagnosticsLayout, persistNestedDiagnosticsLayout } from './BushingLayoutPersistence';

  // Svelte 5: Convert props to $props()
  let {
    form = $bindable(),
    results,
    dndEnabled = true,
    uxMode = 'guided'
  }: {
    form: BushingInputs;
    results: BushingOutput;
    dndEnabled?: boolean;
    uxMode?: 'guided' | 'advanced';
  } = $props();
  
  // Svelte 5: Convert local state to $state
  let infoDialog = $state<'diagnostics' | 'edge' | 'wall' | null>(null);
  let activeWarningIndex = $state(0);

  const DEFAULT_DIAG_ORDER = ['edge', 'wall', 'warnings'] as const;

  const fmt = (n: number | null | undefined, d = 4) => (!Number.isFinite(Number(n)) ? '---' : Number(n).toFixed(d));
  
  // Svelte 5: Convert reactive statements to $derived
  let edgeFailed = $derived(results.warningCodes.some((w) => w.code.includes('EDGE_DISTANCE')));
  let wallFailed = $derived(results.warningCodes.some((w) => w.code.includes('WALL_BELOW_MIN')));
  let hasWarnings = $derived(Boolean(results.warnings?.length));
  let activeDiagIds = $derived((hasWarnings ? [...DEFAULT_DIAG_ORDER] : DEFAULT_DIAG_ORDER.filter((v) => v !== 'warnings')) as string[]);

  // Svelte 5: Convert state to $state
  let diagOrder = $state<string[]>([...DEFAULT_DIAG_ORDER]);
  
  // Svelte 5: Convert reactive statement to $derived
  let diagLaneItems = $derived(diagOrder.map((id) => ({ id })));

  if (typeof window !== 'undefined') diagOrder = loadNestedDiagnosticsLayout([...DEFAULT_DIAG_ORDER]);

  // Svelte 5: Watch for changes to activeDiagIds and normalize diagOrder
  $effect(() => {
    const normalized = normalizeOrder(diagOrder, activeDiagIds);
    if (JSON.stringify(diagOrder) !== JSON.stringify(normalized)) {
      diagOrder = normalized;
    }
  });
  
  // Svelte 5: Persist layout changes
  $effect(() => {
    if (typeof window !== 'undefined') {
      persistNestedDiagnosticsLayout(diagOrder);
    }
  });

  onMount(() => {
    if (typeof window === 'undefined') return;
    (window as any).__SCD_BUSHING_TEST_REORDER_DIAG__ = (sourceId: string, targetId: string) => {
      diagOrder = normalizeOrder(reorderList(diagOrder, sourceId, targetId), activeDiagIds);
    };
  });

  function focusSection(id: string) {
    if (!id || id.trim() === '') return; // Guard against empty strings
    const fallbackSelector =
      id === 'bushing-geometry-card'
        ? "[data-dnd-card='geometry'], #bushing-geometry-card"
        : id === 'bushing-profile-card'
          ? "[data-dnd-card='profile'], #bushing-profile-card"
          : id === 'bushing-process-card'
            ? "[data-dnd-card='process'], #bushing-process-card"
            : `#${id}`;
    const el = document.querySelector<HTMLElement>(fallbackSelector);
    if (!el) return;
    let parent = el.parentElement;
    while (parent) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
      parent = parent.parentElement;
    }
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      el.classList.add('ring-2', 'ring-amber-300/80');
      setTimeout(() => el.classList.remove('ring-2', 'ring-amber-300/80'), 1500);
    });
    infoDialog = null;
  }
  
  function handleInfoClick(e: MouseEvent, type: 'diagnostics' | 'edge' | 'wall') {
    e.stopPropagation();
    infoDialog = type;
  }

  const updateForm = (patch: Partial<BushingInputs>) => {
    form = { ...form, ...patch };
  };
  const updateInterferencePolicy = (patch: Partial<NonNullable<BushingInputs['interferencePolicy']>>) => {
    form = { ...form, interferencePolicy: { ...(form.interferencePolicy ?? {}), ...patch } };
  };
  const updateBoreCapability = (patch: Partial<NonNullable<BushingInputs['boreCapability']>>) => {
    form = { ...form, boreCapability: { ...(form.boreCapability ?? {}), ...patch } };
  };

  let warningEntries = $derived(
    buildBushingWarningEntries(form, results, {
      updateForm,
      updateInterferencePolicy,
      updateBoreCapability
    })
  );
  let selectedWarningEntry = $derived(warningEntries[Math.min(activeWarningIndex, Math.max(warningEntries.length - 1, 0))] ?? null);

  let warningActions = $derived.by(() => {
    const actions = new Map<string, { label: string; target: string }>();
    for (const warning of results.warningCodes) {
      if (warning.code.includes('EDGE_DISTANCE')) actions.set('geometry', { label: 'Jump to Geometry', target: 'bushing-geometry-card' });
      if (warning.code.includes('WALL_BELOW_MIN')) actions.set('profile', { label: 'Jump to Profile', target: 'bushing-profile-card' });
      if (warning.code.includes('INTERFERENCE') || warning.code.includes('TOLERANCE')) {
        actions.set('process', { label: 'Jump to Process', target: 'bushing-process-card' });
      }
    }
    return [...actions.values()];
  });
</script>

<div class="space-y-4">
  <div class="rounded-xl border border-cyan-300/20 bg-cyan-500/8 p-3 text-xs text-cyan-100/85 bushing-pop-card bushing-depth-1">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="font-semibold uppercase tracking-wide text-[10px]">Diagnostic Ladder</div>
      <div class="text-[10px] text-white/60">{results.warnings?.length ?? 0} warning(s)</div>
    </div>
    <div class="mt-2 space-y-1">
      <div>Level 1: {hasWarnings ? 'Warnings present' : 'No active warnings'}</div>
      <div>Level 2: Governing check is <span class="font-semibold text-white/85">{results.governing.name}</span></div>
      {#if uxMode === 'guided'}
        <div>Level 3: Open detailed diagnostics only if the governing reason is unclear.</div>
      {/if}
    </div>
  </div>
  <details id="bushing-diagnostics-card" class="glass-card rounded-xl border border-white/10 p-3 bushing-pop-card bushing-depth-2 bushing-results-card" open>
    <summary class="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-indigo-200/95">
      Detailed Diagnostics
      <button
        type="button"
        class="ml-2 rounded border border-cyan-300/35 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-100 hover:bg-cyan-500/20"
        onclick={(e) => handleInfoClick(e, 'diagnostics')}>
        ?
      </button>
    </summary>
    <div class="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
      {#each diagOrder as item}
        {#if item === 'edge'}
        <div class="rounded-md" data-diag-card="edge">
          <div
            class="cursor-pointer"
            role="button"
            tabindex="0"
            onclick={() => (infoDialog = 'edge')}
            onkeydown={(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (infoDialog = 'edge')}>
            <Card
              id="bushing-edge-distance-card"
              class={`bushing-results-card bushing-pop-card bushing-depth-1 ${edgeFailed ? 'border border-amber-300/55' : ''}`}>
              <CardContent class="pt-4 text-sm space-y-2">
                <div class="text-[10px] uppercase tracking-wide text-indigo-200/95 font-bold">Edge Distance</div>
                <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Actual e/D</span><span class="font-mono text-slate-100 font-semibold">{fmt(results.edgeDistance.edActual)}</span></div>
                <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Min (Seq)</span><span class="font-mono text-slate-100 font-semibold">{fmt(results.edgeDistance.edMinSequence)}</span></div>
                <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Min (Strength)</span><span class="font-mono text-slate-100 font-semibold">{fmt(results.edgeDistance.edMinStrength)}</span></div>
                <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Mode</span><span class="font-mono text-slate-100 font-semibold">{results.edgeDistance.governing}</span></div>
                <div class="pt-1">
                  <button class="rounded border border-cyan-300/35 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-100 hover:bg-cyan-500/20" onclick={(e) => { e.stopPropagation(); focusSection('bushing-geometry-card'); }}>
                    Jump to Geometry
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      {:else if item === 'wall'}
        <div class="rounded-md" data-diag-card="wall">
          <div
            class="cursor-pointer"
            role="button"
            tabindex="0"
            onclick={() => (infoDialog = 'wall')}
            onkeydown={(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (infoDialog = 'wall')}>
            <Card
              id="bushing-wall-thickness-card"
              class={`bushing-results-card bushing-pop-card bushing-depth-1 ${wallFailed ? 'border border-amber-300/55' : ''}`}>
              <CardContent class="pt-4 text-sm space-y-2">
                <div class="text-[10px] uppercase tracking-wide text-indigo-200/95 font-bold">Wall Thickness</div>
                <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Straight</span><span class="font-mono text-slate-100 font-semibold">{fmt(results.sleeveWall)}</span></div>
                <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Neck</span><span class="font-mono text-slate-100 font-semibold">{fmt(results.neckWall)}</span></div>
                <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Governing</span><span class="font-mono text-slate-100 font-semibold">{results.governing.name}</span></div>
                <div class="pt-1">
                  <button class="rounded border border-cyan-300/35 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-100 hover:bg-cyan-500/20" onclick={(e) => { e.stopPropagation(); focusSection('bushing-profile-card'); }}>
                    Jump to Profile
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      {:else if item === 'warnings' && results.warnings?.length}
        <div class="rounded-md md:col-span-2" data-diag-card="warnings">
          <Card id="bushing-warnings-card" class="border border-amber-300/55 bg-amber-500/15 bushing-pop-card bushing-depth-1">
            <CardContent class="pt-4 text-sm space-y-2">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="text-[10px] font-bold uppercase text-amber-200">Warnings</div>
                <div class="flex flex-wrap gap-2">
                  {#each warningActions as action}
                    <button class="rounded border border-amber-200/35 bg-black/20 px-2 py-1 text-[10px] text-amber-50 hover:bg-black/35" onclick={() => focusSection(action.target)}>
                      {action.label}
                    </button>
                  {/each}
                </div>
              </div>
              <div class="rounded-md border border-amber-200/20 bg-black/20 px-2 py-1 text-[11px] text-amber-50/90">
                Review the plain-language warnings first, then jump directly to the source section that controls the outcome.
              </div>
              {#each results.warnings as w}
                <div class="flex items-start gap-2 rounded-md border border-amber-200/35 bg-black/35 px-2 py-1.5 bushing-pop-sub bushing-depth-0 text-amber-50">
                  <span class="text-amber-200">⚠</span><span class="font-medium">{w}</span>
                </div>
              {/each}
              {#if warningEntries.length}
                <div class="mt-3 rounded-md border border-cyan-300/20 bg-cyan-500/10 p-3 text-[11px] text-cyan-100/88">
                  <div class="font-semibold uppercase tracking-wide text-[10px] text-cyan-100">Direct Remediation</div>
                  <div class="mt-2 flex flex-col gap-2">
                    {#each warningEntries as entry, index}
                      <button
                        type="button"
                        class={`w-full rounded-md border px-2 py-1.5 text-left transition-colors ${
                          activeWarningIndex === index
                            ? 'border-cyan-300/35 bg-cyan-500/12 text-white'
                            : 'border-white/10 bg-black/20 text-white/80 hover:border-white/20 hover:bg-white/[0.04]'
                        }`}
                        onclick={() => (activeWarningIndex = index)}>
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
                  </div>
                  {#if selectedWarningEntry}
                    <div class="mt-3 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/80">
                      <div class="font-semibold uppercase tracking-wide text-[10px] text-white/60">Possible Solutions</div>
                      <div class="mt-1">{selectedWarningEntry.friendly.suggestion}</div>
                      <div class="mt-2 flex flex-wrap gap-2">
                        {#each selectedWarningEntry.actions as action}
                          <button
                            type="button"
                            class="rounded border border-cyan-300/30 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-100 hover:bg-cyan-500/20"
                            onclick={() => {
                              action.run();
                              if (action.target) focusSection(action.target);
                            }}>
                            {action.label}
                          </button>
                        {/each}
                        {#if selectedWarningEntry.actions.length === 0 && selectedWarningEntry.quickFix}
                          <div class="rounded border border-white/10 bg-black/25 px-2 py-1 text-[10px] text-white/70">
                            Suggested direction: {selectedWarningEntry.quickFix}
                          </div>
                        {/if}
                      </div>
                    </div>
                  {/if}
                </div>
              {/if}
            </CardContent>
          </Card>
        </div>
      {/if}
      {/each}
    </div>
  </details>
</div>

{#if infoDialog}
  <div class="fixed inset-0 z-[120] grid place-items-center p-4">
    <button
      type="button"
      aria-label="Close dialog backdrop"
      class="absolute inset-0 bg-black/65"
      onclick={() => (infoDialog = null)}>
    </button>
    <div class="relative z-10 w-full max-w-[760px]">
    <Card class="border-cyan-300/35 bg-slate-950/95 text-slate-100 shadow-2xl">
      <CardContent class="space-y-3 pt-5 text-sm">
        {#if infoDialog === 'diagnostics'}
          <div class="text-sm font-semibold text-cyan-100">Detailed Diagnostics</div>
          <div class="text-white/80">Detailed Diagnostics is the rule-resolution layer for bushing acceptance. It decomposes the global pass/fail decision into geometric sufficiency checks that often govern before material yield.</div>
          <div class="text-white/80">These checks are evaluated as explicit margins and compared against zero. The solver selects the lowest margin as governing, which becomes the displayed global controlling condition.</div>
          <div class="rounded-md border border-cyan-300/25 bg-cyan-500/5 p-2 text-[12px] text-cyan-100/95">Current controlling check: <span class="font-mono">{results.governing.name}</span></div>
        {:else if infoDialog === 'edge'}
          <div class="text-sm font-semibold text-cyan-100">Edge Distance</div>
          <div class="text-white/80">`e/D` is a nondimensional edge-distance adequacy ratio. `Actual e/D` is your configuration ratio; minimum requirements are generated from two mechanisms: sequencing robustness and local strength demand.</div>
          <div class="text-white/80">`Sequencing` means the installation/load-transfer progression stays stable as the joint is assembled and loaded in real service order. Practically, enough ligament is required so local deformation does not prematurely redirect or spike load path before full seating and bearing distribution are established.</div>
          <div class="text-white/80">`Min (Seq)` protects process/installation sequencing behavior and load-path development using the dedicated failure-plane angle referenced from the applied load direction. `Min (Strength)` protects against insufficient ligament under the selected loading assumptions. Both are evaluated independently; the larger required value is controlling for acceptance.</div>
          <div class="text-white/80">When `Actual e/D` is below the controlling minimum, edge distance governs regardless of positive material-yield margins elsewhere.</div>
          {#if edgeFailed}
            <div class="rounded-md border border-amber-300/50 bg-amber-500/15 p-2 text-[12px] text-amber-100">
              Edge distance checks are currently failing.
              <button class="ml-1 underline underline-offset-2" onclick={() => focusSection('bushing-geometry-card')}>Jump to Geometry</button>
            </div>
          {/if}
        {:else}
          <div class="text-sm font-semibold text-cyan-100">Wall Thickness</div>
          <div class="text-white/80">Wall thickness checks enforce geometric manufacturability and local structural sufficiency at critical cross-sections.</div>
          <div class="text-white/80">`Straight` is the nominal sleeve wall section, while `Neck` is the reduced section near countersink/flange transitions. Neck is typically more critical due to geometric concentration and reduced ligament.</div>
          <div class="text-white/80">If either section falls below its required minimum, wall-thickness controls the governing margin even when pressure/yield margins remain positive.</div>
          {#if wallFailed}
            <div class="rounded-md border border-amber-300/50 bg-amber-500/15 p-2 text-[12px] text-amber-100">
              Wall checks are currently failing.
              <button class="ml-1 underline underline-offset-2" onclick={() => focusSection('bushing-profile-card')}>Jump to Profile + Settings</button>
            </div>
          {/if}
        {/if}
        <div class="pt-2">
          <button class="rounded-md border border-cyan-300/40 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-500/20" onclick={() => (infoDialog = null)}>
            Close
          </button>
        </div>
      </CardContent>
    </Card>
    </div>
  </div>
{/if}
