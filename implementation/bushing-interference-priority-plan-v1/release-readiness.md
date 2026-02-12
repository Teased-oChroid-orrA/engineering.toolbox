# Release Readiness (Draft)

- [x] Enforcement diagnostics include explicit satisfied/blocked state and reason codes.
- [x] Locked-bore mode does not mutate bore nominal/tolerance values.
- [x] Preserve-nominal mode keeps bore nominal unchanged.
- [x] Capability-floor blockers are surfaced in notes and reason codes.
- [x] Solver regression coverage includes lock/unlock/capability-floor scenarios.
- [ ] UI e2e coverage for interference controls and diagnostics passes in CI.
- [ ] Optional nominal-shift policy implementation completed and validated (currently diagnostics only for width-driven infeasibility).
