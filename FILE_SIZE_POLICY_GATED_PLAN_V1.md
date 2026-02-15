# File Size Policy Gated Plan (V1)

> **Note**: File Size Policy V2 is now available with enhanced detection, flexible configuration, and multiple output formats. See `FILE_SIZE_POLICY_V2.md` for details and `FILE_SIZE_POLICY_MIGRATION.md` for migration guidance. This V1 plan remains valid but V2 is recommended for new projects.

## Trigger Phrase
When you say any of:
- `run file size policy`
- `verify file size policy`
- `enforce file size policy`

I will run:
- `npm run -s verify:file-size-policy` (V1, legacy)
- Or: `npm run verify:file-size-policy:v2` (V2, recommended)

and then refactor every violating file until the policy passes.

## Policy Limits

### Svelte
- Component `.svelte`: max 300 lines
- **Orchestrator `.svelte` (files ending in `Orchestrator.svelte`)**: max 800 lines
- Page `.svelte` (under `src/routes`): max 500 lines
- Store `.js/.ts` (`store`/`stores` naming or folder): max 200 lines

### HTML
- Template `.html`: max 200 lines
- Layout `.html`: max 150 lines

### Rust
- Module `.rs`: max 800 lines
- Handler `.rs`: max 400 lines
- Model `.rs`: max 300 lines
- Service `.rs`: max 600 lines
- Utility `.rs`: max 200 lines
- `main.rs`: max 200 lines

### Config / Build
- Config `.toml/.json`: max 100 lines
- Build files `package.json` / `Cargo.toml`: max 150 lines

### Universal Block Limits
- Function: max 100 lines
- Class: max 400 lines

## Gates

### Gate 1: Verification
- Run `npm run -s verify:file-size-policy`.
- Capture each violation with file path and line.

### Gate 2: Refactor Batch
- Refactor in batches (up to 10 files per batch unless you direct otherwise).
- Prefer extraction to focused modules/components.
- Preserve behavior and external API contracts.

### Gate 3: Validation
- Re-run `npm run -s verify:file-size-policy`.
- Re-run impacted domain tests (e.g., bushing/surface/inspector suites touching changed files).

### Gate 4: Closeout
- Report remaining violators (if any) and next batch list.
- Continue until zero policy violations.

## Refactor Strategy
- Split oversized Svelte files into controller + presentational subcomponents.
- Move dense utility logic to `scripts/` or `src/lib/**/controllers/` modules.
- Break Rust files by concern (`handlers`, `models`, `services`, `utils`).
- Keep each new file below thresholds from the start.

## Enforcement Rule
From now on, I will treat this policy as mandatory and will not consider the task complete when requested unless:
- `verify:file-size-policy` passes, or
- I report exactly which files remain and continue with next refactor batch.
