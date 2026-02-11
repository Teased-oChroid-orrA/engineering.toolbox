# INS-200 Window Placement Repro Matrix

Date: 2026-02-10

## Repro setup
- Load large CSV dataset.
- Scroll dataset grid to mid/deep offsets.
- Open windows from Inspector menu and query options.

## Findings (before remediation)
- Windows launched from query/menu paths were perceived as opening "below" working area.
- Root cause indicator: overlay components were rendered inside the Inspector subtree with animated/3D transform context (`inspector-reveal` / pop-card classes), creating a non-viewport containing block risk for fixed descendants.

## Windows validated for migration
- Shortcuts
- Regex Generator
- Recipes
- Schema stats
- Advanced Builder
- Column Picker
- Header Prompt
- Row Drawer

## Remediation linked tickets
- INS-210, INS-211, INS-212, INS-213, INS-214

