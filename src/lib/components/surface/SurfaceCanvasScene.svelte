<script lang="ts">
  export let selecting = false;
  export let selectionMode: 'none' | 'box' | 'lasso' = 'none';
  export let selRect: { x0: number; y0: number; x1: number; y1: number } | null = null;
  export let lasso: { x: number; y: number }[] = [];
  export let showSurfaces = true;
  export let sortedSurfaces: { i: number; pts: number[]; z: number; name: string }[] = [];
  export let offsetSourceSurfaceA: number | null = null;
  export let offsetSourceSurfaceB: number | null = null;
  export let showDatums = true;
  export let datumPlanePatches: { i: number; name: string; pts: { x: number; y: number; z: number }[] }[] = [];
  export let datumAxisSegments: { i: number; csysIdx: number; axis: 'X' | 'Y' | 'Z'; a: { x: number; y: number; z: number }; b: { x: number; y: number; z: number } }[] = [];
  export let projected: { x: number; y: number; z: number }[] = [];
  export let showEdges = true;
  export let sortedEdges: { i: number; a: number; b: number; z: number }[] = [];
  export let offsetSourceLineA: number | null = null;
  export let offsetSourceLineB: number | null = null;
  export let offsetLinePickActive = false;
  export let offsetSurfacePickActive = false;
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
  export let offsetPreviewA: { a: any; b: any } | null = null;
  export let offsetPreviewB: { a: any; b: any } | null = null;
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
  export let draftCursor: { x: number; y: number } | null = null;
  export let lineDraftStartIdx: number | null = null;
  export let surfaceDraftIds: number[] = [];
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

{#if lineDraftStartIdx !== null && draftCursor}
  {@const lineStart = projected[lineDraftStartIdx]}
  {#if lineStart}
    <g data-layer="draft" class="pointer-events-none">
      <text x={lineStart.x + 10} y={lineStart.y - 10} fill="rgba(186,230,253,0.95)" font-size="10.5" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas">Start</text>
      <line
        x1={lineStart.x}
        y1={lineStart.y}
        x2={draftCursor.x}
        y2={draftCursor.y}
        stroke="rgba(34,211,238,0.92)"
        stroke-width="1.8"
        stroke-dasharray="6 4"
      />
      <circle cx={draftCursor.x} cy={draftCursor.y} r="4.5" fill="rgba(34,211,238,0.12)" stroke="rgba(34,211,238,0.92)" stroke-width="1.2" />
    </g>
  {/if}
{/if}

{#if surfaceDraftIds.length > 0}
  {@const draftPts = surfaceDraftIds.map((pi) => projected[pi]).filter(Boolean)}
  {#if draftPts.length > 0}
    <g data-layer="draft" class="pointer-events-none">
      {#each draftPts as p, idx (idx)}
        <g>
          <circle cx={p.x} cy={p.y} r="7" fill="rgba(15,23,42,0.82)" stroke="rgba(16,185,129,0.42)" stroke-width="1" />
          <text x={p.x} y={p.y + 3.5} text-anchor="middle" fill="rgba(220,252,231,0.96)" font-size="9.5" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas">{idx + 1}</text>
        </g>
      {/each}
      {#if draftPts.length >= 3}
        <polygon
          points={draftPts.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="rgba(16,185,129,0.08)"
          stroke="rgba(16,185,129,0.25)"
          stroke-width="1"
        />
      {/if}
      <polyline
        points={[...draftPts, ...(draftCursor ? [draftCursor] : [])].map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke="rgba(16,185,129,0.92)"
        stroke-width="1.8"
        stroke-dasharray="6 4"
      />
    </g>
  {/if}
{/if}

{#if showSurfaces}
  <g data-layer="surfaces">
    {#each sortedSurfaces as s (s.i)}
      {@const polyPts = s.pts.map((pi) => projected[pi]).filter(Boolean)}
      {#if polyPts.length >= 3 && polyInView(polyPts)}
        {@const sourceSurfaceTone = s.i === offsetSourceSurfaceA ? 'rgba(129,140,248,0.9)' : s.i === offsetSourceSurfaceB ? 'rgba(45,212,191,0.9)' : null}
        <polygon
          points={polyPts.map((p) => `${p.x},${p.y}`).join(' ')}
          fill={sourceSurfaceTone ? 'rgba(255,255,255,0.03)' : offsetSurfacePickActive ? 'rgba(34,211,238,0.06)' : surfaceFillByDepth(s.z)}
          stroke={sourceSurfaceTone ?? surfaceStrokeByDepth(s.z)}
          stroke-width={(sourceSurfaceTone ? 2 : 0.9) + 0.9 * surfaceDepthOpacity(s.z) + (offsetSurfacePickActive ? 0.55 : 0)}
          class={offsetSurfacePickActive ? 'animate-pulse' : ''}
          role="button"
          tabindex="0"
          aria-label={`Select surface S${s.i + 1}`}
          onpointerdown={(ev) => { ev.stopPropagation(); onSurfaceClick(s.i, ev as unknown as MouseEvent); }}
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
        {@const sourceLineTone = e.i === offsetSourceLineA ? 'rgba(129,140,248,0.98)' : e.i === offsetSourceLineB ? 'rgba(45,212,191,0.98)' : null}
        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={sourceLineTone ?? edgeStrokeByDepth(e.z, selectedLineSet.has(e.i) || activeEdgeIdx === e.i)} stroke-width={((selectedLineSet.has(e.i) || activeEdgeIdx === e.i ? 2.2 : 1) + (sourceLineTone ? 1.2 : 0) + (offsetLinePickActive ? 0.55 : 0)) * lerp(0.8, 1.35, clamp01(depthOpacity(e.z)))} stroke-dasharray={sourceLineTone ? 'none' : offsetLinePickActive ? '2 3' : '4 4'} class={`${selectedLineSet.has(e.i) || activeEdgeIdx === e.i || sourceLineTone || offsetLinePickActive ? 'drop-shadow-[0_0_10px_rgba(99,102,241,0.35)]' : ''} ${offsetSurfacePickActive ? 'pointer-events-none' : ''} ${offsetLinePickActive ? 'animate-pulse' : ''}`} role="button" tabindex={offsetSurfacePickActive ? -1 : 0} aria-label={`Select line L${e.i + 1}`} onpointerdown={(ev) => { if (offsetSurfacePickActive) return; ev.stopPropagation(); onEdgeClick(e.i, ev as unknown as MouseEvent); }} onkeydown={(ke) => { if (offsetSurfacePickActive) return; keyActivate(ke, () => onEdgeClick(e.i)); }} />
        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(0,0,0,0)" stroke-width={edgeHitWidth} class={`cursor-pointer ${offsetSurfacePickActive ? 'pointer-events-none' : ''}`} aria-hidden="true" onpointerdown={(ev) => { if (offsetSurfacePickActive) return; ev.stopPropagation(); onEdgeClick(e.i, ev as unknown as MouseEvent); }} />
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

{#if offsetPreviewA}
  {@const a1 = project(offsetPreviewA.a)}
  {@const a2 = project(offsetPreviewA.b)}
  {#if segmentInView(a1, a2)}
    <line x1={a1.x} y1={a1.y} x2={a2.x} y2={a2.y} stroke="rgba(129,140,248,0.92)" stroke-width="2.2" stroke-dasharray="7 4" class="pointer-events-none" />
  {/if}
{/if}

{#if offsetPreviewB}
  {@const b1 = project(offsetPreviewB.a)}
  {@const b2 = project(offsetPreviewB.b)}
  {#if segmentInView(b1, b2)}
    <line x1={b1.x} y1={b1.y} x2={b2.x} y2={b2.y} stroke="rgba(45,212,191,0.92)" stroke-width="2.2" stroke-dasharray="2 4" class="pointer-events-none" />
  {/if}
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
          onpointerdown={(ev) => { ev.stopPropagation(); handlePointClick(i, ev as unknown as MouseEvent); }}
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
