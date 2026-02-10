# Implementation Checklist

## Before Coding
- [ ] Architecture manifest committed (`BSH-000`)
- [ ] Verify script passes locally (`BSH-001`)
- [ ] Branch naming uses `codex/bushing-*`

## During Coding
- [ ] Canonical types imported from one source only
- [ ] D3 used for all sketches/figures
- [ ] No file exceeds declared soft limits
- [ ] Added/updated tests with each behavior change

## Before Merge
- [ ] `npm run check`
- [ ] Bushing solver regression tests pass
- [ ] Bushing smoke e2e passes
- [ ] Drafting live/export parity verified
- [ ] Accessibility pass on key interactions
