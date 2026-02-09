<script lang="ts">
  import { FilterBuilder, WillowDark } from '@svar-ui/svelte-filter';

  let {
    open = false,
    uiAnimDur = 160,
    floatingStyle = '',
    hasLoaded = false,
    svarFields = [],
    svarOptions = {},
    svarFilterSet,
    onClose,
    onReset,
    onBeginDrag,
    onApply,
    onChange
  } = $props<any>();
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-6 relative" transition:fade={{ duration: uiAnimDur }}>
    <button type="button" class="absolute inset-0 modal-backdrop p-0 m-0 border-0" onclick={onClose} aria-label="Close advanced builder"></button>
    <div class="relative z-10 glass-panel w-full max-w-5xl rounded-2xl border border-white/10 p-5" transition:scale={{ duration: uiAnimDur, start: 0.96 }} style={floatingStyle}>
      <div class="mb-2 flex items-center justify-between gap-2 border-b border-white/10 pb-2 cursor-move" role="button" tabindex="0" onmousedown={onBeginDrag}>
        <span class="text-[11px] uppercase tracking-widest text-white/50">Drag</span>
        <button class="btn btn-xs variant-soft" onclick={onReset}>Reset position</button>
      </div>
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="text-sm font-semibold text-white">Advanced Filter Builder</div>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-sm variant-soft" onclick={onClose}>Close</button>
          <button class="btn btn-sm variant-filled" onclick={onApply} disabled={!hasLoaded}>Apply to Inspector</button>
        </div>
      </div>
      <div class="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3">
        <WillowDark fonts={false}>
          <FilterBuilder
            type="list"
            fields={svarFields}
            options={svarOptions}
            value={svarFilterSet}
            onchange={(ev: any) => onChange(ev)}
          />
        </WillowDark>
      </div>
    </div>
  </div>
{/if}
