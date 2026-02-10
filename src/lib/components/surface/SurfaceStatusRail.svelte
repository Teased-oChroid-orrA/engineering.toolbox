<script lang="ts">
  import type { SurfaceStatusWarning } from './controllers/SurfaceWarningsController';

  export let warnings: SurfaceStatusWarning[] = [];
  export let clearWarnings: () => void;
  let severityFilter: 'all' | 'error' | 'warning' | 'info' = 'all';
  const counts = (sev: 'error' | 'warning' | 'info') => warnings.filter((w) => w.severity === sev).length;
  $: filtered = severityFilter === 'all' ? warnings : warnings.filter((w) => w.severity === severityFilter);

  const tone = (s: SurfaceStatusWarning['severity']) => {
    if (s === 'error') return 'border-rose-400/35 bg-rose-500/10 text-rose-200';
    if (s === 'warning') return 'border-amber-300/35 bg-amber-400/10 text-amber-100';
    return 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100';
  };
</script>

<div class="rounded-2xl border border-white/10 bg-black/20 p-3 space-y-2">
  <div class="flex items-center justify-between">
    <div class="text-[11px] font-semibold uppercase tracking-widest text-white/60">Status Rail</div>
    <button class="btn btn-xs variant-soft" onclick={clearWarnings} disabled={warnings.length === 0}>Clear</button>
  </div>
  <div class="flex items-center gap-1 text-[10px]">
    <button class={severityFilter === 'all' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'} onclick={() => (severityFilter = 'all')}>All {warnings.length}</button>
    <button class={severityFilter === 'error' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'} onclick={() => (severityFilter = 'error')}>Err {counts('error')}</button>
    <button class={severityFilter === 'warning' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'} onclick={() => (severityFilter = 'warning')}>Warn {counts('warning')}</button>
    <button class={severityFilter === 'info' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'} onclick={() => (severityFilter = 'info')}>Info {counts('info')}</button>
  </div>
  {#if warnings.length === 0}
    <div class="text-[11px] text-white/45">No active warnings.</div>
  {:else}
    <div class="space-y-1 max-h-40 overflow-auto pr-1 custom-scrollbar">
      {#each filtered as w (w.id)}
        <div class={`rounded-lg border px-2 py-1 text-[11px] ${tone(w.severity)}`}>
          <div class="font-mono uppercase flex items-center justify-between">
            <span>{w.source} {w.code}</span>
            <span class="opacity-80">{new Date(w.when).toLocaleTimeString()}</span>
          </div>
          <div>{w.message}</div>
          {#if w.detail}<div class="opacity-80">{w.detail}</div>{/if}
          {#if w.severity === 'error'}
            <div class="mt-1 rounded border border-rose-300/30 bg-rose-500/10 px-1.5 py-1 text-[10px]">
              Critical: review recommendation rail or reduce solver aggressiveness before export.
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
