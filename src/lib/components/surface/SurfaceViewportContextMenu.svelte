<script lang="ts">
  // Viewport right-click menu (Svelte 5 runes mode). UI-only.
  // SurfaceToolbox owns camera state and passes callbacks.

  type Props = {
    open: boolean;
    x: number;
    y: number;
    onFitToScreen?: () => void;
    onResetView?: () => void;
    onClose: () => void;
  };

  let { open, x, y, onFitToScreen, onResetView, onClose }: Props = $props();

  function stop(e: MouseEvent) {
    e.stopPropagation();
  }

  function disabled(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }
</script>

{#if open}
  <div
    class="absolute z-50 min-w-[200px] rounded-xl border border-white/10 bg-black/80 backdrop-blur-md shadow-xl p-1"
    style={`left:${x}px; top:${y}px;`}
    onclick={stop}
    role="menu"
    tabindex="0"
    onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
  >
    <button
      class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm text-white/80"
      onclick={() => {
        onFitToScreen?.();
        onClose();
      }}
    >
      Fit to screen
    </button>
    <button
      class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm text-white/80"
      onclick={() => {
        onResetView?.();
        onClose();
      }}
    >
      Reset view
    </button>

    <div class="my-1 border-t border-white/10"></div>

    <button
      class="w-full text-left px-3 py-2 rounded-lg text-sm text-white/40 cursor-not-allowed"
      onclick={disabled}
      title="Coming soon"
    >
      Frame selection (coming soon)
    </button>
    <button
      class="w-full text-left px-3 py-2 rounded-lg text-sm text-white/40 cursor-not-allowed"
      onclick={disabled}
      title="Coming soon"
    >
      Toggle axes / overlays (coming soon)
    </button>
    <button
      class="w-full text-left px-3 py-2 rounded-lg text-sm text-white/40 cursor-not-allowed"
      onclick={disabled}
      title="Coming soon"
    >
      Export viewport image (coming soon)
    </button>
  </div>
{/if}
