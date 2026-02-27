<script lang="ts">
  import { tick } from 'svelte';

  type SurfaceCommand = {
    id: string;
    label: string;
    keywords: string;
    run: () => void;
  };

  export let open = false;
  export let commands: SurfaceCommand[] = [];
  export let onClose: () => void = () => {};

  let query = '';
  let filtered: SurfaceCommand[] = [];
  let activeIndex = 0;
  let searchInput: HTMLInputElement | null = null;

  $: filtered = commands.filter((command) => {
    const hay = `${command.label} ${command.keywords}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });
  $: if (activeIndex >= filtered.length) activeIndex = 0;
  $: if (!open) {
    query = '';
    activeIndex = 0;
  }
  $: if (open) {
    void tick().then(() => searchInput?.focus());
  }

  const runActive = () => {
    const command = filtered[activeIndex];
    if (!command) return;
    command.run();
    onClose();
  };
</script>

{#if open}
  <div
    class="fixed inset-0 z-[380] bg-black/45 backdrop-blur-[1px] flex items-start justify-center pt-[14vh]"
    role="dialog"
    tabindex="0"
    aria-label="Surface command palette"
    onpointerdown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
    onkeydown={(event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        activeIndex = Math.min(filtered.length - 1, activeIndex + 1);
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        activeIndex = Math.max(0, activeIndex - 1);
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        runActive();
      }
    }}
  >
    <div class="w-[680px] max-w-[94vw] rounded-2xl border border-cyan-300/25 bg-slate-950/96 shadow-2xl overflow-hidden">
      <div class="px-4 py-3 border-b border-white/10">
        <input
          bind:this={searchInput}
          class="input input-sm glass-input w-full"
          placeholder="Search commands..."
          bind:value={query}
        />
      </div>
      <div class="max-h-[46vh] overflow-auto p-2">
        {#if filtered.length === 0}
          <div class="px-3 py-8 text-center text-sm text-white/45">No commands match your query.</div>
        {:else}
          {#each filtered as command, idx (command.id)}
            <button
              class={idx === activeIndex ? 'w-full text-left px-3 py-2 rounded-lg bg-cyan-500/20 border border-cyan-300/30 text-cyan-100' : 'w-full text-left px-3 py-2 rounded-lg hover:bg-white/6 text-white/80'}
              onclick={() => {
                activeIndex = idx;
                runActive();
              }}
            >
              {command.label}
            </button>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}
