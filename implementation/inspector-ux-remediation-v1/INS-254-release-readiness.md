# INS-254 Release Readiness

Date: 2026-02-10

## Scope Closed
- INS-250 E2E overlay visibility verification
- INS-251 E2E sticky query verification
- INS-252 E2E scroll smoothness contract
- INS-253 UX standards update
- INS-254 final QA/release note
- STB-085 motion-depth token parity (Surface)
- BSH-122 motion-depth token parity (Bushing)

## Verification Commands
- `npm run -s check`
- `npm run -s verify:inspector-ux`
- `npx playwright test --config=playwright.unit.config.ts tests/inspector-grid-window.spec.ts tests/inspector-multi-query.spec.ts`

## QA Checklist
- [x] Utility windows open visible in viewport at deep table scroll.
- [x] Query controls remain visible while dataset grid scrolls.
- [x] Multi-query chain remains inline and stateful across resets/restores.
- [x] No observable row jump-back regression in rapid downward scroll scenario.
- [x] Nested card tilt reduced while preserving pop-card visual hierarchy.
- [x] Type checks and architecture checks pass.

## Release Note (Draft)
- Inspector overlays are now viewport-safe and consistently visible.
- Query and multi-query controls are sticky above the dataset table.
- Grid scrolling has improved stability with reduced visual jitter under rapid movement.
- Motion-depth system is now tokenized and harmonized across Inspector, Surface, and Bushing styles.

