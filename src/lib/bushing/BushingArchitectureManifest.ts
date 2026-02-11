export type BushingModuleBudget = {
  path: string;
  softMaxLoc: number;
  required: boolean;
};

// Bushing architecture follows the same modularity rules as Surface/Inspector:
// route orchestrates, controllers/services own logic, core owns math.
export const BUSHING_ARCHITECTURE_MANIFEST: BushingModuleBudget[] = [
  { path: 'src/routes/bushing/+page.svelte', softMaxLoc: 240, required: true },
  { path: 'src/lib/components/bushing/BushingOrchestrator.svelte', softMaxLoc: 420, required: true },
  { path: 'src/lib/components/bushing/BushingHelperGuidance.svelte', softMaxLoc: 220, required: true },
  { path: 'src/lib/components/bushing/BushingResultSummary.svelte', softMaxLoc: 220, required: true },
  { path: 'src/lib/components/bushing/BushingDiagnosticsPanel.svelte', softMaxLoc: 260, required: true },
  { path: 'src/lib/components/bushing/BushingVisualDiagnostics.ts', softMaxLoc: 180, required: true },
  { path: 'src/lib/components/bushing/BushingExportController.ts', softMaxLoc: 220, required: true },
  { path: 'src/lib/components/bushing/BushingReportBuilder.ts', softMaxLoc: 260, required: true },
  { path: 'src/lib/core/bushing/solve.ts', softMaxLoc: 340, required: true },
  { path: 'src/lib/core/bushing/types.ts', softMaxLoc: 240, required: true },
  { path: 'src/lib/core/bushing/normalize.ts', softMaxLoc: 220, required: true },
  { path: 'src/lib/core/bushing/schema.ts', softMaxLoc: 220, required: true },
  { path: 'src/lib/core/bushing/viewModel.ts', softMaxLoc: 180, required: true },
  { path: 'src/lib/drafting/bushing/BushingDrafting.svelte', softMaxLoc: 260, required: true },
  { path: 'src/lib/drafting/bushing/generate.ts', softMaxLoc: 280, required: true },
  { path: 'src/lib/drafting/bushing/bushingSceneModel.ts', softMaxLoc: 260, required: true },
  { path: 'src/lib/drafting/bushing/bushingSceneRenderer.ts', softMaxLoc: 220, required: true },
  { path: 'src/lib/drafting/bushing/BushingBabylonGeometry.ts', softMaxLoc: 220, required: true },
  { path: 'src/lib/drafting/bushing/BushingBabylonRuntime.ts', softMaxLoc: 320, required: true },
  { path: 'src/lib/drafting/bushing/BushingBabylonParity.ts', softMaxLoc: 240, required: true }
];
