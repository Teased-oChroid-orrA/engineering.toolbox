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

Last Updated: 2026-02-17
