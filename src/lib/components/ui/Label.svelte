<script lang="ts">
  import { cn } from '$lib/utils';
  export let className = '';
</script>

<label class={cn('text-xs font-medium text-white/70 tracking-tight', className)}>
  <slot />
</label>
