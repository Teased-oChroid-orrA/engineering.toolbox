<script lang="ts">
  import SurfaceViewportContextMenu from './SurfaceViewportContextMenu.svelte';
  import SurfaceCanvasScene from './SurfaceCanvasScene.svelte';
  import SurfaceViewportNavPad from './SurfaceViewportNavPad.svelte';

  export let viewportEl: HTMLDivElement | null = null;
  export let svgEl: SVGSVGElement | null = null;

  export let w: number;
  export let h: number;

  export let selectionMode: 'none' | 'box' | 'lasso' = 'none';
  export let probeOn: boolean = false;
  export let selecting: boolean = false;
  export let selRect: { x0: number; y0: number; x1: number; y1: number } | null = null;
  export let lasso: { x: number; y: number }[] = [];

  export let openViewportMenu: (e: MouseEvent) => void;
  export let closeViewportMenu: () => void;
  export let updateProbeFromEvent: (e: MouseEvent) => void;
  export let onViewportMouseLeave: () => void = () => {};
  export let onSvgPointerDown: (e: PointerEvent) => void;
  export let onSvgPointerMove: (e: PointerEvent) => void;
  export let onSvgPointerUp: (e: PointerEvent) => void;
  export let contextTargetKind: 'point' | 'line' | 'empty' = 'empty';
  export let contextTargetIndex: number | null = null;

  export let sortedSurfaces: { i: number; pts: [number, number, number, number] | number[]; z: number; name: string }[] = [];
  export let sortedEdges: { i: number; a: number; b: number; z: number }[] = [];
  export let pointRenderIds: number[] = [];
  export let projected: { x: number; y: number; z: number }[] = [];
  export let pointBaseRadius: number = 5;
  export let edgeHitWidth: number = 10;
  export let activeEdgeIdx: number | null = null;
  export let selectedLineSet: Set<number> = new Set();
  export let setActiveEdgeIdx: (idx: number) => void;
  export let onEdgeClick: (idx: number, ev?: MouseEvent) => void = (idx) => setActiveEdgeIdx(idx);
  export let onSurfaceClick: (idx: number, ev?: MouseEvent) => void = () => {};
  export let onPlaneClick: (idx: number) => void = () => {};
  export let onCsysClick: (idx: number) => void = () => {};
  export let depthOpacity: (z: number) => number;
  export let pointDepthOpacity: (z: number) => number = depthOpacity;
  export let surfaceDepthOpacity: (z: number) => number = depthOpacity;
  export let keyActivate: (e: KeyboardEvent, fn: () => void) => void;
  export let showPoints: boolean = true;
  export let showEdges: boolean = true;
  export let showSurfaces: boolean = true;
  export let showDatums: boolean = true;
  export let showLabels: boolean = true;
  export let datumPlanePatches: { i: number; name: string; pts: { x: number; y: number; z: number }[] }[] = [];
  export let datumAxisSegments: { i: number; csysIdx: number; axis: 'X' | 'Y' | 'Z'; a: { x: number; y: number; z: number }; b: { x: number; y: number; z: number } }[] = [];

  export let loftSegments: { a: any; b: any }[] = [];
  export let project: (p: any) => { x: number; y: number; z?: number };

  export let cylAxisSeg: { a: any; b: any } | null = null;
  export let intersection: { p: any; skew: number } | null = null;
  export let interpPoint: any = null;
  export let activeSnap: { kind: string; screen: { x: number; y: number } } | null = null;
  export let hoverTooltip: { x: number; y: number; title: string; lines: string[] } | null = null;

  export let evalRes: any = null;
  export let heatmapOn: boolean = false;
  export let heatScale: number = 1;
  export let heatColor: (absd: number, scale: number) => string;
  export let pendingPointIdx: number | null = null;
  export let selectedSet: Set<number> = new Set();
  export let cylOutlierSet: Set<number> = new Set();
  export let outlierSet: Set<number> = new Set();
  export let handlePointClick: (i: number, ev?: MouseEvent) => void;
  export let points: { x: number; y: number; z: number }[] = [];

  export let probe: { x: number; y: number; angleDeg: number; ok: boolean } | null = null;
  export let probeBoltDia: number = 0.25;
  export let zoomK: number = 1;
  export let maxTaperDeg: number = 6;

  export let vpMenuOpen: boolean = false;
  export let vpMenuX: number = 0;
  export let vpMenuY: number = 0;
  export let fitToScreen: () => void;
  export let resetView: () => void;
  export let selectedBadge: { x: number; y: number; label: string } | null = null;
  export let cullMargin: number = 0;
  export let isolatedPointIds: Set<number> | null = null;
  export let isolatedLineIds: Set<number> | null = null;
  export let onDeletePointCascade: (idx: number) => void = () => {};
  export let onDeleteLineOnly: (idx: number) => void = () => {};
  export let onConnectFromPoint: (idx: number) => void = () => {};
  export let onConnectToPoint: (idx: number) => void = () => {};
  export let onIsolateFromPoint: (idx: number) => void = () => {};
  export let onIsolateFromLine: (idx: number) => void = () => {};
  export let onClearIsolation: () => void = () => {};
  export let onPanBy: (dx: number, dy: number) => void = () => {};
  export let onRotateBy: (dx: number, dy: number) => void = () => {};
  export let onZoomBy: (factor: number) => void = () => {};

  const inView = (x: number, y: number) => x >= -cullMargin && x <= w + cullMargin && y >= -cullMargin && y <= h + cullMargin;
  const segmentInView = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    return maxX >= -cullMargin && minX <= w + cullMargin && maxY >= -cullMargin && minY <= h + cullMargin;
  };
  const polyInView = (pts: { x: number; y: number }[]) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return maxX >= -cullMargin && minX <= w + cullMargin && maxY >= -cullMargin && minY <= h + cullMargin;
  };
</script>

<div
  class="rounded-xl bg-black/20 border border-white/5 overflow-hidden relative surface-panel-slide"
  bind:this={viewportEl}
  role="region"
  aria-label="Surface viewport container"
>
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
  <svg
    bind:this={svgEl}
    width={w}
    height={h}
    class={selectionMode !== 'none' || probeOn ? 'block cursor-crosshair select-none' : 'block cursor-move select-none'}
    role="application"
    aria-label="3D wireframe viewport"
    oncontextmenu={openViewportMenu}
    onclick={closeViewportMenu}
    onmousemove={updateProbeFromEvent}
    onmouseleave={() => { probe = null; onViewportMouseLeave(); }}
    onpointerdown={onSvgPointerDown}
    onpointermove={onSvgPointerMove}
    onpointerup={onSvgPointerUp}
  >
    <defs>
      <radialGradient id="surfaceViewportVignette" cx="50%" cy="50%" r="68%">
        <stop offset="62%" stop-color="rgba(2, 6, 23, 0)" />
        <stop offset="100%" stop-color="rgba(2, 6, 23, 0.36)" />
      </radialGradient>
      <linearGradient id="surfaceViewportFog" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="rgba(125,211,252,0.06)" />
        <stop offset="100%" stop-color="rgba(15,23,42,0.20)" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width={w} height={h} fill="url(#surfaceViewportFog)" class="pointer-events-none" />

    <SurfaceCanvasScene
      {selecting}
      {selectionMode}
      {selRect}
      {lasso}
      {showSurfaces}
      {sortedSurfaces}
      {showDatums}
      {datumPlanePatches}
      {datumAxisSegments}
      {projected}
      {pointRenderIds}
      {showEdges}
      {sortedEdges}
      {activeEdgeIdx}
      {selectedLineSet}
      {edgeHitWidth}
      {keyActivate}
      {onEdgeClick}
      {onSurfaceClick}
      {onPlaneClick}
      {onCsysClick}
      {depthOpacity}
      {pointDepthOpacity}
      {surfaceDepthOpacity}
      {loftSegments}
      {project}
      {cylAxisSeg}
      {intersection}
      {interpPoint}
      {showPoints}
      {evalRes}
      {heatmapOn}
      {heatScale}
      {heatColor}
      {pendingPointIdx}
      {selectedSet}
      {cylOutlierSet}
      {outlierSet}
      {pointBaseRadius}
      {handlePointClick}
      {points}
      {isolatedPointIds}
      {isolatedLineIds}
      {inView}
      {segmentInView}
      {polyInView}
    />

    {#if activeSnap}
      <g class="pointer-events-none">
        <circle
          cx={activeSnap.screen.x}
          cy={activeSnap.screen.y}
          r="7"
          fill="rgba(6,182,212,0.12)"
          stroke="rgba(34,211,238,0.95)"
          stroke-width="1.6"
          stroke-dasharray="3 2"
        />
        <line x1={activeSnap.screen.x - 9} y1={activeSnap.screen.y} x2={activeSnap.screen.x + 9} y2={activeSnap.screen.y} stroke="rgba(34,211,238,0.9)" stroke-width="1.2" />
        <line x1={activeSnap.screen.x} y1={activeSnap.screen.y - 9} x2={activeSnap.screen.x} y2={activeSnap.screen.y + 9} stroke="rgba(34,211,238,0.9)" stroke-width="1.2" />
      </g>
    {/if}

    {#if hoverTooltip}
      <g class="pointer-events-none">
        <rect
          x={hoverTooltip.x + 12}
          y={hoverTooltip.y - 58}
          width="240"
          height="54"
          rx="9"
          fill="rgba(2,6,23,0.82)"
          stroke="rgba(125,211,252,0.35)"
        />
        <text x={hoverTooltip.x + 20} y={hoverTooltip.y - 42} fill="rgba(186,230,253,0.98)" font-size="10.5" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas">
          {hoverTooltip.title}
        </text>
        {#each hoverTooltip.lines as line, li (li)}
          <text
            x={hoverTooltip.x + 20}
            y={hoverTooltip.y - 29 + li * 12}
            fill="rgba(241,245,249,0.86)"
            font-size="10"
            font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas"
          >
            {line}
          </text>
        {/each}
      </g>
    {/if}

    {#if probeOn && probe}
      <g class="pointer-events-none">
        <ellipse
          cx={probe.x}
          cy={probe.y}
          rx={Math.max(8, probeBoltDia * 30 * zoomK)}
          ry={Math.max(8, probeBoltDia * 30 * zoomK * Math.cos((probe.angleDeg * Math.PI) / 180))}
          fill={probe.ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.18)'}
          stroke={probe.ok ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)'}
          stroke-width="2"
        />
        <g>
          <rect
            x={probe.x + 14}
            y={probe.y - 44}
            width="152"
            height="40"
            rx="10"
            fill="rgba(0,0,0,0.55)"
            stroke="rgba(255,255,255,0.14)"
          />
          <text x={probe.x + 24} y={probe.y - 26} fill="rgba(255,255,255,0.95)" font-size="11" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas">
            {probe.angleDeg.toFixed(2)}°  {probe.ok ? 'OK' : 'FAIL'}
          </text>
          <text x={probe.x + 24} y={probe.y - 12} fill="rgba(255,255,255,0.65)" font-size="10" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas">
            limit {maxTaperDeg.toFixed(1)}°  •  bolt Ø {probeBoltDia.toFixed(3)}
          </text>
        </g>
      </g>
    {/if}

    {#if selectedBadge && showLabels}
      <g class="pointer-events-none">
        <circle
          cx={selectedBadge.x}
          cy={selectedBadge.y}
          r="11"
          fill="rgba(56,189,248,0.12)"
          stroke="rgba(56,189,248,0.65)"
          stroke-width="1.2"
          stroke-dasharray="3 2"
        />
        <rect
          x={selectedBadge.x + 10}
          y={selectedBadge.y - 28}
          width="44"
          height="20"
          rx="8"
          fill="rgba(2,6,23,0.82)"
          stroke="rgba(148,163,184,0.35)"
        />
        <text x={selectedBadge.x + 20} y={selectedBadge.y - 14} fill="rgba(226,232,240,0.95)" font-size="11" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas">
          {selectedBadge.label}
        </text>
      </g>
    {/if}

    <rect x="0" y="0" width={w} height={h} fill="url(#surfaceViewportVignette)" class="pointer-events-none" />
  </svg>

  <SurfaceViewportContextMenu
    open={vpMenuOpen}
    x={vpMenuX}
    y={vpMenuY}
    targetKind={contextTargetKind}
    targetIndex={contextTargetIndex}
    onFitToScreen={fitToScreen}
    onResetView={resetView}
    {onDeletePointCascade}
    {onDeleteLineOnly}
    {onConnectFromPoint}
    {onConnectToPoint}
    {onIsolateFromPoint}
    {onIsolateFromLine}
    {onClearIsolation}
    onClose={closeViewportMenu}
  />

  <SurfaceViewportNavPad
    onPan={onPanBy}
    onRotate={onRotateBy}
    onZoomIn={() => onZoomBy(1.12)}
    onZoomOut={() => onZoomBy(1 / 1.12)}
    onFit={fitToScreen}
    onReset={resetView}
  />

</div>
