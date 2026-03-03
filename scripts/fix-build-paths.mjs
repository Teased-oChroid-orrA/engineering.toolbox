import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const buildDir = path.join(root, 'build');

function toPosixPath(input) {
  return input.split(path.sep).join('/');
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

if (!fs.existsSync(buildDir)) {
  console.warn('[fix-build-paths] build directory not found, skipping.');
  process.exit(0);
}

const htmlFiles = walk(buildDir);
let rewrittenFiles = 0;

for (const htmlPath of htmlFiles) {
  const relativeDir = path.relative(path.dirname(htmlPath), buildDir);
  const prefix = relativeDir === '' ? '.' : toPosixPath(relativeDir);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const rewritten = html.replace(
    /([("'=])\/(?!\/)(?:_app\/|favicon(?:\.ico|\.png)|apple-touch-icon|robots\.txt)([^"'()<>\s]*)/g,
    (_match, lead, target) => `${lead}${prefix}/${target}`
  );

  if (rewritten !== html) {
    fs.writeFileSync(htmlPath, rewritten, 'utf8');
    rewrittenFiles += 1;
  }
}

console.log(`[fix-build-paths] Updated ${rewrittenFiles} HTML file(s).`);
