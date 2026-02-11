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
    label: 'Inspector Menu',
    sections: [
      {
        title: 'Load',
        actions: [
          { id: 'load_stream', label: 'Stream...', disabled: !args.canOpenPath },
          { id: 'load_fallback', label: 'Fallback upload...' }
        ]
      },
      {
        title: 'Tools',
        actions: [
          { id: 'open_schema', label: 'Open Schema' },
          { id: 'open_recipes', label: 'Open Recipes' },
          { id: 'toggle_regex_help', label: args.showRegexHelp ? 'Hide Regex Help' : 'Show Regex Help' },
          { id: 'open_regex_generator', label: 'Regex Generator', disabled: !args.hasLoaded },
          { id: 'open_builder', label: 'Advanced Builder', disabled: !args.hasLoaded },
          { id: 'open_column_picker', label: 'Column Picker' },
          { id: 'open_shortcuts', label: 'Shortcuts' }
        ]
      },
      {
        title: 'Actions',
        actions: [
          { id: 'clear_all_filters', label: 'Clear all filters', disabled: !args.hasLoaded },
          { id: 'rerun_schema', label: 'Re-run schema', disabled: !args.hasLoaded || args.schemaLoading },
          { id: 'export_analysis_bundle', label: 'Analysis bundle', disabled: !args.hasLoaded },
          { id: 'toggle_quiet_logs', label: 'Quiet logs', checked: args.quietBackendLogs },
          { id: 'toggle_auto_restore', label: 'Auto-restore', checked: args.autoRestoreEnabled }
        ]
      },
      {
        title: 'Export',
        actions: [
          { id: 'export_current_view', label: 'Export current view', disabled: !args.hasLoaded },
          { id: 'export_filtered_rows', label: 'Export filtered rows', disabled: !args.hasLoaded },
          { id: 'export_selected_columns', label: 'Export selected columns', disabled: !args.hasLoaded }
        ]
      }
    ]
  };
}
