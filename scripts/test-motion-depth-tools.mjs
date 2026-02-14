import assert from 'node:assert/strict';
import { autoFixDepthClasses, findDepthViolations, MOTION_DEPTH_TARGETS } from './motion-depth-tools.mjs';

const surface = MOTION_DEPTH_TARGETS.find((x) => x.label === 'surface');
const bushing = MOTION_DEPTH_TARGETS.find((x) => x.label === 'bushing');
assert(surface && bushing);

{
  const src = `<div class="glass-panel surface-pop-card rounded-xl">x</div>`;
  const fixed = autoFixDepthClasses(src, surface);
  assert.match(fixed, /\bsurface-pop-card surface-depth-2\b/);
  assert.equal(findDepthViolations(fixed, surface, 'x.svelte').length, 0);
}

{
  const src = `<div class="bushing-pop-sub rounded">x</div>`;
  const fixed = autoFixDepthClasses(src, bushing);
  assert.match(fixed, /\bbushing-pop-sub bushing-depth-1\b/);
  assert.equal(findDepthViolations(fixed, bushing, 'y.svelte').length, 0);
}

{
  const src = `<div class={cn('btn bushing-pop-card rounded')}></div>`;
  const fixed = autoFixDepthClasses(src, bushing);
  assert.match(fixed, /\bbushing-pop-card bushing-depth-2\b/);
}

console.log('[Cross-tool motion-depth tools] OK');

