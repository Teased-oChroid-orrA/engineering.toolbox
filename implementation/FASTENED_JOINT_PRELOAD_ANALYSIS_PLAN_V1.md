# Fastened Joint Preload Analysis Plan V1

## Purpose
Replace the deleted Fastener toolbox with a new fastened-joint preload analysis module built around explicit preload, clamp-force retention, joint separation, slip, and self-loosening mechanics.

The target is not a generic “fastener UI.” The target is a deterministic engineering solver for preloaded bolted joints with:
- fully declared equations
- no hidden assumptions
- every assumption visible and selectable in the UI
- audit-ready intermediate quantities

A truly assumption-free bolted-joint model does not exist. The correct engineering standard is:
- use exact derivations where a closed-form or directly integrated solution is available
- do not use an approximation where a full equation path can reasonably replace it
- no hidden assumptions
- each constitutive/modeling choice is explicit
- each approximation is user-visible and testable

## Research Basis
This plan is grounded in:
- Practical preload framing and torque/preload discussion: [Bolted Joint Preload (Medium)](https://bananajutsu.medium.com/bolted-joint-preload-9ead1f81511b)
- Self-loosening causes and transverse-motion failure mode framing: [Hard Lock Nut — Looseness Causes](https://hardlock-nut.com/technical-info/looseness-causes/)
- Primary reference for bolted-joint mechanics, torque-tension, preload retention, and joint stiffness methodology: [NASA Reference Publication 1228 — Fastener Design Manual](https://ntrs.nasa.gov/citations/19900009424)

## Scope
### In scope
- Single-bolt and multi-bolt preloaded joints
- Torque-to-preload conversion
- Explicit thread and bearing torque decomposition
- Bolt stiffness, member stiffness, and joint constant
- Service-load redistribution into bolt-load rise and clamp-loss
- Separation load
- Slip resistance at faying surfaces
- Embedment relaxation and thermal preload shift
- Self-loosening risk indicators under transverse loading
- Proof / yield / thread-strip / bearing / fatigue screening
- Deterministic exportable calculations

### Out of scope for V1
- Full nonlinear thread-contact FE
- Full Junker test dynamic simulation in the time domain
- Plasticity / gapping contact FE for arbitrary flange geometries
- Random vibration spectral loosening prediction

## Required Inputs
### Geometry
- Bolt nominal diameter: `d`
- Tensile stress area: `A_t`
- Thread pitch: `p`
- Thread pitch diameter: `d_2`
- Bearing mean friction diameter under head/nut: `D_b`
- Thread flank half-angle: `alpha`
- Grip length of bolt in tension: `L_b`
- Effective engaged thread length: `L_e`
- Member stack segments: `{L_i, A_i, E_i, alpha_i}`
- Number of friction interfaces in clamp stack: `n_f`
- Bolt pattern / row geometry for multi-bolt distribution (later gates)

### Materials / Limits
- Bolt modulus: `E_b`
- Bolt proof strength: `S_p`
- Bolt ultimate strength: `S_u`
- Bolt endurance limit (or design fatigue allowable): `S_e`
- Member compressive / bearing allowables as required
- Internal / external thread strip shear allowables: `tau_strip`

### Friction / Installation
- Thread friction coefficient: `mu_t`
- Under-head / under-nut friction coefficient: `mu_b`
- Faying-surface slip coefficient: `mu_s`
- Prevailing torque (if locking element exists): `T_prev`
- Applied installation torque: `T_inst`
- Optional direct target preload: `F_i,target`

### Service / Environment
- External axial separating load: `P`
- External transverse shear load: `V`
- Mean and alternating components for fatigue: `P_mean`, `P_alt`
- Temperature change: `DeltaT`
- Estimated embedment settlement: `delta_emb`

## Governing Equations

## 1. Thread Geometry Terms
Lead angle at the pitch diameter:

`lambda = atan(p / (pi * d_2))`

Thread friction angle term:

`phi_t = atan(mu_t * sec(alpha))`

These appear in the exact raising-load torque relation.

## 2. Installation Torque to Preload
The preload solver must support three installation models.

### 2.1 Exact thread + bearing decomposition
Total installation torque:

`T_inst = T_thread + T_bearing + T_prev`

Thread torque for raising load:

`T_thread = F_i * (d_2 / 2) * ((tan(lambda) + mu_t * sec(alpha)) / (1 - mu_t * sec(alpha) * tan(lambda)))`

Bearing torque under head / nut:

`T_bearing = F_i * mu_b * (D_b / 2)`

Therefore preload from torque is:

`F_i = (T_inst - T_prev) / ((d_2 / 2) * ((tan(lambda) + mu_t * sec(alpha)) / (1 - mu_t * sec(alpha) * tan(lambda))) + mu_b * (D_b / 2))`

This is the preferred V1 solver path.

### 2.2 Nut-factor approximation (explicitly marked empirical)
If the user only has a nut factor `K`:

`T_inst = K * F_i * d`

`F_i = T_inst / (K * d)`

This path must be labeled as an empirical fallback.

### 2.3 Direct-preload mode
If the user has measured preload directly:

`F_i = F_i,target`

The solver still computes the equivalent torque breakdown if friction inputs are provided, but preload is taken as authoritative.

## 3. Bolt Stiffness
### 3.1 Uniform bolt segment
If the bolt is modeled as one effective tensile segment:

`k_b = (A_t * E_b) / L_b`

### 3.2 Segmented bolt model
If shank, thread, nut-engaged, and head transition zones are modeled explicitly:

`1 / k_b = sum_j (L_b,j / (E_b,j * A_b,j))`

`k_b = 1 / sum_j (L_b,j / (E_b,j * A_b,j))`

The segmented form is the default architecture because it avoids hidden equivalent-length assumptions.

## 4. Member / Clamp Stack Stiffness
### 4.1 Series segment compliance model
For a stack of compressed members treated as axial springs in series:

`1 / k_m = sum_i (L_i / (E_i * A_i,eff))`

`k_m = 1 / sum_i (L_i / (E_i * A_i,eff))`

Where `A_i,eff` must be produced by a declared area model:
- cylindrical sleeve model
- exact conical-frustum annulus compliance integration
- user-defined effective area
- pressure-cone surrogate (later gate, explicit only)

### 4.2 No hidden pressure-cone shortcut
If a pressure-cone model is enabled, the exact cone angle, truncation, and area evolution must be user-visible. No hard-coded invisible cone constants.

## 5. Joint Constant / Load Fraction
The joint constant (bolt load fraction) is:

`C = k_b / (k_b + k_m)`

The member load fraction is:

`1 - C = k_m / (k_b + k_m)`

This controls service-load redistribution.

## 6. Service Load Redistribution
For an external separating axial load `P` applied after tightening:

Bolt load increase:

`DeltaF_b = C * P`

Clamp-force reduction:

`DeltaF_c = (1 - C) * P`

Bolt force under service:

`F_b,service = F_i + C * P`

Residual clamp force:

`F_c,service = F_i - (1 - C) * P`

This is the core preload-retention equation set.

## 7. Separation Load
Joint separation occurs when residual clamp force reaches zero:

`F_c,service = 0`

Therefore separation load is:

`P_sep = F_i / (1 - C)`

For `P >= P_sep`, the interface is open and the joint must switch to post-separation logic.

## 8. Post-Separation Bolt Load
After separation, additional external axial load is carried primarily by the bolt.
A conservative V1 post-separation rule is:

`F_b,post = F_i + C * P_sep + (P - P_sep)` for `P > P_sep`

which simplifies to:

`F_b,post = F_i + C * P_sep + P - P_sep`

This keeps the transition continuous and explicitly conservative after gapping.

## 9. Slip Resistance at the Faying Surface
Available slip resistance before interface motion:

`V_slip = mu_s * n_f * F_c,service`

No-slip condition:

`V <= V_slip`

Slip ratio:

`R_slip = V / V_slip`

Interpretation:
- `R_slip < 1`: no gross interface slip predicted
- `R_slip = 1`: incipient slip
- `R_slip > 1`: gross slip expected

This is also the first screening metric for self-loosening susceptibility under transverse loading.

## 10. Embedment / Seating Relaxation
If joint settlement or embedment produces a net axial shortening `delta_emb`, the preload loss is:

`DeltaF_emb = delta_emb / ((1 / k_b) + (1 / k_m))`

Updated preload after settlement:

`F_i,emb = F_i - DeltaF_emb`

This updated preload must be propagated into all later checks.

## 11. Thermal Preload Shift
If bolt and members experience different thermal expansion over the grip:

Free differential expansion mismatch:

`Delta_th,free = (sum_i(alpha_i * L_i) - alpha_b * L_b) * DeltaT`

Thermal preload change:

`DeltaF_th = Delta_th,free / ((1 / k_b) + (1 / k_m))`

Updated preload after thermal shift:

`F_i,th = F_i + DeltaF_th`

Combined preload before service checks:

`F_i,eff = F_i - DeltaF_emb + DeltaF_th`

All service checks must use `F_i,eff`, not the installation preload alone.

## 12. Proof / Yield Check
Bolt axial stress under service:

`sigma_b = F_b / A_t`

Proof utilization:

`U_proof = sigma_b / S_p`

Accept if:

`U_proof <= 1`

A recommended design target is to keep installation preload below a selected fraction of proof, but that fraction must be a user-visible criterion, not hard-coded.

## 13. Bearing Check
For member bearing under transmitted load at a hole:

`sigma_bearing = F_transfer / (t * d_proj)`

Where:
- `t` is the governing member thickness
- `d_proj` is the projected bearing diameter (typically hole or local profile-specific projection)

Accept if:

`sigma_bearing <= sigma_bearing,allow`

If countersunk geometry exists, projected area must use the real countersink-bearing projection, not the straight-hole approximation.

## 14. Thread Strip Check
External or internal thread stripping load can be screened by shear area:

`F_strip = A_shear * tau_strip`

For a first explicit cylindrical approximation:

`A_shear ~= pi * d_p * L_e * eta`

Where:
- `d_p` is an appropriate pitch / shear diameter
- `L_e` is thread engagement length
- `eta` is a thread-form correction factor that must be explicit and user-visible

Accept if:

`F_b <= F_strip`

## 15. Fatigue Screening (Mean + Alternating Bolt Load)
Mean bolt force:

`F_mean = F_i,eff + C * P_mean`

Alternating bolt force amplitude:

`F_alt = C * P_alt`

Mean and alternating stress:

`sigma_m = F_mean / A_t`

`sigma_a = F_alt / A_t`

Goodman relation:

`sigma_a / S_e + sigma_m / S_u <= 1`

This gives an explicit fatigue-screening metric for fluctuating service load.

## 16. Self-Loosening / Transverse Vibration Screening
The Hard Lock material correctly frames the dominant looseness mechanism as relative motion at the bearing/clamped surfaces under transverse excitation. The V1 screening model therefore centers on interface slip and transverse force ratio.

Primary screening metric:

`R_loose = V / (mu_s * n_f * F_c,service)`

Interpretation:
- `R_loose < 1`: low immediate gross-slip risk
- `R_loose ~ 1`: slip onset possible; high vigilance
- `R_loose > 1`: high self-loosening risk under transverse excitation

Secondary screening metric (preload reserve):

`R_clamp = F_c,service / F_i,eff`

If `R_clamp` is already low because of embedment, thermal loss, or high separating load, transverse loosening sensitivity increases sharply.

V2 should add an optional Junker-style empirical decay model, but V1 should not pretend to do time-domain loosening prediction without test-backed coefficients.

## Governing State Logic
Each load case must report:
- installation preload: `F_i`
- effective preload after relaxation + thermal: `F_i,eff`
- current bolt load: `F_b`
- current clamp force: `F_c,service`
- separation margin: `P_sep - P`
- slip margin: `V_slip - V`
- proof margin: `1 - U_proof`
- fatigue margin from Goodman
- thread strip margin
- bearing margin
- self-loosening risk category from `R_loose`

The solver must identify the governing minimum margin and expose it first.

## Required Solver Modes
1. `Torque -> preload`
- exact thread + bearing friction decomposition
- nut-factor fallback

2. `Direct preload`
- preload entered directly

3. `Service case evaluation`
- axial only
- transverse only
- combined axial + transverse
- thermal + embedment + service

4. `Single-bolt detailed`
- full scalar breakdown

5. `Multi-bolt pattern`
- bolt-group force partitioning and per-bolt preload retention (later gate)

## UI Requirements
### Inputs panel
- Installation model selector
- Thread geometry and friction section
- Member stack compliance table
- Service loads
- Thermal / embedment section
- Material / allowable section
- Clear “assumptions in use” panel

### Results panel
- Preload achieved
- Effective preload after losses
- Clamp-force retention
- Separation threshold
- Slip threshold
- Governing failure / warning
- Proof / fatigue / strip / bearing margins
- Self-loosening risk ladder

### Visualization
- axial spring-stack schematic
- preload flow diagram (`bolt`, `members`, `service redistribution`)
- clamp-loss waterfall (installation -> embedment -> thermal -> service)
- per-bolt bar chart for multi-bolt patterns

## Implementation Gates

## G1 Data Model and Explicit Inputs
Tickets:
- Define canonical types for bolt, thread, member stack, friction, preload mode, service load cases
- Build segmented compliance input model (no hidden equivalent lengths)
- Define result schema with every intermediate quantity listed above

Deliverables:
- `src/lib/core/preload/types.ts`
- `src/lib/core/preload/catalog.ts`
- deterministic JSON-serializable input/output contracts

## G2 Preload Core Solver
Tickets:
- Implement exact torque decomposition
- Implement nut-factor fallback
- Implement direct-preload mode
- Implement segmented bolt stiffness and segmented member stiffness
- Implement joint constant `C`

Deliverables:
- `src/lib/core/preload/solve-preload.ts`
- `src/lib/core/preload/stiffness.ts`
- unit tests for all closed-form equations

## G3 Service / Retention Solver
Tickets:
- Implement clamp-loss under axial service load
- Implement separation threshold
- Implement post-separation bolt load path
- Implement slip threshold and slip ratio
- Implement embedment and thermal preload shift

Deliverables:
- `src/lib/core/preload/retention.ts`
- `src/lib/core/preload/service.ts`
- regression tests for separation/slip/load sharing

## G4 Integrity / Failure Checks
Tickets:
- Implement proof check
- Implement bearing check
- Implement thread strip screening
- Implement Goodman fatigue screening
- Implement self-loosening risk ladder based on clamp-loss + transverse slip ratio

Deliverables:
- `src/lib/core/preload/checks.ts`
- severity-ranked governing margin output
- explicit warning codes

## G5 UI / Visualization
Tickets:
- Replace deleted Fastener toolbox with a new `Preload Analysis` route only after solver gates are green
- Build results-first UI
- Build axial spring-stack / clamp-loss visuals
- Add CSV/JSON/SVG/PDF export from the new explicit results model

Deliverables:
- `src/routes/preload/+page.svelte`
- `src/lib/components/preload/*`

## G6 Validation and Research Closure
Tickets:
- Validate against hand-calculated textbook / NASA examples
- Add deterministic test fixtures for torque-to-preload, separation, slip, thermal shift, and fatigue screening
- Document every selectable modeling assumption in a dedicated assumptions panel and markdown reference

Deliverables:
- `tests/preload-solver.spec.ts`
- `implementation/PRELOAD_VALIDATION_MATRIX_V1.md`

## Acceptance Criteria
- No hidden constants in the preload path
- Every stiffness and friction assumption is explicit in UI + outputs
- Every result is reproducible from printed intermediate values
- Exported report contains the full equation path and governing margins
- Separation, slip, and preload-retention margins are visible before secondary metrics
- Self-loosening risk is tied to transverse-slip mechanics, not a vague qualitative label

## Immediate Replacement Recommendation
Do not recreate the old Fastener toolbox UI.
Build the replacement as a new route and model named:
- `Fastened Joint Preload Analysis`

Reason:
- It is narrower and more defensible.
- It maps directly to the research and equations above.
- It avoids resurrecting the deleted mixed-scope fastener route.
