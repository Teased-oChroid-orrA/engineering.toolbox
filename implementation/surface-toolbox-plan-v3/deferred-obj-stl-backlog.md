# Deferred OBJ/STL Backlog

Status: Deferred by plan gate (after slicing/intersection stability and QA signoff)

## Deferred Items

1. OBJ export (mesh + line entities)
- Reason: Core slicing/intersection reliability and numerical validation take priority.
- Entry criteria:
  - STB-071 regression suite stable at 1e-4.
  - STB-072 smoke flows stable.
  - STB-073 release-readiness gate passes.

2. STL export (triangulated surface output)
- Reason: Requires a finalized surface meshing/triangulation contract and format validation.
- Entry criteria:
  - OBJ export baseline completed.
  - Triangulation strategy documented and validated against golden meshes.

## Notes

- Keep export actions hidden behind Advanced until both formats are production-ready.
- Do not regress the canonical CSV + JSON sidecar workflow.
