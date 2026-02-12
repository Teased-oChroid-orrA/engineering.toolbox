<script lang="ts">
  import type { BushingInputs, BushingOutput } from '$lib/core/bushing';
  import type { BabylonRenderDiagnostic } from '$lib/drafting/bushing/BushingBabylonRuntime';
  import type { BushingRenderMode } from '$lib/drafting/bushing/bushingSceneModel';
  import { canMoveInList, moveCardInList } from './BushingCardLayoutController';
  import BushingSortableLane from './BushingSortableLane.svelte';
  import BushingDraggableCard from './BushingDraggableCard.svelte';
  import BushingDraftingPanel from './BushingDraftingPanel.svelte';
  import BushingResultSummary from './BushingResultSummary.svelte';
  import BushingDiagnosticsPanel from './BushingDiagnosticsPanel.svelte';

  export let items: Array<{ id: string }> = [];
  export let dndEnabled = true;
  export let form: BushingInputs;
  export let results: BushingOutput;
  export let draftingView: any;
  export let useLegacyRenderer = false;
  export let renderMode: BushingRenderMode = 'section';
  export let traceEnabled = false;
  export let cacheHits = 0;
  export let cacheMisses = 0;
  export let isInfinitePlate = false;
  export let babylonInitNotice: string | null = null;
  export let visualDiagnostics: any[] = [];
  export let babylonDiagnostics: BabylonRenderDiagnostic[] = [];
  export let onReorder: (items: Array<{ id: string }>) => void;
  export let onExportSvg: () => Promise<void>;
  export let onExportPdf: () => Promise<void>;
  export let onToggleRendererMode: () => void;
  export let onToggleTraceMode: () => void;
  export let onBabylonDiagnostics: (diag: BabylonRenderDiagnostic[]) => void;
  export let onBabylonInitFailure: (reason: string) => void;

  function ids(): string[] {
    return items.map((item) => item.id);
  }

  function canMove(id: string, direction: -1 | 1): boolean {
    return canMoveInList(ids(), id, direction);
  }

  function move(id: string, direction: -1 | 1): void {
    const next = moveCardInList(ids(), id, direction).map((itemId) => ({ id: itemId }));
    items = next; // FIX: UPDATE LOCAL STATE
    onReorder(next);
  }

  function handleConsider(ev: CustomEvent<{ items: Array<{ id: string }> }>) {
    items = ev.detail.items; // FIX: UPDATE LOCAL STATE
    onReorder(ev.detail.items);
  }

  function handleFinalize(ev: CustomEvent<{ items: Array<{ id: string }> }>) {
    items = ev.detail.items; // FIX: UPDATE LOCAL STATE
    onReorder(ev.detail.items);
  }
</script>

<BushingSortableLane
  listClass="flex flex-col gap-4"
  laneType="bushing-top-right"
  {items}
  enabled={dndEnabled}
  on:consider={handleConsider}
  on:finalize={handleFinalize}
  let:item>
  {#if item.id === 'drafting'}
    <BushingDraggableCard 
      column="right" 
      cardId="drafting" 
      title="Drafting View" 
      dragEnabled={dndEnabled} 
      canMoveUp={canMove('drafting', -1)} 
      canMoveDown={canMove('drafting', 1)} 
      onMoveUp={() => move('drafting', -1)} 
      onMoveDown={() => move('drafting', 1)}>
      <BushingDraftingPanel
        {draftingView}
        {useLegacyRenderer}
        {renderMode}
        {traceEnabled}
        {cacheHits}
        {cacheMisses}
        {isInfinitePlate}
        {babylonInitNotice}
        {visualDiagnostics}
        {babylonDiagnostics}
        {onExportSvg}
        {onExportPdf}
        {onToggleRendererMode}
        {onToggleTraceMode}
        {onBabylonDiagnostics}
        {onBabylonInitFailure}
      />
    </BushingDraggableCard>
  {:else if item.id === 'summary'}
    <BushingDraggableCard 
      column="right" 
      cardId="summary" 
      title="Results Panel" 
      dragEnabled={dndEnabled} 
      canMoveUp={canMove('summary', -1)} 
      canMoveDown={canMove('summary', 1)} 
      onMoveUp={() => move('summary', -1)} 
      onMoveDown={() => move('summary', 1)}>
      <BushingResultSummary {form} {results} />
    </BushingDraggableCard>
  {:else if item.id === 'diagnostics'}
    <BushingDraggableCard 
      column="right" 
      cardId="diagnostics" 
      title="Diagnostics" 
      dragEnabled={dndEnabled} 
      canMoveUp={canMove('diagnostics', -1)} 
      canMoveDown={canMove('diagnostics', 1)} 
      onMoveUp={() => move('diagnostics', -1)} 
      onMoveDown={() => move('diagnostics', 1)}>
      <BushingDiagnosticsPanel {results} dndEnabled={dndEnabled} />
    </BushingDraggableCard>
  {/if}
</BushingSortableLane>