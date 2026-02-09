<script lang="ts">
  import { cn } from '$lib/utils';
  export let className = '';
</script>

<div class={cn('px-5 pt-4 pb-2 flex items-start justify-between gap-3', className)}>
  <slot />
</div>
