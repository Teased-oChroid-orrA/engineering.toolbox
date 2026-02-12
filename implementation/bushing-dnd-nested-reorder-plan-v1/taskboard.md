# Taskboard - Bushing DnD Nested Reorder V3

## Milestone Sequence
1. BDN-100 Repro baseline and telemetry
2. BDN-110 Library integration shell
3. BDN-120 Top-level lane migration
4. BDN-130 Nested diagnostics lane migration
5. BDN-140 Hover displacement and transition polish
6. BDN-150 Accessibility and collapse hardening
7. BDN-160 Persistence migration and safety controls
8. BDN-170 Verification and release package

## Ticket Backlog
- BDN-100 Repro baseline + dev telemetry hooks
- BDN-110 Add `svelte-dnd-action` and lane wrapper
- BDN-111 ADR for DnD library decision
- BDN-120 Top-level left/right migration
- BDN-121 Remove obsolete custom DnD state machine
- BDN-130 Nested diagnostics card migration
- BDN-131 Parent/child lane isolation tests
- BDN-140 Placeholder + animated hover displacement
- BDN-150 Keyboard fallback + ARIA semantics
- BDN-151 Collapse interaction hardening
- BDN-160 Layout migration `v2` -> `v3`
- BDN-161 Rollback feature flag and safe-disable behavior
- BDN-170 E2E + smoke + architecture signoff
- BDN-171 Release notes + rollback runbook

## Definition of Done
- all Gates 0-7 in `PLAN.md` passed
- drop commit persists in both parent and nested lanes
- hovered card displacement visible and stable
- `npm run -s check` is green
- `npm run -s verify:bushing-e2e-smoke` is green
- bushing file-size policy gates remain green
