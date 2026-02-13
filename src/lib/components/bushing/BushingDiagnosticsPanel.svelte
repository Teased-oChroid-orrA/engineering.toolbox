<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, CardContent } from '$lib/components/ui';
  import type { BushingOutput } from '$lib/core/bushing';
  import { canMoveInList, moveCardInList, normalizeOrder, reorderList } from './BushingCardLayoutController';
  import { loadNestedDiagnosticsLayout, persistNestedDiagnosticsLayout } from './BushingLayoutPersistence';
  import NativeDragLane from './NativeDragLane.svelte';

  export let results: BushingOutput;
  export let dndEnabled = true;
  let infoDialog: 'diagnostics' | 'edge' | 'wall' | null = null;

  const DEFAULT_DIAG_ORDER = ['edge', 'wall', 'warnings'] as const;

  const fmt = (n: number | null | undefined, d = 4) => (!Number.isFinite(Number(n)) ? '---' : Number(n).toFixed(d));
  $: edgeFailed = results.warningCodes.some((w) => w.code.includes('EDGE_DISTANCE'));
  $: wallFailed = results.warningCodes.some((w) => w.code.includes('WALL_BELOW_MIN'));
  $: hasWarnings = Boolean(results.warnings?.length);
  $: activeDiagIds = (hasWarnings ? [...DEFAULT_DIAG_ORDER] : DEFAULT_DIAG_ORDER.filter((v) => v !== 'warnings')) as string[];

  let diagOrder: string[] = [...DEFAULT_DIAG_ORDER];
  let diagLaneItems: Array<{ id: string }> = [];
  $: diagLaneItems = diagOrder.map((id) => ({ id }));

  if (typeof window !== 'undefined') diagOrder = loadNestedDiagnosticsLayout([...DEFAULT_DIAG_ORDER]);

  $: diagOrder = normalizeOrder(diagOrder, activeDiagIds);
  $: if (typeof window !== 'undefined') persistNestedDiagnosticsLayout(diagOrder);

  onMount(() => {
    if (typeof window === 'undefined') return;
    (window as any).__SCD_BUSHING_TEST_REORDER_DIAG__ = (sourceId: string, targetId: string) => {
      diagOrder = normalizeOrder(reorderList(diagOrder, sourceId, targetId), activeDiagIds);
    };
  });

  function commitDiagLane(items: Array<{ id: string }>): void {
    diagOrder = normalizeOrder(items.map((item) => item.id), activeDiagIds);
  }

  function canMove(id: string, direction: -1 | 1): boolean {
    return canMoveInList(diagOrder, id, direction);
  }

  function move(id: string, direction: -1 | 1): void {
    diagOrder = normalizeOrder(moveCardInList(diagOrder, id, direction), activeDiagIds);
  }

  function focusSection(id: string) {
    if (!id || id.trim() === '') return; // Guard against empty strings
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-amber-300/80');
    setTimeout(() => el.classList.remove('ring-2', 'ring-amber-300/80'), 1500);
    infoDialog = null;
  }
</script>

<div class="space-y-4">
  <details id="bushing-diagnostics-card" class="glass-card rounded-xl border border-white/10 p-3 bushing-pop-card bushing-depth-2 bushing-results-card" open>
    <summary class="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-indigo-200/95">
      Detailed Diagnostics
      <button
        type="button"
        class="ml-2 rounded border border-cyan-300/35 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-100 hover:bg-cyan-500/20"
        on:click|stopPropagation={() => (infoDialog = 'diagnostics')}>
        ?
      </button>
    </summary>
    <NativeDragLane
      listClass="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2"
      enabled={dndEnabled}
      items={diagLaneItems}
      on:finalize={(ev) => commitDiagLane(ev.detail.items)}
      let:item>
      {#if item.id === 'edge'}
        <div class="rounded-md" data-diag-card="edge">
          <div class="mb-1 flex justify-end gap-1 text-[10px]">
            <button type="button" class="rounded border border-white/20 px-1 text-white/80 disabled:opacity-35" on:click={() => move('edge', -1)} disabled={!canMove('edge', -1)}>Up</button>
            <button type="button" class="rounded border border-white/20 px-1 text-white/80 disabled:opacity-35" on:click={() => move('edge', 1)} disabled={!canMove('edge', 1)}>Down</button>
          </div>
          <div
            class="cursor-pointer"
            role="button"
            tabindex="0"
            on:click={() => (infoDialog = 'edge')}
            on:keydown={(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (infoDialog = 'edge')}>
            <Card
              id="bushing-edge-distance-card"
              class={`bushing-results-card bushing-pop-card bushing-depth-1 ${edgeFailed ? 'border border-amber-300/55' : ''}`}>
              <CardContent class="pt-4 text-sm space-y-2">
                <div class="text-[10px] uppercase tracking-wide text-indigo-200/95 font-bold">Edge Distance</div>
                <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Actual e/D</span><span class="font-mono text-slate-100 font-semibold">{fmt(results.edgeDistance.edActual)}</span></div>
                <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Min (Seq)</span><span class="font-mono text-slate-100 font-semibold">{fmt(results.edgeDistance.edMinSequence)}</span></div>
                <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Min (Strength)</span><span class="font-mono text-slate-100 font-semibold">{fmt(results.edgeDistance.edMinStrength)}</span></div>
                <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Mode</span><span class="font-mono text-slate-100 font-semibold">{results.edgeDistance.governing}</span></div>
              </CardContent>
            </Card>
          </div>
        </div>
      {:else if item.id === 'wall'}
        <div class="rounded-md" data-diag-card="wall">
          <div class="mb-1 flex justify-end gap-1 text-[10px]">
            <button type="button" class="rounded border border-white/20 px-1 text-white/80 disabled:opacity-35" on:click={() => move('wall', -1)} disabled={!canMove('wall', -1)}>Up</button>
            <button type="button" class="rounded border border-white/20 px-1 text-white/80 disabled:opacity-35" on:click={() => move('wall', 1)} disabled={!canMove('wall', 1)}>Down</button>
          </div>
          <div
            class="cursor-pointer"
            role="button"
            tabindex="0"
            on:click={() => (infoDialog = 'wall')}
            on:keydown={(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (infoDialog = 'wall')}>
            <Card
              id="bushing-wall-thickness-card"
              class={`bushing-results-card bushing-pop-card bushing-depth-1 ${wallFailed ? 'border border-amber-300/55' : ''}`}>
              <CardContent class="pt-4 text-sm space-y-2">
                <div class="text-[10px] uppercase tracking-wide text-indigo-200/95 font-bold">Wall Thickness</div>
                <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Straight</span><span class="font-mono text-slate-100 font-semibold">{fmt(results.sleeveWall)}</span></div>
                <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Neck</span><span class="font-mono text-slate-100 font-semibold">{fmt(results.neckWall)}</span></div>
                <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Governing</span><span class="font-mono text-slate-100 font-semibold">{results.governing.name}</span></div>
              </CardContent>
            </Card>
          </div>
        </div>
      {:else if item.id === 'warnings' && results.warnings?.length}
        <div class="rounded-md md:col-span-2" data-diag-card="warnings">
          <div class="mb-1 flex justify-end gap-1 text-[10px]">
            <button type="button" class="rounded border border-white/20 px-1 text-white/80 disabled:opacity-35" on:click={() => move('warnings', -1)} disabled={!canMove('warnings', -1)}>Up</button>
            <button type="button" class="rounded border border-white/20 px-1 text-white/80 disabled:opacity-35" on:click={() => move('warnings', 1)} disabled={!canMove('warnings', 1)}>Down</button>
          </div>
          <Card id="bushing-warnings-card" class="border border-amber-300/55 bg-amber-500/15 bushing-pop-card bushing-depth-1">
            <CardContent class="pt-4 text-sm space-y-2">
              <div class="text-[10px] font-bold uppercase text-amber-200">Warnings</div>
              {#each results.warnings as w}
                <div class="flex items-start gap-2 rounded-md border border-amber-200/35 bg-black/35 px-2 py-1.5 bushing-pop-sub bushing-depth-0 text-amber-50">
                  <span class="text-amber-200">⚠</span><span class="font-medium">{w}</span>
                </div>
              {/each}
            </CardContent>
          </Card>
        </div>
      {/if}
    </NativeDragLane>
  </details>
</div>

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
        {#if infoDialog === 'diagnostics'}
          <div class="text-sm font-semibold text-cyan-100">Detailed Diagnostics</div>
          <div class="text-white/80">Detailed Diagnostics is the rule-resolution layer for bushing acceptance. It decomposes the global pass/fail decision into geometric sufficiency checks that often govern before material yield.</div>
          <div class="text-white/80">These checks are evaluated as explicit margins and compared against zero. The solver selects the lowest margin as governing, which becomes the displayed global controlling condition.</div>
          <div class="rounded-md border border-cyan-300/25 bg-cyan-500/5 p-2 text-[12px] text-cyan-100/95">Current controlling check: <span class="font-mono">{results.governing.name}</span></div>
        {:else if infoDialog === 'edge'}
          <div class="text-sm font-semibold text-cyan-100">Edge Distance</div>
          <div class="text-white/80">`e/D` is a nondimensional edge-distance adequacy ratio. `Actual e/D` is your configuration ratio; minimum requirements are generated from two mechanisms: sequencing robustness and local strength demand.</div>
          <div class="text-white/80">`Sequencing` means the installation/load-transfer progression stays stable as the joint is assembled and loaded in real service order. Practically, enough ligament is required so local deformation does not prematurely redirect or spike load path before full seating and bearing distribution are established.</div>
          <div class="text-white/80">`Min (Seq)` protects process/installation sequencing behavior and load-path development. `Min (Strength)` protects against insufficient ligament under the selected loading assumptions. Both are evaluated independently; the larger required value is controlling for acceptance.</div>
          <div class="text-white/80">When `Actual e/D` is below the controlling minimum, edge distance governs regardless of positive material-yield margins elsewhere.</div>
          {#if edgeFailed}
            <div class="rounded-md border border-amber-300/50 bg-amber-500/15 p-2 text-[12px] text-amber-100">
              Edge distance checks are currently failing.
              <button class="ml-1 underline underline-offset-2" on:click={() => focusSection('bushing-geometry-card')}>Jump to Geometry</button>
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
              <button class="ml-1 underline underline-offset-2" on:click={() => focusSection('bushing-profile-card')}>Jump to Profile + Settings</button>
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
