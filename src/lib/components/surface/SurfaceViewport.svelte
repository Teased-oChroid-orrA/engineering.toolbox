<script lang="ts">
  // Minimal, stable SurfaceViewport module.
  // It renders projected points (projectedDraw) and overlays (selection / probe / interp),
  // and delegates all interaction back to SurfaceToolbox via passed-in handlers.
  import type { SvelteComponent } from 'svelte';
  import SurfacePointRenderer from './SurfacePointRenderer.svelte';

  export let viewportEl: HTMLDivElement | null = null;
  export let svgEl: SVGSVGElement | null = null;

  export let w: number;
  export let h: number;

  export let selectionMode: any;
  export let selecting: boolean;
  export let selRect: { x0: number; y0: number; x1: number; y1: number } | null;
  export let lasso: { x: number; y: number }[];

  export let probeOn: boolean;
  export let probe: any;
  export let probeBoltDia: number;
  export let maxTaperDeg: number;
  export let probeMin: number;
  export let probeMax: number;
  export let probeAngleDeg: number;

  export let zoomK: number;

  export let onViewportContextMenu: (e: MouseEvent) => void;
  export let updateProbeFromEvent: (e: PointerEvent | MouseEvent) => void;

  export let onSvgPointerDown: (e: PointerEvent) => void;
  export let onSvgPointerMove: (e: PointerEvent) => void;
  export let onSvgPointerUp: (e: PointerEvent) => void;

  export let projectedDraw: any[] = [];
  export let points: any[] = [];

  export let evalRes: any = null;
  export let heatmapOn: boolean;
  export let heatScale: any;
  export let heatColor: (t: number) => string;

  export let pendingPointIdx: number | null;
  export let selectedSet: Set<number>;
  export let cylOutlierSet: Set<number>;
  export let outlierSet: Set<number>;

  export let handlePointClick: (i: number, e: MouseEvent) => void;
  export let keyActivate: (e: KeyboardEvent) => void;

  export let project: (p: any) => { x: number; y: number; z?: number; depth?: number };

  export let interpLine: any = null;
  export let intersection: any = null;
  export let interpPoint: any = null;
  export let cylAxisSeg: any = null;

  export let depthOpacity: (z: number) => number;

  // Present for compatibility with older refactors; not required by this minimal viewport.
  export let sortedEdges: any[] = [];
</script>

<div
  class="relative w-full h-full overflow-hidden rounded-2xl border border-white/10 bg-black/20"
  bind:this={viewportEl}
  oncontextmenu={(e) => { e.preventDefault(); onViewportContextMenu(e); }}
>
  <svg
    class="absolute inset-0 w-full h-full select-none touch-none"
    bind:this={svgEl}
    viewBox={`0 0 ${w} ${h}`}
    tabindex="0"
    onkeydown={keyActivate}
    onpointerdown={onSvgPointerDown}
    onpointermove={onSvgPointerMove}
    onpointerup={onSvgPointerUp}
    onpointercancel={onSvgPointerUp}
  >
    <SurfacePointRenderer
      {projectedDraw}
      {heatmapOn}
      {heatColor}
      {pendingPointIdx}
      {selectedSet}
      {outlierSet}
      {cylOutlierSet}
      {depthOpacity}
      {handlePointClick}
      {selecting}
      {selectionMode}
      {selRect}
      {lasso}
      {probeOn}
      {probeMin}
      {probeMax}
      {probeAngleDeg}
      {interpLine}
      {cylAxisSeg}
      {intersection}
      {interpPoint}
    />
  </svg>
</div>