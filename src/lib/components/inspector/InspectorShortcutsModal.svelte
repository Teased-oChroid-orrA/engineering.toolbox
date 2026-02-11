<script lang="ts">
  import { fade, scale } from 'svelte/transition';

  let {
    open = false,
    uiAnimDur = 160,
    floatingStyle = '',
    onClose,
    onReset,
    onBeginDrag
  } = $props<{
    open: boolean;
    uiAnimDur: number;
    floatingStyle: string;
    onClose: () => void;
    onReset: () => void;
    onBeginDrag: (e: MouseEvent) => void;
  }>();
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-6 relative" role="dialog" aria-modal="true" aria-label="Inspector shortcuts" tabindex="-1" transition:fade={{ duration: uiAnimDur }}>
    <button type="button" class="absolute inset-0 modal-backdrop p-0 m-0 border-0" onclick={onClose} aria-label="Close shortcuts"></button>
    <div class="relative z-10 glass-panel w-full max-w-xl rounded-2xl border border-white/10 p-5 inspector-pop-layer" transition:scale={{ duration: uiAnimDur, start: 0.96 }} style={floatingStyle}>
      <div class="mb-2 flex items-center justify-between gap-2 border-b border-white/10 pb-2 cursor-move" role="button" tabindex="0" onmousedown={onBeginDrag}>
        <span class="text-[11px] uppercase tracking-widest text-white/50">Drag</span>
        <button class="btn btn-xs variant-soft" onclick={onReset}>Reset position</button>
      </div>
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="text-sm font-semibold text-white">Inspector shortcuts</div>
          <div class="text-xs text-white/60 mt-1">Keyboard-first navigation and actions.</div>
        </div>
        <button class="btn btn-sm variant-soft" onclick={onClose}>Close</button>
      </div>
      <div class="mt-4 grid grid-cols-1 gap-2 text-sm text-white/75">
        <div><span class="font-mono text-white/90">Ctrl/Cmd + F</span> focus query</div>
        <div><span class="font-mono text-white/90">Ctrl/Cmd + Shift + S</span> open schema</div>
        <div><span class="font-mono text-white/90">Ctrl/Cmd + Shift + R</span> open recipes</div>
        <div><span class="font-mono text-white/90">Ctrl/Cmd + K</span> toggle shortcuts</div>
        <div><span class="font-mono text-white/90">Arrow Up/Down</span> move selected row in grid</div>
      </div>
    </div>
  </div>
{/if}
