import type { ContextMenuRegistration } from '$lib/navigation/contextualMenu';

export function buildInspectorContextMenu(args: {
  canOpenPath: boolean;
  hasLoaded: boolean;
  schemaLoading: boolean;
  showRegexHelp: boolean;
  quietBackendLogs: boolean;
  autoRestoreEnabled: boolean;
}): ContextMenuRegistration {
  return {
    scope: 'inspector',
    label: 'Inspector',
    sections: [
      {
        title: 'Data',
        actions: [
          { id: 'load_stream', label: '📂 Load File...', disabled: !args.canOpenPath },
          { id: 'load_fallback', label: '📤 Upload...' }
        ]
      },
      {
        title: 'Analysis',
        actions: [
          { id: 'open_schema', label: '📊 Schema Inspector' },
          { id: 'open_recipes', label: '⚡ Recipes' },
          { id: 'open_column_picker', label: '🔢 Columns' },
          { id: 'open_shortcuts', label: '⌨️ Shortcuts' }
        ]
      },
      {
        title: 'Filter Tools',
        actions: [
          { id: 'open_builder', label: '🔧 Advanced Builder', disabled: !args.hasLoaded },
          { id: 'clear_all_filters', label: '🗑️ Clear Filters', disabled: !args.hasLoaded }
        ]
      },
      {
        title: 'Export',
        actions: [
          { id: 'export_current_view', label: '💾 Current View', disabled: !args.hasLoaded },
          { id: 'export_filtered_rows', label: '📋 Filtered Rows', disabled: !args.hasLoaded },
          { id: 'export_analysis_bundle', label: '📦 Analysis Bundle', disabled: !args.hasLoaded }
        ]
      },
      {
        title: 'Settings',
        actions: [
          { id: 'rerun_schema', label: '🔄 Refresh Schema', disabled: !args.hasLoaded || args.schemaLoading },
          { id: 'toggle_regex_help', label: args.showRegexHelp ? '✓ Regex Help' : 'Regex Help' },
          { id: 'toggle_quiet_logs', label: 'Quiet Logs', checked: args.quietBackendLogs },
          { id: 'toggle_auto_restore', label: 'Auto-restore', checked: args.autoRestoreEnabled }
        ]
      }
    ]
  };
}
