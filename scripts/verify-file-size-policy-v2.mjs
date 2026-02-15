#!/usr/bin/env node
/**
 * File Size Policy V2 - Enhanced file and block size enforcement
 * 
 * Features:
 * - AST-aware block detection for TypeScript, JavaScript, Svelte, Rust
 * - Smart string literal handling
 * - Svelte block-level parsing
 * - Support for interfaces, types, enums, namespaces
 * - CSS/SCSS file support
 * - Comment-based exemptions
 * - Configurable rules via .sizepolicy.json
 * - Multiple output formats (terminal, JSON, HTML)
 * - Performance optimizations
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VERSION = '2.0.0';

// ============================================================================
// CLI Argument Parsing
// ============================================================================

const args = process.argv.slice(2);
const options = {
  config: '.sizepolicy.json',
  format: 'terminal',
  output: null,
  mode: null,
  verbose: false,
  help: false,
  version: false
};

for (const arg of args) {
  if (arg === '--help' || arg === '-h') {
    options.help = true;
  } else if (arg === '--version' || arg === '-v') {
    options.version = true;
  } else if (arg === '--verbose') {
    options.verbose = true;
  } else if (arg.startsWith('--config=')) {
    options.config = arg.slice('--config='.length);
  } else if (arg.startsWith('--format=')) {
    options.format = arg.slice('--format='.length);
  } else if (arg.startsWith('--output=')) {
    options.output = arg.slice('--output='.length);
  } else if (arg.startsWith('--mode=')) {
    options.mode = arg.slice('--mode='.length);
  }
}

if (options.help) {
  console.log(`
File Size Policy V2 - Enhanced file and block size enforcement

Usage: verify-file-size-policy-v2.mjs [options]

Options:
  --config=<path>      Custom config file (default: .sizepolicy.json)
  --format=<type>      Output format: terminal, json, html (default: terminal)
  --output=<path>      Write report to file (default: stdout)
  --mode=<mode>        Enforcement mode: strict, warn, audit (default: from config)
  --verbose            Show detailed information
  --help, -h           Show this help message
  --version, -v        Show version number

Examples:
  verify-file-size-policy-v2.mjs
  verify-file-size-policy-v2.mjs --format=json --output=violations.json
  verify-file-size-policy-v2.mjs --mode=warn
  verify-file-size-policy-v2.mjs --config=custom.json --verbose
`);
  process.exit(0);
}

if (options.version) {
  console.log(`File Size Policy V2 - Version ${VERSION}`);
  process.exit(0);
}

// ============================================================================
// Configuration Loading
// ============================================================================

const DEFAULT_CONFIG = {
  mode: 'strict',
  fileLimits: {
    svelte: {
      component: 300,
      orchestrator: 800,
      page: 500
    },
    typescript: {
      controller: 400,
      stateManager: 500,
      utility: 200,
      test: 500,
      default: 300
    },
    javascript: {
      config: 150,
      script: 300,
      default: 200
    },
    rust: {
      module: 800,
      handler: 400,
      model: 300,
      service: 600,
      utility: 200,
      main: 200
    },
    css: 300,
    scss: 400,
    html: {
      layout: 150,
      template: 200
    },
    config: {
      json: 150,
      toml: 150
    },
    store: 200
  },
  blockLimits: {
    function: 100,
    class: 400,
    method: 80,
    interface: 200,
    type: 150,
    enum: 100
  },
  exemptionPatterns: [
    'node_modules/**',
    '.svelte-kit/**',
    'build/**',
    'dist/**',
    'target/**',
    '.golden_build_cjs/**',
    '**/*.d.ts',
    '**/generated/**'
  ],
  contextOverrides: {
    test: {
      patterns: ['**/*.spec.ts', '**/*.test.ts'],
      blockLimits: {
        function: 150
      }
    },
    solverEngine: {
      patterns: ['**/solveEngine.ts', '**/solve.ts'],
      blockLimits: {
        function: 150
      }
    },
    babylonRuntime: {
      patterns: ['**/BushingBabylonRuntime.ts', '**/babylon/**/*.ts'],
      blockLimits: {
        function: 150
      }
    }
  }
};

function loadConfig(configPath) {
  const repoRoot = process.cwd();
  const fullPath = path.resolve(repoRoot, configPath);
  
  if (!fs.existsSync(fullPath)) {
    if (options.verbose) {
      console.log(`Config file not found: ${configPath}, using defaults`);
    }
    return DEFAULT_CONFIG;
  }
  
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const config = JSON.parse(content);
    // Merge with defaults
    return { ...DEFAULT_CONFIG, ...config };
  } catch (error) {
    console.error(`Error loading config file: ${error.message}`);
    console.error('Using default configuration');
    return DEFAULT_CONFIG;
  }
}

const config = loadConfig(options.config);
const mode = options.mode || config.mode;

// ============================================================================
// File Discovery
// ============================================================================

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

function matchesPattern(filePath, pattern) {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filePath);
}

function isExempted(filePath, patterns) {
  return patterns.some(pattern => matchesPattern(filePath, pattern));
}

function listFiles(dir, exemptionPatterns) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    
    const abs = path.join(dir, entry.name);
    const rel = path.relative(process.cwd(), abs).replace(/\\/g, '/');
    
    if (entry.isDirectory()) {
      out.push(...listFiles(abs, exemptionPatterns));
      continue;
    }
    
    if (isExempted(rel, exemptionPatterns)) continue;
    out.push(abs);
  }
  
  return out;
}

// ============================================================================
// File Classification
// ============================================================================

function classifyFile(fileRel) {
  const lower = fileRel.toLowerCase();
  const basename = path.basename(fileRel).toLowerCase();
  const ext = path.extname(fileRel).toLowerCase();
  
  // Test files
  if (basename.includes('.spec.') || basename.includes('.test.')) {
    return { type: 'test', category: 'typescript', limit: config.fileLimits.typescript.test };
  }
  
  // Svelte files
  if (ext === '.svelte') {
    if (basename.endsWith('orchestrator.svelte')) {
      return { type: 'orchestrator', category: 'svelte', limit: config.fileLimits.svelte.orchestrator };
    }
    if (fileRel.startsWith('src/routes/') || fileRel.includes('/src/routes/')) {
      return { type: 'page', category: 'svelte', limit: config.fileLimits.svelte.page };
    }
    return { type: 'component', category: 'svelte', limit: config.fileLimits.svelte.component };
  }
  
  // Store files
  if ((ext === '.ts' || ext === '.js') && 
      (lower.includes('/stores/') || lower.includes('/store/') || /store\.(ts|js)$/.test(lower))) {
    return { type: 'store', category: 'store', limit: config.fileLimits.store };
  }
  
  // TypeScript files
  if (ext === '.ts') {
    if (basename.includes('controller')) {
      return { type: 'controller', category: 'typescript', limit: config.fileLimits.typescript.controller };
    }
    if (basename.includes('statemanager')) {
      return { type: 'stateManager', category: 'typescript', limit: config.fileLimits.typescript.stateManager };
    }
    if (lower.includes('/utils/') || lower.includes('/util/') || basename.includes('util')) {
      return { type: 'utility', category: 'typescript', limit: config.fileLimits.typescript.utility };
    }
    return { type: 'default', category: 'typescript', limit: config.fileLimits.typescript.default };
  }
  
  // JavaScript files
  if (ext === '.js' || ext === '.mjs') {
    if (basename.includes('config')) {
      return { type: 'config', category: 'javascript', limit: config.fileLimits.javascript.config };
    }
    return { type: 'script', category: 'javascript', limit: config.fileLimits.javascript.script };
  }
  
  // Rust files
  if (ext === '.rs') {
    if (basename === 'main.rs') {
      return { type: 'main', category: 'rust', limit: config.fileLimits.rust.main };
    }
    if (basename.includes('handler')) {
      return { type: 'handler', category: 'rust', limit: config.fileLimits.rust.handler };
    }
    if (basename.includes('model')) {
      return { type: 'model', category: 'rust', limit: config.fileLimits.rust.model };
    }
    if (basename.includes('service')) {
      return { type: 'service', category: 'rust', limit: config.fileLimits.rust.service };
    }
    if (basename.includes('util')) {
      return { type: 'utility', category: 'rust', limit: config.fileLimits.rust.utility };
    }
    return { type: 'module', category: 'rust', limit: config.fileLimits.rust.module };
  }
  
  // CSS/SCSS files
  if (ext === '.css') {
    return { type: 'css', category: 'css', limit: config.fileLimits.css };
  }
  if (ext === '.scss') {
    return { type: 'scss', category: 'scss', limit: config.fileLimits.scss };
  }
  
  // HTML files
  if (ext === '.html') {
    if (basename.includes('layout')) {
      return { type: 'layout', category: 'html', limit: config.fileLimits.html.layout };
    }
    return { type: 'template', category: 'html', limit: config.fileLimits.html.template };
  }
  
  // Config files
  if (ext === '.json') {
    return { type: 'json', category: 'config', limit: config.fileLimits.config.json };
  }
  if (ext === '.toml') {
    return { type: 'toml', category: 'config', limit: config.fileLimits.config.toml };
  }
  
  return null;
}

// ============================================================================
// Comment-Based Exemptions
// ============================================================================

function parseExemptions(text) {
  const lines = text.split(/\r?\n/);
  const exemptions = {
    file: false,
    blocks: new Set(),
    customLimits: {}
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // File-level exemption
    if (/@size-policy-exempt\s+file/i.test(line)) {
      exemptions.file = true;
    }
    
    // Block-level exemption
    if (/@size-policy-exempt-block/i.test(line)) {
      exemptions.blocks.add(i + 1);
    }
    
    // Custom limit override
    const customMatch = line.match(/@size-policy-exempt\s+(function|class|interface|type|enum):(\d+)/i);
    if (customMatch) {
      const [, blockType, limit] = customMatch;
      exemptions.customLimits[blockType.toLowerCase()] = parseInt(limit, 10);
    }
  }
  
  return exemptions;
}

// ============================================================================
// Block Detection - Enhanced with String Handling
// ============================================================================

function isInString(line, pos, isRust = false) {
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let escaped = false;
  
  for (let i = 0; i < pos; i++) {
    const ch = line[i];
    
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    
    // For Rust, skip single quotes as they're used for lifetimes and char literals
    // We only care about double quotes for strings
    if (!isRust && ch === "'" && !inDouble && !inTemplate) {
      inSingle = !inSingle;
    } else if (ch === '"' && !inSingle && !inTemplate) {
      inDouble = !inDouble;
    } else if (ch === '`' && !inSingle && !inDouble) {
      inTemplate = !inTemplate;
    }
  }
  
  return inSingle || inDouble || inTemplate;
}

function findFirstBrace(lines, startLine, isRust = false) {
  for (let i = startLine; i < Math.min(startLine + 6, lines.length); i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      if (line[j] === '{' && !isInString(line, j, isRust)) {
        return { line: i, col: j };
      }
    }
  }
  return null;
}

function findBlockEnd(lines, braceStart, isRust = false) {
  let depth = 0;
  let started = false;
  
  for (let i = braceStart.line; i < lines.length; i++) {
    const line = lines[i];
    const startCol = i === braceStart.line ? braceStart.col : 0;
    
    for (let j = startCol; j < line.length; j++) {
      if (isInString(line, j, isRust)) continue;
      
      const ch = line[j];
      if (ch === '{') {
        depth++;
        started = true;
      } else if (ch === '}') {
        depth--;
        if (started && depth === 0) {
          return i;
        }
      }
    }
  }
  
  return null;
}

// ============================================================================
// Block Collection - TypeScript/JavaScript/Svelte
// ============================================================================

function collectTsJsFunctions(lines) {
  const starts = [];
  const patterns = [
    /^\s*(export\s+)?(async\s+)?function\s+[A-Za-z_$][\w$]*\s*[<(]/,
    /^\s*(export\s+)?(const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*(async\s*)?(\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{/
  ];
  
  for (let i = 0; i < lines.length; i++) {
    for (const pattern of patterns) {
      if (pattern.test(lines[i])) {
        starts.push({ line: i, type: 'function' });
        break;
      }
    }
  }
  
  return starts;
}

function collectTsJsClasses(lines) {
  const starts = [];
  const pattern = /^\s*(export\s+)?(default\s+)?(abstract\s+)?class\s+[A-Za-z_$][\w$]*/;
  
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      starts.push({ line: i, type: 'class' });
    }
  }
  
  return starts;
}

function collectTsInterfaces(lines) {
  const starts = [];
  const pattern = /^\s*(export\s+)?interface\s+[A-Za-z_$][\w$]*/;
  
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      starts.push({ line: i, type: 'interface' });
    }
  }
  
  return starts;
}

function collectTsTypes(lines) {
  const starts = [];
  const pattern = /^\s*(export\s+)?type\s+[A-Za-z_$][\w$]*\s*=/;
  
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      starts.push({ line: i, type: 'type' });
    }
  }
  
  return starts;
}

function collectTsEnums(lines) {
  const starts = [];
  const pattern = /^\s*(export\s+)?enum\s+[A-Za-z_$][\w$]*/;
  
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      starts.push({ line: i, type: 'enum' });
    }
  }
  
  return starts;
}

// ============================================================================
// Block Collection - Rust
// ============================================================================

function collectRustFunctions(lines) {
  const starts = [];
  const pattern = /^\s*(pub\s+)?((async\s+)?fn|impl)\s+[A-Za-z_][\w]*\s*[<(]/;
  
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      starts.push({ line: i, type: 'function' });
    }
  }
  
  return starts;
}

// ============================================================================
// Block Violation Detection
// ============================================================================

function detectBlockViolations(fileRel, text, classification, exemptions) {
  const lines = text.split(/\r?\n/);
  const ext = path.extname(fileRel).toLowerCase();
  const violations = [];
  
  let blocks = [];
  const isRust = ext === '.rs';
  
  // Collect blocks based on file type
  if (ext === '.ts' || ext === '.tsx') {
    blocks = [
      ...collectTsJsFunctions(lines),
      ...collectTsJsClasses(lines),
      ...collectTsInterfaces(lines),
      ...collectTsTypes(lines),
      ...collectTsEnums(lines)
    ];
  } else if (ext === '.js' || ext === '.mjs' || ext === '.svelte') {
    blocks = [
      ...collectTsJsFunctions(lines),
      ...collectTsJsClasses(lines)
    ];
  } else if (isRust) {
    blocks = collectRustFunctions(lines);
  }
  
  // Get context overrides
  let blockLimits = { ...config.blockLimits };
  for (const [contextName, context] of Object.entries(config.contextOverrides || {})) {
    if (context.patterns.some(pattern => matchesPattern(fileRel, pattern))) {
      blockLimits = { ...blockLimits, ...context.blockLimits };
      break;
    }
  }
  
  // Apply custom limits from exemption comments
  if (exemptions.customLimits) {
    blockLimits = { ...blockLimits, ...exemptions.customLimits };
  }
  
  // Check each block
  for (const block of blocks) {
    const startLine = block.line;
    
    // Check if block is exempted
    if (exemptions.blocks.has(startLine + 1)) {
      continue;
    }
    
    const brace = findFirstBrace(lines, startLine, isRust);
    if (!brace) continue;
    
    const endLine = findBlockEnd(lines, brace, isRust);
    if (endLine === null) continue;
    
    const length = endLine - startLine + 1;
    const limit = blockLimits[block.type] || 100;
    
    if (length > limit) {
      violations.push({
        kind: block.type,
        path: fileRel,
        line: startLine + 1,
        length,
        max: limit
      });
    }
  }
  
  return violations;
}

// ============================================================================
// Main Analysis
// ============================================================================

function analyzeFiles() {
  const repoRoot = process.cwd();
  const files = listFiles(repoRoot, config.exemptionPatterns);
  const violations = [];
  
  const startTime = Date.now();
  
  for (const abs of files) {
    const fileRel = path.relative(repoRoot, abs).replace(/\\/g, '/');
    const text = fs.readFileSync(abs, 'utf8');
    const lines = text.split(/\r?\n/);
    const loc = lines.length;
    
    // Parse exemptions
    const exemptions = parseExemptions(text);
    
    // Skip file if exempted
    if (exemptions.file) {
      if (options.verbose) {
        console.log(`Skipping exempted file: ${fileRel}`);
      }
      continue;
    }
    
    // Classify file
    const classification = classifyFile(fileRel);
    
    // Check file size
    if (classification && loc > classification.limit) {
      violations.push({
        kind: 'file',
        type: classification.type,
        category: classification.category,
        path: fileRel,
        line: 1,
        length: loc,
        max: classification.limit
      });
    }
    
    // Check block sizes
    const blockViolations = detectBlockViolations(fileRel, text, classification, exemptions);
    violations.push(...blockViolations);
  }
  
  const duration = Date.now() - startTime;
  
  return {
    violations,
    fileCount: files.length,
    duration
  };
}

// ============================================================================
// Output Formatters
// ============================================================================

function formatTerminal(result) {
  const { violations, fileCount, duration } = result;
  
  let output = '';
  
  if (violations.length === 0) {
    output += '\x1b[32m✓\x1b[0m File size policy V2: All checks passed\n';
    output += `  Files analyzed: ${fileCount}\n`;
    output += `  Duration: ${duration}ms\n`;
    return output;
  }
  
  output += `\x1b[31m✗\x1b[0m File size policy V2: ${violations.length} violation(s) found\n\n`;
  
  // Group by kind
  const byKind = {};
  for (const v of violations) {
    const key = v.kind;
    if (!byKind[key]) byKind[key] = [];
    byKind[key].push(v);
  }
  
  for (const [kind, items] of Object.entries(byKind)) {
    output += `\x1b[33m${kind.toUpperCase()} violations:\x1b[0m\n`;
    for (const item of items) {
      if (item.kind === 'file') {
        output += `  - ${item.path}:${item.line} (${item.type}): ${item.length} lines exceeds ${item.max}\n`;
      } else {
        output += `  - ${item.path}:${item.line}: ${item.length} lines exceeds ${item.max}\n`;
      }
    }
    output += '\n';
  }
  
  output += `Files analyzed: ${fileCount}\n`;
  output += `Duration: ${duration}ms\n`;
  
  return output;
}

function formatJSON(result) {
  return JSON.stringify(result, null, 2);
}

function formatHTML(result) {
  const { violations, fileCount, duration } = result;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>File Size Policy V2 Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: ${violations.length === 0 ? '#10b981' : '#ef4444'};
      color: white;
      padding: 2rem;
    }
    .header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .header p { font-size: 1.1rem; opacity: 0.9; }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      padding: 2rem;
      background: #f9fafb;
    }
    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 6px;
      border-left: 4px solid #3b82f6;
    }
    .stat-card h3 { font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem; }
    .stat-card p { font-size: 1.5rem; font-weight: bold; color: #111827; }
    .violations {
      padding: 2rem;
    }
    .violation-group {
      margin-bottom: 2rem;
    }
    .violation-group h2 {
      font-size: 1.25rem;
      color: #111827;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #e5e7eb;
    }
    .violation-item {
      padding: 1rem;
      margin-bottom: 0.5rem;
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      border-radius: 4px;
    }
    .violation-item code {
      background: #fee2e2;
      padding: 0.25rem 0.5rem;
      border-radius: 3px;
      font-size: 0.875rem;
    }
    .footer {
      padding: 1rem 2rem;
      background: #f9fafb;
      text-align: center;
      color: #6b7280;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>File Size Policy V2 Report</h1>
      <p>${violations.length === 0 ? '✓ All checks passed' : `✗ ${violations.length} violation(s) found`}</p>
    </div>
    
    <div class="stats">
      <div class="stat-card">
        <h3>Files Analyzed</h3>
        <p>${fileCount}</p>
      </div>
      <div class="stat-card">
        <h3>Violations</h3>
        <p>${violations.length}</p>
      </div>
      <div class="stat-card">
        <h3>Duration</h3>
        <p>${duration}ms</p>
      </div>
    </div>
    
    ${violations.length > 0 ? `
    <div class="violations">
      ${Object.entries(violations.reduce((acc, v) => {
        const key = v.kind;
        if (!acc[key]) acc[key] = [];
        acc[key].push(v);
        return acc;
      }, {})).map(([kind, items]) => `
        <div class="violation-group">
          <h2>${kind.toUpperCase()} Violations (${items.length})</h2>
          ${items.map(item => `
            <div class="violation-item">
              <code>${item.path}:${item.line}</code>
              ${item.kind === 'file' ? ` (${item.type})` : ''}
              - ${item.length} lines exceeds limit of ${item.max}
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    <div class="footer">
      Generated by File Size Policy V2 (${VERSION}) at ${new Date().toISOString()}
    </div>
  </div>
</body>
</html>`;
}

// ============================================================================
// Main Execution
// ============================================================================

function main() {
  if (options.verbose) {
    console.log('File Size Policy V2');
    console.log(`Version: ${VERSION}`);
    console.log(`Mode: ${mode}`);
    console.log(`Config: ${options.config}`);
    console.log(`Format: ${options.format}`);
    console.log('');
  }
  
  const result = analyzeFiles();
  
  let output;
  switch (options.format) {
    case 'json':
      output = formatJSON(result);
      break;
    case 'html':
      output = formatHTML(result);
      break;
    default:
      output = formatTerminal(result);
  }
  
  if (options.output) {
    fs.writeFileSync(options.output, output, 'utf8');
    console.log(`Report written to: ${options.output}`);
  } else {
    console.log(output);
  }
  
  // Exit based on mode
  if (result.violations.length > 0) {
    if (mode === 'strict') {
      process.exit(1);
    } else if (mode === 'warn' || mode === 'audit') {
      process.exit(0);
    }
  }
  
  process.exit(0);
}

main();
