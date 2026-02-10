# Dependency Policy (Bushing Toolbox)

1. Prefer existing dependencies from `package.json`.
2. New dependency allowed only with measurable gain in one of:
   - performance
   - maintainability
   - UX/accessibility quality
3. Every added dependency must include:
   - justification note
   - alternatives considered
   - impact on bundle size/startup
4. All sketch/figure rendering flows must be D3-based.
