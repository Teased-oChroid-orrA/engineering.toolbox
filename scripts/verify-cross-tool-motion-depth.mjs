import { MOTION_DEPTH_TARGETS, processTarget } from './motion-depth-tools.mjs';

const root = process.cwd();
const failures = [];
for (const t of MOTION_DEPTH_TARGETS) {
  const { violations } = processTarget(root, t, { write: false });
  failures.push(...violations);
}

if (failures.length) {
  console.error('[Cross-tool motion-depth] FAIL');
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

console.log('[Cross-tool motion-depth] OK');
