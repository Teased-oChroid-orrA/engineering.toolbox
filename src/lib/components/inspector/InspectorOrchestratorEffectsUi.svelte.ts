/**
 * InspectorOrchestratorEffectsUi.svelte.ts
 * 
 * UI-specific $effect blocks extracted from InspectorOrchestratorEffects.svelte.ts.
 * Handles animation duration, backend logging, context menus, category UI, and grid initialization.
 */

import { invoke } from '@tauri-apps/api/core';
import { DEFAULT_GRID_WINDOW_SIZE } from '$lib/components/inspector/InspectorGridConstants';
import { devLog } from '$lib/utils/devLog';

// ========================= Effect 1: uiAnimDur effect =========================
export function setupUiAnimDurEffect(deps: {
  prefersReducedMotion: () => boolean;
  crossQueryBusy: () => boolean;
  totalFilteredCount: () => number;
}, setUiAnimDur: (value: number) => void) {
  $effect(() => {
    deps.prefersReducedMotion();
    deps.crossQueryBusy();
    deps.totalFilteredCount();
    if (deps.prefersReducedMotion()) {
      setUiAnimDur(0);
      return;
    }
    if (deps.crossQueryBusy() || deps.totalFilteredCount() > 200_000) {
      setUiAnimDur(90);
      return;
    }
    if (deps.totalFilteredCount() > 50_000) {
      setUiAnimDur(120);
      return;
    }
    if (deps.totalFilteredCount() > 10_000) {
      setUiAnimDur(145);
      return;
    }
    setUiAnimDur(170);
  });
}

// ========================= Effect 2: quietBackendLogs effect =========================
export function setupQuietBackendLogsEffect(deps: {
  quietBackendLogs: () => boolean;
}) {
  $effect(() => {
    const quiet = deps.quietBackendLogs();
    void invoke('inspector_set_quiet_logs', { quiet: !!quiet }).catch(() => {});
  });
}

// ========================= Effect 3: context menu registration effect =========================
export function setupContextMenuEffect(deps: {
  buildInspectorContextMenu: (params: {
    canOpenPath: boolean;
    hasLoaded: boolean;
    schemaLoading: boolean;
    showRegexHelp: boolean;
    quietBackendLogs: boolean;
    autoRestoreEnabled: boolean;
  }) => any;
  canOpenPath: () => boolean;
  hasLoaded: () => boolean;
  schemaLoading: () => boolean;
  showRegexHelp: () => boolean;
  quietBackendLogs: () => boolean;
  autoRestoreEnabled: () => boolean;
}, callbacks: {
  registerContextMenu: (menu: any) => void;
}) {
  $effect(() => {
    console.log('[MENU EFFECT] Context menu effect running...');
    const menu = deps.buildInspectorContextMenu({
      canOpenPath: deps.canOpenPath(),
      hasLoaded: deps.hasLoaded(),
      schemaLoading: deps.schemaLoading(),
      showRegexHelp: deps.showRegexHelp(),
      quietBackendLogs: deps.quietBackendLogs(),
      autoRestoreEnabled: deps.autoRestoreEnabled()
    });
    console.log('[MENU EFFECT] Built menu:', menu);
    callbacks.registerContextMenu(menu);
    console.log('[MENU EFFECT] Registration complete');
  });
}

// ========================= Effect 4: category column change effect =========================
export function setupCategoryColumnChangeEffect(deps: {
  hasLoaded: () => boolean;
  catFColIdx: () => number | null;
}, callbacks: {
  scheduleFetchCategory: (reset: boolean) => void;
}) {
  $effect(() => {
    if (!deps.hasLoaded()) return;
    // When column changes, reset paging.
    deps.catFColIdx();
    callbacks.scheduleFetchCategory(true);
  });
}

// ========================= Effect 5: category search effect =========================
export function setupCategorySearchEffect(deps: {
  hasLoaded: () => boolean;
  catAvailSearch: () => string;
}, callbacks: {
  scheduleFetchCategory: (reset: boolean) => void;
}) {
  $effect(() => {
    if (!deps.hasLoaded()) return;
    // Search within available values should reset paging.
    deps.catAvailSearch();
    callbacks.scheduleFetchCategory(true);
  });
}

// ========================= Effect 6: grid window initialization effect =========================
export function setupGridWindowInitEffect(deps: {
  hasLoaded: () => boolean;
  totalFilteredCount: () => number;
  gridWindowEndIdx: () => number;
  mergedRowsAllLength: () => number;
  isMergedView: () => boolean;
}, callbacks: {
  initializeGridWindow: (endIdx: number) => void;
}) {
  devLog('GRID INIT EFFECT', 'Effect function created, setting up $effect');
  
  $effect(() => {
    const loaded = deps.hasLoaded();
    const count = deps.totalFilteredCount();
    const currentEndIdx = deps.gridWindowEndIdx();
    const isMerged = deps.isMergedView();
    const dataLength = deps.mergedRowsAllLength();
    
    devLog('GRID INIT EFFECT', 'Running - loaded:', loaded, 'count:', count, 'endIdx:', currentEndIdx, 'isMerged:', isMerged, 'dataLength:', dataLength);
    
    // Only initialize if: loaded, data is ready (merged view has rows), count > 0, and window is 0-0
    const dataReady = !isMerged || dataLength > 0;
    
    if (loaded && count > 0 && currentEndIdx === 0 && dataReady) {
      const endIdx = Math.min(count, DEFAULT_GRID_WINDOW_SIZE);
      devLog('GRID INIT', 'Initializing window to', endIdx, 'rows (count:', count, 'dataReady:', dataReady, ')');
      callbacks.initializeGridWindow(endIdx);
    } else {
      devLog('GRID INIT EFFECT', 'Conditions not met - loaded:', loaded, 'count:', count, 'endIdx:', currentEndIdx, 'dataReady:', dataReady);
    }
  });
}
