<script lang="ts">
  import { cn } from '$lib/utils';
  let className: string | undefined | null = undefined;
  export { className as class };
</script>

<div
  class={cn(
    'rounded-xl border border-surface-200/60 bg-white/60 text-surface-950 shadow-sm backdrop-blur-md',
    className
  )}
  {...$$restProps}
>
  <slot />
</div>