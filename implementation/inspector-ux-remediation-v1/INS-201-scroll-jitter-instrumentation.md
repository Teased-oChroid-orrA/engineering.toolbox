# INS-201 Scroll Jitter Instrumentation

Date: 2026-02-10

## Instrumentation added
- Added `onScrollTrace` hook to virtual grid:
  - `scrollTop`
  - `dy`
  - `dtMs`
  - `velocity`
  - `fastScroll`
- Wired trace into orchestrator debug logger with rate limiting (`gridScrollTrace`).

## Existing telemetry retained
- Window slice telemetry via `onWindowChange` (`gridWindow` event).

## Usage
- Enable normal Inspector debug output.
- Scroll quickly and inspect `gridScrollTrace` + `gridWindow` timing/offset signatures.

## Next-step analysis tickets
- INS-230, INS-231, INS-232, INS-233

