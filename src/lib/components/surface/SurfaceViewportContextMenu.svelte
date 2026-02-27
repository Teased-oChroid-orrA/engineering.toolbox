<script lang="ts">
  // Viewport right-click menu (Svelte 5 runes mode). UI-only.
  // SurfaceToolbox owns camera state and passes callbacks.

  type Props = {
    open: boolean;
    x: number;
    y: number;
    targetKind?: 'point' | 'line' | 'empty';
    targetIndex?: number | null;
    onFitToScreen?: () => void;
    onResetView?: () => void;
    onDeletePointCascade?: (idx: number) => void;
    onDeleteLineOnly?: (idx: number) => void;
    onConnectFromPoint?: (idx: number) => void;
    onConnectToPoint?: (idx: number) => void;
    onIsolateFromPoint?: (idx: number) => void;
    onIsolateFromLine?: (idx: number) => void;
    onClearIsolation?: () => void;
    onClose: () => void;
  };

  let {
    open,
    x,
    y,
    targetKind = 'empty',
    targetIndex = null,
    onFitToScreen,
    onResetView,
    onDeletePointCascade,
    onDeleteLineOnly,
    onConnectFromPoint,
    onConnectToPoint,
    onIsolateFromPoint,
    onIsolateFromLine,
    onClearIsolation,
    onClose
  }: Props = $props();

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

    {#if targetKind === 'point' && targetIndex !== null}
      <div class="px-3 py-1 text-[11px] text-cyan-200/80">Point P{targetIndex + 1}</div>
      <button
        class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm text-white/80"
        onclick={() => {
          onConnectFromPoint?.(targetIndex);
          onClose();
        }}
      >
        Connect from this point
      </button>
      <button
        class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm text-white/80"
        onclick={() => {
          onConnectToPoint?.(targetIndex);
          onClose();
        }}
      >
        Connect to this point
      </button>
      <button
        class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm text-white/80"
        onclick={() => {
          onIsolateFromPoint?.(targetIndex);
          onClose();
        }}
      >
        Isolate connected lines
      </button>
      <button
        class="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/15 text-sm text-rose-200"
        onclick={() => {
          onDeletePointCascade?.(targetIndex);
          onClose();
        }}
      >
        Delete point (cascade)
      </button>
    {:else if targetKind === 'line' && targetIndex !== null}
      <div class="px-3 py-1 text-[11px] text-cyan-200/80">Line L{targetIndex + 1}</div>
      <button
        class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm text-white/80"
        onclick={() => {
          onIsolateFromLine?.(targetIndex);
          onClose();
        }}
      >
        Isolate endpoint neighborhood
      </button>
      <button
        class="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/15 text-sm text-rose-200"
        onclick={() => {
          onDeleteLineOnly?.(targetIndex);
          onClose();
        }}
      >
        Delete line only
      </button>
    {:else}
      <button
        class="w-full text-left px-3 py-2 rounded-lg text-sm text-white/40 cursor-not-allowed"
        onclick={disabled}
        title="Right-click on a point or line for entity actions"
      >
        Entity actions unavailable here
      </button>
    {/if}
    <button
      class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm text-white/80"
      onclick={() => {
        onClearIsolation?.();
        onClose();
      }}
    >
      Clear isolation
    </button>
  </div>
{/if}
