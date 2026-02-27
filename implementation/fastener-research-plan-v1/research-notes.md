# Web Research Notes — Fastener Solver V1

## Intent
Verify governing equations and numerical strategy from primary technical references before implementing the reset architecture.

## Findings

1. Exact axial deformation/stiffness basis
- Source confirms elastic member relation used in preload engine and axial spring representation.
- Equation form used in implementation:
  - `delta = F L / (E A)`
  - `k = E A / L`
- Reference:
  - [Engineering Library — Bolt Preload Introduction](https://engineeringlibrary.org/reference/bolted-joint-design-analysis-sandia)

2. Torque decomposition for preload inversion (no nut-factor shortcut)
- Source provides decomposed thread and bearing torque components and aggregate torque expression.
- Implementation uses equivalent coefficient form:
  - `T = F * [L/(2*pi) + d_m*mu_t/(2*cos(alpha)) + mu_b*d_bm/2]`
- Reference:
  - [MIL-HDBK-60 torque decomposition summary](https://engineeringlibrary.org/reference/fastener-torque-mil-hdbk)

3. Contact constraints for nonlinear branch design
- Complementarity structure (`g_n >= 0`, `p_n >= 0`, `g_n p_n = 0`) aligns with current scaffold branch for separation state reporting.
- Full active-set/augmented-Lagrangian iterations are deferred to next gate.
- References:
  - [COMSOL Structural Mechanics — Contact Analysis Theory](https://doc.comsol.com/6.0/doc/com.comsol.help.sme/sme_ug_theory.06.73.html)
  - [Code_Aster contact/friction algorithm reference](https://www.code-aster.org/doc/default/en/man_r/r5/r5.03.50.pdf)

## Design Implications
- Keep stiffness engine purely continuum-based and modular.
- Keep torque path explicit and invertible with exposed denominator terms.
- Keep contact toggle deterministic now, upgrade to iterative complementarity solver in next phase.

