# Quick Action Items - Codebase Review

**Date**: February 17, 2025  
**Priority Order**: Critical → High → Medium → Low

---

## 🔴 CRITICAL - Do Immediately (1 hour)

### 1. Fix State Reference Warnings (30 min)
**Risk**: May cause reactive state bugs

**File**: `src/lib/components/bushing/BushingOrchestrator.svelte`

```svelte
<!-- BEFORE (Lines 143-147) -->
onMount(() => {
  try {
    form = { ...form, ...safeParseJSON(safeGetItem(KEY), {}) };
    ({ leftCardOrder, rightCardOrder } = loadTopLevelLayout());
    dndEnabled = readBushingDndEnabled();
    useLegacyRenderer = safeGetItem(LEGACY_RENDERER_KEY) === '1';
  } catch { /* ... */ }
});

<!-- AFTER (Recommended) -->
let mounted = $state(false);

onMount(() => {
  mounted = true;
});

$effect(() => {
  if (!mounted) return;
  try {
    form = { ...form, ...safeParseJSON(safeGetItem(KEY), {}) };
    ({ leftCardOrder, rightCardOrder } = loadTopLevelLayout());
    dndEnabled = readBushingDndEnabled();
    useLegacyRenderer = safeGetItem(LEGACY_RENDERER_KEY) === '1';
  } catch { /* ... */ }
});
```

---

### 2. Consolidate Type Definitions (30 min)
**Risk**: Low, high value

**Step 1**: Verify all types are in `InspectorStateTypes.ts`
```typescript
// src/lib/components/inspector/InspectorStateTypes.ts
export type ColType = 'numeric' | 'date' | 'string';
export type MatchMode = 'fuzzy' | 'regex' | 'exact';
export type NumericFilterState = { /* ... */ };
export type DateFilterState = { /* ... */ };
export type CategoryFilterState = { /* ... */ };
```

**Step 2**: Remove duplicate definitions from:
- `InspectorOrchestratorContexts.ts` (lines 5-28)
- `InspectorTier2Controller.ts` (lines 1-20)
- `InspectorQueryController.ts` (line 2)
- `InspectorSchemaController.ts` (line 1)

**Step 3**: Add imports
```typescript
import type { 
  ColType, 
  MatchMode, 
  NumericFilterState, 
  DateFilterState, 
  CategoryFilterState 
} from './InspectorStateTypes';
```

---

## 🟡 HIGH - Do This Week (2 hours)

### 3. Remove Backup Files (5 min)
```bash
cd /home/runner/work/engineering.toolbox/engineering.toolbox

# Remove backup files
rm src/lib/components/inspector/InspectorLifecycleController.ts.backup
rm src/lib/components/inspector/InspectorOrchestrator.svelte.original
rm src/lib/components/inspector/InspectorOrchestratorEffects.svelte.ts.backup
rm src/lib/components/surface/SurfaceOrchestrator.svelte.backup
rm src/lib/navigation/contextualMenu.ts.backup
rm src/routes/+layout.svelte.backup

# Update .gitignore
echo "*.backup" >> .gitignore
echo "*.original" >> .gitignore

# Commit
git add -A
git commit -m "chore: remove backup files and update .gitignore"
```

---

### 4. Migrate Deprecated Slots (1 hour)

**File 1**: `src/lib/components/bushing/NativeDragLane.svelte` (line 201)

```svelte
<!-- BEFORE -->
<script>
  export let item;
</script>
<slot {item} />

<!-- AFTER -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  
  let {
    item,
    children
  }: {
    item: any;
    children?: Snippet<[any]>;
  } = $props();
</script>

{@render children?.(item)}
```

**File 2**: `src/lib/components/bushing/BushingDraggableCard.svelte` (line 62)

```svelte
<!-- BEFORE -->
{#if !collapsed}
  <slot />
{/if}

<!-- AFTER -->
{#if !collapsed}
  {@render children?.()}
{/if}

<!-- Add to script -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  
  let {
    // ... existing props
    children
  }: {
    // ... existing prop types
    children?: Snippet;
  } = $props();
</script>
```

---

### 5. Move Root Svelte Files (2 min)
```bash
# Option 1: Delete (recommended, not imported anywhere)
rm BushingRightLaneCards.svelte
rm BushingSortableLane.svelte

# Option 2: Move to tests
mkdir -p tests/prototypes
mv BushingRightLaneCards.svelte tests/prototypes/
mv BushingSortableLane.svelte tests/prototypes/
```

---

## 🟢 MEDIUM - Do This Month (2 hours)

### 6. Fix Accessibility Issues (2 hours)

**File**: `src/routes/weight-balance/+page.svelte`

**Issue 1**: Modal overlays need ARIA roles (lines 844, 877)
```svelte
<!-- BEFORE -->
<div onclick={...}>

<!-- AFTER -->
<div role="dialog" aria-modal="true" onclick={...} onkeydown={handleEscape}>
```

**Issue 2**: Labels need for= attributes
```svelte
<!-- BEFORE -->
<label class="block text-sm text-gray-400 mb-2">Configuration Name</label>
<input bind:value={configName} />

<!-- AFTER -->
<label for="config-name" class="block text-sm text-gray-400 mb-2">Configuration Name</label>
<input id="config-name" bind:value={configName} />
```

**Issue 3**: Replace autofocus with programmatic focus
```svelte
<!-- BEFORE -->
<input autofocus />

<!-- AFTER -->
<script>
let inputRef: HTMLInputElement;
onMount(() => {
  inputRef?.focus();
});
</script>
<input bind:this={inputRef} />
```

---

## 🔵 LOW - Future Improvements (4 hours)

### 7. Suppress Bundle Size Warning (5 min)

**File**: `vite.config.ts`

```typescript
export default defineConfig({
  base: './',
  plugins: [tailwindcss(), sveltekit()],
  build: {
    assetsInlineLimit: Infinity,
    chunkSizeWarningLimit: 10000, // ADD THIS LINE
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  }
});
```

---

### 8. Refactor Large Context Builder (4 hours)

**File**: `src/lib/components/inspector/InspectorOrchestratorContexts.ts` (940 lines)

**Strategy**: Extract factory pattern

```typescript
// New file: src/lib/components/inspector/ContextFactory.ts

type StateGetter<T, K extends keyof T> = (state: T) => T[K];
type StateSetter<T, K extends keyof T> = (state: T, value: T[K]) => void;

export function createReactiveContext<T extends Record<string, any>>(
  state: T,
  config: {
    [K in keyof T]?: {
      get?: StateGetter<T, K>;
      set?: StateSetter<T, K>;
    };
  }
) {
  const context: any = {};
  
  for (const key in config) {
    const { get, set } = config[key] || {};
    
    Object.defineProperty(context, key, {
      get: get ? () => get(state) : () => state[key],
      set: set ? (value) => set(state, value) : (value) => { state[key] = value; },
      enumerable: true,
    });
  }
  
  return context as T;
}

// Usage in InspectorOrchestratorContexts.ts
export function filterControllerCtx(state: FilterState) {
  return createReactiveContext(state, {
    // Only specify custom getters/setters, rest are automatic
    filterTimer: {
      get: (s) => s.filterTimer,
      set: (s, v) => { s.filterTimer = v; }
    }
  });
}
```

---

## Testing Checklist

After making changes, run these commands:

```bash
# Type checking
npm run check

# Build
npm run build

# Run tests
npm run test:unit

# Verify Inspector specifically
npm run verify:inspector-ux
```

---

## Validation Script

```bash
#!/bin/bash
# validate-review-fixes.sh

echo "🔍 Validating review fixes..."

# Check for backup files
if find . -name "*.backup" -o -name "*.original" | grep -q .; then
  echo "❌ Backup files still exist"
  exit 1
fi

# Check for duplicate types
DUPLICATE_TYPES=$(grep -r "type ColType\|type MatchMode" src/lib/components/inspector/*.ts | grep -v "InspectorStateTypes.ts" | wc -l)
if [ "$DUPLICATE_TYPES" -gt 0 ]; then
  echo "❌ Duplicate type definitions still exist ($DUPLICATE_TYPES)"
  exit 1
fi

# Check for deprecated slots
if grep -r "<slot" src/lib/components/bushing/*.svelte | grep -v "@render" | grep -q .; then
  echo "⚠️ Deprecated slots still in use"
fi

# Run type check
if ! npm run check > /dev/null 2>&1; then
  echo "❌ Type check failed"
  exit 1
fi

echo "✅ All validations passed!"
```

---

## Summary of Time Investment

| Priority | Tasks | Estimated Time |
|----------|-------|----------------|
| 🔴 Critical | 2 tasks | 1 hour |
| 🟡 High | 3 tasks | 2 hours |
| 🟢 Medium | 1 task | 2 hours |
| 🔵 Low | 2 tasks | 4 hours |
| **Total** | **8 tasks** | **9 hours** |

---

## Quick Win Priority

If you only have **1 hour**, do these in order:

1. ✅ Remove backup files (5 min)
2. ✅ Consolidate types (30 min)
3. ✅ Move root Svelte files (2 min)
4. ✅ Fix state warnings (23 min)

**Impact**: Eliminates 76KB of dead code, fixes reactive bugs, improves maintainability

---

## Questions?

See the full report: `CODEBASE_REVIEW_REPORT.md`
