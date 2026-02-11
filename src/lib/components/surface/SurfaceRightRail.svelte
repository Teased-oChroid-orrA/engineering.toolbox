<script lang="ts">
  import SurfaceWorkflowGuideCard from './SurfaceWorkflowGuideCard.svelte';
  import SurfaceStatusRail from './SurfaceStatusRail.svelte';
  import SurfaceFitPanel from './SurfaceFitPanel.svelte';
  import SurfaceDatumSliceExportPanel from './SurfaceDatumSliceExportPanel.svelte';
  import SurfaceSlicingRecommendationRail from './SurfaceSlicingRecommendationRail.svelte';
  import SurfaceInterpolationPanel from './SurfaceInterpolationPanel.svelte';
  import SurfaceOffsetIntersectionPanel from './SurfaceOffsetIntersectionPanel.svelte';
  import SurfaceRecipesPanel from './SurfaceRecipesPanel.svelte';
  import CurveEdgesLoftPanel from './CurveEdgesLoftPanel.svelte';
  import SurfaceSamplerPanel from './SurfaceSamplerPanel.svelte';
  export let rightRailCollapsed = false;
  export let coreMode = true;
  export let advancedOpen = false;
  export let datumSliceBusy = false;
  export let pointsCount = 0;
  export let edgesCount = 0;
  export let surfacesCount = 0;
  export let statusWarnings: any[] = [];
  export let SURFACE_ANALYTICS_ENABLED = false;
  export let interpPct = 50;
  export let interpPoint: any = null;
  export let edges: any[] = [];
  export let points: any[] = [];
  export let selEdgeA: number | null = 0;
  export let selEdgeB: number | null = 1;
  export let offsetDist = 5;
  export let refPointIdx = 0;
  export let intersection: any = null;
  export let intersectionBusy = false;
  export let intersectionDiagnostics: any = null;
  export let evalUseSelection = true;
  export let heatmapOn = false;
  export let evalTol = 0;
  export let evalSigmaMult = 3;
  export let evalBusy = false;
  export let evalErr: string | null = null;
  export let evalRes: any = null;
  export let pendingPointIdx: number | null = null;
  export let cylUseSelection = true;
  export let cylShowAxis = true;
  export let cylBusy = false;
  export let cylErr: string | null = null;
  export let cylRes: any = null;
  export let cylRefineK = 2;
  export let cylThresholdAbs: any = 0;
  export let currentActiveFitPointIds: any = [];
  export let selectedPointIds: number[] = [];
  export let cylFitPointIds: number[] = [];
  export let sliceAxis: 'x' | 'y' | 'z' = 'x';
  export let sliceBins = 24;
  export let sliceThickness = 0;
  export let sliceMetric: 'p95' | 'rms' = 'p95';
  export let sliceBusy = false;
  export let sliceErr: string | null = null;
  export let sliceRes: any = null;
  export let datumPlaneChoices: any[] = [];
  export let datumSlicePlaneIdx = 0;
  export let datumSliceMode: any = 'fixed_spacing';
  export let datumSliceSpacing = 5;
  export let datumSliceCount = 24;
  export let datumSliceThickness = 0;
  export let datumSliceUseSelection = true;
  export let includeOptionalSliceColumns = false;
  export let datumSliceErr: string | null = null;
  export let datumSliceRes: any = null;
  export let sliceSyncModel: any = null;
  export let selectedSliceId: any = null;
  export let recipes: any[] = [];
  export let selectedRecipeId: string | null = null;
  export let recipeNameDraft = '';
  export let recipeStepConfirmed = false;
  export let recipeRun: any = null;
  export let activeEdgeIdx: number | null = null;
  export let curves: any[] = [];
  export let activeCurveIdx: number | null = null;
  export let curveMode = false;
  export let loftA: number | null = null;
  export let loftB: number | null = null;
  export let loftSegmentsCount = 0;
  export let loftErr: string | null = null;
  export let toolCursor: any = 'select';
  export let samplerAppend = true;
  export let samplerMode: 'quad' | 'edges' = 'quad';
  export let samplerNu = 12;
  export let samplerNv = 12;
  export let samplerEdgeSegs = 8;
  export let samplerErr: string | null = null;

  export let onSetRightRailCollapsed: (v: boolean) => void = () => {};
  export let onOpenCreateGeometry: () => void = () => {};
  export let onOpenDatums: () => void = () => {};
  export let onOpenSettings: () => void = () => {};
  export let onClearPicks: () => void = () => {};
  export let onToggleAdvancedOpen: () => void = () => {};
  export let onClearWarnings: () => void = () => {};
  export let computeSurfaceEval: () => Promise<void> | void = () => {};
  export let computeCylinderFit: () => Promise<void> | void = () => {};
  export let cylSelectOutliers: () => void = () => {};
  export let cylKeepInliers: () => void = () => {};
  export let cylRemoveOutliers: () => void = () => {};
  export let computeSectionSlices: () => Promise<void> | void = () => {};
  export let computeDatumSlices: () => Promise<void> | void = () => {};
  export let exportDatumSliceCombined: () => void = () => {};
  export let calcOffsetIntersection: () => Promise<void> | void = () => {};
  export let saveCurrentRecipe: () => void = () => {};
  export let deleteSelectedRecipe: () => void = () => {};
  export let selectRecipe: (id: string) => void = () => {};
  export let toggleSelectedRecipeStep: (...args: any[]) => void = () => {};
  export let startRecipeRun: () => Promise<void> | void = () => {};
  export let runRecipeNextStep: () => Promise<void> | void = () => {};
  export let cancelRecipeRun: () => void = () => {};
  export let setActiveEdgeIdx: (v: number | null) => void = () => {};
  export let deleteEdge: (idx: number) => void = () => {};
  export let setActiveCurveIdx: (v: number | null) => void = () => {};
  export let deleteCurve: (idx: number) => void = () => {};
  export let createCurve: () => void = () => {};
  export let setLoftA: (v: number | null) => void = () => {};
  export let setLoftB: (v: number | null) => void = () => {};
  export let rebuildLoftSegments: () => void = () => {};
  export let setToolCursor: (mode: any) => void = () => {};
  export let generateSamplerPoints: () => Promise<void> | void = () => {};
</script>

<aside class={`glass-panel surface-tech-card surface-panel-slide surface-reveal surface-stagger-1 rounded-2xl ${rightRailCollapsed ? 'p-2' : 'p-5'} space-y-5`}>
  {#if rightRailCollapsed}
    <div class="h-full flex flex-col items-center gap-2 pt-2">
      <button class="btn btn-xs variant-soft w-10" title="Expand tools" onclick={() => onSetRightRailCollapsed(false)}>»</button>
      <button class="btn btn-xs variant-soft w-10" title="Create Geometry" onclick={onOpenCreateGeometry}>＋</button>
      <button class="btn btn-xs variant-soft w-10" title="Datums" onclick={onOpenDatums}>D</button>
      <button class="btn btn-xs variant-soft w-10" title="Settings" onclick={onOpenSettings}>⚙</button>
    </div>
  {:else}
    <div class="flex items-center justify-between">
      <div>
        <div class="text-xs font-semibold uppercase tracking-widest text-white/60">Geometry</div>
        <div class="text-[11px] text-white/40">Points: {pointsCount} • Edges: {edgesCount} • Surfaces: {surfacesCount}</div>
      </div>
      <button class="btn btn-sm variant-soft" onclick={onClearPicks}>Clear picks</button>
    </div>
    <div class="flex items-center justify-end">
      <button class="btn btn-xs variant-soft" title="Collapse tools panel" onclick={() => onSetRightRailCollapsed(true)}>Collapse</button>
    </div>

    <div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-[11px] text-white/55 surface-panel-slide surface-pop-card surface-depth-1">
      {#if coreMode}
        Core Mode is active. Advanced controls are hidden for focused workflow.
      {:else}
        Advanced mode is active. Expand advanced controls only when needed.
      {/if}
    </div>

    <div class="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-2 text-[11px] text-white/70 surface-panel-slide surface-pop-card surface-depth-1">
      <div class="text-[10px] uppercase tracking-widest text-white/50">Core Flow</div>
      <div>1. Add explicit points.</div>
      <div>2. Create lines from existing points.</div>
      <div>3. Create triangle/quad/contour surfaces.</div>
    </div>

    <SurfaceWorkflowGuideCard pointsCount={pointsCount} {datumSliceBusy} />
    <SurfaceStatusRail warnings={statusWarnings} clearWarnings={onClearWarnings} />

    {#if SURFACE_ANALYTICS_ENABLED}
      <SurfaceFitPanel
        bind:evalUseSelection
        bind:heatmapOn
        bind:evalTol
        bind:evalSigmaMult
        {computeSurfaceEval}
        {evalBusy}
        {evalErr}
        {evalRes}
        bind:pendingPointIdx
        bind:cylUseSelection
        bind:cylShowAxis
        {computeCylinderFit}
        {cylBusy}
        {cylErr}
        {cylRes}
        bind:cylRefineK
        {cylSelectOutliers}
        {cylKeepInliers}
        {cylRemoveOutliers}
        {cylThresholdAbs}
        activeFitPointIds={currentActiveFitPointIds}
        {selectedPointIds}
        {cylFitPointIds}
        bind:sliceAxis
        bind:sliceBins
        bind:sliceThickness
        bind:sliceMetric
        {computeSectionSlices}
        {sliceBusy}
        {sliceErr}
        {sliceRes}
        pointsCount={pointsCount}
      />

      <SurfaceDatumSliceExportPanel
        {datumPlaneChoices}
        bind:datumSlicePlaneIdx
        bind:datumSliceMode
        bind:datumSliceSpacing
        bind:datumSliceCount
        bind:datumSliceThickness
        bind:datumSliceUseSelection
        bind:includeOptionalSliceColumns
        {datumSliceBusy}
        {datumSliceErr}
        {datumSliceRes}
        computeDatumPlaneSlices={computeDatumSlices}
        {exportDatumSliceCombined}
      />

      <SurfaceSlicingRecommendationRail
        model={sliceSyncModel}
        onSelectSlice={(id) => {
          selectedSliceId = id;
        }}
      />
    {/if}

    <SurfaceInterpolationPanel bind:interpPct {interpPoint} />
    <SurfaceOffsetIntersectionPanel
      {edges}
      {points}
      bind:selEdgeA
      bind:selEdgeB
      bind:offsetDist
      bind:refPointIdx
      {intersection}
      {intersectionBusy}
      {intersectionDiagnostics}
      {calcOffsetIntersection}
    />

    {#if !coreMode}
      <div class="rounded-2xl border border-white/10 bg-black/15 overflow-hidden">
        <button class="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5" onclick={onToggleAdvancedOpen} title="Advanced controls">
          <span class="text-[11px] font-semibold uppercase tracking-widest text-white/60">Advanced</span>
          <span class="text-[11px] text-white/50">{advancedOpen ? 'Hide' : 'Show'}</span>
        </button>
        {#if advancedOpen}
          <div class="p-4 space-y-4 border-t border-white/10">
            <SurfaceRecipesPanel
              {recipes}
              bind:selectedRecipeId
              bind:recipeNameDraft
              bind:stepConfirmed={recipeStepConfirmed}
              runState={recipeRun}
              onSaveCurrent={saveCurrentRecipe}
              onDeleteSelected={deleteSelectedRecipe}
              onSelectRecipe={selectRecipe}
              onToggleStep={toggleSelectedRecipeStep}
              onStartRun={startRecipeRun}
              onRunNext={runRecipeNextStep}
              onCancelRun={cancelRecipeRun}
            />

            <CurveEdgesLoftPanel
              {edges}
              {activeEdgeIdx}
              {setActiveEdgeIdx}
              {deleteEdge}
              {curves}
              {activeCurveIdx}
              {setActiveCurveIdx}
              {deleteCurve}
              {createCurve}
              {curveMode}
              toggleCurveMode={() => {
                if (toolCursor === 'curve') setToolCursor('select');
                else setToolCursor('curve');
              }}
              {loftA}
              {loftB}
              {setLoftA}
              {setLoftB}
              {rebuildLoftSegments}
              {loftSegmentsCount}
              {loftErr}
            />

            <SurfaceSamplerPanel
              bind:samplerAppend
              bind:samplerMode
              bind:samplerNu
              bind:samplerNv
              bind:samplerEdgeSegs
              bind:samplerErr
              onGenerate={generateSamplerPoints}
            />
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</aside>
