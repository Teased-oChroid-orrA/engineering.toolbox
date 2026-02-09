<script lang="ts">
  export let width = 420;
  export let height = 297;
  export let margin = 18;
  export let title = 'Structural Companion';
  export let subtitle = '';
  export let drawingNo = '—';
  export let sheet = '1/1';
  export let scale = 'NTS';
  export let rev = 'A';
  export let drafter = '';
  export let date = new Date().toISOString().slice(0, 10);

  const TB_W = 150;
  const TB_H = 55;
</script>

<svg 
  width="100%" 
  height="100%" 
  viewBox={`0 0 ${width} ${height}`} 
  preserveAspectRatio="xMidYMid meet"
  xmlns="http://www.w3.org/2000/svg" 
  class="text-white/90"
>
  <rect x={margin} y={margin} width={width - 2*margin} height={height - 2*margin} fill="none" stroke="currentColor" stroke-width="0.6" />

  <slot />

  <g transform={`translate(${width - margin - TB_W}, ${height - margin - TB_H})`} font-family="ui-sans-serif, system-ui, -apple-system">
    
    <rect x="0" y="0" width={TB_W} height={TB_H} fill="rgba(255,255,255,0.03)" stroke="currentColor" stroke-width="0.6" />
    
    <line x1="0" y1="18" x2={TB_W} y2="18" stroke="currentColor" stroke-width="0.4" />
    <line x1="0" y1="36" x2={TB_W} y2="36" stroke="currentColor" stroke-width="0.4" />
    <line x1={TB_W*0.6} y1="18" x2={TB_W*0.6} y2={TB_H} stroke="currentColor" stroke-width="0.4" />

    <text x="4" y="12" font-size="9" font-weight="600" fill="currentColor">{title}</text>
    {#if subtitle}
      <text x="4" y="26" font-size="8" fill="currentColor" opacity="0.8">{subtitle}</text>
    {/if}

    <text x="4" y="44" font-size="7" fill="currentColor">DWG: {drawingNo}</text>
    <text x={TB_W*0.6 + 4} y="44" font-size="7" fill="currentColor">SHT: {sheet}</text>

    <text x="4" y="52" font-size="7" fill="currentColor">SCL: {scale}</text>
    <text x={TB_W*0.6 + 4} y="52" font-size="7" fill="currentColor">REV: {rev}</text>

    {#if drafter}
      <text x="4" y="34" font-size="7" fill="currentColor">DRWN: {drafter}</text>
      <text x={TB_W*0.6 + 4} y="34" font-size="7" fill="currentColor">{date}</text>
    {:else}
      <text x="4" y="34" font-size="7" fill="currentColor">{date}</text>
    {/if}
  </g>
</svg>