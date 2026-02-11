import { clearContextMenu, CONTEXT_MENU_COMMAND_EVENT } from '$lib/navigation/contextualMenu';

type InspectorLifecycleCtx = {
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  queueDebug: (event: string, data?: Record<string, unknown>) => void;
  debugLogger: { flush: () => Promise<void> | void };
  setDebugLogPath: (path: string) => void;
  setIsTauri: (v: boolean) => void;
  setPrefersReducedMotion: (v: boolean) => void;
  setUiAnimDur: (v: number) => void;
  setDialogModule: (mod: unknown) => void;
  setCanOpenPath: (v: boolean) => void;
  getQuietBackendLogs: () => boolean;
  getShowShortcuts: () => boolean;
  setShowShortcuts: (v: boolean) => void;
  getShowRowDrawer: () => boolean;
  closeRowDrawer: () => void;
  openShortcuts: () => void;
  openSchema: () => void;
  openRecipes: () => void;
  openRegexGenerator: () => void;
  openBuilder: () => void;
  openColumnPicker: () => void;
  openStreamLoadFromMenu: () => Promise<void>;
  openFallbackLoadFromMenu: () => void;
  clearAllFilters: () => void;
  computeSchemaStats: () => Promise<void>;
  exportAnalysisBundle: () => void;
  exportCsvPreset: (mode: 'current_view' | 'filtered_rows' | 'selected_columns') => Promise<void>;
  toggleRegexHelp: () => void;
  toggleQuietBackendLogs: () => void;
  toggleAutoRestoreEnabled: () => void;
  focusQueryInput: () => void;
};

function createInspectorKeyHandler(ctx: InspectorLifecycleCtx) {
  return (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === 'k') {
      e.preventDefault();
      if (ctx.getShowShortcuts()) ctx.setShowShortcuts(false);
      else ctx.openShortcuts();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && k === 'f') {
      e.preventDefault();
      ctx.focusQueryInput();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && k === 's') {
      e.preventDefault();
      ctx.openSchema();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && k === 'r') {
      e.preventDefault();
      ctx.openRecipes();
      return;
    }
    if (e.key === 'Escape') {
      if (ctx.getShowRowDrawer()) {
        e.preventDefault();
        ctx.closeRowDrawer();
        return;
      }
      if (ctx.getShowShortcuts()) {
        e.preventDefault();
        ctx.setShowShortcuts(false);
      }
    }
  };
}

function createInspectorContextMenuHandler(ctx: InspectorLifecycleCtx) {
  return (e: Event) => {
    const detail = (e as CustomEvent<{ scope: string; id: string }>).detail;
    if (!detail || detail.scope !== 'inspector') return;
    const id = detail.id;
    if (id === 'load_stream') return void ctx.openStreamLoadFromMenu();
    if (id === 'load_fallback') return ctx.openFallbackLoadFromMenu();
    if (id === 'open_schema') return ctx.openSchema();
    if (id === 'open_recipes') return ctx.openRecipes();
    if (id === 'toggle_regex_help') return ctx.toggleRegexHelp();
    if (id === 'open_regex_generator') return ctx.openRegexGenerator();
    if (id === 'open_builder') return ctx.openBuilder();
    if (id === 'open_column_picker') return ctx.openColumnPicker();
    if (id === 'open_shortcuts') return ctx.openShortcuts();
    if (id === 'clear_all_filters') return ctx.clearAllFilters();
    if (id === 'rerun_schema') return void ctx.computeSchemaStats();
    if (id === 'export_analysis_bundle') return ctx.exportAnalysisBundle();
    if (id === 'toggle_quiet_logs') return ctx.toggleQuietBackendLogs();
    if (id === 'toggle_auto_restore') return ctx.toggleAutoRestoreEnabled();
    if (id === 'export_current_view') return void ctx.exportCsvPreset('current_view');
    if (id === 'export_filtered_rows') return void ctx.exportCsvPreset('filtered_rows');
    if (id === 'export_selected_columns') return void ctx.exportCsvPreset('selected_columns');
  };
}

export function mountInspectorLifecycle(ctx: InspectorLifecycleCtx): () => void {
  void ctx.invoke('inspector_debug_log_clear')
    .then((p) => {
      ctx.setDebugLogPath(String(p ?? ''));
      ctx.queueDebug('sessionStart', { debugLogPath: String(p ?? ''), ts: Date.now() });
    })
    .catch(() => {});

  const resizeObserverNoiseGuard = (e: any) => {
    try {
      const msg = String(e?.message ?? '');
      if (!msg.includes('ResizeObserver loop')) return;
      e?.stopImmediatePropagation?.();
      e?.preventDefault?.();
    } catch {}
  };
  window.addEventListener('error', resizeObserverNoiseGuard);

  const unhandledRejectionHandler = (e: PromiseRejectionEvent) => {
    ctx.queueDebug('unhandledrejection', { reason: String((e as any)?.reason ?? 'unknown') });
  };
  window.addEventListener('unhandledrejection', unhandledRejectionHandler);

  try {
    const isTauri = typeof window !== 'undefined' && (!!(window as any).__TAURI__ || !!(window as any).__TAURI_INTERNALS__);
    ctx.setIsTauri(isTauri);
  } catch {
    ctx.setIsTauri(false);
  }
  try {
    const reduced = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && !!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ctx.setPrefersReducedMotion(reduced);
    ctx.setUiAnimDur(reduced ? 0 : 160);
  } catch {
    ctx.setPrefersReducedMotion(false);
    ctx.setUiAnimDur(160);
  }

  (async () => {
    try {
      const mod = await import(/* @vite-ignore */ '@tauri-apps/plugin-dialog');
      ctx.setDialogModule(mod);
      ctx.setCanOpenPath(true);
    } catch {
      ctx.setCanOpenPath(false);
      ctx.setDialogModule(null);
    }
  })();

  void ctx.invoke('inspector_set_quiet_logs', { quiet: !!ctx.getQuietBackendLogs() }).catch(() => {});

  const onKey = createInspectorKeyHandler(ctx);
  const onContextMenuCommand = createInspectorContextMenuHandler(ctx);
  window.addEventListener('keydown', onKey);
  window.addEventListener(CONTEXT_MENU_COMMAND_EVENT, onContextMenuCommand as EventListener);

  return () => {
    window.removeEventListener('error', resizeObserverNoiseGuard);
    window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener(CONTEXT_MENU_COMMAND_EVENT, onContextMenuCommand as EventListener);
    clearContextMenu('inspector');
    void ctx.debugLogger.flush();
  };
}
