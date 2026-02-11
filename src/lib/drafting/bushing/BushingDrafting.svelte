<script lang="ts">
  import { buildBushingScene, type BushingRenderMode } from './bushingSceneModel';
  import BushingBabylonCanvas from './BushingBabylonCanvas.svelte';
  import { toCanonicalDraftScene } from './BushingDraftRenderer';
  import type { BabylonRenderDiagnostic } from './BushingBabylonRuntime';

  export let inputs: any;
  export let legacyMode = false; // backward compatibility
  export let renderMode: BushingRenderMode | undefined = undefined;
  export let onBabylonDiagnostics: (diag: BabylonRenderDiagnostic[]) => void = () => {};
  export let onBabylonInitFailure: (reason: string) => void = () => {};

  $: scene = buildBushingScene(inputs);
  $: canonicalScene = toCanonicalDraftScene(scene);
  $: mode = renderMode ?? (legacyMode ? 'legacy' : 'section');
</script>

<div class="w-full h-full grid place-items-center rounded-xl overflow-hidden">
  <BushingBabylonCanvas
    scene={canonicalScene}
    onDiagnostics={(diag) => onBabylonDiagnostics(diag)}
    onInitFailure={(reason) => {
      onBabylonInitFailure(reason);
    }}
  />
</div>
