<script lang="ts">
  import { cn } from '$lib/utils';
  export let className = '';
</script>

<div class={cn('px-5 pb-5', className)}>
  <slot />
</div>
