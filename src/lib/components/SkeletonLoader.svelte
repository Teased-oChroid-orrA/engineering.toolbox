<!--
  Lightweight, zero-dependency skeleton placeholder.
  Use when a panel is waiting on calculations, parsing, or async IO.
-->

<script lang="ts">
  export let lines = 3;
  export let className = '';
</script>

<div class={`animate-pulse space-y-3 ${className}`}>
  <div class="h-4 rounded bg-surface-200-800 w-1/2" />
  {#each Array(lines) as _, i (i)}
    <div class="h-3 rounded bg-surface-200-800" />
  {/each}
</div>
