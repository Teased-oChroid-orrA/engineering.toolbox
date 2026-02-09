<script lang="ts">
  import { cn } from '$lib/utils';
  export let className = '';
</script>

<h2 class={cn('text-xs font-semibold tracking-widest uppercase text-white/60', className)}>
  <slot />
</h2>
