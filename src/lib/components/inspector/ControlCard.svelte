<script lang="ts">
  import { INSPECTOR_THEME } from '$lib/components/inspector/InspectorThemeTokens';
  export let label = '';
  export let cardClass = '';
</script>

<div
  class={`control-card ${cardClass}`.trim()}
  style={`--cc-min-h:${INSPECTOR_THEME.control.cardMinHeight}px;--cc-gap:${INSPECTOR_THEME.control.labelGap}px;--cc-input-h:${INSPECTOR_THEME.control.inputMinHeight}px;`}
>
  <span class="control-card-label">{label}</span>
  <div class="control-card-body">
    <slot />
  </div>
</div>

<style>
  .control-card {
    display: flex;
    flex-direction: column;
    gap: var(--cc-gap, 6px);
    min-height: var(--cc-min-h, 66px);
  }
  .control-card-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: rgba(255, 255, 255, 0.52);
    line-height: 1;
  }
  .control-card-body {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    min-height: 36px;
  }
  .control-card-body :global(.input),
  .control-card-body :global(.select) {
    min-height: var(--cc-input-h, 38px);
  }
</style>
