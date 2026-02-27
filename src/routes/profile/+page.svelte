<script lang="ts">
  import ProfileToolbox from '$lib/components/ProfileToolbox.svelte';
</script>

<div class="space-y-4" data-route-ready="profile">
  <div class="flex items-center justify-between">
    <div>
      <div class="text-sm font-semibold">Parametric Profile Generator</div>
      <div class="text-[11px] text-white/50">
        2D B-Rep sketching • constraints • self-healing solve loop
      </div>
    </div>
  </div>

  <ProfileToolbox />
</div>
