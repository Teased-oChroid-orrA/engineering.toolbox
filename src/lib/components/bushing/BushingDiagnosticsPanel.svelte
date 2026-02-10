<script lang="ts">
  import { Card, CardContent } from '$lib/components/ui';
  import type { BushingOutput } from '$lib/core/bushing';

  export let results: BushingOutput;

  const fmt = (n: number | null | undefined, d = 4) => (!Number.isFinite(Number(n)) ? '---' : Number(n).toFixed(d));
</script>

<div class="space-y-4">
  <details class="glass-card rounded-xl border border-white/10 p-3 bushing-pop-card bushing-results-card" open>
    <summary class="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-indigo-200/95">Detailed Diagnostics</summary>
    <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card class="bushing-results-card bushing-pop-card">
        <CardContent class="pt-4 text-sm space-y-2">
          <div class="text-[10px] uppercase tracking-wide text-indigo-200/95 font-bold">Edge Distance</div>
          <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Actual e/D</span><span class="font-mono text-slate-100 font-semibold">{fmt(results.edgeDistance.edActual)}</span></div>
          <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Min (Seq)</span><span class="font-mono text-slate-100 font-semibold">{fmt(results.edgeDistance.edMinSequence)}</span></div>
          <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Min (Strength)</span><span class="font-mono text-slate-100 font-semibold">{fmt(results.edgeDistance.edMinStrength)}</span></div>
          <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Mode</span><span class="font-mono text-slate-100 font-semibold">{results.edgeDistance.governing}</span></div>
        </CardContent>
      </Card>
      <Card class="bushing-results-card bushing-pop-card">
        <CardContent class="pt-4 text-sm space-y-2">
          <div class="text-[10px] uppercase tracking-wide text-indigo-200/95 font-bold">Wall Thickness</div>
          <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Straight</span><span class="font-mono text-slate-100 font-semibold">{fmt(results.sleeveWall)}</span></div>
          <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Neck</span><span class="font-mono text-slate-100 font-semibold">{fmt(results.neckWall)}</span></div>
          <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Governing</span><span class="font-mono text-slate-100 font-semibold">{results.governing.name}</span></div>
        </CardContent>
      </Card>
    </div>
  </details>

  {#if results.warnings?.length}
    <Card class="border border-amber-400/30 bg-amber-500/5 bushing-pop-card">
      <CardContent class="pt-4 text-sm space-y-2">
        <div class="text-[10px] font-bold uppercase text-amber-200">Warnings</div>
        {#each results.warnings as w}
          <div class="flex items-start gap-2 rounded-md border border-amber-200/15 bg-black/20 px-2 py-1.5 bushing-pop-sub">
            <span>⚠</span><span>{w}</span>
          </div>
        {/each}
      </CardContent>
    </Card>
  {/if}
</div>
