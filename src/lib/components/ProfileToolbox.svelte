<script lang="ts">
  import * as d3 from 'd3';
  import { onMount } from 'svelte';

  export let points: { x: number; y: number }[] = [];

  function handleDrag(ev: any, i: number) {
    points[i].x = ev.x;
    points[i].y = ev.y;
    points = [...points];
  }

  function dragAction(node: SVGCircleElement, i: number) {
    const drag = d3.drag<SVGCircleElement, unknown>()
      .on('drag', (ev) => handleDrag(ev, i));
    d3.select(node).call(drag);
    return {
      destroy() {
        d3.select(node).on('.drag', null);
      }
    };
  }
</script>

<svg viewBox="0 0 10 10" class="w-full h-full border">
  {#each points as p, i}
    <circle
      cx={p.x}
      cy={p.y}
      r="0.15"
      class="fill-white cursor-pointer"
      use:dragAction={i}
    />
  {/each}
</svg>