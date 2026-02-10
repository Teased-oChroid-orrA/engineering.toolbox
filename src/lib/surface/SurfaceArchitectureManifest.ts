export type SurfaceLayer =
  | 'ui'
  | 'controller'
  | 'domain'
  | 'geom'
  | 'eval'
  | 'api'
  | 'state'
  | 'viewport'
  | 'types';

export type SurfaceContract =
  | 'geometry.types'
  | 'geometry.curves'
  | 'geometry.edges'
  | 'geometry.points'
  | 'geometry.indexing'
  | 'evaluation.bestFit'
  | 'evaluation.slicing'
  | 'api.surface'
  | 'state.snapshot'
  | 'viewport.projection'
  | 'selection.engine'
  | 'toolbox.entry';

export type SurfaceModuleDefinition = {
  id: string;
  path: string;
  layer: SurfaceLayer;
  owner: string;
  publicContracts: SurfaceContract[];
  dependsOn: string[];
  notes?: string;
};

export const SURFACE_LAYER_IMPORT_POLICY: Record<SurfaceLayer, readonly SurfaceLayer[]> = {
  ui: ['ui', 'controller', 'domain', 'geom', 'eval', 'api', 'state', 'viewport', 'types'],
  controller: ['controller', 'domain', 'geom', 'eval', 'api', 'state', 'viewport', 'types'],
  domain: ['geom', 'types', 'state'],
  geom: ['geom', 'types'],
  eval: ['eval', 'api', 'geom', 'types'],
  api: ['api', 'types'],
  state: ['state', 'types'],
  viewport: ['viewport', 'types', 'geom'],
  types: []
} as const;

export const SURFACE_MODULES: readonly SurfaceModuleDefinition[] = [
  {
    id: 'surface.toolbox',
    path: 'src/lib/components/SurfaceToolbox.svelte',
    layer: 'ui',
    owner: 'surface-ui',
    publicContracts: ['toolbox.entry'],
    dependsOn: ['surface.ui.orchestrator'],
    notes: 'Thin entry shell that composes the surface orchestrator.'
  },
  {
    id: 'surface.ui.orchestrator',
    path: 'src/lib/components/surface/SurfaceOrchestrator.svelte',
    layer: 'ui',
    owner: 'surface-ui',
    publicContracts: [],
    dependsOn: [
      'surface.ui.canvas',
      'surface.ui.selectionControls',
      'surface.ui.interpolationPanel',
      'surface.ui.samplerPanel',
      'surface.ui.fileMenu',
      'surface.ui.loftPanel',
      'surface.ui.fitPanel',
      'surface.ui.datumSliceExportPanel',
      'surface.ui.slicingRecommendationRail',
      'surface.ui.workflowGuideCard',
      'surface.ui.extrudeModal',
      'surface.ui.viewportSettingsModal',
      'surface.ui.offsetPanel',
      'surface.ui.statusRail',
      'surface.ui.recipesPanel',
      'surface.ui.commands',
      'surface.selection.engine',
      'surface.controller.eval',
      'surface.controller.io',
      'surface.controller.cursor',
      'surface.controller.hover',
      'surface.controller.geodesic',
      'surface.controller.intersection',
      'surface.controller.snap',
      'surface.controller.sliceExport',
      'surface.controller.sliceInsights',
      'surface.regression.datumSlicingKernel',
      'surface.controller.warnings',
      'surface.controller.warningDispatch',
      'surface.controller.recipes',
      'surface.controller.recipeRun',
      'surface.controller.recipeTransaction',
      'surface.controller.theme',
      'surface.controller.interaction',
      'surface.controller.modal',
      'surface.controller.datum',
      'surface.controller.tools',
      'surface.controller.uiState',
      'surface.eval.runner',
      'surface.api.client',
      'surface.state.snapshots',
      'surface.state.historyController',
      'surface.viewport.service',
      'surface.geom.points',
      'surface.geom.edges',
      'surface.geom.curves',
      'surface.geom.indexing',
      'surface.types'
    ],
    notes: 'Current orchestration implementation migrated from SurfaceToolbox.'
  },
  {
    id: 'surface.ui.canvas',
    path: 'src/lib/components/surface/SurfaceCanvas.svelte',
    layer: 'ui',
    owner: 'surface-ui',
    publicContracts: [],
    dependsOn: ['surface.viewport.service', 'surface.types']
  },
  {
    id: 'surface.ui.selectionControls',
    path: 'src/lib/components/surface/SurfaceSelectionControls.svelte',
    layer: 'ui',
    owner: 'surface-ui',
    publicContracts: [],
    dependsOn: ['surface.types']
  },
  {
    id: 'surface.ui.interpolationPanel',
    path: 'src/lib/components/surface/SurfaceInterpolationPanel.svelte',
    layer: 'ui',
    owner: 'surface-ui',
    publicContracts: [],
    dependsOn: ['surface.types']
  },
  {
    id: 'surface.ui.samplerPanel',
    path: 'src/lib/components/surface/SurfaceSamplerPanel.svelte',
    layer: 'ui',
    owner: 'surface-ui',
    publicContracts: [],
    dependsOn: ['surface.types']
  },
  {
    id: 'surface.ui.fileMenu',
    path: 'src/lib/components/surface/SurfaceFileMenu.svelte',
    layer: 'ui',
    owner: 'surface-ui',
    publicContracts: [],
    dependsOn: []
  },
  {
    id: 'surface.ui.loftPanel',
    path: 'src/lib/components/surface/CurveEdgesLoftPanel.svelte',
    layer: 'ui',
    owner: 'surface-ui',
    publicContracts: [],
    dependsOn: ['surface.types']
  },
  {
    id: 'surface.ui.fitPanel',
    path: 'src/lib/components/surface/SurfaceFitPanel.svelte',
    layer: 'ui',
    owner: 'surface-ui',
    publicContracts: [],
    dependsOn: ['surface.eval.runner', 'surface.types']
  },
  {
    id: 'surface.ui.datumSliceExportPanel',
    path: 'src/lib/components/surface/SurfaceDatumSliceExportPanel.svelte',
    layer: 'ui',
    owner: 'surface-ui',
    publicContracts: [],
    dependsOn: ['surface.controller.sliceExport', 'surface.types']
  },
  {
    id: 'surface.ui.slicingRecommendationRail',
    path: 'src/lib/components/surface/SurfaceSlicingRecommendationRail.svelte',
    layer: 'ui',
    owner: 'surface-ui',
    publicContracts: [],
    dependsOn: ['surface.controller.sliceInsights']
  },
  {
    id: 'surface.ui.workflowGuideCard',
    path: 'src/lib/components/surface/SurfaceWorkflowGuideCard.svelte',
    layer: 'ui',
    owner: 'surface-ui',
    publicContracts: [],
    dependsOn: []
  },
  {
    id: 'surface.ui.extrudeModal',
    path: 'src/lib/components/surface/SurfaceExtrudeModal.svelte',
    layer: 'ui',
    owner: 'surface-ui',
    publicContracts: [],
    dependsOn: ['surface.types']
  },
  {
    id: 'surface.ui.viewportSettingsModal',
    path: 'src/lib/components/surface/SurfaceViewportSettingsModal.svelte',
    layer: 'ui',
    owner: 'surface-ui',
    publicContracts: [],
    dependsOn: []
  },
  {
    id: 'surface.ui.offsetPanel',
    path: 'src/lib/components/surface/SurfaceOffsetIntersectionPanel.svelte',
    layer: 'ui',
    owner: 'surface-ui',
    publicContracts: [],
    dependsOn: ['surface.types', 'surface.api.client']
  },
  {
    id: 'surface.ui.statusRail',
    path: 'src/lib/components/surface/SurfaceStatusRail.svelte',
    layer: 'ui',
    owner: 'surface-ui',
    publicContracts: [],
    dependsOn: ['surface.controller.warnings']
  },
  {
    id: 'surface.ui.recipesPanel',
    path: 'src/lib/components/surface/SurfaceRecipesPanel.svelte',
    layer: 'ui',
    owner: 'surface-ui',
    publicContracts: [],
    dependsOn: ['surface.controller.recipes']
  },
  {
    id: 'surface.ui.commands',
    path: 'src/lib/components/surface/SurfaceCommands.ts',
    layer: 'controller',
    owner: 'surface-core',
    publicContracts: [],
    dependsOn: ['surface.api.client']
  },
  {
    id: 'surface.selection.engine',
    path: 'src/lib/components/surface/SelectionEngine.ts',
    layer: 'controller',
    owner: 'surface-core',
    publicContracts: ['selection.engine'],
    dependsOn: ['surface.types']
  },
  {
    id: 'surface.controller.eval',
    path: 'src/lib/components/surface/controllers/SurfaceEvalController.ts',
    layer: 'controller',
    owner: 'surface-core',
    publicContracts: [],
    dependsOn: ['surface.eval.runner', 'surface.types']
  },
  {
    id: 'surface.controller.io',
    path: 'src/lib/components/surface/controllers/SurfaceIoController.ts',
    layer: 'controller',
    owner: 'surface-core',
    publicContracts: [],
    dependsOn: ['surface.ui.commands', 'surface.api.client', 'surface.types']
  },
  {
    id: 'surface.controller.cursor',
    path: 'src/lib/components/surface/controllers/SurfaceCursorController.ts',
    layer: 'controller',
    owner: 'surface-core',
    publicContracts: [],
    dependsOn: []
  },
  {
    id: 'surface.controller.hover',
    path: 'src/lib/components/surface/controllers/SurfaceHoverController.ts',
    layer: 'controller',
    owner: 'surface-core',
    publicContracts: [],
    dependsOn: ['surface.controller.snap', 'surface.controller.cursor']
  },
  {
    id: 'surface.controller.geodesic',
    path: 'src/lib/components/surface/controllers/SurfaceGeodesicOffsetController.ts',
    layer: 'controller',
    owner: 'surface-core',
    publicContracts: [],
    dependsOn: ['surface.types', 'surface.geom.points']
  },
  {
    id: 'surface.controller.intersection',
    path: 'src/lib/components/surface/controllers/SurfaceIntersectionController.ts',
    layer: 'controller',
    owner: 'surface-core',
    publicContracts: [],
    dependsOn: ['surface.types', 'surface.geom.points']
  },
  {
    id: 'surface.controller.snap',
    path: 'src/lib/components/surface/controllers/SurfaceSnapController.ts',
    layer: 'controller',
    owner: 'surface-core',
    publicContracts: [],
    dependsOn: ['surface.types', 'surface.geom.points']
  },
  {
    id: 'surface.controller.sliceExport',
    path: 'src/lib/components/surface/controllers/SurfaceSlicingExportController.ts',
    layer: 'controller',
    owner: 'surface-core',
    publicContracts: [],
    dependsOn: ['surface.regression.datumSlicingKernel']
  },
  {
    id: 'surface.controller.sliceInsights',
    path: 'src/lib/components/surface/controllers/SurfaceSlicingInsightsController.ts',
    layer: 'controller',
    owner: 'surface-core',
    publicContracts: [],
    dependsOn: ['surface.controller.sliceExport']
  },
  {
    id: 'surface.regression.datumSlicingKernel',
    path: 'src/lib/surface/regression/DatumSlicingKernel.ts',
    layer: 'domain',
    owner: 'surface-core',
    publicContracts: [],
    dependsOn: ['surface.types']
  },
  {
    id: 'surface.controller.warnings',
    path: 'src/lib/components/surface/controllers/SurfaceWarningsController.ts',
    layer: 'controller',
    owner: 'surface-core',
    publicContracts: [],
    dependsOn: ['surface.controller.intersection', 'surface.controller.sliceExport']
  },
  {
    id: 'surface.controller.warningDispatch',
    path: 'src/lib/components/surface/controllers/SurfaceWarningDispatchController.ts',
    layer: 'controller',
    owner: 'surface-core',
    publicContracts: [],
    dependsOn: ['surface.controller.warnings']
  },
  {
    id: 'surface.controller.recipes',
    path: 'src/lib/components/surface/controllers/SurfaceRecipesController.ts',
    layer: 'controller',
    owner: 'surface-core',
    publicContracts: [],
    dependsOn: ['surface.controller.sliceExport']
  },
  {
    id: 'surface.controller.recipeRun',
    path: 'src/lib/components/surface/controllers/SurfaceRecipeRunController.ts',
    layer: 'controller',
    owner: 'surface-core',
    publicContracts: [],
    dependsOn: ['surface.controller.recipes']
  },
  {
    id: 'surface.controller.interaction',
    path: 'src/lib/components/surface/controllers/SurfaceInteractionController.ts',
    layer: 'controller',
    owner: 'surface-core',
    publicContracts: [],
    dependsOn: ['surface.controller.snap']
  },
  {
    id: 'surface.controller.modal',
    path: 'src/lib/components/surface/controllers/SurfaceModalController.ts',
    layer: 'controller',
    owner: 'surface-ui',
    publicContracts: [],
    dependsOn: []
  },
  {
    id: 'surface.controller.datum',
    path: 'src/lib/components/surface/controllers/SurfaceDatumController.ts',
    layer: 'controller',
    owner: 'surface-core',
    publicContracts: [],
    dependsOn: ['surface.types', 'surface.geom.points']
  },
  {
    id: 'surface.controller.recipeTransaction',
    path: 'src/lib/components/surface/controllers/SurfaceRecipeTransactionController.ts',
    layer: 'controller',
    owner: 'surface-core',
    publicContracts: [],
    dependsOn: ['surface.state.historyController', 'surface.state.snapshots']
  },
  {
    id: 'surface.controller.theme',
    path: 'src/lib/components/surface/controllers/SurfaceThemeController.ts',
    layer: 'controller',
    owner: 'surface-ui',
    publicContracts: [],
    dependsOn: []
  },
  {
    id: 'surface.controller.tools',
    path: 'src/lib/components/surface/controllers/SurfaceToolsController.ts',
    layer: 'controller',
    owner: 'surface-core',
    publicContracts: [],
    dependsOn: []
  },
  {
    id: 'surface.controller.uiState',
    path: 'src/lib/components/surface/controllers/SurfaceUiStateController.ts',
    layer: 'controller',
    owner: 'surface-core',
    publicContracts: [],
    dependsOn: []
  },
  {
    id: 'surface.eval.runner',
    path: 'src/lib/surface/eval/SurfaceEvaluation.ts',
    layer: 'eval',
    owner: 'surface-core',
    publicContracts: ['evaluation.bestFit', 'evaluation.slicing'],
    dependsOn: ['surface.api.client', 'surface.geom.indexing', 'surface.types']
  },
  {
    id: 'surface.api.client',
    path: 'src/lib/surface/api/surfaceApi.ts',
    layer: 'api',
    owner: 'surface-core',
    publicContracts: ['api.surface'],
    dependsOn: ['surface.types']
  },
  {
    id: 'surface.state.snapshots',
    path: 'src/lib/surface/state/SurfaceStore.ts',
    layer: 'state',
    owner: 'surface-core',
    publicContracts: ['state.snapshot'],
    dependsOn: ['surface.types']
  },
  {
    id: 'surface.state.historyController',
    path: 'src/lib/surface/state/SurfaceHistoryController.ts',
    layer: 'state',
    owner: 'surface-core',
    publicContracts: [],
    dependsOn: ['surface.state.snapshots']
  },
  {
    id: 'surface.viewport.service',
    path: 'src/lib/surface/viewport/SurfaceViewport.ts',
    layer: 'viewport',
    owner: 'surface-core',
    publicContracts: ['viewport.projection'],
    dependsOn: ['surface.types', 'surface.geom.points']
  },
  {
    id: 'surface.geom.points',
    path: 'src/lib/surface/geom/points.ts',
    layer: 'geom',
    owner: 'surface-core',
    publicContracts: ['geometry.points'],
    dependsOn: ['surface.types']
  },
  {
    id: 'surface.geom.edges',
    path: 'src/lib/surface/geom/edges.ts',
    layer: 'geom',
    owner: 'surface-core',
    publicContracts: ['geometry.edges'],
    dependsOn: ['surface.types']
  },
  {
    id: 'surface.geom.curves',
    path: 'src/lib/surface/geom/curves.ts',
    layer: 'geom',
    owner: 'surface-core',
    publicContracts: ['geometry.curves'],
    dependsOn: ['surface.types', 'surface.geom.points']
  },
  {
    id: 'surface.geom.indexing',
    path: 'src/lib/surface/geom/indexing.ts',
    layer: 'geom',
    owner: 'surface-core',
    publicContracts: ['geometry.indexing'],
    dependsOn: ['surface.types']
  },
  {
    id: 'surface.types',
    path: 'src/lib/surface/types.ts',
    layer: 'types',
    owner: 'surface-core',
    publicContracts: ['geometry.types'],
    dependsOn: []
  }
] as const;

export const SURFACE_TOOLBOX_WIRING = {
  entrypoint: 'surface.toolbox',
  coreModeDefaultOn: true,
  advancedPanelDefaultCollapsedOnFreshLaunch: true,
  advancedPanelRememberWithinSession: true,
  slices: {
    preferred: 'datum-plane',
    defaults: {
      spacingMode: 'fixed',
      countModeAvailable: true
    }
  },
  exports: {
    primary: 'csv-combined',
    sidecar: 'json-metadata'
  },
  ui: {
    visualDirection: 'technical-lab',
    typography: 'dual-font',
    motionProfile: 'standard-deliberate'
  }
} as const;

export function getSurfaceModuleById(id: string) {
  return SURFACE_MODULES.find((m) => m.id === id);
}

export function getSurfaceModuleByPath(path: string) {
  return SURFACE_MODULES.find((m) => m.path === path);
}

export function validateSurfaceArchitectureManifest(modules = SURFACE_MODULES) {
  const errors: string[] = [];
  const byId = new Map<string, SurfaceModuleDefinition>();
  const byPath = new Map<string, SurfaceModuleDefinition>();

  for (const mod of modules) {
    if (byId.has(mod.id)) errors.push(`Duplicate module id: ${mod.id}`);
    if (byPath.has(mod.path)) errors.push(`Duplicate module path: ${mod.path}`);
    byId.set(mod.id, mod);
    byPath.set(mod.path, mod);
  }

  for (const mod of modules) {
    const allowed = SURFACE_LAYER_IMPORT_POLICY[mod.layer];
    for (const depId of mod.dependsOn) {
      const dep = byId.get(depId);
      if (!dep) {
        errors.push(`${mod.id} -> unknown dependency: ${depId}`);
        continue;
      }
      if (!allowed.includes(dep.layer)) {
        errors.push(
          `${mod.id} (${mod.layer}) may not depend on ${dep.id} (${dep.layer})`
        );
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}
