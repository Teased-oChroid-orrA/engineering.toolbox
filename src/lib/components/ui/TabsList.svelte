<script lang="ts">
  import { cn } from '$lib/utils';
  let className: string | undefined | null = undefined;
  export { className as class };
</script>

<div class={cn('inline-flex h-9 items-center justify-center rounded-md bg-slate-100 p-1 text-slate-900', className)} {...$$restProps}>
  <slot />
</div>
