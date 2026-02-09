<script lang="ts">
  import BucklingModule from '$lib/components/BucklingModule.svelte';
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <div>
      <div class="text-sm font-semibold">Buckling Evaluation</div>
      <div class="text-[11px] text-white/50">
        Euler–Johnson transition • L/r slenderness • critical load
      </div>
    </div>
  </div>

  <BucklingModule />
</div>
