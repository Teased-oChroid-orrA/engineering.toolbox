<script lang="ts">
  import ProfileToolbox from '$lib/components/ProfileToolbox.svelte';
  import DataInspector from '$lib/components/DataInspector.svelte';

  const tabs = ['Profile', 'Inspector'] as const;
  let active = $state<(typeof tabs)[number]>('Profile');

</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <div class="text-sm font-semibold">Engineering Evaluation Suite</div>
      <div class="text-[11px] text-white/50">Profile Generator • Properties • Buckling • Data Inspector</div>
    </div>
    <div class="flex gap-2">
      {#each tabs as t}
        <button
          class={t === active
            ? 'px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs'
            : 'px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 text-xs'}
          onclick={() => (active = t)}
        >
          {t}
        </button>
      {/each}
    </div>
  </div>

  {#if active === 'Profile'}
    <ProfileToolbox />
  {:else}
    <!-- The inspector is fully server-backed; no demo props. -->
    <DataInspector />
  {/if}
</div>
