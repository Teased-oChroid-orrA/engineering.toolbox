# Physics / Formula Research Matrix

This matrix maps current solver areas to validation tasks, expected equations, and references.

## Reference set (primary/standards-first)
- ASME Y14.3-2020 Multiview and Sectional View Drawings (standard reference page): [ASME page](https://www.asme.org/codes-standards/find-codes-standards/y14-3-multiview-sectional-view-drawings)
- ASME Y14.5-2018 Dimensioning and Tolerancing (standard reference page): [ASME page](https://www.asme.org/codes-standards/find-codes-standards/y14-5-dimensioning-tolerancing)
- Journal paper on interference-fit contact pressure and stress behavior: [MDPI Metals 2020](https://www.mdpi.com/2075-4701/10/9/1228)
- Journal paper on thin/thick-walled cylinder stress formulations (reviewed derivation context): [MDPI Materials 2023](https://www.mdpi.com/1996-1944/16/5/1977)
- Interference-fit analytical modeling references via peer-reviewed indexing: [ScienceDirect topic hub](https://www.sciencedirect.com/topics/engineering/interference-fit)

Note: ASME standards are normative but paywalled; equations implemented in code must be linked to accessible derivations where available and tagged with standard clause IDs where licensing allows.

## Solver audit matrix

| Area | Current location | Current method | Risk | Required action |
|---|---|---|---|---|
| Input normalization | `src/lib/core/bushing/normalize.ts` | bounded coercion + defaults | medium | add dimensional and range checks for all coupled fields |
| Countersink solve | `src/lib/core/bushing/solve.ts` + `countersink.ts` | mode-based trig conversion | medium | verify all mode inversions against round-trip tests |
| Thermal interference | `src/lib/core/bushing/solve.ts` | alpha*dT adjustment | medium | verify unit conversion path and sign conventions |
| Press-fit pressure | `src/lib/core/bushing/solve.ts` | Lamé-style compliance terms + edge correction | high | benchmark against closed-form references + targeted FEA points |
| Hoop stress + margins | `src/lib/core/bushing/solve.ts` | thick-cylinder equations + material yield margin | high | add derivation-tagged tests and dimensional checks |
| Edge-distance criteria | `src/lib/core/bushing/solve.ts` | sequencing + strength proxy equations | high | validate against accepted bearing/ligament criteria and warnings |
| Governing logic | `src/lib/core/bushing/solve.ts` | min margin candidate selection | medium | verify tie-break and explainability in diagnostics |

## Validation data plan
1. Deterministic unit tests for every formula branch.
2. Golden cases:
- straight bushing
- flanged bushing
- countersink OD only
- countersink ID only
- dual countersink
3. Perturbation tests:
- +/-1e-4 on key dimensions
- boundary values at minimum wall thresholds
4. Sanity checks:
- monotonic trends (e.g., increased interference should not reduce pressure in same regime).

## Non-negotiable checks
- Every equation output has explicit units in test names.
- Every warning code tied to deterministic predicate.
- Every derived geometry term traceable to either inputs or solved variables.
