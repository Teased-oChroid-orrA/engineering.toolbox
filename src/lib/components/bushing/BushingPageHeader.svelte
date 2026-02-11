<script lang="ts">
  import { Badge } from '$lib/components/ui';
  import { cn } from '$lib/utils';

  export let isFailed = false;
  export let onShowInformation: () => void = () => {};
</script>

<div class="flex items-center justify-between px-1">
  <h2 class="text-lg font-semibold tracking-tight text-white">Bushing Toolbox</h2>
  <div class="flex items-center gap-2">
    <button
      class="rounded-full border border-cyan-300/35 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-100 hover:bg-cyan-500/20"
      on:click={onShowInformation}>
      Information
    </button>
    <Badge variant="outline" class={cn('text-[10px]', isFailed ? 'border-amber-400/40 text-amber-200' : 'border-emerald-400/35 text-emerald-200')}>
      {isFailed ? 'ATTN' : 'PASS'}
    </Badge>
  </div>
</div>
