<script lang="ts">
  import { cn } from '$lib/utils';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{ change: boolean }>();

  export let checked = false;
  export let disabled = false;
  export let className = '';
  export let ariaLabel = 'Toggle';

  function toggle() {
    if (disabled) return;
    checked = !checked;
    dispatch('change', checked);
  }
</script>

<button
  type="button"
  role="switch"
  aria-label={ariaLabel}
  aria-checked={checked}
  on:click={toggle}
  disabled={disabled}
  class={cn(
    'inline-flex h-6 w-10 items-center rounded-full border border-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/35 disabled:opacity-50',
    checked ? 'bg-teal-400/80' : 'bg-white/10',
    className
  )}
>
  <span
    class={cn(
      'inline-block h-5 w-5 rounded-full bg-black/70 shadow-sm transition-transform',
      checked ? 'translate-x-4' : 'translate-x-1'
    )}
  ></span>
</button>
