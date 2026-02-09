<script lang="ts">
  import ProfileToolbox from '$lib/components/ProfileToolbox.svelte';
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <div>
      <div class="text-sm font-semibold">Structural Property Analyzer</div>
      <div class="text-[11px] text-white/50">
        Exact section properties (Green's theorem) • centroid • Ixx • Sxx • radius of gyration
      </div>
    </div>
  </div>

  <!-- The Profile toolbox already computes and displays section properties in its sidebar. -->
  <ProfileToolbox />
</div>
