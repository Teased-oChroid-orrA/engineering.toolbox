# INS-202 Motion Stack Audit

Date: 2026-02-10

## Current motion stack map
- Parent wrappers: `.inspector-pop-card` (3D lift + tilt)
- Nested content wrappers: `.inspector-pop-sub` (additional tilt/lift)
- Value-level hover: `.inspector-pop-value`
- Entry animation wrapper: `.inspector-reveal`

## Risk identified
- Combined transform layers can:
  - reduce legibility stability
  - amplify motion in nested cards
  - interfere with fixed overlay behavior when overlays are rendered under transformed ancestors

## Immediate mitigation completed
- Overlay rendering moved through portal host (body-level) to isolate utility windows from transformed Inspector subtree.

## Follow-up motion-depth work
- INS-240, INS-241, INS-242
- STB-085
- BSH-122

