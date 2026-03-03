<script lang="ts">
  import { buildBushingScene, type BushingRenderMode } from './bushingSceneModel';
  import { toCanonicalDraftScene } from './BushingDraftRenderer';
  import BushingD3Canvas from './BushingD3Canvas.svelte';
  import type { BushingRenderDiagnostic } from './BushingRenderTypes';

  let {
    inputs,
    legacyMode = false,
    renderMode = undefined,
    onRenderDiagnostics = () => {},
    onRenderInitFailure = () => {}
  }: {
    inputs: any;
    legacyMode?: boolean;
    renderMode?: BushingRenderMode;
    onRenderDiagnostics?: (diag: BushingRenderDiagnostic[]) => void;
    onRenderInitFailure?: (reason: string) => void;
  } = $props();

  let scene = $derived(buildBushingScene(inputs));
  let canonicalScene = $derived(toCanonicalDraftScene(scene));
  let mode = $derived(renderMode ?? (legacyMode ? 'legacy' : 'section'));
</script>

<div class="w-full h-full grid place-items-center rounded-xl overflow-hidden">
  <BushingD3Canvas
    scene={canonicalScene}
    sectionScene={scene}
    renderMode={mode}
    viewModel={inputs}
    onDiagnostics={(diag) => onRenderDiagnostics(diag)}
    onInitFailure={(reason) => {
      onRenderInitFailure(reason);
    }}
  />
</div>
