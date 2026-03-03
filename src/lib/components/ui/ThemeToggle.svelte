<script lang="ts">
  import { themeStore, type ThemeMode } from '$lib/stores/themeStore';
  import { onMount } from 'svelte';

  export let compact = false;
  let currentTheme: ThemeMode = 'technical';
  
  themeStore.subscribe(value => {
    currentTheme = value;
  });

  onMount(() => {
    themeStore.init();
  });

  const themes: Array<{ id: ThemeMode; label: string; short: string }> = [
    { id: 'technical', label: 'Technical', short: 'Tech' },
    { id: 'studio', label: 'Studio', short: 'Studio' },
    { id: 'high-contrast', label: 'High Contrast', short: 'Contrast' },
    { id: 'aurora', label: 'Aurora', short: 'Aurora' }
  ];

  function selectTheme(theme: ThemeMode) {
    themeStore.set(theme);
  }
</script>

<div class="theme-toggle-container" class:compact>
  <div class="theme-toggle-grid" class:compact>
    {#each themes as theme}
      <button
        class="theme-btn"
        class:active={currentTheme === theme.id}
        onclick={() => selectTheme(theme.id)}
        aria-label={`Switch to ${theme.label} theme`}>
        <span class="theme-label">{compact ? theme.short : theme.label}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .theme-toggle-container {
    padding: 0.5rem;
  }

  .theme-toggle-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .theme-toggle-container.compact {
    padding: 0;
  }

  .theme-toggle-grid.compact {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.4rem;
  }

  .theme-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 0.5rem 0.65rem;
    border-radius: 0.5rem;
    border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.1));
    background: var(--theme-btn-bg, rgba(0, 0, 0, 0.2));
    color: var(--theme-text, rgba(255, 255, 255, 0.7));
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.75rem;
  }

  .theme-btn:hover {
    background: var(--theme-btn-hover, rgba(255, 255, 255, 0.05));
    border-color: var(--theme-border-hover, rgba(255, 255, 255, 0.2));
  }

  .theme-btn.active {
    background: var(--theme-btn-active, rgba(20, 184, 166, 0.2));
    border-color: var(--theme-border-active, rgba(20, 184, 166, 0.5));
    color: var(--theme-text-active, rgba(20, 184, 166, 1));
  }

  .theme-label {
    font-size: 0.72rem;
    font-weight: 500;
    line-height: 1;
  }
</style>
