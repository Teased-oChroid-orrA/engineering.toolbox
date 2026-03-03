<script lang="ts">
  import { Badge } from '$lib/components/ui';
  import { cn } from '$lib/utils';

  export let isFailed = false;
  export let onShowInformation: () => void = () => {};
  export let uxMode: 'guided' | 'advanced' = 'guided';
  export let onSetUxMode: (mode: 'guided' | 'advanced') => void = () => {};
</script>

<div class="flex items-center justify-between px-1">
  <h2 class="text-lg font-semibold tracking-tight text-white">Bushing Toolbox</h2>
  <div class="flex items-center gap-2">
    <div class="flex items-center gap-1 rounded-full border border-white/10 bg-black/20 p-1">
      <button
        class={cn(
          'rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors',
          uxMode === 'guided' ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white/75'
        )}
        onclick={() => onSetUxMode('guided')}>
        Guided
      </button>
      <button
        class={cn(
          'rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors',
          uxMode === 'advanced' ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white/75'
        )}
        onclick={() => onSetUxMode('advanced')}>
        Advanced
      </button>
    </div>
    <button
      class="bushing-theme-accent rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors"
      onclick={onShowInformation}>
      Information
    </button>
    <Badge
      variant="outline"
      class={cn('text-[10px]', isFailed ? 'border-amber-400/40 text-amber-200' : '')}
      style={!isFailed ? 'border-color: color-mix(in srgb, var(--accent-primary) 35%, transparent); color: color-mix(in srgb, white 72%, var(--accent-primary));' : undefined}
    >
      {isFailed ? 'ATTN' : 'PASS'}
    </Badge>
  </div>
</div>

<style>
  .bushing-theme-accent {
    border: 1px solid color-mix(in srgb, var(--accent-primary) 42%, transparent);
    background: color-mix(in srgb, var(--accent-primary) 14%, transparent);
    color: color-mix(in srgb, white 74%, var(--accent-primary));
  }

  .bushing-theme-accent:hover {
    background: color-mix(in srgb, var(--accent-primary) 22%, transparent);
  }
</style>
