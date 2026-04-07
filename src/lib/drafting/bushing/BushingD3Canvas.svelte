<script lang="ts">
  import { onMount } from 'svelte';
  import { resolveBushingSectionParams } from '../../core/shared/bushingProfileGeometry';
  import { makeRange } from '../../core/bushing/solveMath';
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
  type DimensionKey = 'od' | 'id' | 'length' | 'flangeOd' | 'flangeThk' | 'extCsDia' | 'extCsDepth' | 'intCsDia' | 'intCsDepth';

  let zoom = $state(1);
  let showViews = $state(true);
  let selectedDimension = $state<DimensionKey>('od');
  let hoveredDimension = $state<DimensionKey | null>(null);
  let externalHoveredDimension = $state<DimensionKey | null>(null);
  let tooltip = $state<{ x: number; y: number; key: DimensionKey } | null>(null);
  let rootEl = $state<HTMLDivElement | null>(null);
  let previousGeometrySig = $state('');
  let previousDiagnosticsSig = $state('');
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
  let sectionParams = $derived.by(() => {
    try {
      return resolveBushingSectionParams((viewModel ?? {}) as any, { mode: 'render' });
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
    const housingOpeningDia = featureState.bore;
    const outerFaceDia = featureState.isFlanged
      ? featureState.flangeOd
      : featureState.extCs?.dia
        ? Number(featureState.extCs.dia)
        : housingOpeningDia;
    const innerFaceDia = featureState.intCs?.dia
      ? Number(featureState.intCs.dia)
      : Math.max(featureState.inner, featureState.bore);
    const rHousingOuter = build.dims.rHousing * scale;
    const rHousingOpening = (housingOpeningDia / 2) * scale;
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
      intCsDia: intCs?.dia ? Number(intCs.dia).toFixed(3) : '---',
      intCsDepth: intCs?.depth ? Number(intCs.depth).toFixed(3) : '---'
    };
  });

  function setDimensionFocus(next: DimensionKey) {
    selectedDimension = next;
    hoveredDimension = null;
  }

  const outerFaceDimension = $derived<DimensionKey>(featureState.isFlanged ? 'flangeOd' : featureState.extCs ? 'extCsDia' : 'od');
  const innerFaceDimension = $derived<DimensionKey>(featureState.intCs ? 'intCsDia' : 'id');

  function activeDimension(dim: DimensionKey): boolean {
    return (externalHoveredDimension ?? hoveredDimension ?? selectedDimension) === dim;
  }

  function setTooltipForDimension(dim: DimensionKey, event?: MouseEvent) {
    if (!rootEl || !event) {
      tooltip = dim ? { x: 24, y: 88, key: dim } : null;
      return;
    }
    const rect = rootEl.getBoundingClientRect();
    tooltip = {
      key: dim,
      x: Math.max(18, Math.min(rect.width - 210, event.clientX - rect.left + 14)),
      y: Math.max(54, Math.min(rect.height - 86, event.clientY - rect.top + 14))
    };
  }

  function interactiveAttrs(dim: DimensionKey) {
    return {
      onclick: () => setDimensionFocus(dim),
      onmouseenter: (event: MouseEvent) => {
        hoveredDimension = dim;
        setTooltipForDimension(dim, event);
      },
      onmousemove: (event: MouseEvent) => {
        if (hoveredDimension === dim) setTooltipForDimension(dim, event);
      },
      onmouseleave: () => {
        hoveredDimension = null;
        tooltip = null;
      }
    };
  }

  function highlightColor(dim: DimensionKey): string {
    if (!activeDimension(dim)) return 'rgba(148,163,184,0.72)';
    if (dim === 'od' || dim === 'flangeOd' || dim === 'flangeThk') return '#cbd5e1';
    if (dim === 'id' || dim === 'intCsDia' || dim === 'intCsDepth') return '#5eead4';
    if (dim === 'length') return '#93c5fd';
    return '#f0abfc';
  }

  function highlightOpacity(dim: DimensionKey): number {
    return activeDimension(dim) ? 1 : 0.62;
  }

  function isDimensionKey(value: unknown): value is DimensionKey {
    return value === 'od' || value === 'id' || value === 'length' || value === 'flangeOd' || value === 'flangeThk' || value === 'extCsDia' || value === 'extCsDepth' || value === 'intCsDia' || value === 'intCsDepth';
  }

  onMount(() => {
    if (typeof window === 'undefined') return;
    const handleHover = (event: Event) => {
      const target = (event as CustomEvent<{ target?: unknown }>).detail?.target;
      externalHoveredDimension = isDimensionKey(target) ? target : null;
      if (!isDimensionKey(target)) tooltip = null;
    };
    const handleSelect = (event: Event) => {
      const target = (event as CustomEvent<{ target?: unknown }>).detail?.target;
      if (isDimensionKey(target)) {
        selectedDimension = target;
        externalHoveredDimension = target;
        setTooltipForDimension(target);
      }
    };
    window.addEventListener('bushing-sketch-hover', handleHover as EventListener);
    window.addEventListener('bushing-sketch-select', handleSelect as EventListener);
    return () => {
      window.removeEventListener('bushing-sketch-hover', handleHover as EventListener);
      window.removeEventListener('bushing-sketch-select', handleSelect as EventListener);
    };
  });

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
      selectedDimension = state.extCs ? 'extCsDia' : state.isFlanged ? 'flangeOd' : 'od';
    } else if (changed.some((key) => key.startsWith('intCs') || key === 'idType')) {
      selectedDimension = state.intCs ? 'intCsDia' : 'id';
    } else if (changed.includes('flangeOd') || changed.includes('flangeThk') || changed.includes('isFlanged')) {
      selectedDimension = state.isFlanged ? 'flangeOd' : 'od';
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
        message: 'Use + / - to zoom, Reset to reframe, Top toggle to show or hide the inset, and click directly on section or top-view features to focus dimensions.'
      }
    ];
  }

  $effect(() => {
    try {
      const diagnostics = diagnosticsForScene();
      const nextSig = JSON.stringify(diagnostics);
      if (nextSig === previousDiagnosticsSig) return;
      previousDiagnosticsSig = nextSig;
      onDiagnostics(diagnostics);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown D3 render error.';
      onInitFailure(reason);
    }
  });

  $effect(() => {
    showViews = !isLegacyView;
  });

  const toDisplayLength = (value: number) => (String(viewModel?.units ?? 'imperial') === 'metric' ? value * 25.4 : value);
  const lengthUnit = () => (String(viewModel?.units ?? 'imperial') === 'metric' ? 'mm' : 'in');
  const fmtRange = (lower: number, upper: number, digits = String(viewModel?.units ?? 'imperial') === 'metric' ? 3 : 4) =>
    `${toDisplayLength(lower).toFixed(digits)} / ${toDisplayLength(upper).toFixed(digits)} ${lengthUnit()}`;
  const fixedRange = (value: number) => makeRange('limits', value, value, value);
  const measuredIdRange = $derived.by(() => {
    if (viewModel?.measuredPart?.enabled && viewModel?.measuredPart?.basis === 'measured' && Number.isFinite(viewModel?.measuredPart?.id?.actual)) {
      const actual = Number(viewModel?.measuredPart?.id?.actual);
      return makeRange('limits', actual - Number(viewModel?.measuredPart?.id?.tolMinus ?? 0), actual + Number(viewModel?.measuredPart?.id?.tolPlus ?? 0), actual);
    }
    return fixedRange(Number(viewModel?.idBushing ?? featureState.inner));
  });
  const tooltipInfo = $derived.by(() => {
    const key = tooltip?.key ?? externalHoveredDimension ?? hoveredDimension ?? null;
    if (!key) return null;
    const tolerance = viewModel?.tolerance;
    const outerCsDia = tolerance?.csExternalDia ?? fixedRange(Number(viewModel?.geometry?.csExternal?.dia ?? featureState.extCs?.dia ?? 0));
    const outerCsDepth = tolerance?.csExternalDepth ?? fixedRange(Number(viewModel?.geometry?.csExternal?.depth ?? featureState.extCs?.depth ?? 0));
    const innerCsDia = tolerance?.csInternalDia ?? fixedRange(Number(viewModel?.geometry?.csInternal?.dia ?? featureState.intCs?.dia ?? 0));
    const innerCsDepth = tolerance?.csInternalDepth ?? fixedRange(Number(viewModel?.geometry?.csInternal?.depth ?? featureState.intCs?.depth ?? 0));
    const infoMap: Record<DimensionKey, { title: string; value: string; note: string }> = {
      od: {
        title: 'Bushing OD Band',
        value: fmtRange(tolerance?.odBushing.lower ?? Number(viewModel?.geometry?.odBushing ?? featureState.outer), tolerance?.odBushing.upper ?? Number(viewModel?.geometry?.odBushing ?? featureState.outer)),
        note: 'fit-driving installed OD band'
      },
      id: {
        title: 'Bushing ID',
        value: fmtRange(measuredIdRange.lower, measuredIdRange.upper),
        note: 'through-bore / straight internal diameter'
      },
      length: {
        title: 'Section Length',
        value: fmtRange(Number(viewModel?.housingLen ?? featureState.length), Number(viewModel?.housingLen ?? featureState.length)),
        note: 'engaged section length'
      },
      flangeOd: {
        title: 'Flange OD',
        value: fmtRange(Number(viewModel?.flangeOd ?? featureState.flangeOd), Number(viewModel?.flangeOd ?? featureState.flangeOd)),
        note: 'outer flange face diameter'
      },
      flangeThk: {
        title: 'Flange Thickness',
        value: fmtRange(Number(viewModel?.flangeThk ?? featureState.flangeThk), Number(viewModel?.flangeThk ?? featureState.flangeThk)),
        note: 'axial flange seat thickness'
      },
      extCsDia: {
        title: 'External CS Dia',
        value: fmtRange(outerCsDia.lower, outerCsDia.upper),
        note: 'external countersink face diameter'
      },
      extCsDepth: {
        title: 'External CS Depth',
        value: fmtRange(outerCsDepth.lower, outerCsDepth.upper),
        note: 'external countersink depth'
      },
      intCsDia: {
        title: 'Internal CS Dia',
        value: fmtRange(innerCsDia.lower, innerCsDia.upper),
        note: 'internal countersink face diameter'
      },
      intCsDepth: {
        title: 'Internal CS Depth',
        value: fmtRange(innerCsDepth.lower, innerCsDepth.upper),
        note: 'internal countersink depth'
      }
    };
    return infoMap[key];
  });

  function activeDimensionLabel(dim: DimensionKey): string {
    switch (dim) {
      case 'od': return 'OD band';
      case 'id': return 'ID';
      case 'length': return 'Length';
      case 'flangeOd': return 'Flange OD';
      case 'flangeThk': return 'Flange thickness';
      case 'extCsDia': return 'External CS dia';
      case 'extCsDepth': return 'External CS depth';
      case 'intCsDia': return 'Internal CS dia';
      case 'intCsDepth': return 'Internal CS depth';
    }
  }
</script>

<div class="relative h-full w-full overflow-hidden rounded-xl" bind:this={rootEl}>
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
          data-dimension-target="od"
          d={sectionBuild.paths.leftHousingPath}
          fill="url(#d3HousingHatch)"
          stroke={highlightColor('od')}
          stroke-width={(selectedDimension === 'od' ? 1.8 : 1.1) / sectionView.scale}
          opacity={highlightOpacity('od')}
          cursor="pointer"
          {...interactiveAttrs('od')} />
        <path
          data-dimension-target="od"
          d={sectionBuild.paths.rightHousingPath}
          fill="url(#d3HousingHatch)"
          stroke={highlightColor('od')}
          stroke-width={(selectedDimension === 'od' ? 1.8 : 1.1) / sectionView.scale}
          opacity={highlightOpacity('od')}
          cursor="pointer"
          {...interactiveAttrs('od')} />
        <path
          data-dimension-target="od"
          d={sectionBuild.paths.leftBushingPath}
          fill={featureState.isFlanged ? 'url(#d3FlangeHatch)' : 'url(#d3BushingHatch)'}
          stroke={highlightColor('od')}
          stroke-width={(activeDimension('od') ? 1.8 : 1.1) / sectionView.scale}
          opacity={highlightOpacity('od')}
          cursor="pointer"
          {...interactiveAttrs('od')} />
        <path
          data-dimension-target="od"
          d={sectionBuild.paths.rightBushingPath}
          fill="url(#d3BushingHatch)"
          stroke={highlightColor('od')}
          stroke-width={(activeDimension('od') ? 1.8 : 1.1) / sectionView.scale}
          opacity={highlightOpacity('od')}
          cursor="pointer"
          {...interactiveAttrs('od')} />
        <path
          data-dimension-target="id"
          d={sectionBuild.paths.boreVoidPath}
          fill="rgba(4, 24, 38, 0.96)"
          stroke={highlightColor('id')}
          stroke-width={(activeDimension('id') ? 1.6 : 1.0) / sectionView.scale}
          opacity={0.92}
          cursor="pointer"
          {...interactiveAttrs('id')} />
        {#if sectionParams}
          <line
            x1={-sectionParams.rOuter}
            y1={sectionParams.zBottom}
            x2={-sectionParams.rOuter}
            y2={sectionParams.zExt}
            stroke={highlightColor('od')}
            stroke-width={(activeDimension('od') ? 6 : 5) / sectionView.scale}
            stroke-linecap="round"
            opacity="0.001"
            cursor="pointer"
            {...interactiveAttrs('od')} />
          <line
            x1={sectionParams.rOuter}
            y1={sectionParams.zBottom}
            x2={sectionParams.rOuter}
            y2={sectionParams.zExt}
            stroke={highlightColor('od')}
            stroke-width={(activeDimension('od') ? 6 : 5) / sectionView.scale}
            stroke-linecap="round"
            opacity="0.001"
            cursor="pointer"
            {...interactiveAttrs('od')} />
          <line
            x1={-sectionParams.rInner}
            y1={sectionParams.zBottom}
            x2={-sectionParams.rInner}
            y2={sectionParams.zInt}
            stroke={highlightColor('id')}
            stroke-width={(activeDimension('id') ? 6 : 5) / sectionView.scale}
            stroke-linecap="round"
            opacity="0.001"
            cursor="pointer"
            {...interactiveAttrs('id')} />
          <line
            x1={sectionParams.rInner}
            y1={sectionParams.zBottom}
            x2={sectionParams.rInner}
            y2={sectionParams.zInt}
            stroke={highlightColor('id')}
            stroke-width={(activeDimension('id') ? 6 : 5) / sectionView.scale}
            stroke-linecap="round"
            opacity="0.001"
            cursor="pointer"
            {...interactiveAttrs('id')} />
          {#if featureState.isFlanged}
            <line
              x1={-sectionParams.flangeR}
              y1={sectionParams.zFlangeTop}
              x2={sectionParams.flangeR}
              y2={sectionParams.zFlangeTop}
              stroke={highlightColor('flangeOd')}
              stroke-width={(activeDimension('flangeOd') ? 6 : 5) / sectionView.scale}
              stroke-linecap="round"
              opacity="0.001"
              cursor="pointer"
              {...interactiveAttrs('flangeOd')} />
            <line
              x1={-sectionParams.flangeR}
              y1={sectionParams.zFlangeTop}
              x2={-sectionParams.flangeR}
              y2={sectionParams.zTop}
              stroke={highlightColor('flangeThk')}
              stroke-width={(activeDimension('flangeThk') ? 6 : 5) / sectionView.scale}
              stroke-linecap="round"
              opacity="0.001"
              cursor="pointer"
              {...interactiveAttrs('flangeThk')} />
            <line
              x1={sectionParams.flangeR}
              y1={sectionParams.zFlangeTop}
              x2={sectionParams.flangeR}
              y2={sectionParams.zTop}
              stroke={highlightColor('flangeThk')}
              stroke-width={(activeDimension('flangeThk') ? 6 : 5) / sectionView.scale}
              stroke-linecap="round"
              opacity="0.001"
              cursor="pointer"
              {...interactiveAttrs('flangeThk')} />
          {/if}
          {#if featureState.extCs}
            <line
              x1={-sectionParams.extTop}
              y1={sectionParams.zTop}
              x2={sectionParams.extTop}
              y2={sectionParams.zTop}
              stroke={highlightColor('extCsDia')}
              stroke-width={(activeDimension('extCsDia') ? 6 : 5) / sectionView.scale}
              stroke-linecap="round"
              opacity="0.001"
              cursor="pointer"
              {...interactiveAttrs('extCsDia')} />
            <line
              x1={-sectionParams.extTop}
              y1={sectionParams.zTop}
              x2={-sectionParams.rOuter}
              y2={sectionParams.zExt}
              stroke={highlightColor('extCsDepth')}
              stroke-width={(activeDimension('extCsDepth') ? 6 : 5) / sectionView.scale}
              stroke-linecap="round"
              opacity="0.001"
              cursor="pointer"
              {...interactiveAttrs('extCsDepth')} />
            <line
              x1={sectionParams.extTop}
              y1={sectionParams.zTop}
              x2={sectionParams.rOuter}
              y2={sectionParams.zExt}
              stroke={highlightColor('extCsDepth')}
              stroke-width={(activeDimension('extCsDepth') ? 6 : 5) / sectionView.scale}
              stroke-linecap="round"
              opacity="0.001"
              cursor="pointer"
              {...interactiveAttrs('extCsDepth')} />
          {/if}
          {#if featureState.intCs}
            <line
              x1={-sectionParams.intTop}
              y1={sectionParams.innerTopZ}
              x2={sectionParams.intTop}
              y2={sectionParams.innerTopZ}
              stroke={highlightColor('intCsDia')}
              stroke-width={(activeDimension('intCsDia') ? 6 : 5) / sectionView.scale}
              stroke-linecap="round"
              opacity="0.001"
              cursor="pointer"
              {...interactiveAttrs('intCsDia')} />
            <line
              x1={-sectionParams.intTop}
              y1={sectionParams.innerTopZ}
              x2={-sectionParams.rInner}
              y2={sectionParams.zInt}
              stroke={highlightColor('intCsDepth')}
              stroke-width={(activeDimension('intCsDepth') ? 6 : 5) / sectionView.scale}
              stroke-linecap="round"
              opacity="0.001"
              cursor="pointer"
              {...interactiveAttrs('intCsDepth')} />
            <line
              x1={sectionParams.intTop}
              y1={sectionParams.innerTopZ}
              x2={sectionParams.rInner}
              y2={sectionParams.zInt}
              stroke={highlightColor('intCsDepth')}
              stroke-width={(activeDimension('intCsDepth') ? 6 : 5) / sectionView.scale}
              stroke-linecap="round"
              opacity="0.001"
              cursor="pointer"
              {...interactiveAttrs('intCsDepth')} />
          {/if}
        {/if}
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
        <circle data-dimension-target="od" cx={topPlanView.cx} cy={topPlanView.cy} r={topPlanView.rHousingOuter} fill="url(#d3HousingHatch)" stroke="rgba(203,213,225,0.55)" stroke-width="1" cursor="pointer" {...interactiveAttrs('od')} />
        <circle data-dimension-target="od" cx={topPlanView.cx} cy={topPlanView.cy} r={topPlanView.rHousingOpening} fill="rgba(4, 24, 38, 0.96)" stroke={highlightColor('od')} stroke-width={activeDimension('od') ? '1.4' : '1'} opacity={highlightOpacity('od')} cursor="pointer" {...interactiveAttrs('od')} />
        <circle
          data-dimension-target={outerFaceDimension}
          cx={topPlanView.cx}
          cy={topPlanView.cy}
          r={topPlanView.rBushingOuter}
          fill={featureState.isFlanged ? 'url(#d3FlangeHatch)' : featureState.extCs ? 'rgba(240,171,252,0.14)' : 'url(#d3BushingHatch)'}
          stroke={highlightColor(outerFaceDimension)}
          stroke-width={activeDimension(outerFaceDimension) ? '1.5' : '1'}
          opacity={highlightOpacity(outerFaceDimension)}
          cursor="pointer"
          {...interactiveAttrs(outerFaceDimension)} />
        <circle
          data-dimension-target={innerFaceDimension}
          cx={topPlanView.cx}
          cy={topPlanView.cy}
          r={topPlanView.rBushingInner}
          fill="rgba(2, 16, 28, 0.98)"
          stroke={highlightColor(innerFaceDimension)}
          stroke-width={activeDimension(innerFaceDimension) ? '1.5' : '1'}
          opacity={highlightOpacity(innerFaceDimension)}
          cursor="pointer"
          {...interactiveAttrs(innerFaceDimension)} />

        <line x1={topPlanView.cx + topPlanView.rHousingOpening} y1={topPlanView.cy - 24} x2={topPlanView.panel.x + topPlanView.panel.w + 8} y2={topPlanView.cy - 24} stroke="rgba(203,213,225,0.24)" stroke-width="1" />
        <line x1={topPlanView.cx + topPlanView.rBushingOuter} y1={topPlanView.cy} x2={topPlanView.panel.x + topPlanView.panel.w + 8} y2={topPlanView.cy} stroke="rgba(203,213,225,0.24)" stroke-width="1" />
        <line x1={topPlanView.cx + topPlanView.rBushingInner} y1={topPlanView.cy + 24} x2={topPlanView.panel.x + topPlanView.panel.w + 8} y2={topPlanView.cy + 24} stroke="rgba(203,213,225,0.24)" stroke-width="1" />

        <text data-dimension-target="od" x={topPlanView.panel.x + topPlanView.panel.w + 12} y={topPlanView.cy - 24} fill={highlightColor('od')} font-size="8.5" font-family="ui-monospace, SFMono-Regular" opacity={highlightOpacity('od')} cursor="pointer" {...interactiveAttrs('od')}>Hole open {featureState.bore.toFixed(3)}"</text>
        <text data-dimension-target={outerFaceDimension} x={topPlanView.panel.x + topPlanView.panel.w + 12} y={topPlanView.cy} fill={highlightColor(outerFaceDimension)} font-size="8.5" font-family="ui-monospace, SFMono-Regular" opacity={highlightOpacity(outerFaceDimension)} cursor="pointer" {...interactiveAttrs(outerFaceDimension)}>
          {featureState.isFlanged ? `Flange face ${topPlanView.outerFaceDia.toFixed(3)}"` : featureState.extCs ? `CS face ${topPlanView.outerFaceDia.toFixed(3)}"` : `OD band ${topPlanView.outerFaceDia.toFixed(3)}"`}
        </text>
        <text data-dimension-target={innerFaceDimension} x={topPlanView.panel.x + topPlanView.panel.w + 12} y={topPlanView.cy + 24} fill={highlightColor(innerFaceDimension)} font-size="8.5" font-family="ui-monospace, SFMono-Regular" opacity={highlightOpacity(innerFaceDimension)} cursor="pointer" {...interactiveAttrs(innerFaceDimension)}>
          {featureState.intCs ? `Int CS open ${topPlanView.innerFaceDia.toFixed(3)}"` : `Through ID ${topPlanView.innerFaceDia.toFixed(3)}"`}
        </text>

        <text data-dimension-target="length" x={topPlanView.panel.x} y={topPlanView.panel.y + topPlanView.panel.h + 14} fill={highlightColor('length')} font-size="8.5" font-family="ui-monospace, SFMono-Regular" opacity={highlightOpacity('length')} cursor="pointer" {...interactiveAttrs('length')}>Length {dimensionalLabels.length}"</text>
        {#if featureState.isFlanged}
          <text data-dimension-target="flangeThk" x={topPlanView.panel.x + 96} y={topPlanView.panel.y + topPlanView.panel.h + 14} fill={highlightColor('flangeThk')} font-size="8.5" font-family="ui-monospace, SFMono-Regular" opacity={highlightOpacity('flangeThk')} cursor="pointer" {...interactiveAttrs('flangeThk')}>Flange thk {dimensionalLabels.flangeThk}"</text>
        {:else if featureState.extCs}
          <text data-dimension-target="extCsDepth" x={topPlanView.panel.x + 96} y={topPlanView.panel.y + topPlanView.panel.h + 14} fill={highlightColor('extCsDepth')} font-size="8.5" font-family="ui-monospace, SFMono-Regular" opacity={highlightOpacity('extCsDepth')} cursor="pointer" {...interactiveAttrs('extCsDepth')}>Ext CS depth {dimensionalLabels.extCsDepth}"</text>
        {/if}
        {#if featureState.intCs}
          <text data-dimension-target="intCsDepth" x={topPlanView.panel.x + 196} y={topPlanView.panel.y + topPlanView.panel.h + 14} fill={highlightColor('intCsDepth')} font-size="8.5" font-family="ui-monospace, SFMono-Regular" opacity={highlightOpacity('intCsDepth')} cursor="pointer" {...interactiveAttrs('intCsDepth')}>Int CS depth {dimensionalLabels.intCsDepth}"</text>
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
  <div class="absolute right-3 top-14 flex w-[180px] flex-col gap-1 rounded-md border border-cyan-300/20 bg-cyan-500/8 p-2">
    <div class="text-[9px] font-mono uppercase tracking-[0.18em] text-cyan-100/70">Interactive Focus</div>
    <div class="text-[10px] font-mono leading-relaxed text-cyan-100/82">
      Hover or click exact profile edges and inset labels to inspect the active diameter, thickness, or countersink depth.
    </div>
    <div class="rounded-md border border-white/10 bg-black/22 px-2 py-1 text-[10px] font-mono text-white/78">
      Active: {activeDimensionLabel(selectedDimension)}
    </div>
  </div>
  {/if}
  {#if tooltipInfo && tooltip}
    <div
      class="pointer-events-none absolute z-20 min-w-[184px] max-w-[220px] rounded-xl border border-cyan-300/25 bg-slate-950/96 px-3 py-2 shadow-[0_12px_32px_rgba(2,8,23,0.34)]"
      style={`left:${tooltip.x}px; top:${tooltip.y}px;`}
    >
      <div class="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100/82">{tooltipInfo.title}</div>
      <div class="mt-1 text-sm font-semibold text-slate-100">{tooltipInfo.value}</div>
      <div class="mt-1 text-[10px] text-white/58">{tooltipInfo.note}</div>
    </div>
  {/if}
</div>
