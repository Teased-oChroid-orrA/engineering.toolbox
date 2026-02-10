# Dependency DAG

## Epic-level DAG

```mermaid
graph TD
  E0["Epic 0: Governance + Source of Truth"] --> E1["Epic 1: De-bloat Refactor"]
  E0 --> E3["Epic 3: Geometry Contracts"]
  E1 --> E2["Epic 2: Tool-Cursor UX"]
  E1 --> E5["Epic 5: Workspace Recipes"]
  E3 --> E4["Epic 4: Datum Slicing + Export"]
  E2 --> E7["Epic 7: E2E QA"]
  E4 --> E6["Epic 6: UX/UI System Pass"]
  E5 --> E7
  E4 --> E7
  E6 --> E7
  E7 --> E8["Epic 8: Surface Refocus UX"]
```

## Critical Path

1. STB-001 -> STB-002 -> STB-003
2. STB-010 -> STB-011 -> STB-012 -> STB-020 -> STB-022 -> STB-023
3. STB-030 -> STB-031 -> STB-032 -> STB-033 -> STB-040 -> STB-041 -> STB-042 -> STB-044
4. STB-050 -> STB-051 -> STB-053
5. STB-070 -> STB-071 -> STB-072 -> STB-073
6. STB-073 -> STB-074
7. STB-074 -> STB-080 -> STB-081 -> STB-082 -> STB-083 -> STB-084
8. STB-081 -> STB-086 -> STB-087 -> STB-088
9. STB-082 -> STB-085 -> STB-089
