# QA Matrix - Bushing DnD V3

## Automated
- top-level reorder commits and persists after reload
- nested diagnostics reorder commits and persists after reload
- parent lane unchanged after child reorder
- child lane unchanged after parent reorder
- hovered-target displacement visible during drag
- collapse state retained across reorder/reload
- keyboard fallback move controls function

## Manual
- drag first->last and last->first in each lane
- drag while page is scrolled
- drag in mixed collapsed/expanded state
- verify nested card drag does not move parent container
- verify parent drag does not mutate nested order
- reorder then run export/calculation actions

## Browser Targets
- Chromium (primary)
- WebKit/Safari
