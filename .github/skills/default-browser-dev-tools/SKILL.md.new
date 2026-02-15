---
name: default-browser-devtools
description: 'Cross-engine automation with self-adaptive learning. Validates UI, captures evidence, learns from failures. WebKit/Blink testing, deterministic workflows, agentic-eval integration.'
license: MIT
---

# Default Browser Engine DevTools Agent (Self-Adaptive Testing)

## Overview

This skill provides **cross-engine testing with continuous learning** for self-contained Svelte apps. It combines deterministic test workflows with an **agentic-eval framework** that learns from test execution results, accumulating knowledge over time to improve test quality and reduce false positives.

**Key capabilities:**
- **Engine vs Browser**: Targets real compatibility boundaries: **Blink** vs **WebKit**
- **Self-adaptive**: Learns patterns, optimizes selectors, calibrates thresholds
- **Evidence-based**: Captures screenshots, console logs, network failures, accessibility snapshots
- **Evaluation-driven**: Scores tests on completeness, precision, recall, efficiency
- **Knowledge persistence**: Accumulates learning across CI runs via knowledge base

**Why this approach:**
- Testing rendering engines (Blink/WebKit) covers 99% of browser compatibility issues
- Agentic-eval integration enables continuous quality improvement without manual tuning
- Knowledge base reduces false positives and noise over time
- Multi-dimensional scoring provides actionable feedback

## Architecture

### Self-Adaptive Learning Loop

```
Test Execution → Evidence Capture → Evaluation → Pattern Detection → Knowledge Update → Next Run
                                        ↓
                                  Optimization
                                  Suggestions
```

**Components:**
1. **Runner (runner.js)**: Executes tests via Playwright, captures artifacts
2. **Evaluator (evaluator.js)**: Scores test quality, detects patterns, suggests optimizations
3. **Knowledge Base (test-knowledge.json)**: Persists learned patterns, optimized selectors, thresholds

**Learning mechanisms:**
- Pattern occurrence tracking (ResizeObserver loops, hydration errors, network timeouts)
- Selector confidence calibration based on interaction success rates
- Failure clustering to identify common issue signatures
- Threshold adjustment based on historical baseline scores

## Engine Targets

| Platform target | Practical engine family to test | Playwright engine |
|---|---|---|
| iOS / macOS | WebKit (Safari engine; iOS requires WebKit) | `webkit` |
| Windows / ChromeOS | Blink (Chromium/Edge family) | `chromium` |
| Linux | varies by distro/toolkit; often WebKitGTK; sometimes Chromium | `webkit` (default), optional `chromium` |

> Linux note: there is no single "default engine" across distros. This skill treats Linux as **WebKit-first** (WebKitGTK-like environments), but supports **Chromium** if that matches your target.

## Prerequisites

- Node.js 18+
- Playwright dev dependency

### Setup

```bash
npm i -D playwright
npx playwright install
```

## Runner CLI Reference

### Commands

#### `smoke`
Load + conservative click sweep + artifacts + evaluation

**Purpose:** Verify basic load, hydration, and interaction correctness across engines.

**Artifacts:**
- `baseline.png`, `post_interaction.png`
- `snapshot_baseline.json`, `snapshot_post.json`
- `console.json`, `network_failures.json`
- `summary.json`, `evaluation.json`

**Example:**
```bash
node .github/skills/default-browser-devtools/runner.js smoke \
  --url http://localhost:5173 \
  --engines webkit,chromium \
  --learn true
```

#### `triage`
Console + network failures + screenshot + evaluation

**Purpose:** Fastest signal for "what broke?" debugging.

**Artifacts:**
- `baseline.png`
- `console.json`, `network_failures.json`
- `summary.json`, `evaluation.json`

**Example:**
```bash
node .github/skills/default-browser-devtools/runner.js triage \
  --url http://localhost:5173 \
  --engine webkit
```

#### `golden`
Deterministic feature sequence + evaluation

**Purpose:** "Don't lose features" regression detection.

**Edit `steps` array in runner.js** to match your app's invariants:
```javascript
const steps = [
  { type: "clickText", value: "Surface" },
  { type: "waitText", value: "Surface Toolbox" },
  { type: "clickSelector", value: "#export-btn" },
  { type: "fillSelector", selector: "#filename", value: "test.csv" },
  { type: "press", value: "Enter" },
];
```

**Artifacts:**
- `golden_end.png`
- `snapshot_golden_end.json`
- `console.json`, `network_failures.json`
- `summary.json`, `evaluation.json`

**Example:**
```bash
node .github/skills/default-browser-devtools/runner.js golden \
  --url http://localhost:5173 \
  --engines webkit,chromium
```

#### `perf`
Performance trace + analysis

**Purpose:** Capture trace.zip for performance profiling.

**Artifacts:**
- `trace.zip` (open in Playwright trace viewer or Chrome DevTools)

**Example:**
```bash
node .github/skills/default-browser-devtools/runner.js perf \
  --url http://localhost:5173 \
  --engine chromium
```

**Note:** Performance mode skips evaluation phase (not applicable to perf traces).

#### `eval`
Evaluate existing test artifacts (no test execution)

**Purpose:** Re-evaluate past test runs with updated knowledge base or evaluator logic.

**Example:**
```bash
node .github/skills/default-browser-devtools/runner.js eval \
  --artifacts ./artifacts/default-browser-devtools/20260215_103000 \
  --learn true
```

### CLI Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `--url` | string | `http://localhost:5173` | Target URL to test |
| `--engine` | string | - | Single engine: `webkit` or `chromium` |
| `--engines` | string | `webkit,chromium` | Comma-separated list of engines |
| `--learn` | boolean | `true` | Enable evaluation & learning phase |
| `--knowledge-base` | string | `./test-knowledge.json` | Path to knowledge base JSON |
| `--eval-only` | boolean | `false` | Only evaluate, don't run tests |
| `--eval-consensus` | number | `1` | Run evaluation N times for consensus scoring |
| `--artifacts` | string | - | Path to artifacts directory (for eval-only mode) |
| `--headless` | boolean | `true` | Run browser in headless mode |
| `--readySelector` | string | - | Selector to wait for before proceeding |
| `--readyText` | string | - | Text to wait for before proceeding |
| `--timeoutMs` | number | `30000` | Timeout for ready checks (ms) |
| `--sweepSelector` | string | `button, a, [role='button'], summary` | Selector for click sweep |
| `--maxClicks` | number | `30` | Max interactions in click sweep |
| `--postClickWaitMs` | number | `120` | Wait time after each click (ms) |
| `--viewportWidth` | number | `1280` | Viewport width (px) |
| `--viewportHeight` | number | `720` | Viewport height (px) |
| `--perfWindowMs` | number | `1500` | Performance capture window (ms) |
| `--eval` | string | - | JavaScript expression to evaluate on page |

### Output Structure

```
artifacts/default-browser-devtools/<timestamp>/
├── webkit/
│   ├── baseline.png
│   ├── post_interaction.png
│   ├── snapshot_baseline.json
│   ├── snapshot_post.json
│   ├── console.json
│   ├── network_failures.json
│   ├── summary.json
│   └── evaluation.json          ← Agentic-eval output
├── chromium/
│   └── ... (same structure)
├── combined_summary.json
└── combined_evaluation.json      ← When using eval command
```

## Evaluation & Learning System

### Evaluation Rubric

The evaluator scores each test run across four dimensions:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| **Completeness** | 30% | All expected artifacts captured? |
| **Precision** | 25% | Low false positive rate? |
| **Recall** | 25% | Critical failures detected? |
| **Efficiency** | 20% | Good cost vs value ratio? |

**Overall Score** = Σ(dimension_score × weight)

### Scoring Dimensions

#### Completeness (30%)
Measures whether all expected evidence was captured.

**Checks:**
- Baseline screenshot present? (+15%)
- Console logs captured? (+15%)
- Network failures logged? (+15%)
- Summary file written? (+10%)
- Command-specific artifacts? (+15-25%)
  - Smoke: post-interaction screenshot, post-snapshot
  - Golden: golden-end screenshot, golden-end snapshot
  - Perf: trace.zip
- Interaction data (smoke)? (+10%)
- Ready signal captured? (+10%)

**Score interpretation:**
- `0.90-1.0`: Excellent, all evidence captured
- `0.70-0.89`: Good, minor gaps
- `<0.70`: Incomplete, missing critical artifacts

#### Precision (25%)
Measures false positive rate (noise vs signal).

**Factors:**
- ResizeObserver loop count (common false positive, -2% per occurrence)
- Excessive warnings (>20 warnings, -10%)
- Dev asset failures (localhost/127.0.0.1, -5% per failure)

**Score interpretation:**
- `0.90-1.0`: Excellent, very low noise
- `0.70-0.89`: Acceptable, some false positives
- `<0.70`: High noise, needs filtering

#### Recall (25%)
Measures whether critical failures are detected.

**Checks:**
- Page errors detected? (if test passed despite errors, -30%)
- Console errors caught? (if test passed despite errors, -30%)
- Hydration issues detected? (critical for Svelte, -20% if missed)

**Score interpretation:**
- `0.90-1.0`: Excellent, all critical issues caught
- `0.70-0.89`: Good, minor blind spots
- `<0.70`: Poor recall, missing failures

#### Efficiency (20%)
Measures cost vs value (are we wasting effort?).

**Factors:**
- Interaction count (smoke test):
  - <5 interactions: -20% (too few, low coverage)
  - 10-30 interactions: optimal
  - >50 interactions: -30% (diminishing returns)
- Error rate:
  - >10 errors: -20% (noisy test, wasted effort)

**Score interpretation:**
- `0.90-1.0`: Excellent efficiency
- `0.60-0.89`: Acceptable
- `<0.60`: Inefficient, needs optimization

### Pattern Detection

The evaluator recognizes common failure patterns:

| Pattern | Severity | Description | Evaluator Uses |
|---------|----------|-------------|----------------|
| `resizeObserverLoop` | Low | ResizeObserver loop detected | Precision adjustment, filtering suggestion |
| `hydrationError` | High | Svelte hydration mismatch | Critical issue flag, code quality optimization |
| `networkTimeout` | Medium | Network request timeout | Reliability optimization, timeout tuning |
| `timingIssue` | Medium | Timing/async/race condition | Code quality flag, timing optimization |

### Optimization Suggestions

Based on detected patterns and scores, the evaluator suggests improvements:

**Example optimizations:**
```json
{
  "optimizations": [
    {
      "category": "filtering",
      "priority": "low",
      "suggestion": "Add ResizeObserver loop filtering to reduce noise",
      "rationale": "5 occurrences detected"
    },
    {
      "category": "code-quality",
      "priority": "high",
      "suggestion": "Fix Svelte hydration mismatch (SSR/CSR content differs)",
      "rationale": "Hydration errors can cause UI inconsistencies"
    },
    {
      "category": "efficiency",
      "priority": "medium",
      "suggestion": "Reduce maxClicks or refine sweepSelector to focus on critical interactions",
      "rationale": "42 interactions is high; diminishing returns"
    }
  ]
}
```

### Knowledge Base Schema

**Structure** (`test-knowledge.json`):
```json
{
  "version": "1.0",
  "learned_patterns": [
    {
      "type": "resizeObserverLoop",
      "severity": "low",
      "description": "ResizeObserver loop detected (common false positive)",
      "occurrences": 12,
      "first_seen": "2026-02-15T10:30:00.000Z",
      "last_seen": "2026-02-15T14:20:00.000Z"
    }
  ],
  "optimized_selectors": {
    "interactive_elements": "button, a, [role='button'], summary, [onclick]",
    "confidence": 0.87
  },
  "threshold_calibration": {
    "smoke_test": {
      "baseline_score": 0.85,
      "confidence_threshold": 0.80,
      "adjusted_from": [
        { "date": "2026-02-10", "old": 0.80, "new": 0.85, "reason": "reduced false positives" }
      ]
    }
  },
  "failure_clusters": [
    {
      "pattern_signature": "hydrationError+networkTimeout",
      "patterns": ["hydrationError", "networkTimeout"],
      "occurrences": 3,
      "first_seen": "2026-02-14T09:00:00.000Z",
      "last_seen": "2026-02-15T12:00:00.000Z"
    }
  ]
}
```

**Fields:**
- **`learned_patterns`**: Tracked pattern occurrences with frequency and timestamps
- **`optimized_selectors`**: Selector strings refined based on interaction success rates
  - `confidence`: 0-1 score; used when ≥0.75
- **`threshold_calibration`**: Baseline scores and confidence thresholds for each workflow
- **`failure_clusters`**: Common failure combinations (helps identify systemic issues)

### Evaluation Output Schema

**File** (`evaluation.json`):
```json
{
  "test_run_id": "webkit",
  "overall_score": 0.87,
  "dimensions": {
    "completeness": 0.95,
    "precision": 0.82,
    "recall": 0.90,
    "efficiency": 0.78
  },
  "confidence": 0.89,
  "feedback": [
    {
      "dimension": "precision",
      "severity": "low",
      "message": "High false positive rate detected",
      "action": "Consider filtering known benign issues (e.g., ResizeObserver loops)"
    }
  ],
  "optimizations": [
    {
      "category": "filtering",
      "priority": "low",
      "suggestion": "Add ResizeObserver loop filtering to reduce noise",
      "rationale": "5 occurrences detected"
    }
  ],
  "patterns_detected": 2,
  "patterns_learned": 1,
  "knowledge_base_updated": true,
  "consensus": {
    "runs": 3,
    "average_score": 0.86,
    "average_confidence": 0.88,
    "variance": 0.0002
  }
}
```

**Confidence score:**
- High variance in dimension scores → lower confidence
- Missing data (e.g., null artifacts) → reduced confidence
- Typical range: 0.75-0.95

**Consensus mode** (`--eval-consensus N`):
- Runs evaluation N times
- Computes average scores and variance
- Low variance → stable evaluation
- High variance → consider adversarial review or refinement

## Workflows

### Workflow 1 — Smoke Test with Learning

**Goal:** Verify load + hydration + basic interactions, learn from results.

```bash
node .github/skills/default-browser-devtools/runner.js smoke \
  --url http://localhost:5173 \
  --engines webkit,chromium \
  --learn true
```

**Process:**
1. Launch webkit and chromium browsers
2. Navigate to URL, wait for networkidle
3. Capture baseline screenshot + accessibility snapshot
4. Perform conservative click sweep (up to 30 interactions)
5. Capture post-interaction screenshot + snapshot
6. Log console messages + network failures
7. **Evaluate** test quality (completeness, precision, recall, efficiency)
8. **Detect patterns** (ResizeObserver, hydration, timing issues)
9. **Suggest optimizations**
10. **Update knowledge base** with learned patterns

**Output:**
```
{
  "ok": true,
  "outRoot": "./artifacts/default-browser-devtools/20260215_143000",
  "engines": ["webkit", "chromium"],
  "results": [...]
}

--- Evaluation & Learning Phase ---

Evaluating webkit test run...
  Score: 0.87
  Confidence: 0.89
  Patterns detected: 2
  Patterns learned: 1
  Optimizations suggested: 1
    - [low] Add ResizeObserver loop filtering to reduce noise

Evaluating chromium test run...
  Score: 0.92
  Confidence: 0.91
  Patterns detected: 1
  Patterns learned: 0

✓ Knowledge base updated
```

### Workflow 2 — Triage (Fast Debugging)

**Goal:** Fastest path to "what broke?"

```bash
node .github/skills/default-browser-devtools/runner.js triage \
  --url http://localhost:5173 \
  --engine webkit \
  --learn true
```

**Process:**
1. Launch browser
2. Navigate to URL
3. Capture console logs + network failures + screenshot
4. Evaluate for critical issues
5. Update knowledge base

**Use case:** CI failure, need quick signal.

### Workflow 3 — Golden Path (Regression Prevention)

**Goal:** Ensure core features work across engines.

**Setup:**
Edit `steps` array in `runner.js`:
```javascript
const steps = [
  { type: "clickText", value: "Bushing" },
  { type: "waitText", value: "Bushing Toolbox" },
  { type: "fillSelector", selector: "#bore-diameter", value: "0.5" },
  { type: "clickText", value: "Compute" },
  { type: "waitText", value: "Stress Analysis" },
];
```

**Run:**
```bash
node .github/skills/default-browser-devtools/runner.js golden \
  --url http://localhost:5173 \
  --engines webkit,chromium \
  --learn true
```

**Use case:** Nightly regression suite, feature acceptance testing.

### Workflow 4 — Eval-Only Mode

**Goal:** Re-evaluate past test runs without re-running tests.

```bash
node .github/skills/default-browser-devtools/runner.js eval \
  --artifacts ./artifacts/default-browser-devtools/20260215_103000 \
  --learn true
```

**Use case:**
- Updated evaluator logic
- Knowledge base refinement
- Historical trend analysis

### Workflow 5 — Consensus Evaluation

**Goal:** Increase evaluation reliability via ensemble scoring.

```bash
node .github/skills/default-browser-devtools/runner.js smoke \
  --url http://localhost:5173 \
  --engine webkit \
  --eval-consensus 3
```

**Output:**
```
Evaluating webkit test run...
  Score: 0.86 (consensus of 3)
  Confidence: 0.88
```

**When to use:**
- High variance in scores
- Critical release validation
- Evaluator calibration

### Workflow 6 — Backward Compatible (Learning Disabled)

**Goal:** Run tests without evaluation phase.

```bash
node .github/skills/default-browser-devtools/runner.js smoke \
  --url http://localhost:5173 \
  --engines webkit,chromium \
  --learn false
```

**Use case:**
- CI environments without persistent storage
- Quick local checks
- Debugging evaluator issues

## Maturity Levels

This skill implements a **Level 4** agentic-eval architecture:

| Level | Capability | Status |
|-------|------------|--------|
| **Level 1** | Basic reflection | ✅ Implemented |
| **Level 2** | Evaluator separation | ✅ Implemented (separate evaluator.js) |
| **Level 3** | Adversarial & ensemble | ✅ Implemented (consensus mode) |
| **Level 4** | Benchmark-driven | ✅ Implemented (knowledge base baselines) |
| **Level 5** | Confidence-calibrated & cost-aware | 🔄 Partial (confidence scores, no cost routing yet) |

**Roadmap to Level 5:**
- Add cost-aware routing (skip evaluation for trivial tests)
- Confidence-based early stopping
- Evaluator model selection (small vs large)

## Cross-Platform Portability Checklist

When testing Svelte apps for cross-platform compatibility:

- [ ] Case-sensitive assets/imports (Linux/CI)
- [ ] Path separator assumptions (Windows vs Unix)
- [ ] Keyboard modifiers (Cmd vs Ctrl)
- [ ] Font/layout dependencies (WebKit text rendering differs)
- [ ] ResizeObserver / measurement loops (engine-specific)
- [ ] Scroll container behavior (iOS WebKit scroll anchoring)
- [ ] File input parsing + error UI (WebKit file dialog differences)
- [ ] CSS containment (Blink vs WebKit implementation gaps)
- [ ] Intersection observer thresholds (rounding differences)

## Troubleshooting

### Issue: Evaluation score is low despite test passing

**Symptom:**
```
Score: 0.62
Confidence: 0.75
Feedback:
  - [medium] Test efficiency could be improved
```

**Diagnosis:**
- Check `dimensions` in `evaluation.json`
- Low efficiency? → Too many interactions or high error rate
- Low precision? → High false positive rate
- Low recall? → Critical errors not detected

**Fix:**
1. Review `optimizations` array for specific suggestions
2. Adjust CLI arguments (e.g., `--maxClicks 20` to reduce interaction count)
3. Update knowledge base to filter known false positives

### Issue: Knowledge base not updating

**Symptom:**
```
Patterns learned: 0
Knowledge base updated: false
```

**Diagnosis:**
- Check file permissions on `test-knowledge.json`
- Verify `--learn true` is set
- Check console for error messages

**Fix:**
```bash
# Verify file exists and is writable
ls -l .github/skills/default-browser-devtools/test-knowledge.json
chmod 644 .github/skills/default-browser-devtools/test-knowledge.json

# Run with explicit path
node runner.js smoke --url http://localhost:5173 \
  --knowledge-base /absolute/path/to/test-knowledge.json
```

### Issue: High variance in consensus evaluation

**Symptom:**
```
Score: 0.75 (consensus of 3)
Variance: 0.08
```

**Diagnosis:**
- Variance >0.05 indicates unstable evaluation
- Possible causes:
  - Non-deterministic test behavior
  - Timing-dependent failures
  - Evaluator logic ambiguity

**Fix:**
1. Add `--readySelector` or `--readyText` for more stable ready detection
2. Increase `--postClickWaitMs` for slower interactions
3. Review console logs for timing issues
4. Consider adversarial review (manual inspection)

### Issue: Selector confidence degrading

**Symptom:**
```json
{
  "optimized_selectors": {
    "confidence": 0.52
  }
}
```

**Diagnosis:**
- Many failed interactions
- Selector is too broad or includes non-interactive elements

**Fix:**
1. Review `summary.json` → `interactions` array for failed items
2. Refine `--sweepSelector`:
   ```bash
   --sweepSelector "button:not([disabled]), a[href], [role='button'][tabindex]"
   ```
3. Confidence will automatically increase as success rate improves

### Issue: Eval-only mode fails with missing artifacts

**Symptom:**
```
Error: No summary.json found at <path>
```

**Diagnosis:**
- Artifacts directory structure doesn't match expected format
- Test run failed before writing artifacts

**Fix:**
1. Verify directory structure:
   ```
   artifacts/
     default-browser-devtools/
       <timestamp>/
         webkit/
           summary.json
         chromium/
           summary.json
   ```
2. Point to timestamp directory, not engine directory:
   ```bash
   --artifacts ./artifacts/default-browser-devtools/20260215_103000
   ```

## FAQ

### How does learning persist across CI runs?

**Knowledge base file must be committed:**

```bash
# After local testing with learning
git add .github/skills/default-browser-dev-tools/test-knowledge.json
git commit -m "Update test knowledge base"
git push
```

In CI, mount knowledge base as artifact or use persistent volume:

```yaml
# GitHub Actions example
- name: Run smoke test
  run: |
    node .github/skills/default-browser-devtools/runner.js smoke \
      --url http://localhost:5173 \
      --learn true

- name: Upload knowledge base
  uses: actions/upload-artifact@v3
  with:
    name: test-knowledge
    path: .github/skills/default-browser-dev-tools/test-knowledge.json
```

**Alternative:** Use external storage (S3, database) with custom `--knowledge-base` path.

### When should I use consensus mode?

**Use `--eval-consensus N` when:**
- Evaluating critical release candidates
- High variance in historical scores
- Calibrating evaluator after logic changes
- Detecting evaluator bias or drift

**Typical N values:**
- `N=1`: Default, fast
- `N=3`: Standard consensus, good balance
- `N=5`: High reliability, slower

**Cost:** N× evaluation time (but no additional test execution).

### Can I customize the evaluation rubric?

**Yes.** Edit `evaluator.js` → `WEIGHTS` constant:

```javascript
const WEIGHTS = {
  completeness: 0.30,  // Adjust as needed
  precision: 0.25,
  recall: 0.25,
  efficiency: 0.20,
};
```

Or add custom dimensions:

```javascript
const customScore = this.scoreCustomDimension(summary);
const overallScore =
  completeness * 0.25 +
  precision * 0.20 +
  recall * 0.20 +
  efficiency * 0.15 +
  customScore * 0.20;
```

**Recommendation:** Keep weights documented in knowledge base:
```json
{
  "rubric_config": {
    "completeness": 0.30,
    "precision": 0.25,
    "recall": 0.25,
    "efficiency": 0.20
  }
}
```

### How do I disable learning for specific test runs?

**Temporary disable:**
```bash
--learn false
```

**Permanent disable (CI):**
```bash
export DISABLE_TEST_LEARNING=true
```

Then in `runner.js`:
```javascript
if (process.env.DISABLE_TEST_LEARNING === "true") {
  args.learn = "false";
}
```

### What's the difference between smoke, triage, and golden?

| Command | Purpose | Speed | Coverage | When to use |
|---------|---------|-------|----------|-------------|
| **smoke** | Load + interaction sweep | Moderate | High | PR checks, nightly regression |
| **triage** | Console + network only | Fast | Low | CI failure debugging |
| **golden** | Deterministic feature path | Moderate | Focused | Feature acceptance, critical path validation |
| **perf** | Performance profiling | Slow | N/A | Performance investigation |

### Can I run evaluation without tests?

**Yes.** Use `eval` command or `--eval-only true`:

```bash
# Re-evaluate past run
node runner.js eval --artifacts ./artifacts/default-browser-devtools/20260215_103000

# Or with existing command
node runner.js smoke --url http://localhost:5173 --eval-only true --artifacts <path>
```

**Use case:**
- Updated evaluator logic
- Knowledge base refinement
- Historical trend analysis
- Debugging evaluation scores

### How does the evaluator handle flaky tests?

**Pattern detection:**
- Timing issues → Medium severity pattern
- Network timeouts → Suggests retry logic
- Hydration errors → High severity, indicates code issue

**Confidence adjustment:**
- High variance across runs → Lower confidence
- Inconsistent patterns → Suggests flakiness

**Recommendation:**
1. Use `--eval-consensus 3` to detect flakiness
2. Review `evaluation.json` → `consensus.variance`
3. High variance? Add stabilization (timeouts, ready checks)

### What happens if knowledge base is corrupted?

**Auto-recovery:**
- Evaluator detects parse errors
- Falls back to default knowledge base
- Logs warning: `Failed to parse knowledge base: <error>, using defaults`

**Manual fix:**
```bash
# Backup corrupted file
mv test-knowledge.json test-knowledge.json.bak

# Regenerate from template
cp test-knowledge.json.template test-knowledge.json

# Or let evaluator create default
rm test-knowledge.json
node runner.js smoke --url http://localhost:5173 --learn true
```

## Integration with Agentic-Eval Framework

This skill implements core patterns from the **Agentic-Eval Framework** (`.github/skills/ agentic-eval/SKILL.md`):

### Pattern: Evaluator Separation (Level 2)

**Implementation:**
- `runner.js` = Generator (produces test results)
- `evaluator.js` = Evaluator (scores + critiques)
- Separate concerns ensure evaluator can evolve independently

### Pattern: Multi-Judge Consensus (Level 3)

**Implementation:**
```bash
--eval-consensus 3
```

**Logic:**
```javascript
const evaluations = [];
for (let i = 0; i < consensus; i++) {
  evaluations.push(evaluator.evaluate(engineOut));
}
const avgScore = evaluations.reduce((sum, e) => sum + e.overall_score, 0) / evaluations.length;
```

**Variance interpretation:**
- Low variance (<0.01) → stable evaluation
- High variance (>0.05) → unreliable, needs refinement

### Pattern: Rubric-Based Evaluation

**Implementation:**
- Four dimensions: completeness, precision, recall, efficiency
- Weighted scoring: `overall_score = Σ(dim × weight)`
- Documented rubric in evaluation output

### Pattern: Knowledge Persistence (Level 4)

**Implementation:**
- `learned_patterns`: Track occurrences over time
- `optimized_selectors`: Refine based on success rates
- `threshold_calibration`: Adjust baselines from historical data
- `failure_clusters`: Identify systemic issues

### Pattern: Confidence-Based Routing (Level 5)

**Implementation:**
- `calculateConfidence()`: Score variance + data completeness
- Confidence output in evaluation JSON
- **Future:** Skip evaluation if confidence >0.95 and score >0.90

### Pattern: Cost-Aware Learning

**Current:**
- Learning can be disabled: `--learn false`
- Evaluation is fast (no LLM calls, pure logic)

**Future:**
- Skip evaluation for trivial tests (<50 lines of console output)
- Cache repeated evaluations (hash of artifacts)

## Advanced Examples

### Example 1: CI Integration with Learning

**GitHub Actions workflow:**
```yaml
name: Cross-Engine Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Start dev server
        run: npm run dev &
        env:
          PORT: 5173
      
      - name: Wait for server
        run: npx wait-on http://localhost:5173
      
      - name: Run smoke tests
        run: |
          node .github/skills/default-browser-devtools/runner.js smoke \
            --url http://localhost:5173 \
            --engines webkit,chromium \
            --learn true \
            --knowledge-base .github/skills/default-browser-dev-tools/test-knowledge.json
      
      - name: Upload artifacts
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: artifacts/
      
      - name: Commit knowledge base updates
        if: github.ref == 'refs/heads/main'
        run: |
          git config user.name "github-actions"
          git config user.email "github-actions@github.com"
          git add .github/skills/default-browser-dev-tools/test-knowledge.json
          git diff --quiet || git commit -m "Update test knowledge base [skip ci]"
          git push
```

### Example 2: Local Development Loop

```bash
#!/bin/bash
# dev-test-loop.sh

# Start dev server in background
npm run dev &
DEV_PID=$!

# Wait for server
sleep 3

# Run smoke test with learning
node .github/skills/default-browser-devtools/runner.js smoke \
  --url http://localhost:5173 \
  --engines webkit,chromium \
  --learn true \
  --headless false

# Kill dev server
kill $DEV_PID

# Show evaluation summary
cat artifacts/default-browser-devtools/*/webkit/evaluation.json | jq '.overall_score, .feedback'
```

### Example 3: Historical Trend Analysis

```bash
# Evaluate multiple past runs
for dir in artifacts/default-browser-devtools/*/; do
  echo "Evaluating $dir"
  node .github/skills/default-browser-devtools/runner.js eval \
    --artifacts "$dir" \
    --learn false
done | jq -s '.[] | {timestamp: .test_run_id, score: .overall_score}'
```

**Output:**
```json
[
  {"timestamp": "20260210_100000", "score": 0.78},
  {"timestamp": "20260211_100000", "score": 0.82},
  {"timestamp": "20260212_100000", "score": 0.85},
  {"timestamp": "20260215_100000", "score": 0.87}
]
```

**Analysis:** Score improving over time → learning is effective.

### Example 4: Selective Learning (Per-Branch)

```bash
# main branch: aggressive learning
if [ "$BRANCH" = "main" ]; then
  LEARN=true
  CONSENSUS=3
else
  # feature branches: basic learning
  LEARN=true
  CONSENSUS=1
fi

node runner.js smoke --url http://localhost:5173 \
  --learn $LEARN \
  --eval-consensus $CONSENSUS
```

## References

- **Agentic-Eval Framework**: `.github/skills/ agentic-eval/SKILL.md`
- **Playwright Docs**: https://playwright.dev/docs/intro
- **WebKit vs Blink**: https://en.wikipedia.org/wiki/Comparison_of_browser_engines

## License

MIT
