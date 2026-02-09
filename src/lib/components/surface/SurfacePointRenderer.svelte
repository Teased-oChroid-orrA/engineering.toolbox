<script lang="ts">
  // Pure renderer for point cloud and common overlays.
  // Meant to be used inside an <svg> element; event wiring stays in SurfaceViewport/SurfaceToolbox.

  type DrawNode = { i: number; x: number; y: number; z?: number; t?: number };

  export let projectedDraw: DrawNode[] = [];

  export let heatmapOn: boolean = false;
  export let heatColor: (t: number) => string = () => 'rgba(255,255,255,0.6)';

  export let pendingPointIdx: number | null = null;
  export let selectedSet: Set<number> = new Set();
  export let outlierSet: Set<number> = new Set();
  export let cylOutlierSet: Set<number> = new Set();

  export let depthOpacity: (z: number) => number = () => 1;

  export let handlePointClick: (i: number, e: MouseEvent) => void = () => {};

  export let selecting: boolean = false;
  export let selectionMode: any = 'off';
  export let selRect: { x0: number; y0: number; x1: number; y1: number } | null = null;
  export let lasso: { x: number; y: number }[] = [];

  export let probeOn: boolean = false;
  export let probeMin: number = 0;
  export let probeMax: number = 0;
  export let probeAngleDeg: number = 0;

  // Overlays should be passed already projected into screen space: {x,y}.
  export let interpLine: { a: any; b: any } | null = null;
  export let cylAxisSeg: { a: any; b: any } | null = null;
  export let intersection: any = null;
  export let interpPoint: any = null;
</script>

<!-- Interp line overlay -->
{#if interpLine}
  <line
    x1={interpLine.a?.x}
    y1={interpLine.a?.y}
    x2={interpLine.b?.x}
    y2={interpLine.b?.y}
    stroke="rgba(255,255,255,0.25)"
    stroke-width="2"
    stroke-dasharray="6 6"
    pointer-events="none"
  />
{/if}

<!-- Cylinder axis overlay -->
{#if cylAxisSeg}
  <line
    x1={cylAxisSeg.a?.x}
    y1={cylAxisSeg.a?.y}
    x2={cylAxisSeg.b?.x}
    y2={cylAxisSeg.b?.y}
    stroke="rgba(110,231,183,0.35)"
    stroke-width="2"
    stroke-dasharray="5 5"
    pointer-events="none"
  />
{/if}

<!-- Points -->
{#each projectedDraw as node (node.i)}
  {@const i = node.i}
  {@const isSel = selectedSet?.has(i)}
  {@const isPending = pendingPointIdx === i}
  {@const isOut = outlierSet?.has(i)}
  {@const isCylOut = cylOutlierSet?.has(i)}
  {@const fill = heatmapOn && typeof node.t === 'number'
    ? heatColor(node.t)
    : (isSel ? 'rgba(34,211,238,0.95)' : 'rgba(255,255,255,0.65)')}
  {@const stroke = isCylOut
    ? 'rgba(245,158,11,0.9)'
    : (isOut
      ? 'rgba(248,113,113,0.9)'
      : (isPending ? 'rgba(167,139,250,0.95)' : 'rgba(0,0,0,0)'))}
  <circle
    cx={node.x}
    cy={node.y}
    r={2}
    fill={fill}
    stroke={stroke}
    stroke-width={2}
    opacity={typeof node.z === 'number' ? depthOpacity(node.z) : 1}
    role="button"
    tabindex="0"
    aria-label={`Point ${i}`}
    onclick={(e) => handlePointClick(i, e)}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handlePointClick(i, e as unknown as MouseEvent);
      }
    }}
  />
{/each}

<!-- Intersection marker -->
{#if intersection}
  <circle
    cx={intersection.x}
    cy={intersection.y}
    r={4}
    fill="rgba(34,197,94,0.9)"
    stroke="rgba(0,0,0,0.6)"
    stroke-width={2}
    pointer-events="none"
  />
{/if}

<!-- Interp point marker -->
{#if interpPoint}
  <circle
    cx={interpPoint.x}
    cy={interpPoint.y}
    r={4}
    fill="rgba(59,130,246,0.9)"
    stroke="rgba(0,0,0,0.6)"
    stroke-width={2}
    pointer-events="none"
  />
{/if}

<!-- Selection overlays -->
{#if selecting && selectionMode === 'box' && selRect}
  <rect
    x={Math.min(selRect.x0, selRect.x1)}
    y={Math.min(selRect.y0, selRect.y1)}
    width={Math.abs(selRect.x1 - selRect.x0)}
    height={Math.abs(selRect.y1 - selRect.y0)}
    fill="rgba(34,211,238,0.10)"
    stroke="rgba(34,211,238,0.65)"
    stroke-width="2"
    pointer-events="none"
  />
{/if}

{#if selecting && selectionMode === 'lasso' && lasso?.length > 1}
  <polyline
    points={lasso.map((p) => `${p.x},${p.y}`).join(' ')}
    fill="rgba(34,211,238,0.08)"
    stroke="rgba(34,211,238,0.65)"
    stroke-width="2"
    pointer-events="none"
  />
{/if}

<!-- Probe overlay -->
{#if probeOn}
  <g pointer-events="none">
    <text x="12" y="18" fill="rgba(255,255,255,0.6)" font-size="11">
      Probe: {probeAngleDeg.toFixed?.(1) ?? probeAngleDeg}° (range {probeMin}–{probeMax}°)
    </text>
  </g>
{/if}
