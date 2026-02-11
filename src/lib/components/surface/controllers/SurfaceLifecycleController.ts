import { clearContextMenu, CONTEXT_MENU_COMMAND_EVENT } from '$lib/navigation/contextualMenu';
import { handleSurfaceNavMenuCommand, type SurfaceNavMenuContext } from './SurfaceNavMenuController';

type SurfaceLifecycleCtx = SurfaceNavMenuContext & {
  getLastAction: () => string;
  undo: () => void;
  redo: () => void;
};

function mountSurfaceDevErrorLogger(getLastAction: () => string) {
  if (!import.meta.env.DEV || typeof window === 'undefined') return;
  const w = window as any;
  if (w.__scSurfaceErrLoggerPatched) return;
  w.__scSurfaceErrLoggerPatched = true;
  const safeLog = (...args: any[]) => {
    try {
      // eslint-disable-next-line no-console
      console.error(...args);
    } catch {}
  };
  window.addEventListener('error', (ev: ErrorEvent) => {
    safeLog('[SC][SurfaceToolbox][error]', { file: ev.filename, line: ev.lineno, col: ev.colno }, 'lastAction=', getLastAction());
    if (ev.error?.stack) safeLog(ev.error.stack);
  });
  window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
    const r: any = (ev as any).reason;
    safeLog('[SC][SurfaceToolbox][unhandledrejection]', 'lastAction=', getLastAction());
    if (r?.stack) safeLog(r.stack);
    else safeLog(r);
  });
}

export function mountSurfaceGlobalHandlers(ctx: SurfaceLifecycleCtx): () => void {
  mountSurfaceDevErrorLogger(ctx.getLastAction);
  const onKey = (e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const key = e.key.toLowerCase();
    if (key === 'z' && !e.shiftKey) {
      e.preventDefault();
      ctx.undo();
    } else if (key === 'z' && e.shiftKey) {
      e.preventDefault();
      ctx.redo();
    } else if (key === 'y') {
      e.preventDefault();
      ctx.redo();
    }
  };

  const onContextMenuCommand = (e: Event) => {
    const detail = (e as CustomEvent<{ scope: string; id: string }>).detail;
    if (!detail || detail.scope !== 'surface') return;
    handleSurfaceNavMenuCommand(ctx, detail.id);
  };

  window.addEventListener('keydown', onKey);
  window.addEventListener(CONTEXT_MENU_COMMAND_EVENT, onContextMenuCommand as EventListener);

  return () => {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener(CONTEXT_MENU_COMMAND_EVENT, onContextMenuCommand as EventListener);
    clearContextMenu('surface');
  };
}
