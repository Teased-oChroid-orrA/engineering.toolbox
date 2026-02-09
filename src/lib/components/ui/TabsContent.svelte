<script lang="ts">
  import { useTabs } from './tabs';
  import { get } from 'svelte/store';

  export let value: string;
  const { value: active } = useTabs();
  $: isActive = get(active) === value;
</script>

{#if isActive}
  <div class="mt-4">
    <slot />
  </div>
{/if}
