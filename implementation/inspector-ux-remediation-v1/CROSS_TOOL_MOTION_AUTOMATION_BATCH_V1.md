# Cross-Tool Motion Automation Batch v1

Date: 2026-02-10

## Executed tickets (10 total)
1. `XMD-001` Added reusable motion-depth tooling module  
Status: complete  
File: `scripts/motion-depth-tools.mjs`

2. `XMD-002` Upgraded verification rule to use shared parser/validator  
Status: complete  
File: `scripts/verify-cross-tool-motion-depth.mjs`

3. `XMD-003` Added codemod auto-fixer for missing depth classes  
Status: complete  
File: `scripts/fix-cross-tool-motion-depth.mjs`

4. `XMD-004` Added tool self-test script for parser/fixer cases  
Status: complete  
File: `scripts/test-motion-depth-tools.mjs`

5. `XMD-005` Wired motion-depth verify into global `check` gate  
Status: complete  
File: `package.json`

6. `XMD-006` Added `fix:motion-depth` and `enforce:motion-depth` commands  
Status: complete  
File: `package.json`

7. `XMD-007` Applied explicit depth-tier mapping to Surface card wrappers  
Status: complete  
File: `src/lib/components/surface/SurfaceOrchestrator.svelte`

8. `XMD-008` Applied explicit depth-tier mapping to Bushing orchestrator wrappers  
Status: complete  
File: `src/lib/components/bushing/BushingOrchestrator.svelte`

9. `XMD-009` Applied depth-tier mapping to Bushing result/diagnostics/helper components  
Status: complete  
Files:
- `src/lib/components/bushing/BushingResultSummary.svelte`
- `src/lib/components/bushing/BushingDiagnosticsPanel.svelte`
- `src/lib/components/bushing/BushingHelperGuidance.svelte`

10. `XMD-010` Validated end-to-end enforcement path  
Status: complete  
Commands:
- `npm run -s fix:motion-depth`
- `npm run -s test:motion-depth-tools`
- `npm run -s verify:motion-depth`
- `npm run -s check`

## Result
- New pop-card/pop-sub additions in Surface/Bushing can now be auto-corrected with codemod.
- CI/local gate (`check`) now blocks missing depth classes.
- Consistency contract is executable and test-backed.

