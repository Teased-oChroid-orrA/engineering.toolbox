import { defaultRangeExtractor } from '@tanstack/virtual-core';

const CASES = [
  { label: '100k', count: 100_000, viewport: 720, rowHeight: 34, overscan: 10, maxWindowAbs: 80, samples: 20_000 },
  { label: '500k', count: 500_000, viewport: 720, rowHeight: 34, overscan: 8, maxWindowAbs: 80, samples: 20_000 },
  { label: '1m', count: 1_000_000, viewport: 900, rowHeight: 34, overscan: 8, maxWindowAbs: 96, samples: 25_000 }
];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function currentWindow(cfg, scrollTop) {
  const visible = Math.ceil(cfg.viewport / cfg.rowHeight);
  const start = clamp(Math.floor(scrollTop / cfg.rowHeight), 0, Math.max(0, cfg.count - 1));
  const maxWindow = Math.min(cfg.maxWindowAbs, visible + cfg.overscan * 2);
  const end = clamp(start + maxWindow, 0, cfg.count);
  return { start, end, rendered: Math.max(0, end - start) };
}

function tanstackWindow(cfg, scrollTop) {
  const visible = Math.ceil(cfg.viewport / cfg.rowHeight);
  const start = clamp(Math.floor(scrollTop / cfg.rowHeight), 0, Math.max(0, cfg.count - 1));
  const end = clamp(start + visible - 1, 0, Math.max(0, cfg.count - 1));
  const idx = defaultRangeExtractor({
    startIndex: start,
    endIndex: end,
    overscan: cfg.overscan,
    count: cfg.count
  });
  return {
    start: idx[0] ?? 0,
    end: (idx[idx.length - 1] ?? -1) + 1,
    rendered: idx.length
  };
}

function runCase(cfg) {
  const maxScroll = Math.max(0, cfg.count * cfg.rowHeight - cfg.viewport);
  const offsets = new Array(cfg.samples);
  for (let i = 0; i < cfg.samples; i++) offsets[i] = Math.random() * maxScroll;

  const t0 = performance.now();
  let curRendered = 0;
  for (let i = 0; i < cfg.samples; i++) curRendered += currentWindow(cfg, offsets[i]).rendered;
  const t1 = performance.now();

  let tanRendered = 0;
  for (let i = 0; i < cfg.samples; i++) tanRendered += tanstackWindow(cfg, offsets[i]).rendered;
  const t2 = performance.now();

  return {
    dataset: cfg.label,
    samples: cfg.samples,
    currentMs: Number((t1 - t0).toFixed(2)),
    tanstackMs: Number((t2 - t1).toFixed(2)),
    currentAvgRendered: Number((curRendered / cfg.samples).toFixed(2)),
    tanstackAvgRendered: Number((tanRendered / cfg.samples).toFixed(2))
  };
}

const results = CASES.map(runCase);
console.log('\nVirtualization benchmark (range math only)\n');
console.table(results);
console.log('Note: This benchmark isolates window/range calculation cost, not DOM/rendering throughput.\n');
