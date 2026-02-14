import fs from 'node:fs';
import path from 'node:path';

/**
 * Build verifier for file:// robustness.
 *
 * Checks:
 *  - build/index.html exists
 *  - no absolute asset paths like src="/..." or href="/..." (breaks file://)
 *  - no absolute CSS url(/...)
 *  - hash-router friendliness: no plain route href="/route" links
 */

const root = process.cwd();
const buildDir = process.env.BUILD_DIR
  ? path.resolve(root, process.env.BUILD_DIR)
  : path.join(root, 'build');
const indexPath = path.join(buildDir, 'index.html');

function fail(msg) {
  console.error(`\n[verify-build] FAIL: ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`[verify-build] OK: ${msg}`);
}

if (!fs.existsSync(indexPath)) {
  fail(`Missing ${path.relative(root, indexPath)}. Run the build first.`);
  process.exit(process.exitCode ?? 1);
}

const html = fs.readFileSync(indexPath, 'utf8');

// Absolute paths inside common attributes.
const absAttrRe = /\b(?:src|href|poster|action)=(["'])\/(?!\/)/g;
// Absolute url() usage inside inline styles.
const absCssUrlRe = /url\((?:\s*["']?)\/(?!\/)/g;
// Base tag that forces absolute resolution.
const absBaseRe = /<base\b[^>]*\bhref=(["'])\/(?!\/)/i;

const offenders = [];
for (const re of [absAttrRe, absCssUrlRe]) {
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(html))) {
    const i = m.index;
    const ctx = html.slice(Math.max(0, i - 60), Math.min(html.length, i + 120)).replace(/\s+/g, ' ');
    offenders.push(ctx);
    if (offenders.length >= 12) break;
  }
  if (offenders.length >= 12) break;
}

if (absBaseRe.test(html)) {
  offenders.push('Found <base href="/..."> (forces absolute path resolution)');
}

if (offenders.length) {
  fail(
    `Found absolute paths in ${path.relative(root, indexPath)}. ` +
      `These usually break when opening via file://.\n\n` +
      offenders.map((s, idx) => `  ${idx + 1}) ${s}`).join('\n')
  );
} else {
  ok('No absolute asset paths detected in build/index.html.');
}

// Hash-router sanity: flag plain route anchors like href="/bushing".
// (Absolute route anchors are already caught above; this also catches single-quoted, and edge cases.)
const plainRouteAnchorRe = /<a\b[^>]*\bhref=(["'])\/(?!\/|_app\/|assets\/|favicon\.ico|robots\.txt)/gi;
if (plainRouteAnchorRe.test(html)) {
  fail('Found plain route anchors (href="/route"). Use hash routes (e.g., href="#/route") for file:// builds.');
} else {
  ok('No plain route anchors detected (hash-router friendly).');
}

if (!process.exitCode) {
  ok('Build looks file://-robust.');
}
