# Release Readiness (Visualization Remediation)

## Must Pass
- [ ] `npm run check`
- [ ] `npm run verify:bushing-architecture`
- [ ] `npm run verify:bushing-parity`
- [ ] `npm run verify:bushing-visual`
- [ ] `npm run verify:bushing-smoke`
- [ ] `npm run verify:bushing-regression`

## UI Readability
- [ ] Labels and values in all result cards are readable at normal zoom.
- [ ] No near-black text over dark card backgrounds.
- [ ] Warning/info visual hierarchy remains obvious.

## Assembly Viewport
- [ ] Straight/flanged/countersink views render cleanly.
- [ ] Content stays centered while panel pop/hover animations run.
- [ ] No overflowing glyphs/shapes or clipping artifacts.

## Rollback/Fallback
- [ ] One-flag fallback to previous stable renderer path documented.
- [ ] Rollback procedure tested once.
- [ ] `scd.bushing.legacyRenderer=1` local fallback verified in UI session.
