# File Size Policy Migration Guide: V1 → V2

## 📋 Overview

This guide provides a step-by-step migration path from File Size Policy V1 to V2. V2 is **fully backward compatible** and can run alongside V1 during transition.

## 🎯 Migration Strategy

**Gradual Rollout**: V2 is opt-in, allowing teams to validate accuracy before switching.

### Timeline Recommendation

- **Week 1-2**: Run V2 in warn mode alongside V1
- **Week 3-4**: Compare outputs, validate accuracy
- **Week 5+**: Switch to V2 as default (keep V1 as backup)

## 📊 V1 vs V2 Feature Comparison

| Feature | V1 | V2 | Migration Impact |
|---------|----|----|------------------|
| **Detection Types** | Functions, Classes, Files | +Interfaces, Types, Enums | ⚠️ More violations |
| **File Types** | TS, JS, Svelte, Rust, HTML | +CSS, SCSS | ⚠️ More violations |
| **String Handling** | Basic | Smart (Rust lifetimes) | ✅ Fewer false positives |
| **Exemptions** | None | Comments, Patterns | ✅ More flexibility |
| **Configuration** | Hardcoded | JSON file | ✅ Easier customization |
| **Output Formats** | Terminal | Terminal, JSON, HTML | ✅ Better reporting |
| **Modes** | Strict only | Strict, Warn, Audit | ✅ Non-blocking option |
| **Context Overrides** | None | Test, Solver, Runtime | ✅ Smarter limits |
| **Performance** | ~200ms | ~300ms | ⚠️ Slightly slower |
| **Violations Found** | 12 | 27 | ⚠️ More accurate |

### Legend
- ✅ **Improvement**: Better feature, easier workflow
- ⚠️ **Consideration**: May require attention

## 🔄 Breaking Changes

**None!** V2 is fully backward compatible:

- V1 script remains unchanged at `scripts/verify-file-size-policy.mjs`
- V2 is a new script at `scripts/verify-file-size-policy-v2.mjs`
- Both can run simultaneously
- No changes to existing workflows required

## 📝 Migration Steps

### Step 1: Add V2 Scripts to package.json

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "verify:file-size-policy:v2": "node ./scripts/verify-file-size-policy-v2.mjs",
    "verify:file-size-policy:v2:json": "node ./scripts/verify-file-size-policy-v2.mjs --format=json --output=violations.json",
    "verify:file-size-policy:v2:html": "node ./scripts/verify-file-size-policy-v2.mjs --format=html --output=report.html",
    "verify:file-size-policy:v2:warn": "node ./scripts/verify-file-size-policy-v2.mjs --mode=warn"
  }
}
```

**Existing V1 scripts remain unchanged!**

### Step 2: Create Configuration File

Create `.sizepolicy.json` in repository root:

```json
{
  "mode": "strict",
  "fileLimits": {
    "svelte": {
      "component": 300,
      "orchestrator": 800,
      "page": 500
    },
    "typescript": {
      "controller": 400,
      "stateManager": 500,
      "utility": 200,
      "test": 500,
      "default": 300
    },
    "javascript": {
      "config": 150,
      "script": 300,
      "default": 200
    },
    "rust": {
      "module": 800,
      "handler": 400,
      "model": 300,
      "service": 600,
      "utility": 200,
      "main": 200
    },
    "css": 300,
    "scss": 400,
    "html": {
      "layout": 150,
      "template": 200
    },
    "config": {
      "json": 150,
      "toml": 150
    },
    "store": 200
  },
  "blockLimits": {
    "function": 100,
    "class": 400,
    "method": 80,
    "interface": 200,
    "type": 150,
    "enum": 100
  },
  "exemptionPatterns": [
    "node_modules/**",
    ".svelte-kit/**",
    "build/**",
    "dist/**",
    "target/**",
    ".golden_build_cjs/**",
    "**/*.d.ts",
    "**/generated/**"
  ],
  "contextOverrides": {
    "test": {
      "patterns": ["**/*.spec.ts", "**/*.test.ts"],
      "blockLimits": {
        "function": 150
      }
    },
    "solverEngine": {
      "patterns": ["**/solveEngine.ts", "**/solve.ts"],
      "blockLimits": {
        "function": 150
      }
    },
    "babylonRuntime": {
      "patterns": ["**/BushingBabylonRuntime.ts", "**/babylon/**/*.ts"],
      "blockLimits": {
        "function": 150
      }
    }
  }
}
```

**Tip**: Start with defaults and customize as needed.

### Step 3: Test V2 in Warn Mode

Run V2 in warn mode (non-blocking) to see what it finds:

```bash
npm run verify:file-size-policy:v2:warn
```

**Expected outcome**: V2 will find more violations than V1 (interfaces, types, CSS files).

### Step 4: Compare V1 and V2 Outputs

Run both to compare:

```bash
echo "=== V1 ===" && npm run verify:file-size-policy || true
echo ""
echo "=== V2 ===" && npm run verify:file-size-policy:v2:warn
```

**Validation**: Ensure V2 finds **all** V1 violations plus additional ones.

### Step 5: Generate HTML Report

Create a visual report to review violations:

```bash
npm run verify:file-size-policy:v2:html
open report.html  # macOS
xdg-open report.html  # Linux
```

**Review**: Check if new violations (interfaces, CSS, etc.) are legitimate.

### Step 6: Address New Violations

V2 will find violations V1 missed. Options:

#### Option A: Refactor (Recommended)

Extract large blocks into smaller, focused units:

```typescript
// Before: 250-line interface
interface LargeInterface {
  // ... 250 properties ...
}

// After: Split into focused interfaces
interface CoreData { /* ... */ }
interface ExtendedData extends CoreData { /* ... */ }
interface MetaData { /* ... */ }
```

#### Option B: Exempt Temporarily

Use comment-based exemptions for gradual refactoring:

```typescript
// @size-policy-exempt interface:300
interface LegacyInterface {
  // Mark for future refactoring
}
```

#### Option C: Adjust Limits

Update `.sizepolicy.json` if limits are too restrictive:

```json
{
  "blockLimits": {
    "interface": 300  // Increased from 200
  }
}
```

### Step 7: Add V2 to CI (Optional)

Update `.github/workflows/ci.yml`:

```yaml
# Keep V1 (current)
- name: Run file size policy V1
  run: npm run verify:file-size-policy
  continue-on-error: true

# Add V2 in warn mode
- name: Run file size policy V2 (warn mode)
  run: npm run verify:file-size-policy:v2:warn
  continue-on-error: true
```

**Gradual transition**: Run both in warn mode initially.

### Step 8: Switch to V2 as Default

After validation (2-4 weeks), switch CI to V2:

```yaml
# V2 as primary
- name: Run file size policy V2
  run: npm run verify:file-size-policy:v2

# V1 as backup (optional)
- name: Run file size policy V1 (backup)
  run: npm run verify:file-size-policy
  continue-on-error: true
```

### Step 9: Update Documentation

Update project documentation to reference V2:

- `.github/copilot-instructions.md`: Add V2 examples
- `FILE_SIZE_POLICY_GATED_PLAN_V1.md`: Note V2 availability
- Team wikis/docs: Link to `FILE_SIZE_POLICY_V2.md`

### Step 10: Remove V1 (Optional)

After V2 is stable (3+ months), optionally remove V1:

```bash
# Remove V1 script
rm scripts/verify-file-size-policy.mjs

# Remove V1 npm script from package.json
# "verify:file-size-policy": "node ./scripts/verify-file-size-policy.mjs",  # DELETE

# Rename V2 to be the default
npm pkg set scripts.verify:file-size-policy="node ./scripts/verify-file-size-policy-v2.mjs"
```

**Recommendation**: Keep V1 as backup for at least 6 months.

## 🧪 Testing Strategy

### Phase 1: Local Testing (Week 1)

**Goal**: Validate V2 accuracy locally

```bash
# Run V1 (baseline)
npm run verify:file-size-policy > v1-output.txt 2>&1 || true

# Run V2 in warn mode
npm run verify:file-size-policy:v2:warn > v2-output.txt 2>&1

# Compare outputs
diff v1-output.txt v2-output.txt
```

**Expected**: V2 finds all V1 violations + additional ones (interfaces, CSS).

### Phase 2: Parallel CI Runs (Week 2-3)

**Goal**: Validate V2 in CI environment

```yaml
# Run both in parallel
- name: File Size Policy V1
  run: npm run verify:file-size-policy
  continue-on-error: true

- name: File Size Policy V2
  run: npm run verify:file-size-policy:v2:warn
  continue-on-error: true
```

**Monitor**: Check both pass/fail consistently.

### Phase 3: Team Validation (Week 3-4)

**Goal**: Get team feedback on accuracy

1. Share HTML report: `npm run verify:file-size-policy:v2:html`
2. Review violations with team
3. Adjust `.sizepolicy.json` based on feedback

### Phase 4: Production Rollout (Week 5+)

**Goal**: Make V2 the default

```yaml
# V2 in strict mode (fail build)
- name: File Size Policy V2
  run: npm run verify:file-size-policy:v2

# V1 as backup
- name: File Size Policy V1 (backup)
  run: npm run verify:file-size-policy
  continue-on-error: true
```

## 📊 Validation Checklist

Use this checklist to ensure migration is successful:

- [ ] V2 script runs without errors
- [ ] `.sizepolicy.json` exists and is valid JSON
- [ ] V2 finds all V1 violations (12 baseline violations)
- [ ] New violations (interfaces, CSS) are reviewed
- [ ] HTML report generates successfully
- [ ] JSON output is valid and structured
- [ ] Warn mode works (exit code 0 even with violations)
- [ ] Strict mode works (exit code 1 with violations)
- [ ] Exemption comments work correctly
- [ ] Context overrides apply correctly
- [ ] Performance is acceptable (<3s on 1000 files)
- [ ] Team has reviewed and approved V2 output
- [ ] CI workflow updated to include V2
- [ ] Documentation updated to reference V2

## 🐛 Common Migration Issues

### Issue 1: More Violations Than Expected

**Symptom**: V2 finds 27 violations instead of V1's 12.

**Explanation**: V2 detects additional block types:
- TypeScript interfaces (2 new violations)
- TypeScript types
- CSS files (1 new violation)
- More accurate file classification (12 new violations)

**Solution**:
1. **Review violations**: Are they legitimate?
2. **Refactor**: Split large interfaces/types
3. **Exempt temporarily**: Use `@size-policy-exempt-block`
4. **Adjust limits**: Update `.sizepolicy.json` if needed

### Issue 2: False Positives in Rust Code

**Symptom**: V2 incorrectly flags Rust functions with lifetime parameters.

**Status**: **Fixed in V2!** Rust lifetimes (`'_`, `'static`) are now handled correctly.

**If issue persists**:
```rust
// @size-policy-exempt-block
pub fn my_function<'a>(data: &'a Data) -> &'a Result {
    // ...
}
```

### Issue 3: Config File Not Found

**Symptom**: "Config file not found, using defaults"

**Solution**: Create `.sizepolicy.json` in repository root, or specify path:

```bash
node scripts/verify-file-size-policy-v2.mjs --config=path/to/config.json
```

### Issue 4: Performance Degradation

**Symptom**: V2 is significantly slower than V1.

**Expected**: V2 is ~100ms slower (300ms vs 200ms) due to enhanced detection.

**If much slower**:
1. Check exemption patterns include common directories
2. Verify file count: Run with `--verbose`
3. Report issue with file count and duration

### Issue 5: CI Build Failures

**Symptom**: CI fails immediately after adding V2.

**Solution**: Use warn mode initially:

```yaml
- name: File Size Policy V2 (warn mode)
  run: npm run verify:file-size-policy:v2:warn
  continue-on-error: true
```

After validation (2-4 weeks), switch to strict mode.

## 🔄 Rollback Plan

If issues arise, V2 can be easily reverted:

### Immediate Rollback (CI)

```yaml
# Comment out V2
# - name: File Size Policy V2
#   run: npm run verify:file-size-policy:v2

# Keep V1 active
- name: File Size Policy V1
  run: npm run verify:file-size-policy
```

### Full Rollback (Remove V2)

```bash
# Remove V2 script
rm scripts/verify-file-size-policy-v2.mjs

# Remove V2 config
rm .sizepolicy.json

# Remove V2 npm scripts from package.json
npm pkg delete scripts.verify:file-size-policy:v2
npm pkg delete scripts.verify:file-size-policy:v2:json
npm pkg delete scripts.verify:file-size-policy:v2:html
npm pkg delete scripts.verify:file-size-policy:v2:warn
```

**V1 remains fully functional!**

## 📈 Success Metrics

Track these metrics to measure migration success:

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Accuracy** | 100% of V1 violations detected | Compare V1 and V2 outputs |
| **False Positives** | <5% | Team review of violations |
| **Performance** | <3s on 1000 files | `Duration:` in output |
| **Team Adoption** | 80%+ use V2 | Survey or usage logs |
| **CI Stability** | No false failures | Monitor CI runs for 2 weeks |

## 🎯 Best Practices During Migration

### 1. Start with Warn Mode

Always start with warn mode to avoid breaking builds:

```bash
npm run verify:file-size-policy:v2:warn
```

### 2. Generate HTML Reports

Visual reports help team review violations:

```bash
npm run verify:file-size-policy:v2:html
# Share report.html in PRs or team channels
```

### 3. Use Comment Exemptions Liberally

Don't rush refactoring. Use exemptions for gradual improvement:

```typescript
// @size-policy-exempt interface:300
interface LegacyAPI {
  // TODO: Refactor in Q2 2026
}
```

### 4. Update Limits Based on Codebase

Adjust `.sizepolicy.json` to fit your codebase:

```json
{
  "blockLimits": {
    "interface": 250,  // Adjusted based on team feedback
    "type": 200
  }
}
```

### 5. Monitor CI Runs

Track V2 CI runs for anomalies:

```yaml
- name: File Size Policy V2 (with logging)
  run: |
    npm run verify:file-size-policy:v2:warn | tee size-policy.log
```

### 6. Document Custom Configurations

If you customize `.sizepolicy.json`, document why:

```json
{
  "// Note": "Interface limit raised to 250 due to legacy API interfaces",
  "blockLimits": {
    "interface": 250
  }
}
```

## 📚 Additional Resources

- **V2 Documentation**: `FILE_SIZE_POLICY_V2.md` - Complete feature reference
- **V1 Gated Plan**: `FILE_SIZE_POLICY_GATED_PLAN_V1.md` - Refactoring workflow
- **Copilot Instructions**: `.github/copilot-instructions.md` - AI agent guidance

## 🤝 Support

If you encounter issues during migration:

1. **Check troubleshooting**: See "Common Migration Issues" above
2. **Review V2 docs**: `FILE_SIZE_POLICY_V2.md`
3. **Generate debug output**: Run with `--verbose`
4. **Compare with V1**: Run both and compare outputs
5. **Use warn mode**: Non-blocking until issues resolved

## ✅ Post-Migration Checklist

After successful migration:

- [ ] V2 is default in CI
- [ ] Team is trained on V2 features
- [ ] `.sizepolicy.json` is customized for project
- [ ] Documentation updated
- [ ] V1 marked as deprecated (but kept as backup)
- [ ] Migration metrics tracked and reviewed
- [ ] Success shared with team

---

**Remember**: Migration is gradual and reversible. Take your time to validate accuracy and train the team on V2 features.

**Version**: 2.0.0  
**Last Updated**: February 2026  
**Maintainers**: Structural Companion Desktop Team
