# Bushing Release Readiness

## Required Checks
- [ ] `npm run check`
- [ ] `npm run verify:bushing-architecture`
- [ ] `npm run golden:bushing`
- [ ] `npm run verify:bushing-solver`
- [ ] `npm run verify:bushing-parity`
- [ ] `npm run verify:bushing-visual`
- [ ] `npm run verify:bushing-smoke`
- [ ] `npm run verify:bushing-regression`

## Product Checks
- [ ] Live drafting equals exported drafting geometry (straight/flanged/countersink)
- [ ] Assembly Visualization remains center-locked while parent card hover pop is active
- [ ] D3 figures render correctly for all profile modes
- [ ] Inline helper guidance is concise and non-blocking
- [ ] Visual treatment matches Surface/Inspector language

## Quality Checks
- [ ] No Bushing module exceeds LOC cap
- [ ] No unresolved warning/error loops in console
- [ ] Reduced-motion behavior validated
- [ ] Mouse-first flow verified (core path)

## Signoff Matrix
- [ ] Correctness: solver/golden/parity/visual/smoke checks all green
- [ ] UX: workflow sections + inline guidance + warnings reviewed by product owner
- [ ] Performance: no interaction regressions on standard baseline dataset
- [ ] Architecture: hard LOC gates enforced in CI
