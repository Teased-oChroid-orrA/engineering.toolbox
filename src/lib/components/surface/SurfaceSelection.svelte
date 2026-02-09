<script lang="ts" context="module">
  export type SelectionOp = 'replace' | 'add' | 'subtract';

  export function applySelectionOp(base: Set<number>, incoming: Set<number>, op: SelectionOp): Set<number> {
    if (op === 'replace') return new Set(incoming);
    const out = new Set(base);
    if (op === 'add') {
      for (const i of incoming) out.add(i);
      return out;
    }
    // subtract
    for (const i of incoming) out.delete(i);
    return out;
  }

  export function invertSelection(count: number, selected: Set<number>): Set<number> {
    const out = new Set<number>();
    for (let i = 0; i < count; i++) if (!selected.has(i)) out.add(i);
    return out;
  }
</script>
