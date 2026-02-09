<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { fly, fade, scale } from 'svelte/transition';
  import { Input, Button } from '$lib/components/ui';

  export let open = false;
  export let nav: Array<{ href: string; label: string; hint?: string }>
    = [];

  let query = '';
  let inputEl: HTMLInputElement | null = null;
  let active = 0;

  $: items = nav
    .map((n) => ({ ...n, _k: `${n.label} ${n.hint ?? ''}`.toLowerCase() }))
    .filter((n) => n._k.includes(query.trim().toLowerCase()));

  async function focusInput() {
    await tick();
    inputEl?.focus();
    inputEl?.select();
  }

  $: if (open) {
    query = '';
    active = 0;
    if (typeof window !== 'undefined') focusInput();
  }

  function go(item: { href: string }) {
    if (typeof window !== 'undefined') {
      window.location.hash = item.href.replace(/^#/, '');
    }
    open = false;
  }

  function onKey(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, items.length - 1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); }
    if (e.key === 'Enter') { e.preventDefault(); if (items[active]) go(items[active]); }
    if (e.key === 'Escape') { e.preventDefault(); open = false; }
  }

  onMount(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
</script>

{#if open}
  <div class="fixed inset-0 z-[100]" aria-modal="true" role="dialog">
    <div class="absolute inset-0 bg-black/50" in:fade={{ duration: 120 }} out:fade={{ duration: 100 }} on:click={() => (open = false)} />

    <div class="absolute inset-0 flex items-start justify-center p-4 pt-20">
      <div
        class="w-full max-w-xl sc-surface overflow-hidden"
        in:fly={{ y: 14, duration: 140 }}
        out:fly={{ y: 10, duration: 110 }}
      >
        <div class="p-3 border-b border-white/10 bg-black/20">
          <Input
            bind:this={inputEl}
            placeholder="Search toolboxes, commands…"
            value={query}
            on:input={(e) => (query = (e.detail ?? '') as string)}
            className="h-10"
          />
          <div class="mt-2 text-[11px] sc-muted">Enter to open • Esc to close • ↑/↓ to navigate</div>
        </div>

        <div class="max-h-[360px] overflow-auto">
          {#if items.length === 0}
            <div class="p-5 text-sm sc-muted">No matches.</div>
          {:else}
			{#each items as item, i (item.href)}
				<button
					class={
						`w-full text-left px-4 py-3 border-b border-white/5 transition-colors hover:bg-white/5 ${
							i === active ? 'bg-white/10' : ''
						}`
					}
					on:mouseenter={() => (active = i)}
					on:click={() => go(item)}
				>
                <div class="text-sm font-medium tracking-tight text-white/90">{item.label}</div>
                {#if item.hint}
                  <div class="text-xs sc-muted">{item.hint}</div>
                {/if}
              </button>
            {/each}
          {/if}
        </div>

        <div class="p-3 flex items-center justify-end gap-2 bg-black/10">
          <Button variant="ghost" className="border border-white/10 bg-white/5 hover:bg-white/10" on:click={() => (open = false)}>
            Close
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}
