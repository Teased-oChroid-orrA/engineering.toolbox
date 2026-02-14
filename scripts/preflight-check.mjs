#!/usr/bin/env node
/**
 * Pre-flight checks before dev/build
 * Ensures environment is ready and catches common issues early
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

console.log('🔍 Running pre-flight checks...\n');

let hasErrors = false;

// Check 1: Port availability (dev only)
if (process.env.npm_lifecycle_event === 'dev') {
  console.log('1️⃣ Checking port 5173...');
  try {
    const result = execSync('lsof -ti:5173', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    if (result) {
      console.log('   ⚠️  Port 5173 is in use. Killing processes...');
      execSync(`kill ${result}`, { stdio: 'inherit' });
      // Wait a moment for port to free
      execSync('sleep 2');
      console.log('   ✅ Port freed');
    } else {
      console.log('   ✅ Port available');
    }
  } catch (e) {
    // No processes found - port is free
    console.log('   ✅ Port available');
  }
  console.log('');
}

// Check 2: node_modules
console.log('2️⃣ Checking dependencies...');
if (!existsSync(join(ROOT, 'node_modules'))) {
  console.log('   ❌ node_modules missing. Run: npm install');
  hasErrors = true;
} else {
  console.log('   ✅ Dependencies installed');
}
console.log('');

// Check 3: Critical directories
console.log('3️⃣ Checking project structure...');
const criticalDirs = ['src', 'static', 'src-tauri'];
for (const dir of criticalDirs) {
  if (!existsSync(join(ROOT, dir))) {
    console.log(`   ❌ Missing directory: ${dir}`);
    hasErrors = true;
  }
}
if (!hasErrors) {
  console.log('   ✅ Project structure valid');
}
console.log('');

// Check 4: TypeScript errors (build only - too slow for dev)
if (process.env.npm_lifecycle_event === 'build') {
  console.log('4️⃣ Running type checks...');
  
  // First, ensure .svelte-kit directory exists by running svelte-kit sync
  console.log('   🔄 Running svelte-kit sync to generate .svelte-kit directory...');
  try {
    execSync('npx svelte-kit sync', {
      cwd: ROOT,
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    console.log('   ✅ .svelte-kit directory generated');
  } catch (e) {
    console.log('   ❌ Failed to generate .svelte-kit directory');
    console.log(e.stdout || e.message);
    hasErrors = true;
  }
  
  // Now run type checks
  try {
    execSync('npx svelte-check --tsconfig ./tsconfig.json --threshold error', {
      cwd: ROOT,
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    console.log('   ✅ No TypeScript errors');
  } catch (e) {
    console.log('   ❌ TypeScript errors found');
    console.log(e.stdout || e.message);
    hasErrors = true;
  }
  console.log('');
}

// Summary
if (hasErrors) {
  console.log('❌ Pre-flight checks FAILED\n');
  process.exit(1);
} else {
  console.log('✅ Pre-flight checks PASSED\n');
  process.exit(0);
}
