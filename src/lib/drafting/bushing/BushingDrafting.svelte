<script lang="ts">
  import { buildBushingScene, type BushingRenderMode } from './bushingSceneModel';
  import { renderBushingSceneGroup } from './bushingSceneRenderer';

  export let inputs: any;
  export let legacyMode = false; // backward compatibility
  export let renderMode: BushingRenderMode | undefined = undefined;

  $: scene = buildBushingScene(inputs);
  $: mode = renderMode ?? (legacyMode ? 'legacy' : 'section');
  $: padX = Math.max(0.2, scene.width * 0.12);
  $: padY = Math.max(0.2, scene.height * 0.14);
  $: viewMinX = -scene.width / 2 - padX;
  $: viewMinY = -scene.height / 2 - padY;
  $: viewW = scene.width + padX * 2;
  $: viewH = scene.height + padY * 2;

  let group = '';
  let lastKey = '';
  function sceneKey(): string {
    return [
      mode,
      scene.width.toFixed(6),
      scene.height.toFixed(6),
      scene.leftHousingPath.length,
      scene.rightHousingPath.length,
      scene.leftBushingPath.length,
      scene.rightBushingPath.length,
      scene.boreVoidPath.length
    ].join('|');
  }
  $: {
    const key = sceneKey();
    if (key !== lastKey) {
      group = renderBushingSceneGroup(scene, { x: viewMinX, y: viewMinY, w: viewW, h: viewH }, mode);
      lastKey = key;
    }
  }
</script>

<div class="w-full h-full grid place-items-center rounded-xl overflow-hidden">
  <svg
    viewBox="{viewMinX} {viewMinY} {viewW} {viewH}"
    preserveAspectRatio="xMidYMid meet"
    class="w-full h-full max-h-[460px] drop-shadow-lg rounded-xl">
    <defs>
      <pattern id="gridDots" width="14" height="14" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="0.6" fill="rgba(45,212,191,0.15)" />
      </pattern>
      <linearGradient id="glow" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="rgba(59,130,246,0.35)" />
        <stop offset="100%" stop-color="rgba(59,130,246,0)" />
      </linearGradient>
    </defs>
    <rect x={-scene.width / 2} y={-scene.height / 2} width={scene.width} height={scene.height} fill="url(#glow)" opacity="0.28" />
    <rect x={-scene.width / 2} y={-scene.height / 2} width={scene.width} height={scene.height} fill="url(#gridDots)" opacity="0.28" />
    {@html group}
  </svg>
</div>
