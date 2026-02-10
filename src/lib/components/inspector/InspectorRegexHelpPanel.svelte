<script lang="ts">
  import { slide } from 'svelte/transition';

  export let open = false;
  export let uiAnimDur = 160;

  const UI_ANIM_EASE = (t: number) => 1 - Math.pow(1 - t, 3);
</script>

{#if open}
  <div class="mt-4 border-t border-white/10 pt-4 text-xs text-white/70" transition:slide={{ duration: uiAnimDur, easing: UI_ANIM_EASE }}>
    <div class="font-semibold text-white/85 mb-1">Regex quick help</div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="glass-panel rounded-xl border border-white/10 p-3 inspector-pop-sub">
        <div class="text-white/80 font-semibold">Common patterns</div>
        <ul class="mt-2 space-y-1 text-white/65">
          <li><span class="font-mono text-white/85">^AN\\d+-.*</span> - starts with AN + digits</li>
          <li><span class="font-mono text-white/85">^(NAS|MS)\\d+.*</span> - NAS or MS family</li>
          <li><span class="font-mono text-white/85">.*-\\d+$</span> - ends with dash number</li>
        </ul>
      </div>
      <div class="glass-panel rounded-xl border border-white/10 p-3 inspector-pop-sub">
        <div class="text-white/80 font-semibold">Safety defaults</div>
        <ul class="mt-2 space-y-1 text-white/65">
          <li>Pattern length capped (UI warns at 256 chars).</li>
          <li>Blank Max scan uses backend default cap.</li>
          <li>Invalid regex will not execute; you will see an inline error.</li>
        </ul>
      </div>
    </div>
  </div>
{/if}
