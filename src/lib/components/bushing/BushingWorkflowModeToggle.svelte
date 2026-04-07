<script lang="ts">
  import { cn } from '$lib/utils';
  import type { BushingWorkflowMode } from './BushingLayoutPersistence';

  let {
    workflowMode = 'quick',
    onSetWorkflowMode = () => {}
  }: {
    workflowMode?: BushingWorkflowMode;
    onSetWorkflowMode?: (mode: BushingWorkflowMode) => void;
  } = $props();

  const items: Array<{ value: BushingWorkflowMode; label: string; blurb: string }> = [
    { value: 'quick', label: 'Quick Solve', blurb: 'Fast fit / install decisions.' },
    { value: 'review', label: 'Engineering Review', blurb: 'Full service, approval, and evidence.' }
  ];
</script>

<div class="rounded-2xl border border-white/10 bg-black/20 p-1">
  <div class="grid grid-cols-2 gap-1">
    {#each items as item (item.value)}
      <button
        type="button"
        class={cn(
          'rounded-[1rem] px-3 py-2 text-left transition-colors',
          workflowMode === item.value ? 'bg-cyan-400/14 text-white' : 'text-white/58 hover:bg-white/[0.05] hover:text-white/80'
        )}
        onclick={() => onSetWorkflowMode(item.value)}
      >
        <div class="text-[10px] font-semibold uppercase tracking-[0.18em]">{item.label}</div>
        <div class="mt-1 text-[10px] leading-relaxed opacity-75">{item.blurb}</div>
      </button>
    {/each}
  </div>
</div>
