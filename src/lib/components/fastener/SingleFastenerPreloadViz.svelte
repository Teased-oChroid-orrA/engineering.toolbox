<script lang="ts">
  import type { ElementResult } from '$lib/core/fastener';

  let {
    elements = [],
    preloadForce = 0,
    boltElongation = 0,
    clampCompression = 0,
    stiffness = 0,
    lengthUnit = 'in',
    forceUnit = 'lbf',
    stiffnessUnit = 'lbf/in'
  }: {
    elements: ElementResult[];
    preloadForce: number;
    boltElongation: number;
    clampCompression: number;
    stiffness: number;
    lengthUnit: string;
    forceUnit: string;
    stiffnessUnit: string;
  } = $props();

  const fmt = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : '---');
  const width = 1080;
  const height = 420;
  const stackX0 = 120;
  const stackX1 = 610;
  const stackY0 = 44;
  const stackY1 = 378;
  const stackH = stackY1 - stackY0;
  const boltCx = (stackX0 + stackX1) / 2;
  const boltShankW = 26;
  const headY = stackY0 - 12;
  const nutY = stackY1 + 12;
  const washerW = 86;

  const rows = $derived.by(() => {
    const totalLength = Math.max(1e-9, elements.reduce((s, e) => s + Math.max(0, e.length), 0));
    const minH = 14;
    const rawHeights = elements.map((e) => Math.max(0, (Math.max(0, e.length) / totalLength) * stackH));
    const deficit = rawHeights.reduce((d, h) => d + Math.max(0, minH - h), 0);
    const flex = rawHeights.map((h) => Math.max(0, h - minH));
    const flexTotal = flex.reduce((s, f) => s + f, 0);
    const hAdjusted = rawHeights.map((h, i) => {
      const floor = Math.max(minH, h);
      if (deficit <= 1e-9 || flexTotal <= 1e-9 || h <= minH) return floor;
      return Math.max(minH, floor - (flex[i] / flexTotal) * deficit);
    });

    let y = stackY0;
    return elements.map((e, i) => {
      const h = hAdjusted[i];
      const yMid = y + h / 2;
      const row = {
        ...e,
        y,
        h,
        yMid
      };
      y += h;
      return row;
    });
  });

  function kindColor(kind: string): string {
    if (kind.startsWith('bolt')) return '#4f87ff';
    if (kind.startsWith('washer')) return '#69b8ff';
    if (kind === 'nut-body') return '#3fb4a1';
    if (kind === 'joint-member') return '#32c295';
    return '#7f9cc2';
  }

  function hex(cx: number, cy: number, w: number, h: number): string {
    const hw = w / 2;
    const hh = h / 2;
    return `M ${cx - hw * 0.78} ${cy - hh} L ${cx + hw * 0.78} ${cy - hh} L ${cx + hw} ${cy} L ${cx + hw * 0.78} ${cy + hh} L ${cx - hw * 0.78} ${cy + hh} L ${cx - hw} ${cy} Z`;
  }

  function spring(x: number, y0: number, y1: number, turns = 7, amp = 6): string {
    const h = Math.max(8, y1 - y0);
    const step = h / (turns * 2);
    let y = y0;
    let sign = 1;
    let d = `M ${x} ${y0}`;
    for (let i = 0; i < turns * 2; i++) {
      y += step;
      d += ` L ${x + sign * amp} ${y}`;
      sign *= -1;
    }
    d += ` L ${x} ${y1}`;
    return d;
  }
</script>

<div class="w-full overflow-auto rounded-xl border border-white/10 bg-black/25 p-3">
  <svg viewBox={`0 0 ${width} ${height}`} class="h-[420px] min-w-[860px] w-full">
    <defs>
      <pattern id="preload-thread" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
        <line x1="0" y1="0" x2="0" y2="8" stroke="#d8e4f7" stroke-width="1.8"></line>
      </pattern>
      <linearGradient id="cad-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0c1c35"></stop>
        <stop offset="70%" stop-color="#081425"></stop>
        <stop offset="100%" stop-color="#070f1d"></stop>
      </linearGradient>
      <linearGradient id="member-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#4ad2a8" stop-opacity="0.55"></stop>
        <stop offset="50%" stop-color="#35bf99" stop-opacity="0.32"></stop>
        <stop offset="100%" stop-color="#2da587" stop-opacity="0.2"></stop>
      </linearGradient>
      <linearGradient id="member-metal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8ff0d4" stop-opacity="0.2"></stop>
        <stop offset="45%" stop-color="#48b996" stop-opacity="0.08"></stop>
        <stop offset="100%" stop-color="#1e6f5a" stop-opacity="0.2"></stop>
      </linearGradient>
      <linearGradient id="bolt-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#83afff"></stop>
        <stop offset="55%" stop-color="#5d8fe4"></stop>
        <stop offset="100%" stop-color="#3d6fc3"></stop>
      </linearGradient>
      <linearGradient id="steel-head" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#e7f1ff"></stop>
        <stop offset="35%" stop-color="#7aa7ef"></stop>
        <stop offset="100%" stop-color="#416cb9"></stop>
      </linearGradient>
      <linearGradient id="nut-head" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#e0fff6"></stop>
        <stop offset="45%" stop-color="#6ddac0"></stop>
        <stop offset="100%" stop-color="#2f9682"></stop>
      </linearGradient>
      <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.8"></feGaussianBlur>
        <feOffset dx="0.5" dy="1.2"></feOffset>
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.35"></feFuncA>
        </feComponentTransfer>
        <feMerge>
          <feMergeNode></feMergeNode>
          <feMergeNode in="SourceGraphic"></feMergeNode>
        </feMerge>
      </filter>
      <marker id="preload-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto">
        <path d="M 0 0 L 8 4 L 0 8 z" fill="#ebf3ff"></path>
      </marker>
    </defs>

    <rect x={stackX0} y={stackY0} width={stackX1 - stackX0} height={stackH} rx="10" fill="url(#cad-bg)" stroke="#2e537d" stroke-width="1.2"></rect>
    <rect x={stackX0 + 6} y={stackY0 + 6} width={stackX1 - stackX0 - 12} height="6" rx="3" fill="#8db3df" opacity="0.14"></rect>
    <rect x={stackX0 + 5} y={stackY1 - 11} width={stackX1 - stackX0 - 10} height="5" rx="2.5" fill="#1d3352" opacity="0.8"></rect>

    <path d={hex(boltCx, headY, 90, 20)} fill="url(#steel-head)" stroke="#deebff" stroke-width="1" filter="url(#soft-shadow)"></path>
    <path d={hex(boltCx, headY, 74, 10)} fill="#ebf3ff" opacity="0.2"></path>
    <rect x={boltCx - washerW / 2} y={headY + 12} width={washerW} height="7" rx="3" fill="#89c2ff"></rect>
    <path d={hex(boltCx, nutY, 84, 18)} fill="url(#nut-head)" stroke="#dbfff7" stroke-width="1" filter="url(#soft-shadow)"></path>
    <path d={hex(boltCx, nutY, 66, 9)} fill="#dbfff7" opacity="0.15"></path>
    <rect x={boltCx - washerW / 2} y={nutY - 19} width={washerW} height="7" rx="3" fill="#7fe4d2"></rect>

    <rect x={boltCx - boltShankW / 2} y={stackY0 + 10} width={boltShankW} height={stackH - 20} rx="5" fill="url(#bolt-grad)" stroke="#dbe8ff" stroke-width="1"></rect>
    <rect x={boltCx - boltShankW / 2 + 2} y={stackY0 + 12} width="3" height={stackH - 24} rx="2" fill="#deebff" opacity="0.32"></rect>
    <rect x={boltCx - boltShankW / 2} y={stackY0 + stackH * 0.62} width={boltShankW} height={stackH * 0.28} rx="4" fill="url(#preload-thread)" opacity="0.75"></rect>

    {#each rows as row (row.id)}
      {@const w = row.group === 'bolt' ? 78 : 222}
      <rect
        x={boltCx - w / 2}
        y={row.y + 1}
        width={w}
        height={Math.max(2, row.h - 2)}
        rx="5"
        fill={row.group === 'bolt' ? kindColor(row.kind) : 'url(#member-grad)'}
        opacity={row.group === 'bolt' ? 0.68 : 0.34}
        stroke={row.group === 'bolt' ? '#dce8ff' : '#8de1ca'}
        stroke-width="0.8"
        filter="url(#soft-shadow)"></rect>

      {#if row.group === 'clamped'}
        <rect x={boltCx - w / 2 + 1} y={row.y + 1} width={w - 2} height={Math.max(2, row.h - 2)} rx="5" fill="url(#member-metal)" opacity="0.7"></rect>
        <rect x={boltCx - w / 2 + 2} y={row.y + 2} width={w - 4} height="2.5" rx="1.2" fill="#d5fff2" opacity="0.16"></rect>
      {/if}

      <line x1={stackX1 + 10} x2={stackX1 + 26} y1={row.yMid} y2={row.yMid} stroke="#8caed5" stroke-width="0.8"></line>
      <path d={spring(stackX1 + 34, row.yMid - 8, row.yMid + 8, 3, 3)} stroke="#a4bfdf" stroke-width="1.1" fill="none"></path>
      <text x={stackX1 + 50} y={row.yMid - 2} fill="#e6eefc" font-size="9.4" font-weight="600">{row.label}</text>
      <text x={stackX1 + 50} y={row.yMid + 9} fill="#a9bfdc" font-size="8.6">k={fmt(row.stiffness, 1)} {stiffnessUnit}</text>
    {/each}

    <line x1={boltCx - 112} x2={boltCx - 112} y1={stackY0 - 8} y2={stackY1 + 8} stroke="#f5f8ff" stroke-width="1.2" marker-end="url(#preload-arrow)" opacity="0.75"></line>
    <line x1={boltCx + 112} x2={boltCx + 112} y1={stackY1 + 8} y2={stackY0 - 8} stroke="#9ef8d8" stroke-width="1.2" marker-end="url(#preload-arrow)" opacity="0.75"></line>
    <text x={boltCx - 122} y={stackY0 - 14} text-anchor="end" fill="#dce8fb" font-size="9.8">Bolt preload path: {fmt(preloadForce, 1)} {forceUnit}</text>
    <text x={boltCx + 122} y={stackY1 + 20} fill="#b8f6df" font-size="9.8">Member reaction path: {fmt(preloadForce, 1)} {forceUnit}</text>

    <rect x="742" y="56" width="318" height="322" rx="10" fill="#0a1529" stroke="#2a4a74" stroke-width="1"></rect>
    <text x="756" y="76" fill="#d7e7ff" font-size="10.2">Equivalent Single-Bolt Spring Model</text>
    <line x1="770" x2="1032" y1="102" y2="102" stroke="#607fa8" stroke-width="0.8"></line>
    <line x1="770" x2="1032" y1="322" y2="322" stroke="#607fa8" stroke-width="0.8"></line>
    <path d={spring(842, 102, 322, 8, 9)} stroke="#9cc9ff" stroke-width="2" fill="none"></path>
    <path d={spring(958, 110, 206, 4, 7)} stroke="#86e8cf" stroke-width="2" fill="none"></path>
    <path d={spring(958, 218, 314, 4, 7)} stroke="#86e8cf" stroke-width="2" fill="none"></path>
    <text x="856" y="216" fill="#d4e6ff" font-size="9.2">k_b</text>
    <text x="972" y="216" fill="#c7f5e9" font-size="9.2">k_c</text>
    <text x="756" y="352" fill="#b7cce8" font-size="9">k_total = {fmt(stiffness, 2)} {stiffnessUnit}</text>
    <text x="756" y="366" fill="#b7cce8" font-size="9">delta_b = {fmt(boltElongation, 6)} {lengthUnit}</text>
    <text x="756" y="380" fill="#b7cce8" font-size="9">delta_c = {fmt(clampCompression, 6)} {lengthUnit}</text>

    <text x="12" y="18" fill="#9cb2ce" font-size="10">Single-fastener preload-only view: stack geometry, force path, and stiffness representation.</text>
  </svg>
</div>
