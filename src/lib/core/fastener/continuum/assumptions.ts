export function continuumAssumptions(): string[] {
  return [
    'Axisymmetric continuum formulation with linear elasticity.',
    'No pressure-cone/frustum/effective-area stiffness approximations are used.',
    'All force and load-transfer values are obtained from explicit field or reaction integration.',
    'Current continuum path duplicates bolt/member interface nodes and applies active-set penalty contact on radial normal gap.',
    'Tangential friction uses an augmented-Lagrangian sticking/sliding proxy with user-configurable friction coefficient.',
    'Initial radial gap is user-configurable and enforced in the normal gap function g_n = (u_outer_r - u_bolt_r) - g0.',
    'Full nonlinear Coulomb slip/contact-surface integration remains an extension item.'
  ];
}
