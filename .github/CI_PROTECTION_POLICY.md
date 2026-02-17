# CI Protection Policy

## Overview
This policy ensures CI and build processes remain stable across all changes and updates.

## Required Checks Before Merge

### 1. Local Pre-Merge Validation
Before pushing any changes, developers MUST run:
```bash
npm run check          # Type checking and feature contracts
npm run build          # Build verification
npm run test:unit      # Unit tests (if applicable)
```

### 2. CI Workflow Requirements
- All CI steps must pass (no `continue-on-error` for critical steps)
- Type checking with svelte-check must pass
- Build must complete successfully
- File size policy checks should run

### 3. Script Dependencies
- Every script referenced in CI workflows MUST exist in package.json
- Scripts should fail gracefully with clear error messages
- Use conditional execution where appropriate

### 4. Tauri Build Requirements
- Windows build must complete on windows-latest runner
- All dependencies must be properly cached
- Build artifacts must be generated and uploaded

## Caching Strategy

To optimize build times and reduce redundant work, both CI and Tauri workflows implement comprehensive caching:

### npm Dependencies
- **Cache Location**: Managed by `actions/setup-node@v4` with `cache: npm`
- **Cache Key**: Based on `package-lock.json` hash
- **Benefit**: Avoids re-downloading npm packages on every run

### Playwright Browsers
- **Cache Location**: `~/.cache/ms-playwright`
- **Cache Key**: `${{ runner.os }}-playwright-${{ hashFiles('package-lock.json') }}`
- **Benefit**: Avoids re-downloading ~200MB of browser binaries
- **Restoration**: Falls back to `${{ runner.os }}-playwright-` if exact match not found

### SvelteKit Build Artifacts
- **Cache Location**: `.svelte-kit/` and `build/` directories
- **Cache Key**: `${{ runner.os }}-svelte-build-${{ hashFiles('src/**', 'static/**', 'svelte.config.js', 'vite.config.ts', 'package-lock.json') }}`
- **Benefit**: Reuses compiled output when source files haven't changed
- **Restoration**: Falls back to `${{ runner.os }}-svelte-build-` for partial reuse
- **Note**: Cache invalidates when source files, config, or dependencies change

### Rust/Cargo Dependencies (Tauri only)
- **Cache Location**: `~/.cargo/` and `src-tauri/target/`
- **Cache Key**: `${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}`
- **Benefit**: Avoids recompiling Rust dependencies and intermediate build artifacts
- **Restoration**: Falls back to `${{ runner.os }}-cargo-` for incremental builds

### Cache Invalidation
Caches are automatically invalidated when:
- Lock files change (package-lock.json, Cargo.lock)
- Source files change (for build artifact caches)
- Configuration files change (svelte.config.js, vite.config.ts)
- Manual cache clearing via GitHub Actions UI

### Cache Performance
Expected time savings per workflow run:
- npm dependencies: ~30-60 seconds
- Playwright browsers: ~45-90 seconds
- SvelteKit build: ~20-40 seconds (when cache hit)
- Rust dependencies: ~3-5 minutes (Tauri workflow)

Total expected savings: 1-3 minutes per CI run, 4-7 minutes per Tauri build

## Pre-commit Hooks (Recommended)

Install husky for git hooks:
```bash
npm install --save-dev husky
npx husky init
```

Create `.husky/pre-commit`:
```bash
#!/usr/bin/env sh
npm run check
```

Create `.husky/pre-push`:
```bash
#!/usr/bin/env sh
npm run build
npm run test:unit
```

## Automated Protection

### GitHub Branch Protection Rules
Configure the following for `main` branch:
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Status checks required:
  - CI / verify
  - Build success

### Automated Monitoring
- CI failures trigger immediate notifications
- Weekly dependency audits
- Monthly review of CI performance metrics

## Emergency Procedures

If CI breaks:
1. Identify the breaking change via git bisect
2. Revert if critical, or fix forward if minor
3. Document the issue in this policy
4. Update protection mechanisms

## Review and Updates
This policy should be reviewed quarterly and updated as needed.

Last Updated: 2026-02-17 (Added comprehensive caching strategy)
