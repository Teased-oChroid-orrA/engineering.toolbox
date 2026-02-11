import {
  clearContextMenu,
  CONTEXT_MENU_COMMAND_EVENT,
  registerContextMenu
} from '$lib/navigation/contextualMenu';

type MenuHandlers = {
  onExportSvg: () => void;
  onExportPdf: () => void;
  toggleRendererMode: () => void;
  toggleTraceMode: () => void;
};

export function mountBushingContextMenu(handlers: MenuHandlers) {
  const onContextMenuCommand = (e: Event) => {
    const detail = (e as CustomEvent<{ scope: string; id: string }>).detail;
    if (!detail || detail.scope !== 'bushing') return;
    const id = detail.id;
    if (id === 'export_svg') {
      handlers.onExportSvg();
      return;
    }
    if (id === 'export_pdf') {
      handlers.onExportPdf();
      return;
    }
    if (id === 'toggle_renderer_mode') {
      handlers.toggleRendererMode();
      return;
    }
    if (id === 'toggle_trace_mode') handlers.toggleTraceMode();
  };
  window.addEventListener(CONTEXT_MENU_COMMAND_EVENT, onContextMenuCommand as EventListener);
  return () => {
    window.removeEventListener(CONTEXT_MENU_COMMAND_EVENT, onContextMenuCommand as EventListener);
    clearContextMenu('bushing');
  };
}

export function updateBushingContextMenu(
  useLegacyRenderer: boolean,
  traceEnabled: boolean
) {
  registerContextMenu({
    scope: 'bushing',
    label: 'Bushing Menu',
    sections: [
      {
        title: 'Export',
        actions: [
          { id: 'export_svg', label: 'Export SVG' },
          { id: 'export_pdf', label: 'Export PDF' }
        ]
      },
      {
        title: 'Rendering',
        actions: [
          { id: 'toggle_renderer_mode', label: useLegacyRenderer ? 'Draft Renderer: Legacy' : 'Draft Renderer: Section' },
          { id: 'toggle_trace_mode', label: 'Trace', checked: traceEnabled }
        ]
      }
    ]
  });
}
