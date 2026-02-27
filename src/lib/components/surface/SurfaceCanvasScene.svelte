<script lang="ts">
  export let selecting = false;
  export let selectionMode: 'none' | 'box' | 'lasso' = 'none';
  export let selRect: { x0: number; y0: number; x1: number; y1: number } | null = null;
  export let lasso: { x: number; y: number }[] = [];
  export let showSurfaces = true;
  export let sortedSurfaces: { i: number; pts: number[]; z: number; name: string }[] = [];
  export let showDatums = true;
  export let datumPlanePatches: { i: number; name: string; pts: { x: number; y: number; z: number }[] }[] = [];
  export let datumAxisSegments: { i: number; csysIdx: number; axis: 'X' | 'Y' | 'Z'; a: { x: number; y: number; z: number }; b: { x: number; y: number; z: number } }[] = [];
  export let projected: { x: number; y: number; z: number }[] = [];
  export let showEdges = true;
  export let sortedEdges: { i: number; a: number; b: number; z: number }[] = [];
  export let activeEdgeIdx: number | null = null;
  export let selectedLineSet: Set<number> = new Set();
  export let edgeHitWidth = 10;
  export let keyActivate: (e: KeyboardEvent, fn: () => void) => void;
  export let onEdgeClick: (idx: number, ev?: MouseEvent) => void;
  export let onSurfaceClick: (idx: number, ev?: MouseEvent) => void;
  export let onPlaneClick: (idx: number) => void;
  export let onCsysClick: (idx: number) => void;
  export let depthOpacity: (z: number) => number;
  export let pointDepthOpacity: (z: number) => number;
  export let surfaceDepthOpacity: (z: number) => number;
  export let loftSegments: { a: any; b: any }[] = [];
  export let project: (p: any) => { x: number; y: number; z?: number };
  export let cylAxisSeg: { a: any; b: any } | null = null;
  export let intersection: { p: any; skew: number } | null = null;
  export let interpPoint: any = null;
  export let showPoints = true;
  export let evalRes: any = null;
  export let heatmapOn = false;
  export let heatScale = 1;
  export let heatColor: (absd: number, scale: number) => string;
  export let pendingPointIdx: number | null = null;
  export let selectedSet: Set<number> = new Set();
  export let cylOutlierSet: Set<number> = new Set();
  export let outlierSet: Set<number> = new Set();
  export let pointBaseRadius = 5;
  export let handlePointClick: (i: number, ev?: MouseEvent) => void;
  export let points: { x: number; y: number; z: number }[] = [];
  export let pointRenderIds: number[] = [];
  export let isolatedPointIds: Set<number> | null = null;
  export let isolatedLineIds: Set<number> | null = null;
  export let inView: (x: number, y: number) => boolean;
  export let segmentInView: (a: { x: number; y: number }, b: { x: number; y: number }) => boolean;
  export let polyInView: (pts: { x: number; y: number }[]) => boolean;

  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const rgba = (r: number, g: number, b: number, a: number) =>
    `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${clamp01(a).toFixed(3)})`;

  const surfaceFillByDepth = (z: number) => {
    const d = clamp01(surfaceDepthOpacity(z));
    const fog = 1 - d;
    return rgba(lerp(9, 92, d), lerp(24, 196, d), lerp(53, 162, d), lerp(0.14, 0.38, d) * (1 - fog * 0.4));
  };
  const surfaceStrokeByDepth = (z: number) => {
    const d = clamp01(surfaceDepthOpacity(z));
    return rgba(lerp(84, 118, d), lerp(104, 240, d), lerp(145, 206, d), lerp(0.35, 0.92, d));
  };
  const edgeStrokeByDepth = (z: number, selected: boolean) => {
    const d = clamp01(depthOpacity(z));
    if (selected) return rgba(90, 210, 255, lerp(0.45, 0.98, d));
    return rgba(lerp(124, 240, d), lerp(137, 248, d), lerp(160, 255, d), lerp(0.18, 0.9, d));
  };
  const pointDepthRadius = (z: number) => lerp(0.72, 1.22, clamp01(pointDepthOpacity(z)));
</script>

{#if selecting && selectionMode === 'box' && selRect}
  <g data-layer="selection-overlay">
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
  </g>
{/if}

{#if selecting && selectionMode === 'lasso' && lasso.length > 1}
  <g data-layer="selection-overlay">
    <polyline points={lasso.map((p) => `${p.x},${p.y}`).join(' ')} fill="rgba(99,102,241,0.08)" stroke="rgba(99,102,241,0.75)" stroke-width="1.5" stroke-dasharray="4 3" class="pointer-events-none" />
  </g>
{/if}

{#if showSurfaces}
  <g data-layer="surfaces">
    {#each sortedSurfaces as s (s.i)}
      {@const polyPts = s.pts.map((pi) => projected[pi]).filter(Boolean)}
      {#if polyPts.length >= 3 && polyInView(polyPts)}
        <polygon
          points={polyPts.map((p) => `${p.x},${p.y}`).join(' ')}
          fill={surfaceFillByDepth(s.z)}
          stroke={surfaceStrokeByDepth(s.z)}
          stroke-width={0.9 + 0.9 * surfaceDepthOpacity(s.z)}
          class=""
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
  </g>
{/if}

{#if showDatums}
  <g data-layer="datums">
    {#each datumPlanePatches as pl (pl.i)}
      {@const pp = pl.pts.map((p) => project(p))}
      {#if polyInView(pp)}
        <polygon points={pp.map((p) => `${p.x},${p.y}`).join(' ')} fill="rgba(14,116,144,0.09)" stroke="rgba(56,189,248,0.65)" stroke-dasharray="3 2" stroke-width="1.1" class="" role="button" tabindex="0" aria-label={`Select plane PL${pl.i + 1}`} onpointerdown={(ev) => ev.stopPropagation()} onpointerup={(ev) => { ev.stopPropagation(); onPlaneClick(pl.i); }} onclick={() => onPlaneClick(pl.i)} onkeydown={(ke) => keyActivate(ke, () => onPlaneClick(pl.i))} />
      {/if}
    {/each}
    {#each datumAxisSegments as ax (ax.csysIdx + '-' + ax.axis)}
      {@const a2 = project(ax.a)}
      {@const b2 = project(ax.b)}
      {#if segmentInView(a2, b2)}
        <line x1={a2.x} y1={a2.y} x2={b2.x} y2={b2.y} stroke={ax.axis === 'X' ? 'rgba(248,113,113,0.9)' : ax.axis === 'Y' ? 'rgba(74,222,128,0.9)' : 'rgba(96,165,250,0.9)'} stroke-width="2" class="" role="button" tabindex="0" aria-label={`Select csys CS${ax.csysIdx + 1}`} onpointerdown={(ev) => ev.stopPropagation()} onpointerup={(ev) => { ev.stopPropagation(); onCsysClick(ax.csysIdx); }} onclick={() => onCsysClick(ax.csysIdx)} onkeydown={(ke) => keyActivate(ke, () => onCsysClick(ax.csysIdx))} />
      {/if}
    {/each}
  </g>
{/if}

{#if showEdges}
  <g data-layer="edges">
    {#each sortedEdges as e (e.i)}
      {#if !isolatedLineIds || isolatedLineIds.has(e.i)}
      {@const p1 = projected[e.a]}
      {@const p2 = projected[e.b]}
      {#if p1 && p2 && segmentInView(p1, p2)}
        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={edgeStrokeByDepth(e.z, selectedLineSet.has(e.i) || activeEdgeIdx === e.i)} stroke-width={(selectedLineSet.has(e.i) || activeEdgeIdx === e.i ? 2.2 : 1) * lerp(0.8, 1.35, clamp01(depthOpacity(e.z)))} stroke-dasharray="4 4" class={`${selectedLineSet.has(e.i) || activeEdgeIdx === e.i ? 'drop-shadow-[0_0_10px_rgba(99,102,241,0.35)]' : ''}`} role="button" tabindex="0" aria-label={`Select line L${e.i + 1}`} onpointerdown={(ev) => ev.stopPropagation()} onpointerup={(ev) => { ev.stopPropagation(); onEdgeClick(e.i, ev as unknown as MouseEvent); }} onclick={(ev) => onEdgeClick(e.i, ev)} onkeydown={(ke) => keyActivate(ke, () => onEdgeClick(e.i))} />
        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(0,0,0,0)" stroke-width={edgeHitWidth} class="cursor-pointer" aria-hidden="true" onpointerdown={(ev) => ev.stopPropagation()} onpointerup={(ev) => { ev.stopPropagation(); onEdgeClick(e.i, ev as unknown as MouseEvent); }} onclick={(ev) => onEdgeClick(e.i, ev)} />
      {/if}
      {/if}
    {/each}
  </g>
{/if}

{#if loftSegments.length}
  {#each loftSegments as seg, si (si)}
    {@const p1 = project(seg.a)}
    {@const p2 = project(seg.b)}
    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" class="text-emerald-300/70" opacity="0.8" />
  {/each}
{/if}

{#if cylAxisSeg}
  {@const a2 = project(cylAxisSeg.a)}
  {@const b2 = project(cylAxisSeg.b)}
  <line x1={a2.x} y1={a2.y} x2={b2.x} y2={b2.y} stroke="currentColor" stroke-width="2" stroke-dasharray="6 4" class="text-sky-300/70 pointer-events-none" opacity="0.9" />
{/if}

{#if intersection}
  {@const ip = project(intersection.p)}
  <circle cx={ip.x} cy={ip.y} r="6" fill="rgba(239,68,68,0.85)" stroke="rgba(239,68,68,1)" stroke-width="2" />
{/if}

{#if interpPoint}
  {@const sp = project(interpPoint)}
  <circle cx={sp.x} cy={sp.y} r="5" fill="rgba(34,197,94,0.65)" stroke="rgba(34,197,94,1)" stroke-width="2" />
{/if}

{#if showPoints}
  <g data-layer="points">
    {#each pointRenderIds as i (i)}
      {@const node = projected[i]}
      {#if node}
      {#if !isolatedPointIds || isolatedPointIds.has(i)}
      {@const absd = evalRes ? Math.abs(evalRes.signedDistances[i] ?? 0) : 0}
      {@const baseFill = pendingPointIdx === i ? 'rgba(99,102,241,0.95)' : 'rgba(255,255,255,0.60)'}
      {@const hmFill = heatmapOn && evalRes ? heatColor(absd, heatScale) : baseFill}
      {@const depthScale = pointDepthRadius(node.z)}
      {#if inView(node.x, node.y)}
        <circle
          cx={node.x}
          cy={node.y}
          r={(selectedSet.has(i) ? pointBaseRadius + 2 : (pendingPointIdx === i ? pointBaseRadius + 2 : pointBaseRadius)) * depthScale}
          fill={hmFill}
          fill-opacity={pointDepthOpacity(node.z)}
          stroke={selectedSet.has(i) ? 'rgba(56,189,248,0.95)' : (cylOutlierSet.has(i) ? 'rgba(251,191,36,0.95)' : (outlierSet.has(i) ? 'rgba(244,63,94,0.95)' : 'rgba(255,255,255,0.75)'))}
          stroke-opacity={0.35 + 0.65 * pointDepthOpacity(node.z)}
          stroke-width="1"
          class=""
          role="button"
          tabindex="0"
          aria-label={`Select point P${i + 1}`}
          onpointerdown={(ev) => ev.stopPropagation()}
          onpointerup={(e) => handlePointClick(i, e as unknown as MouseEvent)}
          onclick={(e) => handlePointClick(i, e)}
          onkeydown={(ke) => keyActivate(ke, () => handlePointClick(i))}
        >
          <title>P{i + 1}: ({points[i].x}, {points[i].y}, {points[i].z})</title>
        </circle>
      {/if}
      {/if}
      {/if}
    {/each}
  </g>
{/if}
