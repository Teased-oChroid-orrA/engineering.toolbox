<script lang="ts">
  console.log('[LAYOUT] Script block executing');
  import '../app.css';
  import '$lib/styles/themes.css';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { themeStore } from '$lib/stores/themeStore';
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

  console.log('[LAYOUT] Imports complete');

  let { children } = $props();

  const nav = [
    { href: '#/', label: 'Home', path: '/' },
    { href: '#/bushing', label: 'Bushing', path: '/bushing' },
    { href: '#/shear', label: 'Shear', path: '/shear' },
    { href: '#/profile', label: 'Profile', path: '/profile' },
    { href: '#/properties', label: 'Properties', path: '/properties' },
    { href: '#/buckling', label: 'Buckling', path: '/buckling' },
	{ href: '#/inspector', label: 'Inspector', path: '/inspector' },
	{ href: '#/surface', label: 'Surface', path: '/surface' }
  ];

  let pathname = $derived($page.url.pathname);
  let hash = $derived($page.url.hash);
  let routePath = $derived.by(() => {
    // Extract path from hash (e.g., '#/inspector' -> '/inspector')
    const hashPath = hash.startsWith('#/') ? hash.slice(1) : '';
    const result = hashPath || pathname;
    console.log('[LAYOUT] routePath derived:', result, '(hash:', hash, 'hashPath:', hashPath, 'pathname:', pathname, ')');
    return result;
  });
  const active = (p: string) => routePath === p;
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
  let activeScope = $derived.by(() => {
    const scope = pathToScope(routePath);
    console.log('[LAYOUT] activeScope derived:', scope, '(routePath:', routePath, ')');
    return scope;
  });
  let activeToolMenu = $derived.by(() => {
    const menu = activeScope ? menuByScope[activeScope] ?? null : null;
    console.log('[LAYOUT] activeToolMenu derived:', menu ? 'MENU FOUND' : 'NULL', '(activeScope:', activeScope, ')');
    return menu;
  });

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
    console.log('[LAYOUT] onMount called - setting up listeners');
    themeStore.init();
    console.log('[LAYOUT] Reading registered menus from registry...');
    // Use setTimeout to ensure child components have mounted and registered
    setTimeout(() => {
      menuByScope = getRegisteredContextMenus();
      console.log('[LAYOUT] menuByScope initialized to:', menuByScope);
      console.log('[LAYOUT] activeScope:', activeScope);
      console.log('[LAYOUT] activeToolMenu:', activeToolMenu);
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
      console.log('[LAYOUT] onMenuRegister called, event:', ev);
      const reg = (ev as CustomEvent<ContextMenuRegistration>).detail;
      console.log('[LAYOUT] Registration detail:', reg);
      if (!reg?.scope) {
        console.log('[LAYOUT] No scope, returning');
        return;
      }
      const prev = menuByScope[reg.scope];
      console.log('[LAYOUT] Previous menu:', prev);
      if (prev && JSON.stringify(prev) === JSON.stringify(reg)) {
        console.log('[LAYOUT] Menu unchanged, skipping update');
        return;
      }
      console.log('[LAYOUT] Updating menuByScope for scope:', reg.scope);
      menuByScope = { ...menuByScope, [reg.scope]: reg };
      console.log('[LAYOUT] menuByScope updated:', menuByScope);
    };
    const onMenuClear = (ev: Event) => {
      const detail = (ev as CustomEvent<{ scope: ContextMenuScope }>).detail;
      if (!detail?.scope) return;
      const next = { ...menuByScope };
      delete next[detail.scope];
      menuByScope = next;
      if (activeScope === detail.scope) toolMenuOpen = false;
    };
    window.addEventListener('pointerdown', onPointer, true);
    console.log('[LAYOUT] Adding CONTEXT_MENU_REGISTER_EVENT listener');
    window.addEventListener(CONTEXT_MENU_REGISTER_EVENT, onMenuRegister as EventListener);
    window.addEventListener(CONTEXT_MENU_CLEAR_EVENT, onMenuClear as EventListener);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    console.log('[LAYOUT] All event listeners registered');
    return () => {
      ro.disconnect();
      window.removeEventListener('pointerdown', onPointer, true);
      window.removeEventListener('hashchange', syncHashPath);
      window.removeEventListener(CONTEXT_MENU_REGISTER_EVENT, onMenuRegister as EventListener);
      window.removeEventListener(CONTEXT_MENU_CLEAR_EVENT, onMenuClear as EventListener);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  });
</script>

<svelte:head>
  <title>Structural Companion Desktop</title>
</svelte:head>

<div class="min-h-screen text-white">
  <AppBar class="sticky top-4 z-50 mx-4 mt-4 rounded-2xl glass-panel shadow-2xl">
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

  <div class="mx-auto max-w-7xl px-4 py-6 pb-20">
    {@render children()}
  </div>
</div>
