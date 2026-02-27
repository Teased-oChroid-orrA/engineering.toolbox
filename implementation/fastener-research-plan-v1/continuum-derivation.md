# Continuum Derivation Notes (Single Fastener, Axisymmetric)

## Governing Equations
For axisymmetric small-strain elasticity in `(r, z)`:

- `epsilon_r = du_r/dr`
- `epsilon_z = du_z/dz`
- `epsilon_theta = u_r/r`
- `gamma_rz = du_r/dz + du_z/dr`

Constitutive relation (isotropic linear elastic):

- `sigma = D(E, nu) * epsilon`

with Lamé constants:

- `lambda = E*nu / ((1+nu)*(1-2*nu))`
- `mu = E/(2*(1+nu))`

Axisymmetric integration measure:

- `dOmega = 2*pi*r*dr*dz`

Weak form:

`int_Omega (delta_epsilon^T sigma) dOmega = int_Omega(delta_u^T b) dOmega + int_Gamma_t(delta_u^T tbar) dGamma + int_Gamma_c(delta_u^T tc) dGamma`

## Q4 Axisymmetric Element
For each quadrilateral element with nodal DOFs `[u_r1, u_z1, ..., u_r4, u_z4]`:

- `K_e = int(B^T D B * 2*pi*r * detJ) dxi deta`

Gaussian quadrature (2x2) is used.

## Preload Application (Current Continuum Path)
Current implementation applies equal/opposite axial tractions on bolt-core top and bottom boundary edges:

- `t_top = -F0 / A_bolt`
- `t_bottom = +F0 / A_bolt`

where `A_bolt = pi*r_b^2`.

Nodal load contribution along an axisymmetric edge:

- `f_i = int(N_i * t_z * 2*pi*r * |dr/dxi|) dxi`

## Field Recovery
Element-center stresses and strains are recovered from solved displacement field:

- `epsilon = B * u_e`
- `sigma = D * epsilon`

## Layer Load Transfer Extraction
For each layer and region (`bolt`, `outer`), axial stress `sigma_z` is volume-weight averaged and converted to resultant force:

- `F_bolt_layer = avg(sigma_z_bolt) * A_bolt`
- `F_outer_layer = avg(sigma_z_outer) * A_outer`

Transferred load proxy between adjacent layers:

- `DeltaF_transfer = F_bolt(previous) - F_bolt(current)`

## Dimensional Consistency
- `K`: force/length
- `u`: length
- `sigma`: force/area
- `F`: force
- `residual`: dimensionless relative norm

## Explicit Constraints
- No pressure-cone/frustum/effective-area shortcuts.
- All reported load-transfer values derive from integrated field quantities and reactions.

## Current Extension Gaps
- Detailed gap/contact pair enforcement is schema-ready but not yet active in continuum path.
- Current v1 continuum path models bolt/member interface as bonded (no clearance slip).
