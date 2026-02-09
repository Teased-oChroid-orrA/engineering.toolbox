<script lang="ts">
  import { cn } from '$lib/utils';
  let className: string | undefined | null = undefined;
  export { className as class };
</script>

<div class={cn('px-5 pt-4 pb-2 flex items-start justify-between gap-3', className)} {...$$restProps}>
  <slot />
</div>
