/**
 * ThemeToggle - Component for switching between light/dark/teal themes
 */
<script lang="ts">
  import { themeStore, type ThemeMode } from '$lib/stores/themeStore';
  import { onMount } from 'svelte';

  let currentTheme: ThemeMode = 'dark';
  
  themeStore.subscribe(value => {
    currentTheme = value;
  });

  onMount(() => {
    themeStore.init();
  });

  const themes: Array<{ id: ThemeMode; label: string; icon: string }> = [
    { id: 'dark', label: 'Dark', icon: '🌙' },
    { id: 'light', label: 'Light', icon: '☀️' },
    { id: 'teal-dark', label: 'Teal Dark', icon: '🌊' },
    { id: 'teal-light', label: 'Teal Light', icon: '💎' }
  ];

  function selectTheme(theme: ThemeMode) {
    themeStore.set(theme);
  }
</script>

<div class="theme-toggle-container">
  <div class="theme-toggle-grid">
    {#each themes as theme}
      <button
        class="theme-btn"
        class:active={currentTheme === theme.id}
        onclick={() => selectTheme(theme.id)}
        aria-label={`Switch to ${theme.label} theme`}>
        <span class="theme-icon">{theme.icon}</span>
        <span class="theme-label">{theme.label}</span>
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
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .theme-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem;
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

  .theme-icon {
    font-size: 1.5rem;
  }

  .theme-label {
    font-size: 0.7rem;
    font-weight: 500;
  }
</style>
