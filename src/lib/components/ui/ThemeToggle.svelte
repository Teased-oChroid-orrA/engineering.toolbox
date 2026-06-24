<script lang="ts">
  import {
    themeStore,
    colorModeStore,
    type ThemeMode,
    type ColorMode
  } from '$lib/stores/themeStore';
  import { onMount } from 'svelte';

  let { compact = false }: { compact?: boolean } = $props();

  // Auto-subscriptions ($store) are cleaned up by the compiler — no manual unsubscribe (was a leak).
  const currentTheme = $derived($themeStore);
  const currentMode = $derived($colorModeStore);

  onMount(() => {
    themeStore.init();
    colorModeStore.init();
  });

  const themes: Array<{ id: ThemeMode; label: string; short: string }> = [
    { id: 'technical', label: 'Technical', short: 'Tech' },
    { id: 'studio', label: 'Studio', short: 'Studio' },
    { id: 'high-contrast', label: 'High Contrast', short: 'Contrast' },
    { id: 'aurora', label: 'Aurora', short: 'Aurora' }
  ];

  const modes: Array<{ id: ColorMode; label: string; icon: string }> = [
    { id: 'light', label: 'Light', icon: '☀' },
    { id: 'dark', label: 'Dark', icon: '☾' },
    { id: 'auto', label: 'Auto', icon: '◐' }
  ];

  function selectTheme(theme: ThemeMode) {
    themeStore.set(theme);
  }

  function selectMode(mode: ColorMode) {
    colorModeStore.set(mode);
  }
</script>

<div class="theme-toggle-container" class:compact>
  <div class="mode-toggle-grid" role="group" aria-label="Color mode">
    {#each modes as mode (mode.id)}
      <button
        class="mode-btn"
        class:active={currentMode === mode.id}
        onclick={() => selectMode(mode.id)}
        aria-pressed={currentMode === mode.id}
        aria-label={`Use ${mode.label} mode`}
        title={`${mode.label} mode`}>
        <span class="mode-icon" aria-hidden="true">{mode.icon}</span>
        {#if !compact}<span class="mode-label">{mode.label}</span>{/if}
      </button>
    {/each}
  </div>

  <div class="theme-toggle-grid" class:compact>
    {#each themes as theme (theme.id)}
      <button
        class="theme-btn"
        class:active={currentTheme === theme.id}
        onclick={() => selectTheme(theme.id)}
        aria-pressed={currentTheme === theme.id}
        aria-label={`Switch to ${theme.label} theme`}>
        <span class="theme-label">{compact ? theme.short : theme.label}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .theme-toggle-container {
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .theme-toggle-container.compact {
    padding: 0;
    gap: 0.4rem;
  }

  .mode-toggle-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.4rem;
  }

  .theme-toggle-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .theme-toggle-grid.compact {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.4rem;
  }

  .theme-btn,
  .mode-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    padding: 0.5rem 0.65rem;
    border-radius: 0.5rem;
    border: 1px solid var(--theme-border, rgba(148, 173, 209, 0.18));
    background: var(--theme-btn-bg, rgba(13, 23, 41, 0.55));
    color: var(--theme-text, rgba(226, 235, 247, 0.82));
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.75rem;
  }

  .theme-btn:hover,
  .mode-btn:hover {
    background: var(--theme-btn-hover, rgba(148, 173, 209, 0.1));
    border-color: var(--theme-border-hover, rgba(125, 211, 252, 0.32));
  }

  .theme-btn.active,
  .mode-btn.active {
    background: var(--theme-btn-active, rgba(56, 189, 248, 0.18));
    border-color: var(--theme-border-active, rgba(56, 189, 248, 0.5));
    color: var(--theme-text-active, rgba(224, 247, 255, 0.98));
  }

  .theme-btn:focus-visible,
  .mode-btn:focus-visible {
    outline: 2px solid var(--accent-primary, #38bdf8);
    outline-offset: 2px;
  }

  .mode-icon {
    font-size: 0.9rem;
    line-height: 1;
  }

  .mode-label,
  .theme-label {
    font-size: 0.72rem;
    font-weight: 500;
    line-height: 1;
  }
</style>
