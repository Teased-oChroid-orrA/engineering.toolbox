<script lang="ts">
  import { cn } from '$lib/utils';
  let className: string | undefined | null = undefined;
  export { className as class };
</script>

<h2 class={cn('text-xs font-semibold tracking-widest uppercase text-white/60', className)} {...$$restProps}>
  <slot />
</h2>
