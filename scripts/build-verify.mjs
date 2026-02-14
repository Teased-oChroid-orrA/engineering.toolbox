import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const buildDir = path.join(root, 'build');
const indexHtml = path.join(buildDir, 'index.html');

function fail(msg) {
  console.error(`\n[build-verify] ❌ ${msg}\n`);
  process.exit(1);
}

if (!fs.existsSync(indexHtml)) {
  fail(`Missing ${path.relative(root, indexHtml)}. Did you run the build?`);
}

const html = fs.readFileSync(indexHtml, 'utf8');

// 1) Absolute asset paths break file:// portability (e.g. src="/foo", href="/bar").
// Allow protocol absolute URLs.
const absAttr = /(\s(?:src|href)=")\/(?!\/)([^"#?][^"]*)"/g;
const absMatches = [...html.matchAll(absAttr)]
  .map((m) => `/${m[2]}`)
  .filter((u) => !u.startsWith('/favicon') && !u.startsWith('/apple-touch-icon'));

if (absMatches.length) {
  fail(
    `Found absolute asset/route URLs in build/index.html (breaks file://). Examples:\n` +
      absMatches.slice(0, 8).map((u) => `  - ${u}`).join('\n')
  );
}

// 2) Ensure hash router is present for internal links.
// This is a best-effort check — we just ensure typical internal anchors use "#/".
const internalHref = /href="(#[^"]*|\/[^"#][^"]*)"/g;
const badLinks = [...html.matchAll(internalHref)]
  .map((m) => m[1])
  .filter(
    (href) =>
      href.startsWith('/') &&
      !href.startsWith('//') &&
      !href.startsWith('/favicon') &&
      !href.startsWith('/apple-touch-icon') &&
      !href.startsWith('/robots.txt')
  );

if (badLinks.length) {
  fail(
    `Found non-hash internal links in build/index.html. Examples:\n` +
      badLinks.slice(0, 8).map((u) => `  - ${u}`).join('\n')
  );
}

console.log('[build-verify] ✅ build/index.html looks file://-robust (no absolute asset paths; no non-hash internal links).');
