# File Size Policy V2 - Complete Documentation

## 📋 Overview

File Size Policy V2 is an enhanced file and block size enforcement system that provides accurate, flexible, and developer-friendly code quality checks. It builds upon V1 with significant improvements in detection accuracy, configurability, and output formats.

### Key Features

- **AST-Aware Block Detection**: Accurately detects functions, classes, interfaces, types, and enums
- **Smart String Handling**: Avoids false positives from braces in strings and Rust lifetimes
- **Enhanced File Type Support**: TypeScript, JavaScript, Svelte, Rust, CSS/SCSS, HTML, and config files
- **Flexible Exemption System**: Comment-based exemptions, pattern matching, and custom limits
- **Configurable Rules**: Load limits and overrides from `.sizepolicy.json`
- **Multiple Output Formats**: Terminal (colored), JSON (CI-friendly), HTML (visual reports)
- **High Performance**: Analyzes 761 files in ~300ms
- **Context-Aware**: Different limits for test files, solver engines, and runtime files

## 🚀 Installation & Setup

### Prerequisites

- Node.js 18+ (uses ES modules)
- No external dependencies required (uses Node.js built-ins only)

### Files

1. **Main Script**: `scripts/verify-file-size-policy-v2.mjs` (executable)
2. **Configuration**: `.sizepolicy.json` (root of repository)

### Quick Start

```bash
# Run with default settings (strict mode, terminal output)
node scripts/verify-file-size-policy-v2.mjs

# Or use the npm script (after adding to package.json)
npm run verify:file-size-policy:v2
```

## 📊 Configuration Reference

The `.sizepolicy.json` file defines all size limits, exemptions, and behavior:

```json
{
  "mode": "strict",
  "fileLimits": { ... },
  "blockLimits": { ... },
  "exemptionPatterns": [ ... ],
  "contextOverrides": { ... }
}
```

### Enforcement Modes

- **`strict`** (default): Exit with code 1 if violations found (fail CI builds)
- **`warn`**: Report violations but exit with code 0 (non-blocking)
- **`audit`**: Same as warn, for auditing purposes

Override via CLI: `--mode=warn`

### File Size Limits

#### Svelte Files
```json
"svelte": {
  "component": 300,      // Standard Svelte components
  "orchestrator": 800,   // *Orchestrator.svelte files
  "page": 500            // Files in src/routes/
}
```

#### TypeScript Files
```json
"typescript": {
  "controller": 400,     // *Controller.ts or files in /controllers/
  "stateManager": 500,   // *StateManager.ts files
  "utility": 200,        // Files in /utils/ or *Util.ts
  "test": 500,           // *.spec.ts or *.test.ts
  "default": 300         // Other .ts files
}
```

#### JavaScript Files
```json
"javascript": {
  "config": 150,         // Files with 'config' in name
  "script": 300,         // Other .js/.mjs files
  "default": 200
}
```

#### Rust Files
```json
"rust": {
  "module": 800,         // General .rs files
  "handler": 400,        // *handler*.rs files
  "model": 300,          // *model*.rs files
  "service": 600,        // *service*.rs files
  "utility": 200,        // *util*.rs files
  "main": 200            // main.rs specifically
}
```

#### Other Files
```json
"css": 300,
"scss": 400,
"html": {
  "layout": 150,         // *layout*.html
  "template": 200        // Other .html files
},
"config": {
  "json": 150,
  "toml": 150
},
"store": 200             // Store files (store.ts, /stores/ folder)
```

### Block Size Limits

```json
"blockLimits": {
  "function": 100,       // Function declarations and arrow functions
  "class": 400,          // Class declarations
  "method": 80,          // Class methods (future enhancement)
  "interface": 200,      // TypeScript interfaces
  "type": 150,           // TypeScript type aliases
  "enum": 100            // TypeScript/Rust enums
}
```

### Exemption Patterns

Glob patterns to exclude from scanning:

```json
"exemptionPatterns": [
  "node_modules/**",
  ".svelte-kit/**",
  "build/**",
  "dist/**",
  "target/**",
  ".golden_build_cjs/**",
  "**/*.d.ts",           // TypeScript declaration files
  "**/generated/**"      // Generated code directories
]
```

### Context Overrides

Apply different limits based on file patterns:

```json
"contextOverrides": {
  "test": {
    "patterns": ["**/*.spec.ts", "**/*.test.ts"],
    "blockLimits": {
      "function": 150    // Test functions can be larger
    }
  },
  "solverEngine": {
    "patterns": ["**/solveEngine.ts", "**/solve.ts"],
    "blockLimits": {
      "function": 150    // Complex solver logic allowed
    }
  },
  "babylonRuntime": {
    "patterns": ["**/BushingBabylonRuntime.ts", "**/babylon/**/*.ts"],
    "blockLimits": {
      "function": 150    // 3D rendering setup can be complex
    }
  }
}
```

## 💬 Comment-Based Exemptions

### File-Level Exemption

Exempt an entire file from all checks:

```typescript
// @size-policy-exempt file
export function someFunction() {
  // This file won't be checked
}
```

### Block-Level Exemption

Exempt a specific function/class/interface from size checks:

```typescript
// @size-policy-exempt-block
export function complexLegacyFunction() {
  // This function won't be checked
  // ... 200 lines of legacy code ...
}
```

### Custom Limit Override

Override the default limit for a specific block:

```typescript
// @size-policy-exempt function:150
export function specialCase() {
  // This function can be up to 150 lines instead of 100
}
```

Supported overrides:
- `@size-policy-exempt function:N`
- `@size-policy-exempt class:N`
- `@size-policy-exempt interface:N`
- `@size-policy-exempt type:N`
- `@size-policy-exempt enum:N`

## 🖥️ CLI Usage

### Basic Commands

```bash
# Default: strict mode, terminal output
node scripts/verify-file-size-policy-v2.mjs

# Show help
node scripts/verify-file-size-policy-v2.mjs --help

# Show version
node scripts/verify-file-size-policy-v2.mjs --version
```

### Options

#### `--config=<path>`
Use a custom configuration file:
```bash
node scripts/verify-file-size-policy-v2.mjs --config=custom-policy.json
```

#### `--format=<type>`
Choose output format: `terminal`, `json`, or `html`:
```bash
# JSON output (for CI integration)
node scripts/verify-file-size-policy-v2.mjs --format=json

# HTML report (for visual review)
node scripts/verify-file-size-policy-v2.mjs --format=html
```

#### `--output=<path>`
Write report to a file instead of stdout:
```bash
# Generate JSON report
node scripts/verify-file-size-policy-v2.mjs --format=json --output=violations.json

# Generate HTML report
node scripts/verify-file-size-policy-v2.mjs --format=html --output=report.html
```

#### `--mode=<mode>`
Override enforcement mode from config:
```bash
# Warn mode (non-blocking)
node scripts/verify-file-size-policy-v2.mjs --mode=warn

# Audit mode
node scripts/verify-file-size-policy-v2.mjs --mode=audit
```

#### `--verbose`
Show detailed execution information:
```bash
node scripts/verify-file-size-policy-v2.mjs --verbose
```

### Common Use Cases

#### Local Development
```bash
# Quick check with warnings only
npm run verify:file-size-policy:v2:warn
```

#### CI Integration
```bash
# Strict mode (default) - fails if violations found
npm run verify:file-size-policy:v2

# Generate JSON report for processing
npm run verify:file-size-policy:v2:json
```

#### Code Review
```bash
# Generate visual HTML report
npm run verify:file-size-policy:v2:html

# Open in browser
open report.html  # macOS
xdg-open report.html  # Linux
```

## 📈 Output Formats

### Terminal (Default)

Colored, human-readable output:

```
✗ File size policy V2: 27 violation(s) found

FILE violations:
  - package-lock.json:1 (json): 4269 lines exceeds 150
  - src/app.css:1 (css): 541 lines exceeds 300

FUNCTION violations:
  - src/lib/core/bushing/normalize.ts:54: 124 lines exceeds 100

Files analyzed: 761
Duration: 318ms
```

### JSON

Structured data for CI systems and tools:

```json
{
  "violations": [
    {
      "kind": "file",
      "type": "css",
      "category": "css",
      "path": "src/app.css",
      "line": 1,
      "length": 541,
      "max": 300
    },
    {
      "kind": "function",
      "path": "src/lib/core/bushing/normalize.ts",
      "line": 54,
      "length": 124,
      "max": 100
    }
  ],
  "fileCount": 761,
  "duration": 318
}
```

### HTML

Visual report with statistics and styling:

- Header with overall status (pass/fail)
- Statistics cards (files analyzed, violations, duration)
- Grouped violations by type (file, function, interface, etc.)
- Styled with modern CSS (responsive, clean design)
- Timestamp and version information in footer

## 🔍 How It Works

### File Classification

V2 uses a sophisticated classification system based on:

1. **File extension**: `.ts`, `.js`, `.svelte`, `.rs`, `.css`, `.html`, etc.
2. **Filename patterns**: `*Orchestrator.svelte`, `*Controller.ts`, `*StateManager.ts`
3. **Path patterns**: `src/routes/`, `/controllers/`, `/utils/`
4. **Special markers**: `.spec.ts`, `.test.ts` for test files

### Block Detection

#### TypeScript/JavaScript
- **Functions**: `function name()`, `const name = () =>`, `async function`
- **Classes**: `class Name`, `export class Name`, `abstract class`
- **Interfaces**: `interface Name`, `export interface Name`
- **Types**: `type Name =`, `export type Name =`
- **Enums**: `enum Name`, `export enum Name`

#### Rust
- **Functions**: `fn name()`, `pub fn name()`, `async fn name()`
- **Special handling**: Ignores single quotes in lifetime parameters (`'static`, `'_`)

#### Svelte
- Treats as JavaScript with function and class detection

### String Literal Handling

V2 correctly handles:
- Double-quoted strings: `"hello {world}"`
- Single-quoted strings (JS/TS): `'hello {world}'`
- Template literals: `` `hello ${world}` ``
- Rust lifetimes (not treated as strings): `State<'_, DataState>`
- Escaped characters: `\"`, `\'`, `\\`

This prevents false positives from braces inside strings.

### Performance Optimizations

- **Smart file filtering**: Skips `node_modules`, build artifacts
- **Early returns**: Skips exempted files immediately
- **Efficient line counting**: Single pass through file
- **Minimal regex usage**: Pre-compiled patterns
- **No external dependencies**: Pure Node.js for fast startup

**Result**: Analyzes 761 files in ~300ms

## 🐛 Troubleshooting

### "Config file not found"

If `.sizepolicy.json` doesn't exist, V2 uses built-in defaults. To use a custom config:
```bash
node scripts/verify-file-size-policy-v2.mjs --config=path/to/config.json
```

### False Positives

If a legitimate block is flagged:

1. **Use comment-based exemption**:
   ```typescript
   // @size-policy-exempt-block
   function complexButNecessary() { ... }
   ```

2. **Use custom limit override**:
   ```typescript
   // @size-policy-exempt function:150
   function needsMoreLines() { ... }
   ```

3. **Add pattern to contextOverrides** in `.sizepolicy.json`:
   ```json
   "mySpecialCase": {
     "patterns": ["**/special/**/*.ts"],
     "blockLimits": { "function": 150 }
   }
   ```

### No Violations Detected

If V2 seems to miss violations:

1. **Check file classification**: Run with `--verbose` to see which files are analyzed
2. **Verify patterns**: Ensure exemption patterns aren't too broad
3. **Check context overrides**: Some patterns may have higher limits

### Performance Issues

If V2 is slow (>3s on 1000 files):

1. **Check exemption patterns**: Ensure common directories are excluded
2. **Verify file count**: Run with `--verbose` to see file count
3. **Report performance issue**: Include file count and duration

### Rust Lifetime Detection Issues

V2 correctly handles Rust lifetimes (`'_`, `'static`). If you encounter issues:

1. **Verify brace matching**: Check if braces in strings are confusing detection
2. **Use block exemption**: Add `// @size-policy-exempt-block` if needed

## 📊 Comparison with V1

| Feature | V1 | V2 |
|---------|----|----|
| **Detection Types** | Functions, Classes, Files | +Interfaces, Types, Enums |
| **File Types** | TS, JS, Svelte, Rust, HTML, Config | +CSS, SCSS |
| **String Handling** | Basic | Smart (Rust lifetimes, templates) |
| **Exemptions** | None | Comments, Patterns, Custom Limits |
| **Configuration** | Hardcoded | JSON file with overrides |
| **Output Formats** | Terminal only | Terminal, JSON, HTML |
| **Enforcement Modes** | Strict only | Strict, Warn, Audit |
| **Context Awareness** | None | Test files, Solvers, Runtime |
| **Performance** | ~200ms | ~300ms (more features) |
| **Violations Found** | 12 | 27 (more accurate) |

## 🔄 Backward Compatibility

V2 is **fully backward compatible**:
- V1 script remains unchanged
- V2 is opt-in via new npm scripts
- V2 detects **all** V1 violations plus additional ones
- No breaking changes to existing workflows

## 📝 Best Practices

### 1. Use Appropriate Exemptions

```typescript
// ✅ Good: Specific exemption for complex algorithm
// @size-policy-exempt function:150
export function complexSort() { ... }

// ❌ Bad: Blanket file exemption
// @size-policy-exempt file
```

### 2. Configure Context Overrides

For project-specific needs, use context overrides:

```json
"contextOverrides": {
  "integration": {
    "patterns": ["**/integration/**/*.spec.ts"],
    "blockLimits": { "function": 200 }
  }
}
```

### 3. Use Warn Mode During Refactoring

When refactoring large files:

```bash
# Non-blocking during refactoring
npm run verify:file-size-policy:v2:warn

# Generate HTML report to track progress
npm run verify:file-size-policy:v2:html
```

### 4. Integrate in CI

```yaml
# Warn mode: Report but don't fail build
- name: Run file size policy V2 (warn mode)
  run: npm run verify:file-size-policy:v2:warn
  continue-on-error: true

# Strict mode: Fail build on violations
- name: Run file size policy V2
  run: npm run verify:file-size-policy:v2
```

### 5. Generate Reports for Code Review

```bash
# Generate HTML report before PR
npm run verify:file-size-policy:v2:html
# Attach report.html to PR for review
```

## 🎯 Examples

### Example 1: Basic Usage

```bash
$ node scripts/verify-file-size-policy-v2.mjs
✗ File size policy V2: 3 violation(s) found

FILE violations:
  - src/app.css:1 (css): 541 lines exceeds 300

FUNCTION violations:
  - src/lib/core/bushing/normalize.ts:54: 124 lines exceeds 100
  - src/lib/core/bushing/solveEngine.ts:162: 262 lines exceeds 100

Files analyzed: 761
Duration: 318ms
```

### Example 2: Custom Config

```bash
# Create custom config
cat > .sizepolicy-strict.json <<EOF
{
  "mode": "strict",
  "fileLimits": {
    "typescript": {
      "default": 200
    }
  }
}
EOF

# Use custom config
node scripts/verify-file-size-policy-v2.mjs --config=.sizepolicy-strict.json
```

### Example 3: CI Integration

```yaml
# .github/workflows/ci.yml
- name: File Size Policy V2
  run: |
    npm run verify:file-size-policy:v2 || \
    (npm run verify:file-size-policy:v2:json && exit 1)
  
- name: Upload violation report
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: size-policy-violations
    path: violations.json
```

### Example 4: Code with Exemptions

```typescript
// File: src/lib/complex-algorithm.ts

// @size-policy-exempt function:150
export function complexAlgorithm(data: number[]): number[] {
  // This function implements a complex sorting algorithm
  // that requires more than 100 lines for clarity
  
  // ... 140 lines of well-documented algorithm ...
  
  return result;
}

// Standard function (100 line limit applies)
export function helperFunction() {
  // ... must be under 100 lines ...
}
```

## 🚀 Future Enhancements

Potential improvements for V3:

- **Method-level detection**: Track individual class methods separately
- **Cyclomatic complexity**: Measure code complexity alongside size
- **Auto-fix suggestions**: Suggest refactoring strategies
- **IDE integration**: VSCode extension with inline warnings
- **Historical tracking**: Track size trends over time
- **Machine learning**: Suggest optimal size limits based on codebase patterns

## 📚 Additional Resources

- **Migration Guide**: See `FILE_SIZE_POLICY_MIGRATION.md` for V1 → V2 migration
- **Gated Plan V1**: See `FILE_SIZE_POLICY_GATED_PLAN_V1.md` for refactoring workflow
- **Copilot Instructions**: See `.github/copilot-instructions.md` for AI agent guidance
- **Source Code**: `scripts/verify-file-size-policy-v2.mjs` (well-commented)

## 🤝 Contributing

When modifying V2:

1. Preserve backward compatibility with V1
2. Maintain performance (<3s on 1000 files)
3. Add tests for new detection patterns
4. Update documentation
5. Update `.sizepolicy.json` if adding new file types

## 📄 License

Part of the Structural Companion Desktop project.

---

**Version**: 2.0.0  
**Last Updated**: February 2026  
**Maintainers**: Structural Companion Desktop Team
