import fs from 'node:fs';
import path from 'node:path';

export const MOTION_DEPTH_TARGETS = [
  {
    label: 'surface',
    dir: 'src/lib/components/surface',
    popCardClass: 'surface-pop-card',
    popSubClass: 'surface-pop-sub',
    depthCardDefault: 'surface-depth-2',
    depthSubDefault: 'surface-depth-1',
    depthCardPattern: /\bsurface-depth-[012]\b/,
    depthSubPattern: /\bsurface-depth-[01]\b/
  },
  {
    label: 'bushing',
    dir: 'src/lib/components/bushing',
    popCardClass: 'bushing-pop-card',
    popSubClass: 'bushing-pop-sub',
    depthCardDefault: 'bushing-depth-2',
    depthSubDefault: 'bushing-depth-1',
    depthCardPattern: /\bbushing-depth-[012]\b/,
    depthSubPattern: /\bbushing-depth-[01]\b/
  }
];

export function walk(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function classSegmentAt(text, tokenIndex) {
  const start = Math.max(0, tokenIndex - 260);
  const end = Math.min(text.length, tokenIndex + 260);
  return text.slice(start, end);
}

export function findDepthViolations(text, target, relPath) {
  const out = [];
  let idx = -1;
  while ((idx = text.indexOf(target.popCardClass, idx + 1)) !== -1) {
    const seg = classSegmentAt(text, idx);
    if (!target.depthCardPattern.test(seg)) {
      const line = text.slice(0, idx).split(/\r?\n/).length;
      out.push(`${relPath}:${line} ${target.popCardClass} missing depth class`);
    }
  }
  idx = -1;
  while ((idx = text.indexOf(target.popSubClass, idx + 1)) !== -1) {
    const seg = classSegmentAt(text, idx);
    if (!target.depthSubPattern.test(seg)) {
      const line = text.slice(0, idx).split(/\r?\n/).length;
      out.push(`${relPath}:${line} ${target.popSubClass} missing depth class`);
    }
  }
  return out;
}

function addDepthNextToToken(value, token, depthToken, depthPattern) {
  if (!value.includes(token)) return value;
  if (depthPattern.test(value)) return value;
  return value.replace(token, `${token} ${depthToken}`);
}

function patchQuotedClassAttributes(text, target) {
  const re = /class\s*=\s*"([^"]*)"/gms;
  return text.replace(re, (m, v) => {
    let next = v;
    next = addDepthNextToToken(next, target.popCardClass, target.depthCardDefault, target.depthCardPattern);
    next = addDepthNextToToken(next, target.popSubClass, target.depthSubDefault, target.depthSubPattern);
    return `class="${next}"`;
  });
}

function patchTemplateClassAttributes(text, target) {
  const re = /class\s*=\s*\{`([\s\S]*?)`\}/gms;
  return text.replace(re, (m, v) => {
    let next = v;
    next = addDepthNextToToken(next, target.popCardClass, target.depthCardDefault, target.depthCardPattern);
    next = addDepthNextToToken(next, target.popSubClass, target.depthSubDefault, target.depthSubPattern);
    return `class={\`${next}\`}`;
  });
}

function patchCnStringLiterals(text, target) {
  // Adds depth token directly into any quoted class literal containing pop class.
  return text.replace(/(['"])([^'"\n]*?(?:surface-pop-card|surface-pop-sub|bushing-pop-card|bushing-pop-sub)[^'"\n]*?)\1/g, (m, q, v) => {
    let next = v;
    next = addDepthNextToToken(next, target.popCardClass, target.depthCardDefault, target.depthCardPattern);
    next = addDepthNextToToken(next, target.popSubClass, target.depthSubDefault, target.depthSubPattern);
    return `${q}${next}${q}`;
  });
}

export function autoFixDepthClasses(text, target) {
  let next = text;
  next = patchQuotedClassAttributes(next, target);
  next = patchTemplateClassAttributes(next, target);
  next = patchCnStringLiterals(next, target);
  return next;
}

export function processTarget(root, target, { write = false } = {}) {
  const dir = path.join(root, target.dir);
  const files = walk(dir).filter((f) => f.endsWith('.svelte'));
  const violations = [];
  const changed = [];
  for (const file of files) {
    const rel = path.relative(root, file);
    const orig = fs.readFileSync(file, 'utf8');
    const fixed = autoFixDepthClasses(orig, target);
    const finalText = write ? fixed : orig;
    if (write && fixed !== orig) {
      fs.writeFileSync(file, fixed);
      changed.push(rel);
    }
    violations.push(...findDepthViolations(finalText, target, rel));
  }
  return { changed, violations };
}

