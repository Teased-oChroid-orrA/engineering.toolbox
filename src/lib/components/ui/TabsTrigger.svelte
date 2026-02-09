<script lang="ts">
  import { cn } from '$lib/utils';
  import { useTabs } from './tabs';
  import { get } from 'svelte/store';

  export let value: string;
  export let className = '';

  const { value: active } = useTabs();

  $: isActive = get(active) === value;
  function select() { active.set(value); }
</script>

<button
  type="button"
  on:click={select}
  class={cn(
    'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ring-offset-white',
    isActive ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900',
    className
  )}
>
  <slot />
</button>
