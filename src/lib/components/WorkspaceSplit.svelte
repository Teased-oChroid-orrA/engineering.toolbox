<script lang="ts">
  export let leftTitle = '';
  export let rightTitle = '';
</script>

<div class="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4 items-start">
  <div class="space-y-4">
    {#if leftTitle}
      <div class="text-[11px] uppercase tracking-widest text-white/45">{leftTitle}</div>
    {/if}
    <slot name="left" />
  </div>

  <div class="space-y-4">
    {#if rightTitle}
      <div class="text-[11px] uppercase tracking-widest text-white/45">{rightTitle}</div>
    {/if}
    <slot name="right" />
  </div>
</div>
