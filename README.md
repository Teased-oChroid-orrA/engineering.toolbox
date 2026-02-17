# Engineering Toolbox

[![CI](https://github.com/Teased-oChroid-orrA/engineering.toolbox/actions/workflows/ci.yml/badge.svg)](https://github.com/Teased-oChroid-orrA/engineering.toolbox/actions/workflows/ci.yml)

## Overview

Structural Companion Desktop is a SvelteKit + Tauri desktop application for structural engineering design and analysis, focusing on fastener design (Bushing Toolbox) and surface modeling (Surface Toolbox). Built with Svelte 5, TypeScript, Babylon.js (3D), D3 (drafting), and Rust (Tauri backend).

## Development Workflow & CI Protection

### Before Committing
This project uses git hooks to ensure code quality:
- **pre-commit**: Runs type checking and feature contracts
- **pre-push**: Runs build verification and tests

### Setup Hooks (First Time)
```bash
bash .github/scripts/setup-hooks.sh
```

### Manual Validation
```bash
npm run check      # Type checking
npm run build      # Build verification  
npm run test:unit  # Unit tests
```

See `.github/CI_PROTECTION_POLICY.md` for complete details.

## Quick Start

### Development
```bash
npm install                              # Install dependencies
npm run dev                              # Start dev server (127.0.0.1:5173)
npm run build                            # Production build + verification
npm run check                            # Type-check + architecture verification
```

### Testing
```bash
# Run a single test
playwright test tests/<test-name>.spec.ts

# Unit test (no server)
playwright test --config=playwright.unit.config.ts tests/<test-name>.spec.ts

# Common test suites
npm run verify:bushing-regression        # Full 23-step regression (all gates)
npm run verify:bushing-smoke             # Quick smoke test
npm run verify:surface-regression        # Surface module regression
npm run verify:inspector-ux              # Full inspector UX suite
```

### Tauri
```bash
npm run tauri:dev                        # Start Tauri desktop app
npm run tauri:build                      # Build Tauri app
```

## Key Features

### Bushing Toolbox
Interference-fit bushing/housing design solver using Lamé thick-cylinder stress model.
- Three profile modes: straight, flanged, countersink (internal/external)
- Fit/tolerance closure with auto-adjust logic
- Stress and margin checks (hoop stress, edge distance, wall thickness)
- Dual rendering: SVG (legacy) + Babylon.js (active migration)
- Export to SVG/PDF

### Surface Toolbox
3D surface modeling with interpolation, slicing, geodesic analysis.
- Multiple surface types (meshgrid, point cloud)
- Best-fit interpolation
- Datum slicing engine
- Geodesic/curvature analysis
- Recipe-based workflows

### Inspector
Advanced data inspection and analysis tool with filtering, sorting, and visualization capabilities.

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

### File Size Policy
**Enforced LOC Limits** (via `verify:file-size-policy`):
- Svelte components: **300 lines** (pages: **500 lines**, orchestrators: **800 lines**)
- TypeScript modules: **Varies by manifest** (typically 200-400 lines)
- Functions: **100 lines max**
- Classes: **400 lines max**
- Rust modules: **800 lines** (handlers: 400, models: 300, services: 600)

## Contributing

Please follow the CI Protection Policy when contributing:
1. Run `npm run check` before committing
2. Run `npm run build && npm run test:unit` before pushing
3. Ensure all CI checks pass on your PR
4. Review `.github/CI_PROTECTION_POLICY.md` for complete guidelines

## License

[License information]
