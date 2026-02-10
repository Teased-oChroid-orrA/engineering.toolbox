import { buildBushingViewModel, computeBushing, normalizeBushingInputs, type BushingInputs } from '$lib/core/bushing';
import { buildBushingScene, type BushingScene } from '$lib/drafting/bushing/bushingSceneModel';

export type BushingPipelineState = {
  normalized: ReturnType<typeof normalizeBushingInputs>;
  results: ReturnType<typeof computeBushing>;
  draftingView: ReturnType<typeof buildBushingViewModel>;
  scene: BushingScene;
  cacheHit: boolean;
};

type CacheEntry = Omit<BushingPipelineState, 'cacheHit'>;

const CACHE_LIMIT = 24;
const cache = new Map<string, CacheEntry>();
let cacheHits = 0;
let cacheMisses = 0;

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(String(value));
}

function touch(key: string, entry: CacheEntry) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, entry);
  if (cache.size <= CACHE_LIMIT) return;
  const oldestKey = cache.keys().next().value as string | undefined;
  if (oldestKey) cache.delete(oldestKey);
}

export function evaluateBushingPipeline(rawInput: BushingInputs): BushingPipelineState {
  const normalized = normalizeBushingInputs(rawInput);
  const key = stableStringify(normalized);
  const cached = cache.get(key);
  if (cached) {
    cacheHits += 1;
    touch(key, cached);
    return { ...cached, cacheHit: true };
  }

  cacheMisses += 1;
  const results = computeBushing(rawInput);
  const draftingView = buildBushingViewModel(rawInput, results);
  const scene = buildBushingScene(draftingView);
  const entry: CacheEntry = { normalized, results, draftingView, scene };
  touch(key, entry);
  return { ...entry, cacheHit: false };
}

export function getBushingPipelineCacheStats() {
  return {
    size: cache.size,
    hits: cacheHits,
    misses: cacheMisses
  };
}

export function clearBushingPipelineCache() {
  cache.clear();
  cacheHits = 0;
  cacheMisses = 0;
}

