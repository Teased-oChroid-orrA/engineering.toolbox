import type { ContextMenuRegistration } from '$lib/navigation/contextualMenu';

export type SurfaceNavMenuContext = {
  canUndo: boolean;
  canRedo: boolean;
  coreMode: boolean;
  rightRailCollapsed: boolean;
  openCreateGeometry: () => void;
  openSurfaceCurveOps: () => void;
  openExtrude: () => void;
  openDatums: () => void;
  openSettings: () => void;
  undo: () => void;
  redo: () => void;
  clearPicks: () => void;
  fitToScreen: () => void;
  resetView: () => void;
  toggleCoreMode: () => void;
  toggleRightRail: () => void;
  exportCsv: () => void;
  exportStep: () => void;
};

export function handleSurfaceNavMenuCommand(ctx: SurfaceNavMenuContext, id: string): void {
  if (id === 'open_create_geometry') return ctx.openCreateGeometry();
  if (id === 'open_surface_curve_ops') return ctx.openSurfaceCurveOps();
  if (id === 'open_extrude') return ctx.openExtrude();
  if (id === 'open_datums') return ctx.openDatums();
  if (id === 'open_settings') return ctx.openSettings();
  if (id === 'undo') return ctx.undo();
  if (id === 'redo') return ctx.redo();
  if (id === 'clear_picks') return ctx.clearPicks();
  if (id === 'fit_to_screen') return ctx.fitToScreen();
  if (id === 'reset_view') return ctx.resetView();
  if (id === 'toggle_core_mode') return ctx.toggleCoreMode();
  if (id === 'toggle_right_rail') return ctx.toggleRightRail();
  if (id === 'export_csv') return ctx.exportCsv();
  if (id === 'export_step') return ctx.exportStep();
}

export function buildSurfaceNavMenu(ctx: Pick<SurfaceNavMenuContext, 'canUndo' | 'canRedo' | 'coreMode' | 'rightRailCollapsed'>): ContextMenuRegistration {
  return {
    scope: 'surface',
    label: 'Surface Menu',
    sections: [
      {
        title: 'Create',
        actions: [
          { id: 'open_create_geometry', label: 'Create Geometry...' },
          { id: 'open_surface_curve_ops', label: 'Surface/Curve Operations...' },
          { id: 'open_extrude', label: 'Extrude...' },
          { id: 'open_datums', label: 'Datums...' },
          { id: 'open_settings', label: 'Settings...' }
        ]
      },
      {
        title: 'Actions',
        actions: [
          { id: 'undo', label: 'Undo', disabled: !ctx.canUndo },
          { id: 'redo', label: 'Redo', disabled: !ctx.canRedo },
          { id: 'clear_picks', label: 'Clear picks' },
          { id: 'fit_to_screen', label: 'Fit to screen' },
          { id: 'reset_view', label: 'Reset view' },
          { id: 'toggle_core_mode', label: 'Core Mode', checked: ctx.coreMode },
          { id: 'toggle_right_rail', label: 'Right rail collapsed', checked: ctx.rightRailCollapsed }
        ]
      },
      {
        title: 'Export',
        actions: [
          { id: 'export_csv', label: 'Export CSV' },
          { id: 'export_step', label: 'Export STEP', disabled: true }
        ]
      }
    ]
  };
}
