<script lang="ts">
  import { cn } from '$lib/utils';
  let className: string | undefined | null = undefined;
  export { className as class };
</script>

<label class={cn('text-xs font-medium text-white/70 tracking-tight', className)} {...$$restProps}>
  <slot />
</label>
