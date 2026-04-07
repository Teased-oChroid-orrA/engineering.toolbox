<script lang="ts">
  import { Card, CardContent } from '$lib/components/ui';
  import type { BushingOutput } from '$lib/core/bushing';

  let {
    open = false,
    mode = null,
    results,
    edgeFailed = false,
    wallFailed = false,
    fitFailed = false,
    fmt,
    onClose,
    focusSection
  }: {
    open: boolean;
    mode: 'safety' | 'fit' | null;
    results: BushingOutput;
    edgeFailed: boolean;
    wallFailed: boolean;
    fitFailed: boolean;
    fmt: (v: number, d?: number) => string;
    onClose: () => void;
    focusSection: (id: string) => void;
  } = $props();
</script>

{#if open && mode}
  <div class="fixed inset-0 z-[120] grid place-items-center p-4">
    <button type="button" aria-label="Close dialog backdrop" class="absolute inset-0 bg-black/65" onclick={onClose}></button>
    <div class="relative z-10 w-full max-w-[760px]">
      <Card class="border-cyan-300/35 bg-slate-950/95 text-slate-100 shadow-2xl">
        <CardContent class="space-y-3 pt-5 text-sm">
          {#if mode === 'safety'}
            <div class="text-sm font-semibold text-cyan-100">Safety Margins (Yield)</div>
            <div class="text-white/80">These are hoop-yield margins from a thick-cylinder press-fit model. `Housing` compares predicted housing hoop stress to housing yield allowable; `Bushing` does the same for the bushing bore wall.</div>
            <div class="text-white/80">`Sequencing` in this tool is a geometry/process adequacy check: it verifies that edge ligament is sufficient for stable installation and progressive load transfer, so the joint does not localize damage before the intended bearing path is established.</div>
            <div class="text-white/80">`Governing` is the minimum margin across all active structural and geometry constraints. A negative governing value with positive yield margins means another check controls, commonly edge-distance or minimum-wall criteria.</div>
            <div class="rounded-md border border-cyan-300/25 bg-cyan-500/5 p-2 text-[12px] text-cyan-100/95">
              Active governing check: <span class="font-mono">{results.governing.name}</span>
            </div>
            {#if edgeFailed || wallFailed}
              <div class="rounded-md border border-amber-300/50 bg-amber-500/15 p-2 text-[12px] text-amber-100">
                Related failing checks:
                {#if edgeFailed}
                  <button class="ml-1 underline underline-offset-2" onclick={() => focusSection('bushing-edge-distance-card')}>Edge Distance</button>
                {/if}
                {#if wallFailed}
                  <button class="ml-2 underline underline-offset-2" onclick={() => focusSection('bushing-wall-thickness-card')}>Wall Thickness</button>
                {/if}
              </div>
            {/if}
          {:else}
            <div class="text-sm font-semibold text-cyan-100">Fit Envelope</div>
            <div class="text-white/80">This panel summarizes the fit story from requested target, to achieved stack-up, to settled current-state interference after thermal correction. Interference produces radial contact pressure through member elastic compliance; install force is estimated from friction, pressure, and engagement length.</div>
            <div class="text-white/80">Min / max rows show the actual envelope. `Bushing OD` is the solver-selected band, `Requested` is the target containment window, `Achieved` is the raw stack-up, and `Settled` is the current effective fit after thermal correction.</div>
            <div class="rounded-md border border-cyan-300/25 bg-cyan-500/5 p-2 text-[12px] text-cyan-100/95">
              Current effective interference: <span class="font-mono">{fmt(results.physics.deltaEffective, 4)}</span>
            </div>
            {#if fitFailed}
              <div class="rounded-md border border-amber-300/50 bg-amber-500/15 p-2 text-[12px] text-amber-100">
                Fit constraint warnings are active.
                <button class="ml-1 underline underline-offset-2" onclick={() => focusSection('bushing-geometry-card')}>Open Geometry Inputs</button>
              </div>
            {/if}
          {/if}
          <div class="pt-2">
            <button class="rounded-md border border-cyan-300/40 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-500/20" onclick={onClose}>
              Close
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
{/if}
