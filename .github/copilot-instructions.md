# Structural Companion Desktop - Copilot Instructions

## Overview

Structural Companion Desktop is a SvelteKit + Tauri desktop application for structural engineering design and analysis, focusing on fastener design (Bushing Toolbox) and surface modeling (Surface Toolbox). Built with Svelte 5, TypeScript, Babylon.js (3D), D3 (drafting), and Rust (Tauri backend).

**Key Characteristics:**
- Strict layered architecture with enforced dependencies
- Physics-based solvers with extensive validation
- Dual rendering paths (D3 SVG + Babylon.js 3D)
- Golden file testing and visual regression
- Gated migration plans for major refactors

## Build, Test, and Lint Commands

### Development
```bash
npm run dev                              # Start dev server (127.0.0.1:5173)
npm run build                            # Production build + verification
npm run check                            # Type-check + architecture verification + contracts + DnD integrity
```

### Testing

**Run a single test:**
```bash
# E2E test (auto-starts dev server)
playwright test tests/<test-name>.spec.ts

# Unit test (no server)
playwright test --config=playwright.unit.config.ts tests/<test-name>.spec.ts
```

**Common test suites:**
```bash
# Bushing Toolbox
npm run verify:bushing-regression        # Full 23-step regression (all gates)
npm run verify:bushing-smoke             # Quick smoke test
npm run verify:bushing-solver            # Solver logic + physics
npm run verify:bushing-section-kernel    # Section profile + render mode
npm run verify:bushing-physics-audit     # Formula audit + unit conversion
npm run verify:bushing-parity            # D3 drafting parity
npm run verify:bushing-babylon-parity    # Babylon.js render parity
npm run verify:bushing-visual-baseline   # Visual regression (screenshots)
npm run verify:bushing-e2e-smoke         # E2E user flows

# Surface Toolbox
npm run verify:surface-regression        # Surface module regression
npm run verify:surface-smoke-e2e         # Surface E2E smoke test
npm run verify:surface-toolbox           # Surface feature contracts
npm run verify:surface-toolbox:e2e       # Surface toolbox E2E

# Inspector
npm run verify:inspector-ux              # Full inspector UX suite
npm run verify:inspector-overlay-visibility
npm run verify:inspector-sticky-query
npm run verify:inspector-scroll-smoothness

# Architecture & Policies
npm run verify:bushing-architecture      # Bushing module LOC limits
npm run verify:surface-architecture      # Surface dependency graph + layer policy
npm run verify:file-size-policy          # Universal file size limits
npm run verify:motion-depth              # Cross-tool motion depth consistency
npm run verify:dnd-integrity             # Drag-and-drop layout integrity (duplicate prevention)
```

### Golden Files
```bash
npm run golden:bushing                   # Verify against golden baselines
npm run golden:bushing:gen               # Regenerate golden files (after solver changes)
npm run golden:bushing:dataset-pack      # Dataset pack golden validation
```

### Architecture Enforcement
```bash
npm run verify:bushing-path-integrity    # Bushing routing validation
npm run fix:motion-depth                 # Auto-fix motion depth violations
npm run enforce:motion-depth             # Fix + verify motion depth
```

### Tauri
```bash
npm run tauri:dev                        # Start Tauri desktop app
npm run tauri:build                      # Build Tauri app
```

## Architecture

### Layered Architecture with Enforced Dependencies

The codebase uses **strict layered architecture** enforced by architecture manifests:

**Layer Hierarchy** (higher layers can import lower layers only):
```
UI (routes, components)
  ↓
Controller (state coordination, business logic)
  ↓
Domain (complex business rules, solvers)
  ↓
API (external service boundaries)
  ↓
Eval (computation engines)
  ↓
Geom (geometric primitives)
  ↓
State (stores, history)
  ↓
Viewport (rendering)
  ↓
Types (shared type definitions)
```

**Architecture Manifests:**
- `src/lib/bushing/BushingArchitectureManifest.ts` - Module size budgets (LOC limits per file)
- `src/lib/surface/SurfaceArchitectureManifest.ts` - Module dependency graph + layer import policy

**Validation:** Run `npm run check` to validate all architecture constraints.

### Module Structure

**Core Modules** (`src/lib/core/`):
- `bushing/` - Bushing solver, schema, normalization, validation, materials
- `shear/` - Shear bearing solvers and materials
- `edge-distance/` - Edge distance constraint solvers
- `units/` - Unit conversion system
- `shared/` - Common utilities

**Component Modules** (`src/lib/components/`):
- `bushing/` - Bushing orchestrator + controllers (export, compute, drag, layout, card position)
- `surface/` - 20+ controllers (eval, IO, cursor, hover, snap, recipes, slicing, warnings, themes)
- `inspector/` - Query, grid, schema, recipes, loader, theme controllers

**Drafting/Rendering** (`src/lib/drafting/`):
- `bushing/` - Babylon.js geometry/runtime, D3 SVG, section profiles, scene model
- `surface/` - D3 vector graphics, primitives, layout
- `core/` - Shared rendering utilities

**Routes** (`src/routes/`):
- Each route has `+page.svelte` (orchestrator) + supporting components
- Hash-based routing for file:// portability
- Key routes: `/bushing`, `/surface`, `/inspector`, `/shear`, `/suite`

### File Size Policy

**Enforced LOC Limits** (via `verify:file-size-policy`):
- Svelte components: **300 lines** (pages: **500 lines**)
- TypeScript modules: **Varies by manifest** (typically 200-400 lines)
- Functions: **100 lines max**
- Classes: **400 lines max**
- Rust modules: **800 lines** (handlers: 400, models: 300, services: 600)

**Pattern:** When a file exceeds limits, extract to focused subcomponents/modules. See `FILE_SIZE_POLICY_GATED_PLAN_V1.md` for refactoring strategy.

### Import Depth Control

**Motion Depth** verification ensures consistent import chain depth across tools.

**Commands:**
```bash
npm run verify:motion-depth              # Check violations
npm run fix:motion-depth                 # Auto-fix depth issues
npm run enforce:motion-depth             # Fix + verify
```

## Key Conventions

### Bushing Toolbox

**Purpose:** Interference-fit bushing/housing design solver using Lamé thick-cylinder stress model.

**Key Features:**
- Three profile modes: straight, flanged, countersink (internal/external)
- Fit/tolerance closure with auto-adjust logic
- Stress and margin checks (hoop stress, edge distance, wall thickness)
- Dual rendering: SVG (legacy) + Babylon.js (active migration)
- Export to SVG/PDF

**Tolerance Auto-Adjust:**
- When `Enforce Interference Tolerance` is enabled, solver auto-adjusts bore tolerances
- **Key constraint:** bore width ≤ target interference width for feasibility
- **Reamer-fixed mode:** locks bore, prevents auto-adjust
- Full behavior in `docs/BUSHING_TOOLBOX_README.md`

**Card Layout:**
- Drag-and-drop reorderable cards (left/right columns)
- Layout persists in localStorage: `scd.bushing.layout.v3`
- Implemented with `svelte-dnd-action` in `BushingSortableLane.svelte`
- **Free positioning mode:** Feature flag for absolute positioning (localStorage: `scd.bushing.freePositioning.enabled`)

**Failsafes & Integrity:**
- Duplicate key detection and prevention
- Corrupted localStorage cleanup on load
- Validation before persistence
- Null checks in drag event handlers
- **Critical Pattern:** Only update state in `finalize` event, NOT `consider` event
  - `consider` is for visual preview only (fires during drag)
  - `finalize` fires when drag completes
  - Updating state in `consider` breaks the drag operation
- **Regression Prevention:** `npm run verify:dnd-integrity` validates all failsafes

### Bushing D3 → Babylon Migration

**Current State:**
- Active renderer: **SVG** (`BushingDrafting.svelte`, `bushingSceneRenderer.ts`)
- D3 usage: Limited to SVG path generation in `sectionProfile.ts`
- **Babylon migration:** In progress via `BUSHING_D3_TO_BABYLON_GATED_PLAN_V1.md`

**Renderer Feature Flag:**
- `draftRenderer = 'svg' | 'babylon'` (persisted in localStorage)
- Both renderers must maintain parity (tested via `verify:bushing-babylon-parity`)

**Migration Status:**
- Batch 1 (Gates 1-10): Architecture + parallel Babylon renderer
- Batch 2 (Gates 11-20): Parity, interaction, export compatibility
- Batch 3 (Gates 21-30): Default switch + D3 retirement

### Surface Toolbox

**Purpose:** 3D surface modeling with interpolation, slicing, geodesic analysis.

**Key Features:**
- Multiple surface types (meshgrid, point cloud)
- Best-fit interpolation
- Datum slicing engine
- Geodesic/curvature analysis
- Recipe-based workflows

**Layer Import Policy** (enforced by `verify:surface-architecture`):
- Each module declares `layer`, `publicContracts`, `dependsOn` in manifest
- Import violations caught at check/build time
- Example: `domain` layer cannot import from `controller` or `ui`

### Golden File Testing

**Purpose:** Deterministic validation of solver output and UI state.

**Location:** `golden/` directory
- `bushing_expected.json` - Expected solver outputs
- `bushing_cases.json` - Test case definitions
- `bushing_dataset_pack/` - Dataset regression baselines

**Workflow:**
1. Make changes to solver logic
2. Run `npm run golden:bushing` to compare against baselines
3. If intentional change: `npm run golden:bushing:gen` to regenerate
4. Commit updated golden files with justification

**Dataset Pack:** `npm run golden:bushing:dataset-pack` validates against large dataset packs.

### Gated Plans

**Purpose:** Document large refactoring/migration work with clear exit criteria.

**Pattern:** Break work into numbered gates with defined deliverables and validation steps.

**Active Plans:**
- `BUSHING_D3_TO_BABYLON_GATED_PLAN_V1.md` - Renderer migration (30 gates in 3 batches)
- `BUSHING_TOOLBOX_AUDIT_GATED_PLAN_V1.md` - Stabilization gates (contracts, UI state, dataflow)
- `FILE_SIZE_POLICY_GATED_PLAN_V1.md` - File size refactoring process
- `INSPECTOR_UX_REMEDIATION_GATED_PLAN_V1.md` - Inspector UX improvements
- `implementation/NATIVE_DND_MIGRATION_PLAN_V1.md` - **COMPLETE** Native HTML5 drag-and-drop (20 gates, 3 batches done)
  - **Status:** Batch 1-3 complete, Batch 2 tests need manual run
  - **Goal:** Removed broken `svelte-dnd-action`, implemented native HTML5, zero dependencies
  - **Timeline:** Core implementation complete (14 hours actual)

**Execution Rule:** Complete batch → verify regression passes → next batch.

### Verification Scripts

Many custom Node.js modules in `scripts/` enforce architecture and quality:

**Architecture Validation:**
- `verify-bushing-architecture.mjs` - Reads `BushingArchitectureManifest.ts`, enforces LOC limits
- `verify-surface-architecture.mjs` - Validates dependency graph + layer import policy
- `verify-bushing-path-integrity.mjs` - Routing and path validation
- `verify-dnd-integrity.mjs` - Drag-and-drop layout integrity (prevents duplicate keys, validates failsafes)

**Policy Enforcement:**
- `verify-file-size-policy.mjs` - Universal file size limits
- `verify-cross-tool-motion-depth.mjs` - Import chain depth consistency
- `fix-cross-tool-motion-depth.mjs` - Auto-fix motion depth issues

**Feature Contracts:**
- `feature-contract-surface-toolbox.mjs` - Surface toolbox contract validation
- `verify-surface-toolbox.mjs` - Surface feature contract verification

**Golden Files:**
- `golden-bushing.mjs` - Generate/verify golden files (use `--gen` flag)
- `golden-bushing-dataset-pack.mjs` - Dataset pack validation

**Build Verification:**
- `build-verify.mjs` - Post-build validation (runs after `npm run build`)

**Pattern:** Run verification → identify violations → fix → re-verify → iterate.

### Testing Patterns

**Unit Tests** (use `playwright.unit.config.ts`):
- No dev server, fast isolated tests
- Examples: `verify:bushing-trace`, `verify:bushing-section-kernel`, `verify:bushing-physics-audit`

**E2E Tests** (use `playwright.config.ts`):
- Auto-starts dev server at 127.0.0.1:5173
- Full user interaction flows
- Examples: `verify:bushing-e2e-smoke`, `verify:surface-smoke-e2e`

**Visual Regression** (`tests/visual/`):
- Snapshot-based visual validation
- Examples: `verify:bushing-visual-baseline`, `verify:bushing-cards`

**Performance Tests:**
- `verify:bushing-ui-throughput` - UI responsiveness
- `verify:bushing-render-stress` - Render performance under load
- `verify:bushing-pipeline-cache` - Caching effectiveness

**Regression Suites:**
- `verify:bushing-regression` - Full 23-step bushing pipeline (all gates)
- `verify:surface-regression` - Full surface module regression
- `verify:inspector-ux` - Full inspector UX suite

### File Portability

The build produces a **single portable HTML file** that works offline via `file://`:

**SvelteKit Config** (`svelte.config.js`):
```js
router: { type: 'hash' }              // Hash routing for file:// compatibility
output: { bundleStrategy: 'inline' }  // Single-file bundle
```

**Vite Config** (`vite.config.ts`):
```js
base: './'                             // Relative asset paths
build: { assetsInlineLimit: Infinity } // Inline all assets
```

This enables both Tauri (native) and browser (`file://` HTML) deployment.

### Tauri-Specific Patterns

**Dialog Handling:**
- Use `@tauri-apps/plugin-dialog` for native file dialogs
- Example: Export SVG/PDF via native save dialog

**Backend Location:** `src-tauri/src/` (Rust)

**Build Targets:**
- Native desktop app (Tauri)
- Portable single-file HTML (file://)

## Common Workflows

### Making Changes to Bushing Solver

1. Modify solver logic in `src/lib/core/bushing/solve.ts` or related modules
2. Run `npm run verify:bushing-solver` to check basic solver tests
3. Run `npm run golden:bushing` to compare against golden baselines
4. If output changed intentionally:
   - Run `npm run golden:bushing:gen` to update golden files
   - Commit changes with justification in commit message
5. Run `npm run verify:bushing-regression` to ensure no regressions
6. Check architecture: `npm run verify:bushing-architecture`

### Adding a New Bushing Component

1. Check `BushingArchitectureManifest.ts` for LOC limit (typically 220-300 lines)
2. Create component in `src/lib/components/bushing/`
3. If component exceeds limit, add to manifest or extract subcomponents
4. Verify: `npm run verify:bushing-architecture`
5. Ensure card layout integration if adding to main UI

### Refactoring for File Size Policy

1. Run `npm run verify:file-size-policy` to identify violations
2. Extract oversized files to focused subcomponents/modules
3. Preserve behavior and external API contracts
4. Re-run `npm run verify:file-size-policy` to confirm
5. Run impacted test suites (e.g., `verify:bushing-smoke`)

### Working with Surface Architecture

1. Check `SurfaceArchitectureManifest.ts` for module dependencies
2. Ensure new imports respect layer hierarchy (no upward imports)
3. Declare `publicContracts` and `dependsOn` in manifest for new modules
4. Verify: `npm run verify:surface-architecture`
5. Run surface regression: `npm run verify:surface-regression`

## MCP Servers (Model Context Protocol)

This project benefits from the following MCP servers:

**Recommended MCP Servers:**
1. **Playwright MCP** - Test automation and debugging assistance
   - Use for: Test creation, E2E workflow validation, visual regression
   - Relevant to: Extensive Playwright test suite (24+ test files)

2. **GitHub MCP** - Repository data access and GitHub API integration
   - Use for: Issue tracking, PR management, workflow automation
   - Relevant to: CI/CD pipeline, architecture enforcement

**Dependency-Specific MCP Servers:**
- **Babylon.js** - 3D rendering library used for bushing visualization
- **Svelte/SvelteKit** - Primary frontend framework
- **Tauri** - Desktop app framework
- **Tailwind CSS** - Styling framework

**How to Configure MCP Servers:**
Add MCP server configurations to your Copilot settings or environment to enable enhanced capabilities for this project type.
