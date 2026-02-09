<script lang="ts">
  import { computePosition, autoUpdate, offset, flip, shift } from '@floating-ui/dom';

  let {
    disabled = false,
    onBuilder = () => {},
    onRegexMode = () => {},
    onHelp = () => {},
    onGenerator = () => {},
    onRecipes = () => {}
  }: {
    disabled?: boolean;
    onBuilder?: () => void;
    onRegexMode?: () => void;
    onHelp?: () => void;
    onGenerator?: () => void;
    onRecipes?: () => void;
  } = $props();

  let open = $state(false);
  let buttonEl = $state<HTMLButtonElement | null>(null);
  let panelEl = $state<HTMLDivElement | null>(null);
  let panelStyle = $state('position:fixed;left:0px;top:0px;');
  let cleanupAuto: (() => void) | null = null;

  const trigger = () => {
    if (disabled) return;
    open = !open;
  };

  const run = (fn: () => void) => {
    open = false;
    fn();
  };

  async function updatePosition() {
    if (!buttonEl || !panelEl) return;
    const pos = await computePosition(buttonEl, panelEl, {
      placement: 'bottom-end',
      middleware: [offset(8), flip(), shift({ padding: 8 })]
    });
    panelStyle = `position:fixed;left:${Math.round(pos.x)}px;top:${Math.round(pos.y)}px;z-index:5000;`;
  }

  $effect(() => {
    open;
    if (!open) {
      if (cleanupAuto) {
        cleanupAuto();
        cleanupAuto = null;
      }
      return;
    }
    if (!buttonEl || !panelEl) return;
    void updatePosition();
    cleanupAuto = autoUpdate(buttonEl, panelEl, () => {
      void updatePosition();
    });
    return () => {
      if (cleanupAuto) {
        cleanupAuto();
        cleanupAuto = null;
      }
    };
  });

  $effect(() => {
    open;
    if (!open) return;
    const onPointerDown = (ev: PointerEvent) => {
      const target = ev.target as Node | null;
      if (!target) return;
      if (buttonEl?.contains(target)) return;
      if (panelEl?.contains(target)) return;
      open = false;
    };
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') open = false;
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  });
</script>

<div class="absolute inset-y-0 right-1 z-20 flex items-center">
  <button
    bind:this={buttonEl}
    class="btn btn-xs variant-soft h-7"
    {disabled}
    onclick={trigger}
    title="Query tools"
    type="button"
  >
    Options ▾
  </button>

  {#if open}
    <div bind:this={panelEl} class="z-[4000] min-w-[180px] rounded-xl border border-white/10 bg-surface-900/95 p-2 shadow-2xl pointer-events-auto" style={panelStyle}>
      <button class="w-full text-left px-2 py-1 rounded hover:bg-white/10 text-xs" onclick={() => run(onBuilder)}>Builder</button>
      <button class="w-full text-left px-2 py-1 rounded hover:bg-white/10 text-xs" onclick={() => run(onRegexMode)}>Regex mode</button>
      <button class="w-full text-left px-2 py-1 rounded hover:bg-white/10 text-xs" onclick={() => run(onHelp)}>Help</button>
      <button class="w-full text-left px-2 py-1 rounded hover:bg-white/10 text-xs" onclick={() => run(onGenerator)}>Generator</button>
      <button class="w-full text-left px-2 py-1 rounded hover:bg-white/10 text-xs" onclick={() => run(onRecipes)}>Recipes</button>
    </div>
  {/if}
</div>
