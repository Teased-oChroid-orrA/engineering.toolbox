<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';

  let { area = 1, r_g = 1 } = $props<{ area?: number; r_g?: number }>();

  let L = $state(48);
  let K = $state(1.0);
  let E = $state(10.3e6);
  let Sy = $state(73000);

  let result = $state<{ critical_load: number; mode: string; slenderness: number } | null>(null);

  $effect(() => {
    invoke('eval_buckling', { area: Number(area), rG: Number(r_g), l: Number(L), k: Number(K), e: Number(E), sy: Number(Sy) })
      .then((r: any) => { result = r; })
      .catch(() => { result = null; });
  });

  let isCritical = $derived(result ? result.slenderness > 120 : false);
</script>

<div class="card p-4 {isCritical ? 'buckling-fail' : 'variant-soft'} border border-white/10">
  <h3 class="text-xs font-bold mb-2">BUCKLING EVALUATION</h3>

  <div class="grid grid-cols-2 gap-2">
    <label class="text-[10px] text-white/60">Length (in)
      <input type="number" bind:value={L} class="glass-input w-full p-1 text-xs" />
    </label>
    <label class="text-[10px] text-white/60">K
      <input type="number" bind:value={K} step="0.05" class="glass-input w-full p-1 text-xs" />
    </label>
  </div>

  <div class="grid grid-cols-2 gap-2 mt-2">
    <label class="text-[10px] text-white/60">E (psi)
      <input type="number" bind:value={E} class="glass-input w-full p-1 text-xs" />
    </label>
    <label class="text-[10px] text-white/60">Sy (psi)
      <input type="number" bind:value={Sy} class="glass-input w-full p-1 text-xs" />
    </label>
  </div>

  <div class="mt-3 text-xs font-mono">
    {#if result}
      <p>L/r: {result.slenderness.toFixed(2)}</p>
      <p>Mode: {result.mode}</p>
      <p>Pcr: {result.critical_load.toFixed(2)}</p>
      <p class={isCritical ? 'text-error-500' : 'text-success-500'}>{isCritical ? 'CRITICAL' : 'STABLE'}</p>
    {:else}
      <p class="text-white/40">Buckling solver unavailable.</p>
    {/if}
  </div>
</div>
