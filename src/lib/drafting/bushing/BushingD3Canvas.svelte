<script lang="ts">
  import type { CanonicalDraftScene } from './BushingDraftRenderer';
  import { buildBushingSectionProfile } from './bushingSectionProfileBuilder';
  import type { BushingRenderMode, BushingScene } from './bushingSceneModel';
  import type { BushingRenderDiagnostic } from './BushingRenderTypes';

  let {
    scene,
    sectionScene,
    renderMode = 'section',
    onDiagnostics = () => {},
    onInitFailure = () => {},
    viewModel
  }: {
    scene: CanonicalDraftScene;
    sectionScene: BushingScene;
    renderMode?: BushingRenderMode;
    onDiagnostics?: (diag: BushingRenderDiagnostic[]) => void;
    onInitFailure?: (reason: string) => void;
    viewModel?: any;
  } = $props();

  const SECTION_SIZE = 660;
  type DimensionKey = 'od' | 'id' | 'length' | 'flange' | 'extCs' | 'intCs';

  let zoom = $state(1);
  let showViews = $state(true);
  let selectedDimension = $state<DimensionKey>('od');
  let previousGeometrySig = $state('');
  let isLegacyView = $derived(renderMode === 'legacy');

  let featureState = $derived.by(() => {
    const bore = Math.max(0.01, Number(viewModel?.boreDia ?? sectionScene.width * 0.25));
    const inner = Math.max(0.01, Number(viewModel?.idBushing ?? bore * 0.82));
    const length = Math.max(0.01, Number(viewModel?.housingLen ?? sectionScene.height));
    const outer = Math.max(bore + 0.02, Number(viewModel?.geometry?.odBushing ?? sectionScene.width * 0.55));
    const isFlanged = String(viewModel?.bushingType ?? '') === 'flanged';
    const flangeThkRaw = Math.max(0, Number(viewModel?.flangeThk ?? 0));
    const flangeThk = isFlanged ? flangeThkRaw : 0;
    const flangeOd = Math.max(outer, Number(viewModel?.flangeOd ?? outer));
    const extCs = String(viewModel?.bushingType ?? '') === 'countersink'
      ? (viewModel?.csSolved?.od ?? viewModel?.geometry?.csExternal ?? null)
      : null;
    const intCs = String(viewModel?.idType ?? '') === 'countersink'
      ? (viewModel?.csSolved?.id ?? viewModel?.geometry?.csInternal ?? null)
      : null;
    return { bore, inner, length, outer, isFlanged, flangeThk, flangeOd, extCs, intCs };
  });

  let sectionBuild = $derived.by(() => {
    try {
      return buildBushingSectionProfile((viewModel ?? {}) as any);
    } catch {
      return null;
    }
  });

  let sharedGeometryScale = $derived.by(() => {
    const build = sectionBuild;
    if (!build) return null;
    const sectionBandTop = 270;
    const sectionBandBottom = SECTION_SIZE - 82;
    const sidePad = 84;
    const usableW = SECTION_SIZE - sidePad * 2;
    const usableH = sectionBandBottom - sectionBandTop;
    return Math.min(
      usableW / Math.max(build.dims.width, 1e-6),
      usableH / Math.max(build.dims.height, 1e-6)
    );
  });

  let sectionView = $derived.by(() => {
    const build = sectionBuild;
    const scale = sharedGeometryScale;
    if (!build || !scale) return null;
    const sectionBandTop = 270;
    const sectionBandBottom = SECTION_SIZE - 82;
    const centerZ = (build.dims.zTop + build.dims.zBottom) / 2;
    return {
      scale,
      tx: SECTION_SIZE * 0.5,
      ty: (sectionBandTop + sectionBandBottom) / 2 - centerZ * scale
    };
  });

  let topPlanView = $derived.by(() => {
    const build = sectionBuild;
    const scale = sharedGeometryScale;
    if (!build || !scale) return null;
    const centerX = SECTION_SIZE * 0.5;
    const outerFaceDia = featureState.isFlanged
      ? featureState.flangeOd
      : featureState.extCs?.dia
        ? Number(featureState.extCs.dia)
        : featureState.outer;
    const innerFaceDia = featureState.intCs?.dia
      ? Number(featureState.intCs.dia)
      : Math.max(featureState.inner, featureState.bore);
    const rHousingOuter = build.dims.rHousing * scale;
    const rHousingOpening = build.dims.rInner * scale;
    const rBushingOuter = (outerFaceDia / 2) * scale;
    const rBushingInner = (innerFaceDia / 2) * scale;
    const maxRadius = Math.max(rHousingOuter, rBushingOuter, rBushingInner, 1e-6);
    const panelW = Math.max(176, maxRadius * 2 + 34);
    const panelH = Math.max(164, maxRadius * 2 + 44);
    const panel = { x: Math.max(28, Math.min(SECTION_SIZE - panelW - 160, centerX - panelW / 2)), y: 46, w: panelW, h: panelH };
    return {
      panel,
      cx: centerX,
      cy: panel.y + panel.h * 0.58,
      rHousingOuter,
      rHousingOpening,
      rBushingOuter,
      rBushingInner,
      outerFaceDia,
      innerFaceDia
    };
  });

  let dimensionalLabels = $derived.by(() => {
    const { bore, inner, length, outer, flangeOd, flangeThk, extCs, intCs } = featureState;
    return {
      bore: bore.toFixed(3),
      inner: inner.toFixed(3),
      outer: outer.toFixed(3),
      length: length.toFixed(3),
      flangeOd: flangeOd.toFixed(3),
      flangeThk: flangeThk.toFixed(3),
      extCsDia: extCs?.dia ? Number(extCs.dia).toFixed(3) : '---',
      extCsDepth: extCs?.depth ? Number(extCs.depth).toFixed(3) : '---',
      intCsDia: intCs?.dia ? Number(intCs.dia).toFixed(3) : '---'
    };
  });

  function setDimensionFocus(next: DimensionKey) {
    selectedDimension = next;
  }

  function highlightColor(dim: DimensionKey): string {
    if (selectedDimension !== dim) return 'rgba(148,163,184,0.72)';
    if (dim === 'od' || dim === 'flange') return '#cbd5e1';
    if (dim === 'id' || dim === 'intCs') return '#5eead4';
    if (dim === 'length') return '#93c5fd';
    return '#f0abfc';
  }

  function highlightOpacity(dim: DimensionKey): number {
    return selectedDimension === dim ? 1 : 0.62;
  }

  $effect(() => {
    const state = featureState;
    const sigObj = {
      bore: state.bore,
      inner: state.inner,
      length: state.length,
      outer: state.outer,
      flangeOd: state.flangeOd,
      flangeThk: state.flangeThk,
      isFlanged: state.isFlanged,
      extCsDia: state.extCs?.dia ?? null,
      extCsDepth: state.extCs?.depth ?? null,
      intCsDia: state.intCs?.dia ?? null,
      bushingType: viewModel?.bushingType ?? '',
      idType: viewModel?.idType ?? ''
    };
    const next = JSON.stringify(sigObj);
    if (!previousGeometrySig) {
      previousGeometrySig = next;
      return;
    }
    if (next === previousGeometrySig) return;
    const prev = JSON.parse(previousGeometrySig) as Record<string, unknown>;
    const changed = Object.keys(sigObj).filter((key) => JSON.stringify((sigObj as Record<string, unknown>)[key]) !== JSON.stringify(prev[key]));
    if (changed.some((key) => key.startsWith('extCs') || key === 'bushingType')) {
      selectedDimension = state.extCs ? 'extCs' : state.isFlanged ? 'flange' : 'od';
    } else if (changed.some((key) => key.startsWith('intCs') || key === 'idType')) {
      selectedDimension = state.intCs ? 'intCs' : 'id';
    } else if (changed.includes('flangeOd') || changed.includes('flangeThk') || changed.includes('isFlanged')) {
      selectedDimension = state.isFlanged ? 'flange' : 'od';
    } else if (changed.includes('length')) {
      selectedDimension = 'length';
    } else if (changed.includes('outer')) {
      selectedDimension = 'od';
    } else if (changed.includes('bore') || changed.includes('inner')) {
      selectedDimension = 'id';
    }
    previousGeometrySig = next;
  });

  function diagnosticsForScene(): BushingRenderDiagnostic[] {
    return [
      {
        severity: 'info',
        code: 'D3_RENDER_SUMMARY',
        message: `D3 loops: ${scene.loops.length} • ${isLegacyView ? 'legacy outline drafting' : `upright 2D section + ${showViews ? 'top view inset' : 'section only'}`}`
      },
      {
        severity: 'info',
        code: 'D3_INTERACTION_HINT',
        message: 'Use + / - to zoom, Reset to reframe, Top toggle to show or hide the inset, and the dimension chips to focus callouts.'
      }
    ];
  }

  $effect(() => {
    try {
      onDiagnostics(diagnosticsForScene());
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown D3 render error.';
      onInitFailure(reason);
    }
  });

  $effect(() => {
    showViews = !isLegacyView;
  });
</script>

<div class="relative h-full w-full overflow-hidden rounded-xl">
  <svg
    data-bushing-export-root="true"
    viewBox={`0 0 ${SECTION_SIZE} ${SECTION_SIZE}`}
    class="h-full w-full rounded-xl"
    style={`transform: scale(${zoom}); transform-origin: center center;`}>
    <defs>
      <pattern id="d3HousingHatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
        <rect width="10" height="10" fill="rgba(107,127,147,0.06)" />
        <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(203,213,225,0.22)" stroke-width="2" />
      </pattern>
      <pattern id="d3BushingHatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
        <rect width="10" height="10" fill="rgba(14,61,67,0.08)" />
        <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(94,234,212,0.26)" stroke-width="2" />
      </pattern>
      <pattern id="d3FlangeHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(55)">
        <rect width="8" height="8" fill="rgba(8,41,46,0.12)" />
        <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(147,197,253,0.26)" stroke-width="1.8" />
      </pattern>
    </defs>

    <rect width={SECTION_SIZE} height={SECTION_SIZE} rx="18" fill="rgba(2, 16, 28, 0.96)" />

    {#if sectionBuild && sectionView && !isLegacyView}
      <g transform={`translate(${sectionView.tx} ${sectionView.ty}) scale(${sectionView.scale} ${sectionView.scale})`} opacity="0.96">
        <line
          x1="0"
          y1={sectionBuild.dims.zTop - featureState.length * 0.18}
          x2="0"
          y2={sectionBuild.dims.zBottom + featureState.length * 0.18}
          stroke="#7dd3fc"
          stroke-width={1 / sectionView.scale}
          stroke-dasharray={`${8 / sectionView.scale} ${8 / sectionView.scale}`}
          opacity="0.38" />
        <path
          d={sectionBuild.paths.leftHousingPath}
          fill="url(#d3HousingHatch)"
          stroke={highlightColor('od')}
          stroke-width={(selectedDimension === 'od' ? 1.8 : 1.1) / sectionView.scale}
          opacity={highlightOpacity('od')} />
        <path
          d={sectionBuild.paths.rightHousingPath}
          fill="url(#d3HousingHatch)"
          stroke={highlightColor('od')}
          stroke-width={(selectedDimension === 'od' ? 1.8 : 1.1) / sectionView.scale}
          opacity={highlightOpacity('od')} />
        <path
          d={sectionBuild.paths.leftBushingPath}
          fill={featureState.isFlanged ? 'url(#d3FlangeHatch)' : 'url(#d3BushingHatch)'}
          stroke={featureState.isFlanged ? highlightColor('flange') : highlightColor('id')}
          stroke-width={((featureState.isFlanged && selectedDimension === 'flange') || (!featureState.isFlanged && selectedDimension === 'id') ? 1.8 : 1.1) / sectionView.scale}
          opacity={featureState.isFlanged ? highlightOpacity('flange') : highlightOpacity('id')} />
        <path
          d={sectionBuild.paths.rightBushingPath}
          fill="url(#d3BushingHatch)"
          stroke={highlightColor(featureState.extCs ? 'extCs' : 'id')}
          stroke-width={((featureState.extCs && selectedDimension === 'extCs') || (!featureState.extCs && selectedDimension === 'id') ? 1.8 : 1.1) / sectionView.scale}
          opacity={featureState.extCs ? highlightOpacity('extCs') : highlightOpacity('id')} />
        <path
          d={sectionBuild.paths.boreVoidPath}
          fill="rgba(4, 24, 38, 0.96)"
          stroke={highlightColor(featureState.intCs ? 'intCs' : 'id')}
          stroke-width={((featureState.intCs && selectedDimension === 'intCs') || (!featureState.intCs && selectedDimension === 'id') ? 1.6 : 1.0) / sectionView.scale}
          opacity={featureState.intCs ? highlightOpacity('intCs') : 0.92} />
      </g>
    {/if}

    {#if sectionBuild && sectionView && isLegacyView}
      <g transform={`translate(${sectionView.tx} ${sectionView.ty}) scale(${sectionView.scale} ${sectionView.scale})`} opacity="0.98">
        <line
          x1="0"
          y1={sectionBuild.dims.zTop - featureState.length * 0.18}
          x2="0"
          y2={sectionBuild.dims.zBottom + featureState.length * 0.18}
          stroke="rgba(125,211,252,0.36)"
          stroke-width={0.95 / sectionView.scale}
          stroke-dasharray={`${8 / sectionView.scale} ${8 / sectionView.scale}`} />
        <path
          d={sectionBuild.paths.leftHousingPath}
          fill="rgba(148,163,184,0.08)"
          stroke="rgba(203,213,225,0.88)"
          stroke-width={1.05 / sectionView.scale} />
        <path
          d={sectionBuild.paths.rightHousingPath}
          fill="rgba(148,163,184,0.08)"
          stroke="rgba(203,213,225,0.88)"
          stroke-width={1.05 / sectionView.scale} />
        <path
          d={sectionBuild.paths.leftBushingPath}
          fill="rgba(45,212,191,0.08)"
          stroke="rgba(94,234,212,0.92)"
          stroke-width={1.15 / sectionView.scale} />
        <path
          d={sectionBuild.paths.rightBushingPath}
          fill="rgba(45,212,191,0.08)"
          stroke="rgba(94,234,212,0.92)"
          stroke-width={1.15 / sectionView.scale} />
        <path
          d={sectionBuild.paths.boreVoidPath}
          fill="rgba(2, 16, 28, 0.98)"
          stroke="rgba(148,163,184,0.24)"
          stroke-width={0.8 / sectionView.scale} />
      </g>
    {/if}

    <text x="22" y="26" fill="#cbd5e1" font-size="12" font-family="ui-monospace, SFMono-Regular">2D Section</text>
    <text x="30" y="242" fill="#cbd5e1" font-size="10" font-family="ui-monospace, SFMono-Regular">{isLegacyView ? 'Legacy outline housing' : 'Housing section'}</text>
    <text x="30" y="258" fill="#5eead4" font-size="10" font-family="ui-monospace, SFMono-Regular">{isLegacyView ? 'Legacy outline bushing + through-bore' : 'Bushing wall + through-bore'}</text>
    <text x="30" y={SECTION_SIZE - 42} fill="rgba(203,213,225,0.72)" font-size="10" font-family="ui-monospace, SFMono-Regular">{isLegacyView ? 'Legacy view reduces to clean outlines only.' : 'Section shows profile. Top inset carries face diameters.'}</text>

    {#if showViews && topPlanView && !isLegacyView}
      <g>
        <rect x={topPlanView.panel.x} y={topPlanView.panel.y} width={topPlanView.panel.w} height={topPlanView.panel.h} rx="12" fill="rgba(8, 22, 36, 0.52)" stroke="rgba(148,163,184,0.16)" />
        <text x={topPlanView.panel.x + 12} y={topPlanView.panel.y + 16} fill="#cbd5e1" font-size="10" font-family="ui-monospace, SFMono-Regular">Top View</text>
        <line x1={topPlanView.cx - 64} y1={topPlanView.cy} x2={topPlanView.cx + 64} y2={topPlanView.cy} stroke="#60a5fa" stroke-width="1" stroke-dasharray="7 6" opacity="0.24" />
        <line x1={topPlanView.cx} y1={topPlanView.cy - 64} x2={topPlanView.cx} y2={topPlanView.cy + 64} stroke="#60a5fa" stroke-width="1" stroke-dasharray="7 6" opacity="0.24" />
        <circle cx={topPlanView.cx} cy={topPlanView.cy} r={topPlanView.rHousingOuter} fill="url(#d3HousingHatch)" stroke="rgba(203,213,225,0.55)" stroke-width="1" />
        <circle cx={topPlanView.cx} cy={topPlanView.cy} r={topPlanView.rHousingOpening} fill="rgba(4, 24, 38, 0.96)" stroke="rgba(203,213,225,0.3)" stroke-width="1" />
        <circle
          cx={topPlanView.cx}
          cy={topPlanView.cy}
          r={topPlanView.rBushingOuter}
          fill={featureState.isFlanged ? 'url(#d3FlangeHatch)' : featureState.extCs ? 'rgba(240,171,252,0.14)' : 'url(#d3BushingHatch)'}
          stroke={highlightColor(featureState.isFlanged ? 'flange' : featureState.extCs ? 'extCs' : 'od')}
          stroke-width={selectedDimension === (featureState.isFlanged ? 'flange' : featureState.extCs ? 'extCs' : 'od') ? '1.5' : '1'}
          opacity={highlightOpacity(featureState.isFlanged ? 'flange' : featureState.extCs ? 'extCs' : 'od')} />
        <circle
          cx={topPlanView.cx}
          cy={topPlanView.cy}
          r={topPlanView.rBushingInner}
          fill="rgba(2, 16, 28, 0.98)"
          stroke={highlightColor(featureState.intCs ? 'intCs' : 'id')}
          stroke-width={selectedDimension === (featureState.intCs ? 'intCs' : 'id') ? '1.5' : '1'}
          opacity={highlightOpacity(featureState.intCs ? 'intCs' : 'id')} />

        <line x1={topPlanView.cx + topPlanView.rHousingOpening} y1={topPlanView.cy - 24} x2={topPlanView.panel.x + topPlanView.panel.w + 8} y2={topPlanView.cy - 24} stroke="rgba(203,213,225,0.24)" stroke-width="1" />
        <line x1={topPlanView.cx + topPlanView.rBushingOuter} y1={topPlanView.cy} x2={topPlanView.panel.x + topPlanView.panel.w + 8} y2={topPlanView.cy} stroke="rgba(203,213,225,0.24)" stroke-width="1" />
        <line x1={topPlanView.cx + topPlanView.rBushingInner} y1={topPlanView.cy + 24} x2={topPlanView.panel.x + topPlanView.panel.w + 8} y2={topPlanView.cy + 24} stroke="rgba(203,213,225,0.24)" stroke-width="1" />

        <text x={topPlanView.panel.x + topPlanView.panel.w + 12} y={topPlanView.cy - 24} fill="rgba(203,213,225,0.82)" font-size="8.5" font-family="ui-monospace, SFMono-Regular">Face open {featureState.bore.toFixed(3)}"</text>
        <text x={topPlanView.panel.x + topPlanView.panel.w + 12} y={topPlanView.cy} fill={highlightColor(featureState.isFlanged ? 'flange' : featureState.extCs ? 'extCs' : 'od')} font-size="8.5" font-family="ui-monospace, SFMono-Regular" opacity={highlightOpacity(featureState.isFlanged ? 'flange' : featureState.extCs ? 'extCs' : 'od')}>
          {featureState.isFlanged ? `Flange face ${topPlanView.outerFaceDia.toFixed(3)}"` : featureState.extCs ? `CS face ${topPlanView.outerFaceDia.toFixed(3)}"` : `Bushing face ${topPlanView.outerFaceDia.toFixed(3)}"`}
        </text>
        <text x={topPlanView.panel.x + topPlanView.panel.w + 12} y={topPlanView.cy + 24} fill={highlightColor(featureState.intCs ? 'intCs' : 'id')} font-size="8.5" font-family="ui-monospace, SFMono-Regular" opacity={highlightOpacity(featureState.intCs ? 'intCs' : 'id')}>
          {featureState.intCs ? `Int CS open ${topPlanView.innerFaceDia.toFixed(3)}"` : `Through ID ${topPlanView.innerFaceDia.toFixed(3)}"`}
        </text>

        <text x={topPlanView.panel.x} y={topPlanView.panel.y + topPlanView.panel.h + 14} fill={highlightColor('length')} font-size="8.5" font-family="ui-monospace, SFMono-Regular" opacity={highlightOpacity('length')}>Length {dimensionalLabels.length}"</text>
        {#if featureState.isFlanged}
          <text x={topPlanView.panel.x + 96} y={topPlanView.panel.y + topPlanView.panel.h + 14} fill={highlightColor('flange')} font-size="8.5" font-family="ui-monospace, SFMono-Regular" opacity={highlightOpacity('flange')}>Flange thk {dimensionalLabels.flangeThk}"</text>
        {:else if featureState.extCs}
          <text x={topPlanView.panel.x + 96} y={topPlanView.panel.y + topPlanView.panel.h + 14} fill={highlightColor('extCs')} font-size="8.5" font-family="ui-monospace, SFMono-Regular" opacity={highlightOpacity('extCs')}>Ext CS depth {dimensionalLabels.extCsDepth}"</text>
        {/if}
      </g>
    {/if}
  </svg>

  <div class="absolute left-3 top-3 flex flex-col gap-1">
    <div class="rounded-md border border-cyan-300/35 bg-slate-950/92 px-2 py-1 text-[10px] font-mono text-cyan-100 shadow-sm">
      D3 renderer active
    </div>
    <div class="rounded-md border border-cyan-300/20 bg-slate-950/88 px-2 py-1 text-[10px] font-mono text-cyan-100/80 shadow-sm">
      {isLegacyView ? 'Legacy outline view' : '2D section • top view inset'}
    </div>
  </div>
  <div class="absolute right-3 top-3 flex gap-1">
    <button
      aria-label="Zoom Out"
      class="rounded-md border border-cyan-300/35 bg-cyan-500/15 px-2 py-1 text-[10px] font-mono text-cyan-100 hover:bg-cyan-500/25"
      onclick={() => (zoom = Math.max(0.7, Number((zoom - 0.1).toFixed(2))))}>
      -
    </button>
    <button
      aria-label="Zoom In"
      class="rounded-md border border-cyan-300/35 bg-cyan-500/15 px-2 py-1 text-[10px] font-mono text-cyan-100 hover:bg-cyan-500/25"
      onclick={() => (zoom = Math.min(1.8, Number((zoom + 0.1).toFixed(2))))}>
      +
    </button>
    <button
      aria-label="Reset View"
      class="rounded-md border border-cyan-300/35 bg-cyan-500/15 px-2 py-1 text-[10px] font-mono text-cyan-100 hover:bg-cyan-500/25"
      onclick={() => (zoom = 1)}>
      Reset
    </button>
    {#if !isLegacyView}
      <button
        aria-label="Toggle Top View"
        class="rounded-md border border-cyan-300/35 bg-cyan-500/15 px-2 py-1 text-[10px] font-mono text-cyan-100 hover:bg-cyan-500/25"
        onclick={() => (showViews = !showViews)}>
        {showViews ? 'Top: On' : 'Top: Off'}
      </button>
    {/if}
  </div>
  {#if !isLegacyView}
  <div class="absolute right-3 top-14 flex w-[104px] flex-col gap-1 rounded-md border border-cyan-300/20 bg-cyan-500/8 p-2">
    <div class="text-[9px] font-mono uppercase tracking-[0.18em] text-cyan-100/70">Focus</div>
    <button class="rounded-md border px-2 py-1 text-left text-[10px] font-mono" style={`border-color:${highlightColor('od')};color:${highlightColor('od')};background:${selectedDimension === 'od' ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.08)'}`} onclick={() => setDimensionFocus('od')}>OD</button>
    <button class="rounded-md border px-2 py-1 text-left text-[10px] font-mono" style={`border-color:${highlightColor('id')};color:${highlightColor('id')};background:${selectedDimension === 'id' ? 'rgba(94,234,212,0.16)' : 'rgba(94,234,212,0.08)'}`} onclick={() => setDimensionFocus('id')}>Bore / ID</button>
    <button class="rounded-md border px-2 py-1 text-left text-[10px] font-mono" style={`border-color:${highlightColor('length')};color:${highlightColor('length')};background:${selectedDimension === 'length' ? 'rgba(147,197,253,0.16)' : 'rgba(147,197,253,0.08)'}`} onclick={() => setDimensionFocus('length')}>Length</button>
    {#if featureState.isFlanged}
      <button class="rounded-md border px-2 py-1 text-left text-[10px] font-mono" style={`border-color:${highlightColor('flange')};color:${highlightColor('flange')};background:${selectedDimension === 'flange' ? 'rgba(240,171,252,0.16)' : 'rgba(240,171,252,0.08)'}`} onclick={() => setDimensionFocus('flange')}>Flange</button>
    {/if}
    {#if featureState.extCs}
      <button class="rounded-md border px-2 py-1 text-left text-[10px] font-mono" style={`border-color:${highlightColor('extCs')};color:${highlightColor('extCs')};background:${selectedDimension === 'extCs' ? 'rgba(240,171,252,0.16)' : 'rgba(240,171,252,0.08)'}`} onclick={() => setDimensionFocus('extCs')}>Ext CS</button>
    {/if}
    {#if featureState.intCs}
      <button class="rounded-md border px-2 py-1 text-left text-[10px] font-mono" style={`border-color:${highlightColor('intCs')};color:${highlightColor('intCs')};background:${selectedDimension === 'intCs' ? 'rgba(94,234,212,0.16)' : 'rgba(94,234,212,0.08)'}`} onclick={() => setDimensionFocus('intCs')}>Int CS</button>
    {/if}
  </div>
  {/if}
</div>
