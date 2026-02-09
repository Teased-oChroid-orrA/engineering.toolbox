<script lang="ts">
  import { cn } from '$lib/utils';
  let className: string | undefined | null = undefined;
  export { className as class };
</script>

<hr class={cn('border-0 h-px bg-white/10 my-4', className)} {...$$restProps} />
