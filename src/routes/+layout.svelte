<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { AppBar } from '@skeletonlabs/skeleton-svelte';
  import { cn } from '$lib/utils';

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
  const active = (p: string) => pathname === p;
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
        <nav class="flex flex-wrap items-center justify-center gap-1">
          {#each nav as item}
            <a
              href={item.href}
              class={cn(
                'rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-300',
                active(item.path)
                  ? 'bg-white/10 text-white shadow-inner shadow-white/5 border border-white/10'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              )}
            >
              {item.label}
            </a>
          {/each}
        </nav>
      </AppBar.Headline>

      <AppBar.Trail>
        <div class="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
      </AppBar.Trail>
    </AppBar.Toolbar>
  </AppBar>

  <div class="mx-auto max-w-7xl px-4 py-6 pb-20">
    {@render children()}
  </div>
</div>
