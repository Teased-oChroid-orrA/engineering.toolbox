<script lang="ts">
  import { onMount } from 'svelte';
  import BushingFreePositionCard from './BushingFreePositionCard.svelte';
  import type { CardId, CardPosition, FreeLayoutV4 } from './BushingCardPositionController';
  import {
    loadFreeLayout,
    saveFreeLayout,
    resetToDefaultLayout,
    findOverlappingCards,
    DEFAULT_CARD_POSITIONS
  } from './BushingCardPositionController';
  
  // Props for all card content
  export let form: any;
  export let results: any;
  export let draftingView: any;
  export let useLegacyRenderer: boolean;
  export let renderMode: any;
  export let traceEnabled: boolean;
  export let cacheStats: any;
  export let babylonInitNotice: string | null;
  export let visualDiagnostics: any[];
  export let babylonDiagnostics: any[];
  export let onExportSvg: () => Promise<void>;
  export let onExportPdf: () => Promise<void>;
  export let toggleRendererMode: () => void;
  export let toggleTraceMode: () => void;
  export let handleBabylonInitFailure: (reason: string) => void;
  export let dndEnabled: boolean = true;
  export let showInformationView: boolean = false;
  export let isFailed: boolean = false;
  
  let layout: FreeLayoutV4;
  let overlappingCards: Record<CardId, boolean> = {} as Record<CardId, boolean>;
  
  // Initialize layout on mount
  onMount(() => {
    layout = loadFreeLayout();
    updateOverlappingCards();
  });
  
  function handlePositionChange(e: CustomEvent<{ cardId: string; position: CardPosition }>) {
    const { cardId, position } = e.detail;
    
    // Update layout
    layout = {
      ...layout,
      cards: {
        ...layout.cards,
        [cardId]: position
      }
    };
    
    // Save to localStorage
    saveFreeLayout(layout);
    
    // Update overlapping detection
    updateOverlappingCards();
  }
  
  function updateOverlappingCards() {
    if (!layout) return;
    
    const newOverlapping: Record<CardId, boolean> = {} as Record<CardId, boolean>;
    
    for (const cardId of Object.keys(layout.cards) as CardId[]) {
      const overlaps = findOverlappingCards(cardId, layout.cards[cardId], layout.cards);
      newOverlapping[cardId] = overlaps.length > 0;
    }
    
    overlappingCards = newOverlapping;
  }
  
  function handleResetLayout() {
    if (confirm('Reset all cards to default positions?')) {
      layout = resetToDefaultLayout();
      updateOverlappingCards();
    }
  }
  
  // Reactive statement to ensure layout is initialized
  $: if (!layout) {
    layout = {
      version: 4,
      mode: 'free',
      cards: { ...DEFAULT_CARD_POSITIONS }
    };
  }
</script>

<div class="bushing-free-container">
  <!-- Control bar -->
  <div class="control-bar">
    <div class="control-info">
      <span class="control-label">Free Positioning Mode</span>
      <span class="control-hint">Drag cards anywhere to customize layout</span>
    </div>
    <button class="reset-button" on:click={handleResetLayout} title="Reset to default layout">
      Reset Layout
    </button>
  </div>
  
  <!-- Cards container -->
  <div class="cards-area">
    {#if layout}
      <!-- Slot props for each card will be passed from orchestrator -->
      <BushingFreePositionCard
        cardId="header"
        position={layout.cards.header}
        isDraggable={dndEnabled}
        isOverlapping={overlappingCards.header || false}
        on:positionChange={handlePositionChange}>
        <slot name="header" />
      </BushingFreePositionCard>
      
      <BushingFreePositionCard
        cardId="guidance"
        position={layout.cards.guidance}
        isDraggable={dndEnabled}
        isOverlapping={overlappingCards.guidance || false}
        on:positionChange={handlePositionChange}>
        <slot name="guidance" />
      </BushingFreePositionCard>
      
      <BushingFreePositionCard
        cardId="setup"
        position={layout.cards.setup}
        isDraggable={dndEnabled}
        isOverlapping={overlappingCards.setup || false}
        on:positionChange={handlePositionChange}>
        <slot name="setup" />
      </BushingFreePositionCard>
      
      <BushingFreePositionCard
        cardId="geometry"
        position={layout.cards.geometry}
        isDraggable={dndEnabled}
        isOverlapping={overlappingCards.geometry || false}
        on:positionChange={handlePositionChange}>
        <slot name="geometry" />
      </BushingFreePositionCard>
      
      <BushingFreePositionCard
        cardId="profile"
        position={layout.cards.profile}
        isDraggable={dndEnabled}
        isOverlapping={overlappingCards.profile || false}
        on:positionChange={handlePositionChange}>
        <slot name="profile" />
      </BushingFreePositionCard>
      
      <BushingFreePositionCard
        cardId="process"
        position={layout.cards.process}
        isDraggable={dndEnabled}
        isOverlapping={overlappingCards.process || false}
        on:positionChange={handlePositionChange}>
        <slot name="process" />
      </BushingFreePositionCard>
      
      <BushingFreePositionCard
        cardId="drafting"
        position={layout.cards.drafting}
        isDraggable={dndEnabled}
        isOverlapping={overlappingCards.drafting || false}
        on:positionChange={handlePositionChange}>
        <slot name="drafting" />
      </BushingFreePositionCard>
      
      <BushingFreePositionCard
        cardId="summary"
        position={layout.cards.summary}
        isDraggable={dndEnabled}
        isOverlapping={overlappingCards.summary || false}
        on:positionChange={handlePositionChange}>
        <slot name="summary" />
      </BushingFreePositionCard>
      
      <BushingFreePositionCard
        cardId="diagnostics"
        position={layout.cards.diagnostics}
        isDraggable={dndEnabled}
        isOverlapping={overlappingCards.diagnostics || false}
        on:positionChange={handlePositionChange}>
        <slot name="diagnostics" />
      </BushingFreePositionCard>
    {/if}
  </div>
</div>

<style>
  .bushing-free-container {
    position: relative;
    width: 100%;
    min-height: 100vh;
    padding: 1rem;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  }
  
  .control-bar {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(8px);
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    border: 1px solid rgba(139, 92, 246, 0.2);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .control-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }
  
  .control-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: rgba(139, 92, 246, 0.9);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .control-hint {
    font-size: 0.75rem;
    color: rgba(148, 163, 184, 0.8);
  }
  
  .reset-button {
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.2));
    color: rgba(139, 92, 246, 0.9);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .reset-button:hover {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(99, 102, 241, 0.3));
    border-color: rgba(139, 92, 246, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(139, 92, 246, 0.2);
  }
  
  .reset-button:active {
    transform: translateY(0);
  }
  
  .cards-area {
    position: relative;
    width: 100%;
    min-height: 1500px;
    /* Grid pattern background for visual guidance */
    background-image: 
      linear-gradient(rgba(139, 92, 246, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(139, 92, 246, 0.05) 1px, transparent 1px);
    background-size: 50px 50px;
  }
</style>
