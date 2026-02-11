<script lang="ts">
  import SurfaceSelectionControls from './SurfaceSelectionControls.svelte';
  import SurfaceFileMenu from './SurfaceFileMenu.svelte';
  import type { ToolCursorMode } from './controllers/SurfaceCursorController';

  export let actionsBarEl: HTMLElement | null = null;
  export let coreMode = true;
  export let toolCursor: ToolCursorMode = 'select';
  export let createGeometryModalOpen = false;
  export let probeOn = false;
  export let maxTaperDeg = 8;
  export let selectionMode: 'none' | 'box' | 'lasso' = 'none';
  export let curveMode = false;
  export let selectedCount = 0;
  export let selectionProfile: 'precision' | 'assisted' = 'precision';
  export let createPrereqNotice: string | null = '';
  export let topCreateHint = '';
  export let fileNotice: string | null = null;
  export let canUndo = false;
  export let canRedo = false;
  export let minPointsFor = { line: 2, surface: 3 };
  export let pointsCount = 0;

  export let onToggleCoreMode: () => void = () => {};
  export let onSetToolCursor: (mode: ToolCursorMode) => void = () => {};
  export let onSetSelectionMode: (mode: 'none' | 'box' | 'lasso') => void = () => {};
  export let onToggleProbe: () => void = () => {};
  export let onSetSelectionProfile: (mode: 'precision' | 'assisted') => void = () => {};
  export let onClearSelection: () => void = () => {};
  export let onInvertSelection: () => void = () => {};
  export let onLoadFile: (file: File) => Promise<void> | void = () => {};
  export let onExportCSV: () => void = () => {};
  export let onExportSTEP: () => void = () => {};
  export let onOpenDatums: () => void = () => {};
  export let onOpenCreateGeometry: () => void = () => {};
  export let onOpenSurfaceCurveOps: () => void = () => {};
  export let onOpenExtrude: () => void = () => {};
  export let onOpenHealing: () => void = () => {};
  export let onOpenSettings: () => void = () => {};
  export let onUndo: () => void = () => {};
  export let onRedo: () => void = () => {};
</script>

<div class="flex items-center gap-2" bind:this={actionsBarEl}>
  <div class="glass-panel surface-tech-card surface-panel-slide surface-pop-card surface-depth-2 rounded-xl px-3 py-2 flex items-center gap-2">
    <div class="text-[10px] text-white/50 uppercase tracking-widest">Mode</div>
    <button
      class={coreMode ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'}
      onclick={onToggleCoreMode}
      title="Core Mode hides advanced controls by default"
    >
      {coreMode ? 'Core' : 'Advanced'}
    </button>
  </div>

  <div class="glass-panel surface-tech-card surface-panel-slide surface-pop-card surface-depth-2 rounded-xl px-2 py-2 flex flex-col items-start gap-1 min-w-[320px]">
    <div class="text-[10px] text-white/50 uppercase tracking-widest px-1">Create</div>
    <div class="flex items-center gap-1">
      <button
        class={toolCursor === 'select' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'}
        onclick={() => {
          onSetToolCursor('select');
          onSetSelectionMode('none');
        }}
        title="Select entities"
      >
        Select
      </button>
      <button
        class={createGeometryModalOpen ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-85'}
        onclick={() => {
          onSetToolCursor('select');
          onOpenCreateGeometry();
        }}
        title="Add point with exact XYZ"
      >
        Point
      </button>
      <button
        class={toolCursor === 'line' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'}
        onclick={() => onSetToolCursor('line')}
        title="Create lines by clicking points"
        disabled={pointsCount < minPointsFor.line}
      >
        Line
      </button>
      <button
        class={toolCursor === 'surface' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'}
        onclick={() => onSetToolCursor('surface')}
        title="Create surfaces from point picks"
        disabled={pointsCount < minPointsFor.surface}
      >
        Surface
      </button>
    </div>
    <div class={`px-1 text-[11px] ${createPrereqNotice ? 'text-amber-200/90' : 'text-white/55'}`}>{topCreateHint}</div>
  </div>

  <div class="glass-panel surface-tech-card surface-panel-slide surface-pop-card surface-depth-2 rounded-xl px-3 py-2 flex items-center gap-3">
    <div class="text-[11px] text-white/60 uppercase tracking-widest">Probe</div>
    <button
      class={probeOn
        ? 'px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs'
        : 'px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 text-xs'}
      onclick={onToggleProbe}
      title="Toggle fastener Go/No-Go overlay"
    >
      {probeOn ? 'On' : 'Off'}
    </button>
    {#if probeOn}
      <div class="flex items-center gap-2 border-l border-white/10 pl-3">
        <div class="text-[10px] text-white/50">Max</div>
        <input
          type="number"
          min="0"
          step="0.5"
          class="input input-sm w-16 bg-black/20 border border-white/10"
          bind:value={maxTaperDeg}
          title="Max taper angle (deg)"
        />
        <div class="text-[10px] text-white/50">°</div>
      </div>
    {/if}
  </div>

  <SurfaceSelectionControls
    {selectionMode}
    {curveMode}
    {selectedCount}
    setSelectionMode={onSetSelectionMode}
    clearSelection={onClearSelection}
    invertSelection={onInvertSelection}
  />

  <div class="glass-panel surface-pop-card surface-depth-1 rounded-xl px-2 py-2 flex items-center gap-1">
    <div class="text-[10px] text-white/50 uppercase tracking-widest px-1">Selection</div>
    <button
      class={selectionProfile === 'precision' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'}
      onclick={() => onSetSelectionProfile('precision')}
      title="Precision: tighter hit targets"
    >
      Precision
    </button>
    <button
      class={selectionProfile === 'assisted' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'}
      onclick={() => onSetSelectionProfile('assisted')}
      title="Assisted: larger hit targets"
    >
      Assisted
    </button>
  </div>

  <SurfaceFileMenu
    {onLoadFile}
    {onExportCSV}
    {onExportSTEP}
    {onOpenDatums}
    onOpenDrafting={onOpenCreateGeometry}
    {onOpenCreateGeometry}
    {onOpenSurfaceCurveOps}
    {onOpenExtrude}
    {onOpenHealing}
    {onOpenSettings}
    canExportSTEP={false}
    bind:fileNotice
  />

  <div class="glass-panel surface-pop-card surface-depth-1 rounded-xl px-2 py-2 flex items-center gap-2">
    <button class="btn btn-sm variant-soft" onclick={onUndo} disabled={!canUndo} title="Undo (Ctrl/Cmd+Z)">Undo</button>
    <button class="btn btn-sm variant-soft" onclick={onRedo} disabled={!canRedo} title="Redo (Ctrl/Cmd+Shift+Z)">Redo</button>
  </div>
</div>
