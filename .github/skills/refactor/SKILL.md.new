---
name: refactor
description: "Surgical refactoring with self-adaptive learning. Evaluates quality, learns from patterns, optimizes techniques. Behavior preservation mandatory."
license: MIT
---

# Refactor (Self-Adaptive Code Improvement)

## Overview

This skill provides **structured code refactoring with continuous learning** that improves internal code structure without changing external behavior. It combines safe refactoring protocols with an **agentic-eval framework** that learns from refactoring results, accumulating knowledge over time to improve refactoring quality and effectiveness.

**Key capabilities:**
- **Behavior Preservation**: Mandatory - external behavior must remain unchanged
- **Self-adaptive**: Learns successful patterns, tracks code smells, calibrates approaches
- **Quality-driven**: Multi-dimensional scoring (completeness, correctness, maintainability, safety)
- **Pattern Learning**: Accumulates knowledge about effective refactoring techniques
- **Safety-first**: Risky changes flagged and avoided

**Why this approach:**
- Refactoring is a skill that improves with practice and learning
- Agentic-eval integration enables continuous improvement of refactoring strategies
- Knowledge base reduces repetition and guides effective transformations
- Multi-dimensional scoring ensures high-quality refactorings

## Architecture

### Self-Adaptive Learning Loop

```
Code Analysis → Refactor Plan → Execute Changes → Evaluate Quality → Learn Patterns → Next Refactor
                                                        ↓
                                                  Knowledge Update
```

**Components:**
1. **Core Skill (SKILL.md)**: Refactoring protocols and execution patterns
2. **Evaluator (evaluator.js)**: Quality assessment, pattern detection, learning
3. **Knowledge Base (refactor-knowledge.json)**: Persists learned patterns, smells, successful techniques

**Learning mechanisms:**
- Code smell tracking (long methods, magic numbers, deep nesting, duplication)
- Successful refactoring pattern accumulation
- Technique confidence calibration based on outcomes
- Smell clustering to identify common problem signatures

## Core Contract

When using this skill:

- External behavior **MUST** remain unchanged
- Public APIs **MUST** remain unchanged unless explicitly requested
- Return types **MUST** remain unchanged
- Side effects **MUST** remain unchanged
- Async/sync behavior **MUST** remain unchanged
- No new dependencies unless explicitly requested
- No feature additions
- No logic rewrites disguised as refactoring

If behavior must change, the user must explicitly allow it.

## Refactor Execution Protocol

When invoked, follow this exact sequence:

### 1. ANALYZE

- Summarize what the code does
- Identify primary code smells
- Identify refactor opportunities
- Confirm assumptions about behavior

### 2. PLAN

- List minimal refactor steps
- Confirm no behavior change
- Confirm public interfaces preserved
- State chosen refactor mode

### 3. EXECUTE (Surgically)

- Apply smallest safe transformations
- Make incremental structural improvements
- Preserve logic exactly
- Keep formatting consistent with existing style

### 4. EVALUATE (with Agentic-Eval)

- Score refactoring quality (completeness, correctness, maintainability, safety)
- Detect patterns and improvements
- Generate actionable feedback
- Update knowledge base

### 5. OUTPUT FORMAT

Default: Unified diff format.

Alternative (only if requested): Full refactored file.

After code, include:

- Summary of changes (concise)
- Why it improves maintainability
- Confirmation of behavior preservation
- **Evaluation scores** (if learning enabled)

## Refactor Modes

User may specify a mode. If not specified, default to `minimal`.

### Mode: minimal
- Extract small methods
- Rename unclear variables
- Remove dead code
- Introduce constants
- Add light type improvements

Smallest possible safe improvement.

### Mode: structural
- Break large functions
- Split god classes
- Improve module boundaries
- Introduce parameter objects

No architectural redesign.

### Mode: type-safety
- Add explicit types
- Replace `any`
- Introduce domain types
- Improve null safety
- Strengthen return types (without changing shape)

### Mode: design-pattern
- Replace conditionals with polymorphism
- Introduce strategy
- Apply single responsibility
- Improve dependency flow

Only when clearly beneficial.

## Evaluation & Learning System

### Evaluation Rubric

The evaluator scores each refactoring across four dimensions:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| **Completeness** | 25% | All intended refactorings applied? |
| **Correctness** | 35% | Behavior preserved correctly? |
| **Maintainability** | 25% | Code more maintainable? |
| **Safety** | 15% | No risky changes introduced? |

**Overall Score** = Σ(dimension_score × weight)

### Scoring Dimensions

#### Completeness (25%)
Measures whether all intended refactorings were applied.

**Checks:**
- Code actually changed? (baseline: 0.8)
- Improvements detected? (+0.1 for some, +0.2 for many)
- Mode-specific expectations met?
  - Minimal: basic improvements present
  - Structural: significant structural changes
  - Type-safety: type additions present

**Score interpretation:**
- `0.90-1.0`: Excellent, all refactorings applied
- `0.70-0.89`: Good, most changes completed
- `<0.70`: Incomplete, significant work remaining

#### Correctness (35%)
Measures whether behavior was preserved correctly.

**Checks:**
- Function signatures unchanged? (−0.2 if changed)
- Async/sync behavior preserved? (−0.15 if changed)
- Side effects order maintained? (−0.05 per change)
- Error handling preserved? (−0.1 if changed)

**Score interpretation:**
- `0.95-1.0`: Excellent, behavior perfectly preserved
- `0.85-0.94`: Good, minor potential issues
- `<0.85`: Risk of behavior changes, review carefully

#### Maintainability (25%)
Measures whether code is more maintainable after refactoring.

**Factors:**
- Code smells removed: +0.1 per smell (up to +0.3)
- Code length: +0.1 if reduced 10-50%
- Improved naming: +0.1 if better patterns added
- New smells introduced: −0.1 per smell
- Code bloat: −0.1 if >20% longer

**Score interpretation:**
- `0.80-1.0`: Excellent, significantly more maintainable
- `0.60-0.79`: Good, some improvement
- `<0.60`: Poor, little to no improvement

#### Safety (15%)
Measures whether risky changes were avoided.

**Checks:**
- New dependencies: −0.2 if added
- New `any` types: −0.15 if added
- Removed error handling: −0.15 if removed
- Dangerous patterns (eval, innerHTML): −0.2 if added

**Score interpretation:**
- `0.90-1.0`: Excellent, very safe refactoring
- `0.75-0.89`: Good, minor risks
- `<0.75`: Risky, review carefully

### Code Smell Detection

The evaluator recognizes common code smells:

| Smell | Severity | Pattern | Impact |
|-------|----------|---------|--------|
| `longMethod` | Medium | Functions >50 lines | Maintainability |
| `magicNumber` | Low | Hardcoded numbers (3+ digits) | Maintainability |
| `deepNesting` | High | 4+ nesting levels | Complexity |
| `duplicatedCode` | High | Repeated 30+ char sequences | Maintainability |
| `largeClass` | Medium | Classes >300 lines | Maintainability |
| `longParameterList` | Medium | Parameter lists >80 chars | Usability |

### Improvement Detection

The evaluator tracks improvements made:

| Improvement | Pattern | Benefit |
|-------------|---------|---------|
| `extractedMethod` | New function/const declarations | Structure |
| `introducedConstant` | New CONSTANT declarations | Readability |
| `addedType` | Type annotations added | Type safety |
| `reducedNesting` | Early returns added | Complexity |
| `improvedNaming` | Semantic naming (is/has/get/set) | Clarity |

### Knowledge Base Schema

**Structure** (`refactor-knowledge.json`):
```json
{
  "version": "1.0",
  "learned_smells": [
    {
      "type": "longMethod",
      "severity": "medium",
      "description": "Long method (>50 lines estimated)",
      "occurrences": 15,
      "first_seen": "2026-02-15T10:00:00.000Z",
      "last_seen": "2026-02-15T14:00:00.000Z"
    }
  ],
  "successful_refactorings": [
    {
      "mode": "minimal",
      "smells_removed": 3,
      "improvements": ["extractedMethod", "introducedConstant"],
      "timestamp": "2026-02-15T14:30:00.000Z"
    }
  ],
  "refactoring_patterns": {
    "extract_method": {
      "success_count": 42,
      "confidence": 0.88
    },
    "introduce_constant": {
      "success_count": 28,
      "confidence": 0.82
    }
  },
  "threshold_calibration": {
    "minimal_mode": {
      "baseline_score": 0.82,
      "confidence_threshold": 0.78,
      "adjusted_from": [
        {
          "date": "2026-02-10",
          "old": 0.80,
          "new": 0.82,
          "reason": "improved pattern recognition"
        }
      ]
    }
  },
  "smell_clusters": [
    {
      "smell_signature": "deepNesting+longMethod",
      "smells": ["deepNesting", "longMethod"],
      "occurrences": 8,
      "first_seen": "2026-02-12T09:00:00.000Z",
      "last_seen": "2026-02-15T11:00:00.000Z"
    }
  ]
}
```

**Fields:**
- **`learned_smells`**: Tracked code smell occurrences with frequency
- **`successful_refactorings`**: History of effective refactorings
- **`refactoring_patterns`**: Pattern success rates with confidence scores
- **`threshold_calibration`**: Baseline scores and thresholds per mode
- **`smell_clusters`**: Common smell combinations (helps identify systemic issues)

### Evaluation Output Schema

**File** (`evaluation.json`):
```json
{
  "refactoring_id": "BushingOrchestrator",
  "overall_score": 0.84,
  "dimensions": {
    "completeness": 0.90,
    "correctness": 0.95,
    "maintainability": 0.75,
    "safety": 0.85
  },
  "confidence": 0.88,
  "feedback": [
    {
      "dimension": "maintainability",
      "severity": "medium",
      "message": "Maintainability did not improve significantly",
      "action": "Consider more aggressive refactoring or different approach"
    }
  ],
  "recommendations": [
    {
      "category": "code-quality",
      "priority": "high",
      "suggestion": "Address 2 remaining high-severity code smell(s)",
      "rationale": "deepNesting, duplicatedCode"
    }
  ],
  "smells_removed": 3,
  "improvements_applied": 5,
  "patterns_learned": 2,
  "knowledge_base_updated": true
}
```

**Confidence score:**
- High variance in dimension scores → lower confidence
- Low scores in any dimension → reduced confidence
- Typical range: 0.70-0.95

## Usage Workflows

### Workflow 1 — Minimal Safe Cleanup

**Goal:** Basic code cleanup without structural changes.

**Invocation:**
```
Use refactor skill in minimal mode.
```

**Process:**
1. Analyze code for basic smells
2. Extract small constants
3. Rename unclear variables
4. Remove dead code
5. Add light type hints
6. **Evaluate** refactoring quality
7. **Learn** effective patterns

**When to use:** Regular code maintenance, PR cleanup.

### Workflow 2 — Structural Improvement

**Goal:** Break down large functions/classes into manageable pieces.

**Invocation:**
```
Use refactor skill in structural mode.
```

**Process:**
1. Identify large methods/classes
2. Extract cohesive sub-functions
3. Introduce parameter objects
4. Improve module boundaries
5. **Evaluate** structural improvements
6. **Learn** successful decomposition patterns

**When to use:** Legacy code cleanup, complexity reduction.

### Workflow 3 — Type Safety Hardening

**Goal:** Add type annotations and remove `any`.

**Invocation:**
```
Use refactor skill in type-safety mode.
```

**Process:**
1. Identify missing types
2. Replace `any` with specific types
3. Add domain types
4. Improve null safety
5. **Evaluate** type coverage improvement
6. **Learn** effective typing strategies

**When to use:** TypeScript migration, type safety improvements.

### Workflow 4 — Design Pattern Application

**Goal:** Apply design patterns to improve architecture.

**Invocation:**
```
Use refactor skill in design-pattern mode.
```

**Process:**
1. Identify architectural issues
2. Select appropriate patterns
3. Apply transformations incrementally
4. Verify behavior preservation
5. **Evaluate** architectural improvement
6. **Learn** pattern effectiveness

**When to use:** Complex refactorings, architectural improvements.

### Workflow 5 — Learning-Driven Refactoring

**Goal:** Use accumulated knowledge to guide refactoring.

**Process:**
1. Load knowledge base
2. Review learned smell patterns
3. Apply high-confidence refactoring techniques
4. Use calibrated thresholds
5. **Evaluate** with consensus scoring
6. **Update** knowledge base

**When to use:** Regular refactoring sessions, continuous improvement.

## Safety Constraints

These are mandatory:

- Do **NOT** change function names unless rename is explicitly requested
- Do **NOT** change exported API surface
- Do **NOT** reorder side-effect execution
- Do **NOT** modify business rules
- Do **NOT** alter validation logic
- Do **NOT** change error semantics
- Do **NOT** silently fix bugs (that is not refactoring)

If a bug is detected:
- Mention it
- Do not fix unless explicitly requested

## Scope Control

If the file is large:

- Refactor only the provided snippet
- Do not speculate about unseen code
- Do not introduce cross-module changes
- Stay within visible scope

## Code Smells to Target

Focus on:

- Long methods (> 50 lines)
- Duplicated logic
- Large classes
- Long parameter lists
- Nested conditionals
- Magic numbers/strings
- Primitive obsession
- Dead code
- Inappropriate intimacy
- Feature envy

Avoid speculative refactoring.

## Refactoring Checklist (Internal)

Before finalizing:

- [ ] Public API unchanged
- [ ] Behavior preserved
- [ ] Tests would still pass
- [ ] No new dependencies
- [ ] No logic changed
- [ ] Code more readable
- [ ] Complexity reduced or equal
- [ ] Evaluation score >0.75 (if learning enabled)

If any box cannot be checked, stop and explain.

## Maturity Levels

This skill implements a **Level 3** agentic-eval architecture:

| Level | Capability | Status |
|-------|------------|--------|
| **Level 1** | Basic reflection | ✅ Implemented |
| **Level 2** | Evaluator separation | ✅ Implemented (separate evaluator.js) |
| **Level 3** | Pattern learning & knowledge base | ✅ Implemented |
| **Level 4** | Benchmark-driven | 🔄 Partial (threshold calibration) |
| **Level 5** | Confidence-calibrated & cost-aware | 🔄 Partial (confidence scores) |

**Roadmap to Level 5:**
- Add cost-aware routing (skip evaluation for trivial refactorings)
- Confidence-based technique selection
- Automated benchmark suite for refactoring quality

## Integration with Agentic-Eval Framework

This skill implements core patterns from the **Agentic-Eval Framework** (`.github/skills/ agentic-eval/SKILL.md`):

### Pattern: Evaluator Separation (Level 2)

**Implementation:**
- Core skill = Generator (produces refactorings)
- evaluator.js = Evaluator (scores + critiques)
- Separate concerns ensure evaluator can evolve independently

### Pattern: Rubric-Based Evaluation

**Implementation:**
- Four dimensions: completeness, correctness, maintainability, safety
- Weighted scoring: `overall_score = Σ(dim × weight)`
- Documented rubric in evaluation output

### Pattern: Knowledge Persistence (Level 3-4)

**Implementation:**
- `learned_smells`: Track occurrences over time
- `successful_refactorings`: Accumulate effective techniques
- `refactoring_patterns`: Calibrate confidence based on success rates
- `smell_clusters`: Identify systemic issues

### Pattern: Confidence-Based Routing (Level 5)

**Implementation:**
- `calculateConfidence()`: Score variance analysis
- Confidence output in evaluation JSON
- **Future:** Skip evaluation if confidence >0.95 and score >0.90

## Troubleshooting

### Issue: Low maintainability score despite changes

**Symptom:**
```json
{
  "dimensions": {
    "maintainability": 0.52
  }
}
```

**Diagnosis:**
- Code smells not significantly reduced
- Code length increased without clear benefit
- No improved naming patterns detected

**Fix:**
1. Focus on smell removal (extract methods, reduce nesting)
2. Keep code length stable or reduced
3. Use semantic naming patterns (is/has/get/set/create)

### Issue: Correctness score below 0.90

**Symptom:**
```json
{
  "dimensions": {
    "correctness": 0.78
  },
  "feedback": [
    {
      "dimension": "correctness",
      "severity": "high",
      "message": "Potential behavior changes detected"
    }
  ]
}
```

**Diagnosis:**
- Function signatures changed
- Async/sync behavior modified
- Error handling altered

**Fix:**
1. Review all public API changes
2. Ensure side effects remain in same order
3. Verify error handling unchanged
4. Run tests to confirm behavior preservation

### Issue: Knowledge base not updating

**Symptom:**
```json
{
  "patterns_learned": 0,
  "knowledge_base_updated": false
}
```

**Diagnosis:**
- No smells detected
- No improvements made
- File permissions issue

**Fix:**
1. Ensure refactoring actually changed code
2. Check file permissions on `refactor-knowledge.json`
3. Verify evaluator can write to knowledge base path

## FAQ

### How does the evaluator detect code smells?

The evaluator uses regex patterns to detect common smells:
- **Long methods**: Functions with >500 characters estimated
- **Magic numbers**: Hardcoded numeric literals (3+ digits, not in quotes)
- **Deep nesting**: 4+ levels of braces `{`
- **Duplicated code**: 30+ character sequences repeated within ~5 lines
- **Large classes**: Classes with >2000 characters estimated
- **Long parameter lists**: Parameter lists >80 characters

These are heuristics and may have false positives/negatives. Review evaluator suggestions carefully.

### Can I customize the evaluation rubric?

**Yes.** Edit `evaluator.js` → `WEIGHTS` constant:

```javascript
const WEIGHTS = {
  completeness: 0.25,  // Adjust as needed
  correctness: 0.35,
  maintainability: 0.25,
  safety: 0.15,
};
```

Or add custom dimensions by extending the `evaluate()` method.

### How does knowledge persist across refactoring sessions?

The `refactor-knowledge.json` file accumulates learning:
1. **Learned smells**: Occurrence counts increment with each detection
2. **Successful refactorings**: Successful patterns added to history
3. **Pattern confidence**: Success rates update after each refactoring
4. **Smell clusters**: Common smell combinations tracked

Commit the knowledge base to git for team-wide learning, or use external storage (database, S3) with custom path.

### What if a refactoring introduces a bug?

**Refactoring should not introduce bugs.** If correctness score is <0.90:
1. Review the evaluation feedback
2. Run tests to verify behavior
3. Revert if tests fail
4. Apply safer, more incremental refactorings

The evaluator flags potential behavior changes but cannot guarantee correctness. Always run tests after refactoring.

### Can I disable learning for specific refactorings?

Currently, the evaluator runs on every refactoring. To disable:
1. Don't call `evaluator.evaluate()`
2. Or skip `updateKnowledgeBase()` call in evaluator

**Future:** Add `--learn false` flag similar to default-browser-devtools skill.

### How do I interpret confidence scores?

**Confidence** (0-1) indicates evaluation reliability:
- **High confidence (>0.90)**: Scores are stable, evaluation is reliable
- **Medium confidence (0.70-0.90)**: Some uncertainty, review carefully
- **Low confidence (<0.70)**: High variance in scores, manual review recommended

Low confidence often means:
- Extreme scores in some dimensions (e.g., correctness 1.0, maintainability 0.3)
- Limited pattern detection
- Unusual refactoring approach

## Advanced Examples

### Example 1: Extract Method Refactoring

**Before:**
```javascript
function processOrder(order) {
  // Validation (long block)
  if (!order.id) throw new Error("Missing order ID");
  if (!order.items || order.items.length === 0) throw new Error("Empty order");
  if (!order.customer) throw new Error("Missing customer");
  
  // Calculation (long block)
  let total = 0;
  for (const item of order.items) {
    total += item.price * item.quantity;
  }
  const tax = total * 0.1;
  const shipping = total > 100 ? 0 : 10;
  const finalTotal = total + tax + shipping;
  
  // Persistence (long block)
  db.orders.insert(order);
  db.transactions.insert({ orderId: order.id, amount: finalTotal });
  emailService.send(order.customer.email, `Order ${order.id} confirmed`);
  
  return { total: finalTotal, tax, shipping };
}
```

**After (minimal mode):**
```javascript
function processOrder(order) {
  validateOrder(order);
  const totals = calculateOrderTotals(order);
  persistOrder(order, totals.final);
  return totals;
}

function validateOrder(order) {
  if (!order.id) throw new Error("Missing order ID");
  if (!order.items?.length) throw new Error("Empty order");
  if (!order.customer) throw new Error("Missing customer");
}

function calculateOrderTotals(order) {
  const subtotal = order.items.reduce((sum, item) => 
    sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.1;
  const shipping = subtotal > 100 ? 0 : 10;
  return { subtotal, tax, shipping, final: subtotal + tax + shipping };
}

function persistOrder(order, total) {
  db.orders.insert(order);
  db.transactions.insert({ orderId: order.id, amount: total });
  emailService.send(order.customer.email, `Order ${order.id} confirmed`);
}
```

**Evaluation:**
```json
{
  "overall_score": 0.88,
  "dimensions": {
    "completeness": 0.95,
    "correctness": 1.0,
    "maintainability": 0.85,
    "safety": 0.90
  },
  "smells_removed": 1,
  "improvements_applied": 3
}
```

### Example 2: Introduce Constant

**Before:**
```javascript
function calculateDiscount(order) {
  if (order.total > 1000) {
    return order.total * 0.15;
  } else if (order.total > 500) {
    return order.total * 0.10;
  } else if (order.total > 100) {
    return order.total * 0.05;
  }
  return 0;
}
```

**After (minimal mode):**
```javascript
const DISCOUNT_TIER_PLATINUM = 1000;
const DISCOUNT_TIER_GOLD = 500;
const DISCOUNT_TIER_SILVER = 100;

const DISCOUNT_RATE_PLATINUM = 0.15;
const DISCOUNT_RATE_GOLD = 0.10;
const DISCOUNT_RATE_SILVER = 0.05;

function calculateDiscount(order) {
  if (order.total > DISCOUNT_TIER_PLATINUM) {
    return order.total * DISCOUNT_RATE_PLATINUM;
  } else if (order.total > DISCOUNT_TIER_GOLD) {
    return order.total * DISCOUNT_RATE_GOLD;
  } else if (order.total > DISCOUNT_TIER_SILVER) {
    return order.total * DISCOUNT_RATE_SILVER;
  }
  return 0;
}
```

**Evaluation:**
```json
{
  "overall_score": 0.82,
  "dimensions": {
    "completeness": 0.90,
    "correctness": 1.0,
    "maintainability": 0.70,
    "safety": 0.95
  },
  "smells_removed": 1,
  "improvements_applied": 6
}
```

## Example Invocation Patterns

**Minimal safe cleanup:**
```
Use refactor skill in minimal mode.
```

**Structural improvement:**
```
Use refactor skill in structural mode.
```

**Type hardening:**
```
Use refactor skill in type-safety mode.
```

**Pattern application:**
```
Use refactor skill in design-pattern mode.
```

**With evaluation:**
```
Use refactor skill in minimal mode. Evaluate refactoring quality and update knowledge base.
```

## When NOT to Use

Do not use this skill for:

- Rewrites
- Feature additions
- Architecture redesign
- Performance overhauls
- Business logic changes

Use repo-rebuilder or architecture skill for that.

## Design Philosophy

Refactoring is controlled evolution.

It improves:
- Readability
- Maintainability
- Type safety
- Structural clarity

Without changing:
- Behavior
- Interfaces
- Business rules

**Small steps. Safe changes. No surprises.**

With continuous learning, refactoring skills compound over time.

## References

- **Agentic-Eval Framework**: `.github/skills/ agentic-eval/SKILL.md`
- **Martin Fowler's Refactoring**: https://refactoring.com/
- **Refactoring Catalog**: https://refactoring.guru/refactoring/catalog

## License

MIT
