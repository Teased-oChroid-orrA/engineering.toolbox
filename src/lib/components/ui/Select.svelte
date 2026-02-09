<script lang="ts">
  import { cn } from '$lib/utils';
  
  // FIX: Added 'items' prop to support dynamic options
  export let items: { value: string | number; label: string }[] = [];
  export let value: string | number;
  export let className = '';
  export let disabled = false;
  export let name: string | undefined = undefined;
  export let id: string | undefined = undefined;
</script>

<div class="relative">
  <select
    {id}
    {name}
    bind:value
    {disabled}
    class={cn(
      // Glassy Select Styling
      'flex h-9 w-full appearance-none rounded-md border border-white/10 bg-black/20 px-3 py-1 pr-8 text-sm text-white shadow-sm transition-all',
      'focus-visible:border-indigo-500/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/50',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
  >
    {#each items as item}
      <option value={item.value} class="bg-surface-900 text-white">
        {item.label}
      </option>
    {/each}
    <slot />
  </select>
  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white/50">
    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
  </div>
</div>