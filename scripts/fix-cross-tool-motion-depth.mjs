import { MOTION_DEPTH_TARGETS, processTarget } from './motion-depth-tools.mjs';

const root = process.cwd();
let changed = [];
for (const t of MOTION_DEPTH_TARGETS) {
  const out = processTarget(root, t, { write: true });
  changed = changed.concat(out.changed);
}

if (!changed.length) {
  console.log('[Cross-tool motion-depth] no changes');
  process.exit(0);
}

console.log('[Cross-tool motion-depth] updated files:');
for (const f of changed) console.log(` - ${f}`);

