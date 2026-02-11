# INS-253 UX Standards Update

Date: 2026-02-10

## Overlay Placement Policy
- All Inspector utility windows render through a body-level portal host.
- Overlays must open inside viewport bounds.
- Default open position is centered in viewport.
- Drag offsets are bounded to viewport-safe limits.
- All overlays use dialog semantics:
  - `role="dialog"`
  - `aria-modal="true"`
  - explicit `aria-label`
  - ESC closes where supported by existing modal behavior.

## Sticky Query Policy
- Query controls (including inline multi-query chain) remain visible while dataset grid scrolls.
- Table headers remain sticky under the query layer.
- Merged-grid source banner offset must reference `INSPECTOR_THEME.grid.headerHeight`.

## Virtualization Stability Policy
- Row height must be normalized and constrained.
- Window translate offset must be pixel-snapped and rendered with `translate3d`.
- Row enter/exit transitions are disabled in main virtualized path to avoid scroll jitter.
- Scroll instrumentation should remain available for regression analysis (`gridScrollTrace`, `gridWindow`).

## Motion Depth Policy
- Use motion-depth tokens for consistency:
  - Inspector: `inspector-depth-0|1|2`
  - Surface: `surface-depth-0|1|2`
  - Bushing: `bushing-depth-0|1|2`
- Nested/sub-card wrappers should use reduced depth compared to parent cards.
- Keep rim glow/pop identity while limiting nested tilt/parallax.

