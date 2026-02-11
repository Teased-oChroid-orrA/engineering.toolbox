<script lang="ts">
  export let open = false;
  export let panelEl: HTMLElement | null = null;
  export let healTol = 0.01;
  export let onClose: () => void;
  export let runTopologyHealing: () => void;
</script>

{#if open}
  <div class="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 backdrop-blur-[1px]" role="button" tabindex="0" onpointerdown={(e) => { if (e.target === e.currentTarget) onClose(); }} onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}>
    <div class="w-[420px] max-w-[92vw] rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl p-4 space-y-4" bind:this={panelEl}>
      <div class="flex items-center justify-between"><div class="text-sm font-semibold tracking-wide text-white/90">Topology Healing</div><button class="btn btn-xs variant-soft" onclick={onClose}>Close</button></div>
      <div class="grid grid-cols-2 gap-2 items-center"><div class="text-[11px] text-white/60">Tolerance</div><input class="input input-xs glass-input" type="number" step="0.01" min="0" bind:value={healTol} /></div>
      <button class="btn btn-xs variant-soft w-full" onclick={runTopologyHealing}>Run Healing</button>
    </div>
  </div>
{/if}
