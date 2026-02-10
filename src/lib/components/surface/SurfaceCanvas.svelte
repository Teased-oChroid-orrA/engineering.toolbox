<script lang="ts">
  import SurfaceViewportContextMenu from './SurfaceViewportContextMenu.svelte';

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

  export let sortedSurfaces: { i: number; pts: [number, number, number, number] | number[]; z: number; name: string }[] = [];
  export let sortedEdges: { i: number; a: number; b: number; z: number }[] = [];
  export let projected: { x: number; y: number; z: number }[] = [];
  export let pointBaseRadius: number = 5;
  export let edgeHitWidth: number = 10;
  export let activeEdgeIdx: number | null = null;
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
  export let cullMargin: number = 120;

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
    {#if selecting && selectionMode === 'box' && selRect}
      <rect
        x={Math.min(selRect.x0, selRect.x1)}
        y={Math.min(selRect.y0, selRect.y1)}
        width={Math.abs(selRect.x1 - selRect.x0)}
        height={Math.abs(selRect.y1 - selRect.y0)}
        fill="rgba(99,102,241,0.10)"
        stroke="rgba(99,102,241,0.75)"
        stroke-width="1.5"
        stroke-dasharray="4 3"
        class="pointer-events-none"
      />
    {/if}

    {#if selecting && selectionMode === 'lasso' && lasso.length > 1}
      <polyline
        points={lasso.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="rgba(99,102,241,0.08)"
        stroke="rgba(99,102,241,0.75)"
        stroke-width="1.5"
        stroke-dasharray="4 3"
        class="pointer-events-none"
      />
    {/if}

    {#if showSurfaces}
      {#each sortedSurfaces as s (s.i)}
        {@const polyPts = s.pts.map((pi) => projected[pi]).filter(Boolean)}
        {#if polyPts.length >= 3 && polyInView(polyPts)}
          <polygon
            points={polyPts.map((p) => `${p.x},${p.y}`).join(' ')}
            fill={`rgba(16,185,129,${0.05 + 0.18 * surfaceDepthOpacity(s.z)})`}
            stroke={`rgba(16,185,129,${0.2 + 0.65 * surfaceDepthOpacity(s.z)})`}
            stroke-width="1.1"
            role="button"
            tabindex="0"
            aria-label={`Select surface S${s.i + 1}`}
            onpointerdown={(ev) => ev.stopPropagation()}
            onpointerup={(ev) => { ev.stopPropagation(); onSurfaceClick(s.i, ev as unknown as MouseEvent); }}
            onclick={(ev) => onSurfaceClick(s.i, ev)}
            onkeydown={(ke) => keyActivate(ke, () => onSurfaceClick(s.i))}
          >
            <title>{s.name}</title>
          </polygon>
        {/if}
      {/each}
    {/if}

    {#if showDatums}
      {#each datumPlanePatches as pl (pl.i)}
        {@const pp = pl.pts.map((p) => project(p))}
        {#if polyInView(pp)}
          <polygon
            points={pp.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="rgba(14,116,144,0.09)"
            stroke="rgba(56,189,248,0.65)"
            stroke-dasharray="3 2"
            stroke-width="1.1"
            role="button"
            tabindex="0"
            aria-label={`Select plane PL${pl.i + 1}`}
            onpointerdown={(ev) => ev.stopPropagation()}
            onpointerup={(ev) => { ev.stopPropagation(); onPlaneClick(pl.i); }}
            onclick={() => onPlaneClick(pl.i)}
            onkeydown={(ke) => keyActivate(ke, () => onPlaneClick(pl.i))}
          />
        {/if}
      {/each}
      {#each datumAxisSegments as ax (ax.csysIdx + '-' + ax.axis)}
        {@const a2 = project(ax.a)}
        {@const b2 = project(ax.b)}
        {#if segmentInView(a2, b2)}
          <line
            x1={a2.x}
            y1={a2.y}
            x2={b2.x}
            y2={b2.y}
            stroke={ax.axis === 'X' ? 'rgba(248,113,113,0.9)' : ax.axis === 'Y' ? 'rgba(74,222,128,0.9)' : 'rgba(96,165,250,0.9)'}
            stroke-width="2"
            role="button"
            tabindex="0"
            aria-label={`Select csys CS${ax.csysIdx + 1}`}
            onpointerdown={(ev) => ev.stopPropagation()}
            onpointerup={(ev) => { ev.stopPropagation(); onCsysClick(ax.csysIdx); }}
            onclick={() => onCsysClick(ax.csysIdx)}
            onkeydown={(ke) => keyActivate(ke, () => onCsysClick(ax.csysIdx))}
          />
        {/if}
      {/each}
    {/if}

    {#if showEdges}
      {#each sortedEdges as e (e.i)}
        {@const p1 = projected[e.a]}
        {@const p2 = projected[e.b]}
        {#if segmentInView(p1, p2)}
          <line
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke="rgba(255,255,255,0.85)"
            stroke-width={activeEdgeIdx === e.i ? 2 : 1}
            stroke-dasharray="4 4"
            stroke-opacity={depthOpacity(e.z)}
            class={activeEdgeIdx === e.i ? 'drop-shadow-[0_0_10px_rgba(99,102,241,0.35)]' : ''}
            role="button"
            tabindex="0"
            aria-label={`Select line L${e.i + 1}`}
            onpointerdown={(ev) => ev.stopPropagation()}
            onpointerup={(ev) => { ev.stopPropagation(); onEdgeClick(e.i, ev as unknown as MouseEvent); }}
            onclick={(ev) => onEdgeClick(e.i, ev)}
            onkeydown={(ke) => keyActivate(ke, () => onEdgeClick(e.i))}
          />
          <line
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke="rgba(0,0,0,0)"
            stroke-width={edgeHitWidth}
            class="cursor-pointer"
            aria-hidden="true"
            onpointerdown={(ev) => ev.stopPropagation()}
            onpointerup={(ev) => { ev.stopPropagation(); onEdgeClick(e.i, ev as unknown as MouseEvent); }}
            onclick={(ev) => onEdgeClick(e.i, ev)}
          />
        {/if}
      {/each}
    {/if}

    {#if loftSegments.length}
      {#each loftSegments as seg, si (si)}
        {@const p1 = project(seg.a)}
        {@const p2 = project(seg.b)}
        <line
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke="currentColor"
          stroke-width="1"
          stroke-dasharray="4 3"
          class="text-emerald-300/70"
          opacity="0.8"
        />
      {/each}
    {/if}

    {#if cylAxisSeg}
      {@const a2 = project(cylAxisSeg.a)}
      {@const b2 = project(cylAxisSeg.b)}
      <line
        x1={a2.x}
        y1={a2.y}
        x2={b2.x}
        y2={b2.y}
        stroke="currentColor"
        stroke-width="2"
        stroke-dasharray="6 4"
        class="text-sky-300/70 pointer-events-none"
        opacity="0.9"
      />
    {/if}

    {#if intersection}
      {@const ip = project(intersection.p)}
      <circle cx={ip.x} cy={ip.y} r="6" fill="rgba(239,68,68,0.85)" stroke="rgba(239,68,68,1)" stroke-width="2" />
    {/if}

    {#if interpPoint}
      {@const sp = project(interpPoint)}
      <circle cx={sp.x} cy={sp.y} r="5" fill="rgba(34,197,94,0.65)" stroke="rgba(34,197,94,1)" stroke-width="2" />
    {/if}

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

    {#if showPoints}
      {#each projected as node, i (i)}
        {@const absd = evalRes ? Math.abs(evalRes.signedDistances[i] ?? 0) : 0}
        {@const baseFill = pendingPointIdx === i ? 'rgba(99,102,241,0.95)' : 'rgba(255,255,255,0.60)'}
        {@const hmFill = heatmapOn && evalRes ? heatColor(absd, heatScale) : baseFill}
        {#if inView(node.x, node.y)}
          <circle
            cx={node.x}
            cy={node.y}
            r={selectedSet.has(i) ? pointBaseRadius + 2 : (pendingPointIdx === i ? pointBaseRadius + 2 : pointBaseRadius)}
            fill={hmFill}
            fill-opacity={pointDepthOpacity(node.z)}
            stroke={selectedSet.has(i) ? 'rgba(56,189,248,0.95)' : (cylOutlierSet.has(i) ? 'rgba(251,191,36,0.95)' : (outlierSet.has(i) ? 'rgba(244,63,94,0.95)' : 'rgba(255,255,255,0.75)'))}
            stroke-opacity={0.35 + 0.65 * pointDepthOpacity(node.z)}
            stroke-width="1"
            class="transition-transform"
            role="button"
            tabindex="0"
            aria-label={`Select point P${i + 1}`}
            onpointerup={(e) => handlePointClick(i, e as unknown as MouseEvent)}
            onclick={(e) => handlePointClick(i, e)}
            onkeydown={(ke) => keyActivate(ke, () => handlePointClick(i))}
          >
            <title>P{i + 1}: ({points[i].x}, {points[i].y}, {points[i].z})</title>
          </circle>
        {/if}
      {/each}
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
  </svg>

  <SurfaceViewportContextMenu
    open={vpMenuOpen}
    x={vpMenuX}
    y={vpMenuY}
    onFitToScreen={fitToScreen}
    onResetView={resetView}
    onClose={closeViewportMenu}
  />
</div>
