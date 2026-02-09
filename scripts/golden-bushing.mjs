import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = process.cwd();
const OUT_DIR = path.join(root, '.golden_build_cjs');
const OUT_PKG = path.join(OUT_DIR, 'package.json');
const CASES_PATH = path.join(root, 'golden', 'bushing_cases.json');
const EXPECTED_PATH = path.join(root, 'golden', 'bushing_expected.json');

function die(msg) {
  console.error(`\n[golden:bushing] ${msg}`);
  process.exit(1);
}

function compileCore() {
  // Prefer project-local TypeScript, but fall back to a global `tsc` if available.
  const localTsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  const cmd = fs.existsSync(localTsc) ? process.execPath : 'tsc';
  const args = fs.existsSync(localTsc) ? [localTsc, '-p', 'tsconfig.golden.cjs.json'] : ['-p', 'tsconfig.golden.cjs.json'];

  const res = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit'
  });
  if (res.status !== 0) {
    die('Compilation failed.');
  }

  // Ensure Node treats the compiled output as CommonJS even though the repo is "type": "module".
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!fs.existsSync(OUT_PKG)) {
    fs.writeFileSync(OUT_PKG, JSON.stringify({ type: 'commonjs' }, null, 2));
  }
}

function roundDeep(v, digits = 10) {
  const s = Math.pow(10, digits);
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return v;
    // Stabilize -0
    const r = Math.round(v * s) / s;
    return Object.is(r, -0) ? 0 : r;
  }
  if (Array.isArray(v)) return v.map((x) => roundDeep(x, digits));
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v).sort()) {
      const val = v[k];
      if (val === undefined) continue;
      o[k] = roundDeep(val, digits);
    }
    return o;
  }
  return v;
}

function pickGolden(out) {
  // Lock only the stable, user-facing outputs (exclude debug).
  return {
    sleeveWall: out.sleeveWall,
    neckWall: out.neckWall,
    odInstalled: out.odInstalled,
    csSolved: out.csSolved,
    pressure: out.pressure,
    hoop: out.hoop,
    edgeDistance: out.edgeDistance,
    governing: out.governing,
    warnings: out.warnings
  };
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const ak = Object.keys(a).sort();
  const bk = Object.keys(b).sort();
  if (ak.length !== bk.length) return false;
  for (let i = 0; i < ak.length; i++) if (ak[i] !== bk[i]) return false;
  for (const k of ak) if (!deepEqual(a[k], b[k])) return false;
  return true;
}

function main() {
  const gen = process.argv.includes('--gen');
  if (!fs.existsSync(CASES_PATH)) {
    die(`Missing ${path.relative(root, CASES_PATH)}`);
  }

  compileCore();

  const require = createRequire(import.meta.url);
  const solveMod = require(path.join(OUT_DIR, 'bushing', 'solve.js'));
  const computeBushing = solveMod.computeBushing;
  if (typeof computeBushing !== 'function') {
    die('Could not load computeBushing from compiled output.');
  }

  const cases = JSON.parse(fs.readFileSync(CASES_PATH, 'utf8'));

  if (gen) {
    const expected = {};
    for (const c of cases) {
      const out = computeBushing(c.input);
      expected[c.name] = roundDeep(pickGolden(out));
    }
    fs.writeFileSync(EXPECTED_PATH, JSON.stringify(expected, null, 2));
    console.log(`[golden:bushing] Wrote ${path.relative(root, EXPECTED_PATH)} (${Object.keys(expected).length} cases).`);
    return;
  }

  if (!fs.existsSync(EXPECTED_PATH)) {
    die(`Missing ${path.relative(root, EXPECTED_PATH)}. Run \`npm run golden:bushing:gen\` once to create it.`);
  }

  const expected = JSON.parse(fs.readFileSync(EXPECTED_PATH, 'utf8'));
  let failures = 0;

  for (const c of cases) {
    const exp = expected[c.name];
    if (!exp) {
      console.error(`[golden:bushing] Missing expected for case: ${c.name}`);
      failures++;
      continue;
    }
    const got = roundDeep(pickGolden(computeBushing(c.input)));
    if (!deepEqual(got, exp)) {
      failures++;
      console.error(`\n[golden:bushing] MISMATCH: ${c.name}`);
      console.error('Expected:', JSON.stringify(exp, null, 2));
      console.error('Got     :', JSON.stringify(got, null, 2));
    }
  }

  if (failures) {
    die(`Golden test failures: ${failures}`);
  }
  console.log(`[golden:bushing] PASS: ${cases.length} cases match.`);
}

main();
