# Bushing Interference Priority Plan v1

Execution pack for implementing strict interference containment with reamer-aware bore policies.

## Migration Notes (BIF-042)
- Legacy fields remain supported:
  - `enforceInterferenceTolerance` -> `interferencePolicy.enabled`
  - `lockBoreForInterference` -> `interferencePolicy.lockBore`
- New canonical objects:
  - `interferencePolicy`
  - `boreCapability`
- Default mapping for legacy sessions:
  - `interferencePolicy.enabled = false`
  - `interferencePolicy.lockBore = true`
  - `interferencePolicy.preserveBoreNominal = true`
  - `interferencePolicy.allowBoreNominalShift = false`
  - `boreCapability.mode = unspecified`
- Normalizer precedence:
  - Canonical policy/capability fields take priority when present.
  - Legacy aliases are still mirrored for backward compatibility while UI migration completes.
- Reamer-fixed safeguard:
  - `boreCapability.mode = reamer_fixed` forces `interferencePolicy.lockBore = true`.

## Contents
- `PLAN.md`: gated plan and acceptance criteria
- `taskboard.md`: sprint ordering
- `tickets/`: one ticket per implementation unit
