<script lang="ts">
  export let onZoomIn: () => void = () => {};
  export let onZoomOut: () => void = () => {};
  export let onFit: () => void = () => {};
  export let onReset: () => void = () => {};
  export let onPan: (dx: number, dy: number) => void = () => {};
  export let onRotate: (dx: number, dy: number) => void = () => {};
</script>

<div class="absolute left-4 top-4 z-20 pointer-events-auto rounded-xl border border-white/10 bg-slate-950/76 backdrop-blur-sm p-2 text-white/85">
  <div class="text-[10px] uppercase tracking-widest text-white/50 mb-1 px-1">Nav</div>
  <div class="grid grid-cols-3 gap-1 mb-1">
    <button class="btn btn-xs variant-soft" onclick={() => onRotate(0, -1)} title="Rotate up">R↑</button>
    <button class="btn btn-xs variant-soft" onclick={() => onPan(0, -20)} title="Pan up">↑</button>
    <button class="btn btn-xs variant-soft" onclick={() => onRotate(1, 0)} title="Rotate right">R→</button>
    <button class="btn btn-xs variant-soft" onclick={() => onRotate(-1, 0)} title="Rotate left">R←</button>
    <button class="btn btn-xs variant-soft" onclick={() => onPan(0, 20)} title="Pan down">↓</button>
    <button class="btn btn-xs variant-soft" onclick={() => onRotate(0, 1)} title="Rotate down">R↓</button>
    <button class="btn btn-xs variant-soft" onclick={() => onPan(-20, 0)} title="Pan left">←</button>
    <button class="btn btn-xs variant-soft" onclick={() => onPan(20, 0)} title="Pan right">→</button>
    <button class="btn btn-xs variant-soft" onclick={onFit} title="Fit">Fit</button>
  </div>
  <div class="flex gap-1">
    <button class="btn btn-xs variant-soft" onclick={onZoomIn} title="Zoom in">+</button>
    <button class="btn btn-xs variant-soft" onclick={onZoomOut} title="Zoom out">-</button>
    <button class="btn btn-xs variant-soft" onclick={onReset} title="Reset view">Reset</button>
  </div>
</div>
