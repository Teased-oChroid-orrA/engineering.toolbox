<script lang="ts">
  import { cn } from '$lib/utils';
  export let className = '';
</script>

<div class={cn('inline-flex h-9 items-center justify-center rounded-md bg-slate-100 p-1 text-slate-900', className)}>
  <slot />
</div>
