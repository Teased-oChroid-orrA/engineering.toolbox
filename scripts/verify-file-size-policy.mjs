#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  '.svelte-kit',
  '.golden_build_cjs',
  'build',
  'dist',
  'target',
  'test-results'
]);

const IGNORE_FILES = new Set([
  'package-lock.json'
]);

const JSON_CONFIG_BASENAME_RE = /(^tsconfig.*\.json$|^tauri\.conf\.json$|\.config\.json$)/i;

const FUNCTION_LIMIT = 100;
const CLASS_LIMIT = 400;

function listFiles(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(abs));
      continue;
    }
    if (IGNORE_FILES.has(entry.name)) continue;
    out.push(abs);
  }
  return out;
}

function rel(abs) {
  return path.relative(repoRoot, abs).replace(/\\/g, '/');
}

function lineCount(text) {
  return text.split(/\r?\n/).length;
}

function isStoreFile(fileRel) {
  const lower = fileRel.toLowerCase();
  return (
    (lower.endsWith('.ts') || lower.endsWith('.js')) &&
    (lower.includes('/stores/') || lower.includes('/store/') || /store\.(ts|js)$/.test(lower))
  );
}

function isSveltePageFile(fileRel) {
  return fileRel.endsWith('.svelte') && (fileRel.startsWith('src/routes/') || fileRel.includes('/src/routes/'));
}

function isSvelteComponentFile(fileRel) {
  return fileRel.endsWith('.svelte') && !isSveltePageFile(fileRel);
}

function isHtmlLayout(fileRel) {
  return fileRel.endsWith('.html') && /layout/i.test(path.basename(fileRel));
}

function isHtmlTemplate(fileRel) {
  return fileRel.endsWith('.html') && !isHtmlLayout(fileRel);
}

function rustKind(fileRel) {
  const name = path.basename(fileRel).toLowerCase();
  if (!fileRel.endsWith('.rs')) return null;
  if (name === 'main.rs') return 'main';
  if (name.includes('handler')) return 'handler';
  if (name.includes('model')) return 'model';
  if (name.includes('service')) return 'service';
  if (name.includes('util')) return 'utility';
  return 'module';
}

function isConfigFile(fileRel) {
  const name = path.basename(fileRel);
  if (name === 'package.json' || name === 'Cargo.toml') return true;
  if (fileRel.endsWith('.toml')) return true;
  if (!fileRel.endsWith('.json')) return false;
  return JSON_CONFIG_BASENAME_RE.test(name);
}

function fileLimit(fileRel) {
  // Special case: Orchestrator components get 800 line limit
  if (isSvelteComponentFile(fileRel) && fileRel.endsWith('Orchestrator.svelte')) {
    return { group: 'svelte_orchestrator', max: 800 };
  }
  if (isSvelteComponentFile(fileRel)) return { group: 'svelte_component', max: 300 };
  if (isSveltePageFile(fileRel)) return { group: 'svelte_page', max: 500 };
  if (isStoreFile(fileRel)) return { group: 'store', max: 200 };
  if (isHtmlLayout(fileRel)) return { group: 'html_layout', max: 150 };
  if (isHtmlTemplate(fileRel)) return { group: 'html_template', max: 200 };

  const rk = rustKind(fileRel);
  if (rk === 'main') return { group: 'rust_main', max: 200 };
  if (rk === 'handler') return { group: 'rust_handler', max: 400 };
  if (rk === 'model') return { group: 'rust_model', max: 300 };
  if (rk === 'service') return { group: 'rust_service', max: 600 };
  if (rk === 'utility') return { group: 'rust_utility', max: 200 };
  if (rk === 'module') return { group: 'rust_module', max: 800 };

  if (isConfigFile(fileRel)) {
    if (path.basename(fileRel) === 'package.json' || path.basename(fileRel) === 'Cargo.toml') {
      return { group: 'build_config', max: 150 };
    }
    return { group: 'config', max: 100 };
  }

  return null;
}

function firstBraceOffset(lines, startLine) {
  for (let i = startLine; i < Math.min(startLine + 6, lines.length); i += 1) {
    const idx = lines[i].indexOf('{');
    if (idx !== -1) return { line: i, col: idx };
  }
  return null;
}

function findBlockEnd(lines, braceStart) {
  let depth = 0;
  let started = false;
  for (let i = braceStart.line; i < lines.length; i += 1) {
    const line = lines[i];
    let j = i === braceStart.line ? braceStart.col : 0;
    for (; j < line.length; j += 1) {
      const ch = line[j];
      if (ch === '{') {
        depth += 1;
        started = true;
      } else if (ch === '}') {
        depth -= 1;
        if (started && depth === 0) return i;
      }
    }
  }
  return null;
}

function collectJsTsSvelteFunctions(lines) {
  const starts = [];
  const fnDecl = /^\s*(export\s+)?(async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/;
  const arrowDecl = /^\s*(export\s+)?(const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*(async\s*)?(\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{/;
  for (let i = 0; i < lines.length; i += 1) {
    if (fnDecl.test(lines[i]) || arrowDecl.test(lines[i])) starts.push(i);
  }
  return starts;
}

function collectJsTsSvelteClasses(lines) {
  const starts = [];
  const clsDecl = /^\s*(export\s+)?(default\s+)?class\s+[A-Za-z_$][\w$]*/;
  for (let i = 0; i < lines.length; i += 1) {
    if (clsDecl.test(lines[i])) starts.push(i);
  }
  return starts;
}

function collectRustFunctions(lines) {
  const starts = [];
  const fnDecl = /^\s*(pub\s+)?(async\s+)?fn\s+[A-Za-z_][\w]*\s*\(/;
  for (let i = 0; i < lines.length; i += 1) {
    if (fnDecl.test(lines[i])) starts.push(i);
  }
  return starts;
}

function blockViolations(fileRel, text) {
  const lines = text.split(/\r?\n/);
  const ext = path.extname(fileRel).toLowerCase();
  const violations = [];

  let fnStarts = [];
  let clsStarts = [];

  if (ext === '.js' || ext === '.ts' || ext === '.svelte') {
    fnStarts = collectJsTsSvelteFunctions(lines);
    clsStarts = collectJsTsSvelteClasses(lines);
  } else if (ext === '.rs') {
    fnStarts = collectRustFunctions(lines);
  }

  for (const s of fnStarts) {
    const brace = firstBraceOffset(lines, s);
    if (!brace) continue;
    const end = findBlockEnd(lines, brace);
    if (end == null) continue;
    const len = end - s + 1;
    if (len > FUNCTION_LIMIT) {
      violations.push({
        kind: 'function',
        path: fileRel,
        line: s + 1,
        length: len,
        max: FUNCTION_LIMIT
      });
    }
  }

  for (const s of clsStarts) {
    const brace = firstBraceOffset(lines, s);
    if (!brace) continue;
    const end = findBlockEnd(lines, brace);
    if (end == null) continue;
    const len = end - s + 1;
    if (len > CLASS_LIMIT) {
      violations.push({
        kind: 'class',
        path: fileRel,
        line: s + 1,
        length: len,
        max: CLASS_LIMIT
      });
    }
  }

  return violations;
}

const files = listFiles(repoRoot);
const failures = [];

for (const abs of files) {
  const fileRel = rel(abs);
  const text = fs.readFileSync(abs, 'utf8');
  const loc = lineCount(text);
  const lim = fileLimit(fileRel);
  if (lim && loc > lim.max) {
    failures.push({
      kind: 'file',
      group: lim.group,
      path: fileRel,
      line: 1,
      length: loc,
      max: lim.max
    });
  }
  failures.push(...blockViolations(fileRel, text));
}

if (failures.length) {
  console.error('[File size policy] Failures:');
  for (const f of failures) {
    if (f.kind === 'file') {
      console.error(` - ${f.group}: ${f.path}:${f.line} ${f.length} lines exceeds max ${f.max}`);
    } else {
      console.error(` - ${f.kind}: ${f.path}:${f.line} ${f.length} lines exceeds max ${f.max}`);
    }
  }
  process.exit(1);
}

console.log('[File size policy] Checks: OK');
