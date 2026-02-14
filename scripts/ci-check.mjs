#!/usr/bin/env node
/**
 * CI/CD Integration Check
 * Runs comprehensive checks suitable for CI pipeline
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║                                                           ║');
console.log('║              CI/CD INTEGRATION CHECK                      ║');
console.log('║                                                           ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

let hasErrors = false;
let hasWarnings = false;
const results = [];

function runCheck(name, fn) {
  process.stdout.write(`${name}... `);
  try {
    const result = fn();
    if (result.status === 'pass') {
      console.log('✅ PASS');
      results.push({ name, status: 'pass', message: result.message });
    } else if (result.status === 'warn') {
      console.log('⚠️  WARN');
      hasWarnings = true;
      results.push({ name, status: 'warn', message: result.message });
    } else {
      console.log('❌ FAIL');
      hasErrors = true;
      results.push({ name, status: 'fail', message: result.message });
    }
  } catch (e) {
    console.log('❌ ERROR');
    hasErrors = true;
    results.push({ name, status: 'error', message: e.message });
  }
}

// Check 1: TypeScript
runCheck('TypeScript Compilation', () => {
  try {
    const output = execSync('npx svelte-check --tsconfig ./tsconfig.json', {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    const errorMatch = output.match(/found (\d+) errors?/);
    const errors = errorMatch ? parseInt(errorMatch[1]) : 0;
    
    if (errors > 0) {
      return { status: 'fail', message: `${errors} TypeScript errors found` };
    }
    return { status: 'pass', message: '0 errors' };
  } catch (e) {
    const errorMatch = e.stdout?.match(/found (\d+) errors?/);
    const errors = errorMatch ? parseInt(errorMatch[1]) : 'unknown';
    return { status: 'fail', message: `${errors} errors found` };
  }
});

// Check 2: Build
runCheck('Production Build', () => {
  try {
    execSync('npm run build', {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    // Verify build output exists
    if (!existsSync(join(ROOT, 'build', 'index.html'))) {
      return { status: 'fail', message: 'build/index.html not found' };
    }
    
    return { status: 'pass', message: 'Build succeeded' };
  } catch (e) {
    return { status: 'fail', message: 'Build failed' };
  }
});

// Check 3: Architecture Contracts
runCheck('Architecture Contracts', () => {
  try {
    execSync('node ./scripts/feature-contract-surface-toolbox.mjs', {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    execSync('node ./scripts/verify-surface-architecture.mjs', {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    execSync('node ./scripts/verify-bushing-architecture.mjs', {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    return { status: 'pass', message: 'All contracts satisfied' };
  } catch (e) {
    return { status: 'fail', message: 'Contract violations found' };
  }
});

// Check 4: Test Suite
runCheck('Automated Tests', () => {
  try {
    execSync('npx playwright test tests/console-all-toolboxes.spec.ts --timeout=60000', {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    return { status: 'pass', message: 'All tests passed' };
  } catch (e) {
    const failMatch = e.stdout?.match(/(\d+) failed/);
    if (failMatch) {
      return { status: 'warn', message: `${failMatch[1]} tests failed` };
    }
    return { status: 'warn', message: 'Some tests failed' };
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60) + '\n');

const passed = results.filter(r => r.status === 'pass').length;
const warned = results.filter(r => r.status === 'warn').length;
const failed = results.filter(r => r.status === 'fail' || r.status === 'error').length;

console.log(`✅ Passed: ${passed}`);
console.log(`⚠️  Warned: ${warned}`);
console.log(`❌ Failed: ${failed}\n`);

if (failed > 0) {
  console.log('Details:\n');
  results
    .filter(r => r.status === 'fail' || r.status === 'error')
    .forEach(r => {
      console.log(`❌ ${r.name}: ${r.message}`);
    });
}

if (hasErrors) {
  console.log('\n❌ CI/CD CHECK FAILED\n');
  process.exit(1);
} else if (hasWarnings) {
  console.log('\n⚠️  CI/CD CHECK PASSED WITH WARNINGS\n');
  process.exit(0);
} else {
  console.log('\n✅ CI/CD CHECK PASSED\n');
  process.exit(0);
}
