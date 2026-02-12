# ADR BDN-111 - Adopt `svelte-dnd-action`

## Status
Proposed -> Accepted (for this implementation stream)

## Context
Custom DnD logic repeatedly exhibits drop-commit instability and parent/child lane interference despite multiple fixes.

## Decision
Use `svelte-dnd-action` as the sortable engine for top-level and nested bushing lanes.

## Consequences
Positive:
- higher reliability for pointer/mouse/touch
- built-in sortable semantics and transition behavior
- lower maintenance overhead than custom event orchestration

Negative:
- dependency footprint increase
- adaptation work for lane typing and persistence wiring

## Guardrails
- keep lane-specific logic in thin wrappers
- preserve fallback controls for accessibility and rollback mode
