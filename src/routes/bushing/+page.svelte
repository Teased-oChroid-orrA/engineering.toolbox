<script lang="ts">
  import BushingOrchestrator from '$lib/components/bushing/BushingOrchestrator.svelte';
  import { safeModeStore } from '$lib/stores/safeModeStore';

  let loadFullWorkspace = $state(false);
</script>

<div data-route-ready="bushing">
  {#if $safeModeStore && !loadFullWorkspace}
    <div class="rounded-xl border border-amber-300/25 bg-amber-500/10 p-4 text-sm text-amber-100">
      <div class="text-xs uppercase tracking-widest text-amber-200/80">Safe Mode</div>
      <div class="mt-1">Bushing workspace is deferred to reduce startup load on slower systems.</div>
      <button class="btn btn-sm mt-3 variant-soft border border-amber-300/40" onclick={() => (loadFullWorkspace = true)}>
        Load Bushing Workspace
      </button>
    </div>
  {:else}
    <BushingOrchestrator />
  {/if}
</div>
