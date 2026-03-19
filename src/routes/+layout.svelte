<script lang="ts">
  import '../app.css';
  import '$lib/styles/themes.css';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { themeStore } from '$lib/stores/themeStore';
  import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte';
  import { toolboxProgress } from '$lib/stores/toolboxProgress';
  import { safeModeStore } from '$lib/stores/safeModeStore';
  import { AppBar } from '@skeletonlabs/skeleton-svelte';
  import { cn } from '$lib/utils';
  import {
    CONTEXT_MENU_CLEAR_EVENT,
    CONTEXT_MENU_REGISTER_EVENT,
    emitContextMenuCommand,
    getRegisteredContextMenus,
    type ContextMenuRegistration,
    type ContextMenuScope
  } from '$lib/navigation/contextualMenu';

  let { children } = $props();

  const nav = [
    { href: '#/', label: 'Home', path: '/' },
    { href: '#/bushing', label: 'Bushing', path: '/bushing' },
    { href: '#/preload', label: 'Preload', path: '/preload' },
    { href: '#/shear', label: 'Shear', path: '/shear' },
    { href: '#/profile', label: 'Profile', path: '/profile' },
    { href: '#/properties', label: 'Properties', path: '/properties' },
    { href: '#/buckling', label: 'Buckling', path: '/buckling' },
    { href: '#/weight-balance', label: 'W&B', path: '/weight-balance' },
	{ href: '#/inspector', label: 'Inspector', path: '/inspector' },
	{ href: '#/surface', label: 'Surface', path: '/surface' }
  ];

  let pathname = $derived(page.url.pathname);
  let hash = $derived(page.url.hash);
  let routePath = $derived.by(() => {
    // Extract path from hash (e.g., '#/inspector' -> '/inspector')
    const hashPath = hash.startsWith('#/') ? hash.slice(1) : '';
    return hashPath || pathname;
  });
  const active = (p: string) => routePath === p;
  const routeReadyKey = (route: string): string => {
    const normalized = normalizeRoute(route);
    if (normalized === '/') return 'dashboard';
    return normalized.replace(/^\//, '') || 'dashboard';
  };
  const pathToScope = (p: string): ContextMenuScope | null => {
    if (p.startsWith('/inspector')) return 'inspector';
    if (p.startsWith('/surface')) return 'surface';
    if (p.startsWith('/bushing')) return 'bushing';
    return null;
  };
  let navHost = $state<HTMLElement | null>(null);
  let compactNav = $state(false);
  let navMenuOpen = $state(false);
  let toolMenuOpen = $state(false);
  let toolMenuButtonEl = $state<HTMLElement | null>(null);
  let toolMenuPos = $state({ x: 8, y: 8 });
  let menuByScope = $state<Partial<Record<ContextMenuScope, ContextMenuRegistration>>>({});
  let activeScope = $derived(pathToScope(routePath));
  let activeToolMenu = $derived(activeScope ? menuByScope[activeScope] ?? null : null);
  let lastProgressRoute = $state('');
  let routeProgressToken = $state(0);
  let startupNotice = $state<{ open: boolean; text: string }>({ open: false, text: '' });
  let startupHealth = $state<{
    elapsedMs: number;
    shellMounted: boolean;
    appReady: boolean;
    splashFinished: boolean;
    shellMountedElapsedMs: number | null;
    appReadyElapsedMs: number | null;
    splashFinishedElapsedMs: number | null;
    lastProgress: number;
    lastMessage: string;
    watchdogForcedShow: boolean;
    watchdogForceCount: number;
    mainWindowVisible: boolean | null;
    pid: number;
    executablePath: string | null;
  } | null>(null);
  let showStartupHealth = $state(false);
  let safeModeRedirected = $state(false);
  let shellHidden = $state(false);
  let shellPinned = $state(false);
  let shellHoverReady = $state(false);
  let lastScrollY = $state(0);

  type RouteBootProfile = {
    steps: [string, string, string];
    messages: [string, string, string];
    done: string;
    selectors: string[];
  };

  type RouteReadiness = {
    ready: boolean;
    rootPresent: boolean;
    contentReady: boolean;
    missingSelectors: string[];
    pendingLabel: string;
  };

  const normalizeRoute = (route: string) => {
    if (!route) return '/';
    if (route.length > 1 && route.endsWith('/')) return route.slice(0, -1);
    return route;
  };

  const routeProfile = (route: string, label: string): RouteBootProfile => {
    const table: Record<string, RouteBootProfile> = {
      '/': {
        steps: ['Resolve dashboard route', 'Restore dashboard state', 'Render dashboard panels'],
        messages: ['Resolving dashboard route...', 'Restoring dashboard state...', 'Rendering dashboard panels...'],
        done: 'Dashboard ready.',
        selectors: ['[data-route-ready="dashboard"]']
      },
      '/bushing': {
        steps: ['Resolve bushing route', 'Initialize bushing engine', 'Render bushing workspace'],
        messages: ['Resolving bushing route...', 'Initializing bushing analysis engine...', 'Rendering bushing workspace...'],
        done: 'Bushing ready.',
        selectors: ['[data-route-ready="bushing"]']
      },
      '/preload': {
        steps: ['Resolve preload route', 'Initialize preload solver', 'Render preload workspace'],
        messages: ['Resolving preload route...', 'Initializing preload solver...', 'Rendering preload workspace...'],
        done: 'Preload ready.',
        selectors: ['[data-route-ready="preload"]']
      },
      '/shear': {
        steps: ['Resolve shear route', 'Initialize shear model', 'Render shear workspace'],
        messages: ['Resolving shear route...', 'Initializing shear model...', 'Rendering shear workspace...'],
        done: 'Shear ready.',
        selectors: ['[data-route-ready="shear"]']
      },
      '/profile': {
        steps: ['Resolve profile route', 'Initialize profile kernel', 'Render profile workspace'],
        messages: ['Resolving profile route...', 'Initializing profile kernel...', 'Rendering profile workspace...'],
        done: 'Profile ready.',
        selectors: ['[data-route-ready="profile"]']
      },
      '/properties': {
        steps: ['Resolve properties route', 'Initialize properties kernel', 'Render properties workspace'],
        messages: ['Resolving properties route...', 'Initializing properties kernel...', 'Rendering properties workspace...'],
        done: 'Properties ready.',
        selectors: ['[data-route-ready="properties"]']
      },
      '/buckling': {
        steps: ['Resolve buckling route', 'Initialize buckling model', 'Render buckling workspace'],
        messages: ['Resolving buckling route...', 'Initializing buckling model...', 'Rendering buckling workspace...'],
        done: 'Buckling ready.',
        selectors: ['[data-route-ready="buckling"]']
      },
      '/weight-balance': {
        steps: ['Resolve weight & balance route', 'Initialize loading model', 'Render W&B workspace'],
        messages: ['Resolving weight and balance route...', 'Initializing loading model...', 'Rendering weight and balance workspace...'],
        done: 'Weight and balance ready.',
        selectors: ['[data-route-ready="weight-balance"]']
      },
      '/inspector': {
        steps: ['Resolve inspector route', 'Initialize inspector datasets', 'Render inspector workspace'],
        messages: ['Resolving inspector route...', 'Initializing inspector datasets...', 'Rendering inspector workspace...'],
        done: 'Inspector ready.',
        selectors: ['[data-route-ready="inspector"]']
      },
      '/surface': {
        steps: ['Resolve surface route', 'Initialize surface model', 'Render surface workspace'],
        messages: ['Resolving surface route...', 'Initializing surface model...', 'Rendering surface workspace...'],
        done: 'Surface ready.',
        selectors: ['[data-route-ready="surface"]']
      },
      '/suite': {
        steps: ['Resolve suite route', 'Initialize suite modules', 'Render suite workspace'],
        messages: ['Resolving suite route...', 'Initializing suite modules...', 'Rendering suite workspace...'],
        done: 'Suite ready.',
        selectors: ['[data-route-ready="suite"]']
      }
    };
    const normalized = normalizeRoute(route);
    return (
      table[normalized] ?? {
        steps: ['Resolve toolbox route', 'Hydrate toolbox state', 'Render toolbox workspace'],
        messages: ['Resolving toolbox route...', 'Hydrating toolbox state...', 'Rendering toolbox workspace...'],
        done: `${label} ready.`,
        selectors: ['#app-content-root']
      }
    );
  };

  const describeSelector = (selector: string): string =>
    selector
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(\[data-route-ready=")([^"]+)("\])$/, '$2 route marker');

  const getRouteReadiness = (selectors: string[]): RouteReadiness => {
    if (typeof document === 'undefined') {
      return {
        ready: false,
        rootPresent: false,
        contentReady: false,
        missingSelectors: ['document'],
        pendingLabel: 'Waiting for browser document'
      };
    }
    const root = document.getElementById('app-content-root');
    const rootPresent = Boolean(root);
    if (!rootPresent || !root) {
      return {
        ready: false,
        rootPresent: false,
        contentReady: false,
        missingSelectors: ['app content root'],
        pendingLabel: 'Waiting for app content root'
      };
    }
    const contentReady = root.childElementCount > 0;
    if (!contentReady) {
      return {
        ready: false,
        rootPresent: true,
        contentReady: false,
        missingSelectors: ['route content mount'],
        pendingLabel: 'Waiting for route content mount'
      };
    }
    const missingSelectors = selectors
      .filter((selector) => !document.querySelector(selector))
      .map((selector) => describeSelector(selector));
    return {
      ready: missingSelectors.length === 0,
      rootPresent: true,
      contentReady: true,
      missingSelectors,
      pendingLabel:
        missingSelectors.length > 0
          ? `Waiting for ${missingSelectors.length} route hook${missingSelectors.length === 1 ? '' : 's'}`
          : 'Route hooks ready'
    };
  };

  const positionToolMenu = () => {
    const panelWidth = 288;
    const margin = 8;
    const r = toolMenuButtonEl?.getBoundingClientRect();
    if (!r) {
      toolMenuPos = { x: margin, y: margin };
      return;
    }
    const x = Math.max(margin, Math.min(r.left, window.innerWidth - panelWidth - margin));
    const y = Math.max(margin, r.bottom + 8);
    toolMenuPos = { x: Math.round(x), y: Math.round(y) };
  };

  onMount(() => {
    let tauriInvoke: ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null = null;
    let healthTimer: ReturnType<typeof setInterval> | null = null;
    let healthTickInFlight = false;
    const sendStartupHealthEvent = async (event: string, progress?: number, message?: string) => {
      if (!tauriInvoke) return;
      try {
        await tauriInvoke('startup_health_event', {
          event,
          progress: typeof progress === 'number' ? Math.max(0, Math.min(100, Math.round(progress))) : undefined,
          message
        });
      } catch {
        // best-effort telemetry
      }
    };
    const updateShellVisibility = () => {
      const y = window.scrollY || 0;
      if (shellPinned) {
        lastScrollY = y;
        return;
      }
      if (y < 80) {
        shellHidden = false;
        shellHoverReady = false;
        lastScrollY = y;
        return;
      }
      const delta = y - lastScrollY;
      if (delta > 10) {
        if (!shellHidden) shellHoverReady = false;
        shellHidden = true;
      } else if (delta < -10) {
        shellHidden = false;
        shellHoverReady = false;
      }
      lastScrollY = y;
    };
    const armShellHover = (ev: PointerEvent) => {
      if (!shellHidden) return;
      if (ev.clientY > 32) shellHoverReady = true;
    };
    lastScrollY = typeof window !== 'undefined' ? window.scrollY || 0 : 0;
    window.addEventListener('scroll', updateShellVisibility, { passive: true });
    window.addEventListener('pointermove', armShellHover, { passive: true });
    const fetchStartupHealth = async () => {
      if (!tauriInvoke || healthTickInFlight) return;
      healthTickInFlight = true;
      try {
        const snap = (await tauriInvoke('startup_health_get')) as typeof startupHealth;
        startupHealth = snap;
      } catch {
        // ignore when not running in tauri context
      } finally {
        healthTickInFlight = false;
      }
    };
    const unsubscribeProgress = toolboxProgress.subscribe((state) => {
      if (typeof window === 'undefined') return;
      if (!state.visible) return;
      const totalSteps = state.steps.length;
      const runningIdx = state.steps.findIndex((step) => step.status === 'running');
      const doneCount = state.steps.filter((step) => step.status === 'done' || step.status === 'failed').length;
      const activeIdx = runningIdx >= 0 ? runningIdx : Math.max(0, doneCount - 1);
      const activeLabel = state.steps[activeIdx]?.label ?? 'Loading';
      const stepPrefix = totalSteps > 0 ? `Step ${Math.min(activeIdx + 1, totalSteps)}/${totalSteps}` : 'Step';
      window.dispatchEvent(
        new CustomEvent('app-progress', {
          detail: {
            progress: Math.max(12, Math.min(100, state.progress)),
            message: state.message || `Loading ${state.scope}...`,
            stepPrefix,
            activeLabel,
            steps: state.steps
          }
        })
      );
      void sendStartupHealthEvent('app-progress', state.progress, state.message);
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('app-shell-mounted'));
      window.dispatchEvent(
        new CustomEvent('app-progress', {
          detail: { progress: 38, message: 'Mounting navigation and toolbars...' }
        })
      );
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('app-progress', {
            detail: { progress: 52, message: 'Hydrating toolbox state...' }
          })
        );
      }, 120);
      const onWatchdogEvent = (ev: Event) => {
        const detail = (ev as CustomEvent<{ event?: string; visible?: boolean }>).detail;
        if (!detail) return;
        startupNotice = {
          open: true,
          text: `Startup watchdog: ${detail.event ?? 'signal'}${detail.visible == null ? '' : ` · window visible=${detail.visible}`}`
        };
      };
      window.addEventListener('startup-watchdog', onWatchdogEvent as EventListener);
      setTimeout(() => window.removeEventListener('startup-watchdog', onWatchdogEvent as EventListener), 30000);
    }

    themeStore.init();
    safeModeStore.init();
    void import('@tauri-apps/api/core')
      .then((mod) => {
        tauriInvoke = mod.invoke;
        void fetchStartupHealth();
        healthTimer = setInterval(fetchStartupHealth, 1200);
      })
      .catch(() => {
        tauriInvoke = null;
      });
    // Use setTimeout to ensure child components have mounted and registered
    setTimeout(() => {
      menuByScope = getRegisteredContextMenus();
    }, 0);
    const update = () => {
      const width = navHost?.clientWidth ?? 0;
      compactNav = width > 0 && width < 900;
      if (!compactNav) navMenuOpen = false;
      if (toolMenuOpen) positionToolMenu();
    };
    update();
    const ro = new ResizeObserver(() => update());
    if (navHost) ro.observe(navHost);
    const onPointer = (ev: PointerEvent) => {
      const el = ev.target as HTMLElement | null;
      if (el?.closest?.('[data-main-nav-root]')) return;
      navMenuOpen = false;
      toolMenuOpen = false;
    };
    const onMenuRegister = (ev: Event) => {
      const reg = (ev as CustomEvent<ContextMenuRegistration>).detail;
      if (!reg?.scope) return;
      const prev = menuByScope[reg.scope];
      if (prev && JSON.stringify(prev) === JSON.stringify(reg)) return;
      menuByScope = { ...menuByScope, [reg.scope]: reg };
    };
    const onMenuClear = (ev: Event) => {
      const detail = (ev as CustomEvent<{ scope: ContextMenuScope }>).detail;
      if (!detail?.scope) return;
      const next = { ...menuByScope };
      delete next[detail.scope];
      menuByScope = next;
      if (activeScope === detail.scope) toolMenuOpen = false;
    };
    const onBootOverlayFinished = (ev: Event) => {
      const detail = (ev as CustomEvent<{ elapsedMs?: number; phase?: string; diagnostics?: string }>).detail ?? {};
      const elapsed = typeof detail.elapsedMs === 'number' ? `${(detail.elapsedMs / 1000).toFixed(1)}s` : 'n/a';
      startupNotice = {
        open: true,
        text: `Startup handoff complete in ${elapsed}. ${detail.phase ?? ''} ${detail.diagnostics ?? ''}`.trim()
      };
      setTimeout(() => {
        startupNotice = { open: false, text: '' };
      }, 5200);
      void sendStartupHealthEvent('boot-overlay-finished', 100, detail.diagnostics ?? 'Boot overlay finished');
    };
    const onShellMounted = () => {
      void sendStartupHealthEvent('app-shell-mounted', 72, 'UI shell mounted');
    };
    const onAppReady = () => {
      void sendStartupHealthEvent('app-ready', 100, 'Route ready');
    };
    window.addEventListener('pointerdown', onPointer, true);
    window.addEventListener(CONTEXT_MENU_REGISTER_EVENT, onMenuRegister as EventListener);
    window.addEventListener(CONTEXT_MENU_CLEAR_EVENT, onMenuClear as EventListener);
    window.addEventListener('boot-overlay-finished', onBootOverlayFinished as EventListener);
    window.addEventListener('app-shell-mounted', onShellMounted as EventListener);
    window.addEventListener('app-ready', onAppReady as EventListener);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      unsubscribeProgress();
      if (healthTimer) clearInterval(healthTimer);
      ro.disconnect();
      window.removeEventListener('pointerdown', onPointer, true);
      window.removeEventListener(CONTEXT_MENU_REGISTER_EVENT, onMenuRegister as EventListener);
      window.removeEventListener(CONTEXT_MENU_CLEAR_EVENT, onMenuClear as EventListener);
      window.removeEventListener('boot-overlay-finished', onBootOverlayFinished as EventListener);
      window.removeEventListener('app-shell-mounted', onShellMounted as EventListener);
      window.removeEventListener('app-ready', onAppReady as EventListener);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('pointermove', armShellHover);
    };
  });

  $effect(() => {
    if (typeof window === 'undefined') return;
    const safeMode = $safeModeStore;
    document.body.setAttribute('data-safe-mode', safeMode ? 'true' : 'false');
    if (!safeMode || safeModeRedirected) return;
    const normalizedRoute = normalizeRoute(routePath);
    if (normalizedRoute !== '/') {
      safeModeRedirected = true;
      window.location.hash = '#/';
      startupNotice = {
        open: true,
        text: 'Safe mode launch is active. Redirected to Home; heavy toolboxes load on demand.'
      };
      setTimeout(() => {
        startupNotice = { open: false, text: '' };
      }, 4500);
    }
  });

  $effect(() => {
    if (typeof window === 'undefined') return;
    const normalizedRoute = normalizeRoute(routePath);
    if (!normalizedRoute || normalizedRoute === lastProgressRoute) return;
    lastProgressRoute = normalizedRoute;
    const label = normalizedRoute === '/' ? 'Main Dashboard' : `${normalizedRoute.replace('/', '').toUpperCase()} Toolbox`;
    routeProgressToken += 1;
    const token = routeProgressToken;
    const profile = routeProfile(normalizedRoute, label);
    toolboxProgress.begin(label, profile.steps, profile.messages[0]);
    setTimeout(() => {
      if (routeProgressToken !== token) return;
      toolboxProgress.complete('step-1', profile.messages[0]);
    }, 45);
    setTimeout(() => {
      if (routeProgressToken !== token) return;
      toolboxProgress.complete('step-2', profile.messages[1]);
    }, 220);

    const started = Date.now();
    let lastHeartbeatMs = 0;
    let waitProgress = 88;
    const pollReady = () => {
      if (routeProgressToken !== token) return;
      const elapsedMs = Date.now() - started;
      const readiness = getRouteReadiness(profile.selectors);
      if (readiness.ready) {
        toolboxProgress.complete('step-3', profile.messages[2]);
        toolboxProgress.completeAll(profile.done, 280);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.dispatchEvent(new Event('app-ready'));
          });
        });
        return;
      }
      if (elapsedMs - lastHeartbeatMs >= 900) {
        lastHeartbeatMs = elapsedMs;
        waitProgress = Math.max(waitProgress, Math.min(95, 88 + Math.floor(elapsedMs / 2800)));
        const waitMessage =
          elapsedMs < 14000
            ? `Waiting for toolbox hooks (${(elapsedMs / 1000).toFixed(1)}s)...`
            : `Still waiting for toolbox hooks (${(elapsedMs / 1000).toFixed(1)}s)...`;
        const missing = readiness.missingSelectors.slice(0, 3);
        const missingText = missing.length > 0 ? missing.join(' • ') : readiness.pendingLabel;
        window.dispatchEvent(
          new CustomEvent('app-progress', {
            detail: {
              progress: waitProgress,
              message: waitMessage,
              stepPrefix: 'Step 3/3',
              activeLabel: readiness.pendingLabel,
              waitElapsedMs: elapsedMs,
              waitMissing: missing,
              waitMissingText: missingText,
              waitRootPresent: readiness.rootPresent,
              waitContentReady: readiness.contentReady
            }
          })
        );
      }
      if (elapsedMs > 35000) {
        toolboxProgress.fail('step-3', 'Route startup exceeded expected time; finalizing.');
        toolboxProgress.completeAll(`${profile.done} (slow startup)`, 420);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.dispatchEvent(new Event('app-ready'));
          });
        });
        return;
      }
      setTimeout(pollReady, 180);
    };
    setTimeout(pollReady, 120);
  });
</script>

<svelte:head>
  <title>Structural Companion Desktop</title>
</svelte:head>

<div class="min-h-screen text-white">
  {#if shellHidden}
    <div
      class="fixed inset-x-0 top-0 z-[55] h-3"
      aria-hidden="true"
      onmouseenter={() => {
        if (!shellHoverReady) return;
        shellPinned = true;
        shellHidden = false;
        shellHoverReady = false;
      }}
    ></div>
  {/if}
  <AppBar
    class={cn(
      'fixed inset-x-0 top-0 z-50 mx-4 mt-2 rounded-2xl glass-panel shadow-2xl transition-[transform,opacity] duration-300 ease-out',
      shellHidden
        ? '-translate-y-[calc(100%+1.25rem)] opacity-0 pointer-events-none'
        : 'translate-y-0 opacity-100 pointer-events-auto'
    )}
    onmouseenter={() => {
      shellPinned = true;
      shellHidden = false;
      shellHoverReady = false;
    }}
    onmouseleave={() => {
      shellPinned = false;
      shellHidden = (window.scrollY || 0) > 80;
    }}
    onfocusin={() => {
      shellPinned = true;
      shellHidden = false;
      shellHoverReady = false;
    }}
    onfocusout={() => {
      shellPinned = false;
      shellHidden = (window.scrollY || 0) > 80;
    }}
  >
    <AppBar.Toolbar class="px-6 py-3 grid-cols-[auto_1fr_auto]">
      <AppBar.Lead>
        <div class="flex items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-500/30">SC</div>
          <div class="leading-none">
            <div class="font-semibold tracking-wide text-sm">Structural Companion</div>
            <div class="text-[10px] text-white/40 uppercase tracking-widest mt-1">Desktop • v3.3</div>
          </div>
        </div>
      </AppBar.Lead>

      <AppBar.Headline>
        <div class="relative w-full" bind:this={navHost} data-main-nav-root="true">
          {#if !compactNav}
            <nav class="flex flex-nowrap items-center justify-center gap-1">
              {#each nav as item}
                <a
                  href={item.href}
                  class={cn(
                    'rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-300 whitespace-nowrap',
                    active(item.path)
                      ? 'bg-white/10 text-white shadow-inner shadow-white/5 border border-white/10'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  )}
                >
                  {item.label}
                </a>
              {/each}
            </nav>
          {:else}
            <div class="flex items-center justify-center">
              <button
                class="btn btn-xs variant-soft rounded-full px-4 py-1.5 text-xs font-medium"
                onclick={() => (navMenuOpen = !navMenuOpen)}
              >
                Navigate ▾
              </button>
            </div>
            {#if navMenuOpen}
              <div class="absolute left-1/2 top-full mt-2 z-[1400] w-56 -translate-x-1/2 rounded-xl border border-white/10 bg-surface-900/95 p-2 shadow-2xl">
                {#each nav as item}
                  <a
                    href={item.href}
                    class={cn(
                      'block rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                      active(item.path)
                        ? 'bg-white/10 text-white border border-white/10'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    )}
                    onclick={() => (navMenuOpen = false)}
                  >
                    {item.label}
                  </a>
                {/each}
              </div>
            {/if}
          {/if}
        </div>
      </AppBar.Headline>

      <AppBar.Trail>
        <div class="flex items-center gap-2" data-main-nav-root="true">
          <ThemeToggle compact={true} />
          <button
            class={`btn btn-xs rounded-full px-3 py-1.5 text-xs font-medium ${$safeModeStore ? 'variant-soft border border-amber-300/40 text-amber-100' : 'variant-ghost text-white/70'}`}
            onclick={() => safeModeStore.toggle()}
          >
            Safe mode {$safeModeStore ? 'On' : 'Off'}
          </button>
          {#if activeToolMenu}
            <div class="relative">
              <button
                bind:this={toolMenuButtonEl}
                class="btn btn-xs variant-soft rounded-full px-3 py-1.5 text-xs font-medium"
                onclick={() => {
                  toolMenuOpen = !toolMenuOpen;
                  if (toolMenuOpen) positionToolMenu();
                }}
              >
                {activeToolMenu.label ?? 'Menu'} ▾
              </button>
              {#if toolMenuOpen}
                <div
                  class="fixed z-[1400] w-72 max-w-[calc(100vw-16px)] rounded-xl border border-white/10 bg-surface-900/95 p-2 shadow-2xl"
                  style={`left:${toolMenuPos.x}px; top:${toolMenuPos.y}px;`}
                >
                  {#each activeToolMenu.sections as section, sectionIdx}
                    {#if sectionIdx > 0}
                      <div class="my-1 h-px bg-white/10"></div>
                    {/if}
                    <div class="px-2 py-1 text-[10px] uppercase tracking-widest text-white/45">{section.title}</div>
                    {#each section.actions as action}
                      <button
                        class="w-full text-left px-2 py-1 rounded hover:bg-white/10 text-xs flex items-center justify-between"
                        disabled={action.disabled}
                        onclick={() => {
                          if (!activeScope || action.disabled) return;
                          emitContextMenuCommand(activeScope, action.id);
                          toolMenuOpen = false;
                        }}
                      >
                        <span>{action.label}</span>
                        {#if action.checked != null}
                          <span class={`text-[10px] ${action.checked ? 'text-emerald-300' : 'text-white/35'}`}>{action.checked ? 'ON' : 'OFF'}</span>
                        {/if}
                      </button>
                    {/each}
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
          <div class="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
        </div>
      </AppBar.Trail>
    </AppBar.Toolbar>
  </AppBar>

  <div class="mx-auto max-w-7xl px-4 pt-24">
  {#if $toolboxProgress.visible && $toolboxProgress.progress < 100}
    <div class="mt-2">
      <div class="rounded-xl border border-cyan-400/20 bg-surface-900/70 px-3 py-2 backdrop-blur">
        <div class="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest">
          <span class="text-cyan-200">Loading · {$toolboxProgress.scope}</span>
          <span class="font-mono text-white/80">{$toolboxProgress.progress}%</span>
        </div>
        <div class="h-1.5 w-full overflow-hidden rounded bg-white/10">
          <div
            class="h-full rounded bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 transition-all duration-300"
            style={`width:${$toolboxProgress.progress}%;`}
          ></div>
        </div>
        <div class="mt-1 flex items-center justify-between text-[11px] text-white/60">
          <span>{$toolboxProgress.message}</span>
          <span class="font-mono text-[10px] uppercase tracking-widest text-cyan-200/85">
            {#if $toolboxProgress.steps.length > 0}
              {#if $toolboxProgress.steps.findIndex((s) => s.status === 'running') >= 0}
                {@const idx = $toolboxProgress.steps.findIndex((s) => s.status === 'running')}
                Step {idx + 1}/{$toolboxProgress.steps.length}
              {:else}
                Step {$toolboxProgress.steps.length}/{$toolboxProgress.steps.length}
              {/if}
            {:else}
              Step
            {/if}
          </span>
        </div>
        {#if $toolboxProgress.steps.length > 0}
          <div class="mt-2 grid grid-cols-3 gap-1">
            {#each $toolboxProgress.steps as step}
              <div class="h-1 overflow-hidden rounded bg-white/10">
                <div
                  class={`h-full transition-all duration-300 ${
                    step.status === 'done'
                      ? 'w-full bg-emerald-400'
                      : step.status === 'failed'
                        ? 'w-full bg-rose-400'
                        : step.status === 'running'
                          ? 'w-3/5 bg-cyan-400'
                          : 'w-0 bg-transparent'
                  }`}
                ></div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
  {#if startupNotice.open}
    <div class="mt-2">
      <div class="rounded-xl border border-cyan-300/30 bg-surface-900/92 px-3 py-2 text-[11px] text-cyan-100 shadow-xl">
        <div class="mb-1 text-[10px] uppercase tracking-widest text-cyan-200/80">Startup Telemetry</div>
        <div>{startupNotice.text}</div>
      </div>
    </div>
  {/if}
  {#if startupHealth}
    <div class="mt-2">
      <div class="rounded-xl border border-indigo-300/20 bg-surface-900/88 px-3 py-2 text-[11px] text-indigo-100">
        <div class="mb-1 flex items-center justify-between">
          <div class="text-[10px] uppercase tracking-widest text-indigo-200/80">Startup Health</div>
          <button class="btn btn-xs variant-soft px-2 py-0.5 text-[10px]" onclick={() => (showStartupHealth = !showStartupHealth)}>
            {showStartupHealth ? 'Hide' : 'Show'}
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-3 text-[10px]">
          <span>elapsed {((startupHealth.elapsedMs ?? 0) / 1000).toFixed(1)}s</span>
          <span>shell {startupHealth.shellMounted ? 'yes' : 'no'}</span>
          <span>ready {startupHealth.appReady ? 'yes' : 'no'}</span>
          <span>splash {startupHealth.splashFinished ? 'done' : 'pending'}</span>
          <span>watchdog {startupHealth.watchdogForcedShow ? `force-show x${startupHealth.watchdogForceCount}` : 'idle'}</span>
          <span>window {startupHealth.mainWindowVisible == null ? 'unknown' : startupHealth.mainWindowVisible ? 'visible' : 'hidden'}</span>
        </div>
        {#if showStartupHealth}
          <div class="mt-2 grid gap-1 text-[10px] text-white/75">
            <div>last progress: {startupHealth.lastProgress}%</div>
            <div>last message: {startupHealth.lastMessage}</div>
            <div>shell mounted at: {startupHealth.shellMountedElapsedMs == null ? '—' : `${(startupHealth.shellMountedElapsedMs / 1000).toFixed(2)}s`}</div>
            <div>app ready at: {startupHealth.appReadyElapsedMs == null ? '—' : `${(startupHealth.appReadyElapsedMs / 1000).toFixed(2)}s`}</div>
            <div>splash finished at: {startupHealth.splashFinishedElapsedMs == null ? '—' : `${(startupHealth.splashFinishedElapsedMs / 1000).toFixed(2)}s`}</div>
            <div>pid: {startupHealth.pid}</div>
            <div class="truncate">exe: {startupHealth.executablePath ?? '—'}</div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <div
    id="app-content-root"
    data-route-ready={routeReadyKey(routePath)}
    class="py-6 pb-20"
  >
    {@render children()}
  </div>
  </div>
</div>
