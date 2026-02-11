<script lang="ts">
  export let points: { x: number; y: number }[] = [];

  function dragAction(node: SVGCircleElement, i: number) {
    let active = false;

    const onPointerDown = (ev: PointerEvent) => {
      if (ev.button !== 0) return;
      active = true;
      node.setPointerCapture(ev.pointerId);
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (!active) return;
      const svg = node.ownerSVGElement;
      if (!svg) return;
      const pt = svg.createSVGPoint();
      pt.x = ev.clientX;
      pt.y = ev.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const local = pt.matrixTransform(ctm.inverse());
      points[i].x = local.x;
      points[i].y = local.y;
      points = [...points];
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (!active) return;
      active = false;
      try {
        node.releasePointerCapture(ev.pointerId);
      } catch {
        // no-op
      }
    };

    node.addEventListener('pointerdown', onPointerDown);
    node.addEventListener('pointermove', onPointerMove);
    node.addEventListener('pointerup', onPointerUp);
    node.addEventListener('pointercancel', onPointerUp);

    return {
      destroy() {
        node.removeEventListener('pointerdown', onPointerDown);
        node.removeEventListener('pointermove', onPointerMove);
        node.removeEventListener('pointerup', onPointerUp);
        node.removeEventListener('pointercancel', onPointerUp);
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
