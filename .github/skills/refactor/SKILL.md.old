---
name: refactor
description: "Surgical code refactoring to improve maintainability without changing behavior. Applies structured, safe, incremental transformations. Behavior preservation is mandatory."
license: MIT
---

# Refactor

Improve internal structure without changing external behavior.

Refactoring is controlled structural improvement — not rewriting, not feature work, not redesign.

This skill enforces strict behavior preservation and minimal, safe changes.

---

# Core Contract

When using this skill:

- External behavior MUST remain unchanged
- Public APIs MUST remain unchanged unless explicitly requested
- Return types MUST remain unchanged
- Side effects MUST remain unchanged
- Async/sync behavior MUST remain unchanged
- No new dependencies unless explicitly requested
- No feature additions
- No logic rewrites disguised as refactoring

If behavior must change, the user must explicitly allow it.

---

# Refactor Execution Protocol

When invoked, follow this exact sequence:

## 1. ANALYZE

- Summarize what the code does
- Identify primary code smells
- Identify refactor opportunities
- Confirm assumptions about behavior

## 2. PLAN

- List minimal refactor steps
- Confirm no behavior change
- Confirm public interfaces preserved
- State chosen refactor mode

## 3. EXECUTE (Surgically)

- Apply smallest safe transformations
- Make incremental structural improvements
- Preserve logic exactly
- Keep formatting consistent with existing style

## 4. VERIFY

- Confirm behavior unchanged
- Confirm edge cases preserved
- Confirm no signature changes
- Identify potential risks (if any)

## 5. OUTPUT FORMAT

Default: Unified diff format.

Alternative (only if requested): Full refactored file.

After code, include:

- Summary of changes (concise)
- Why it improves maintainability
- Confirmation of behavior preservation

Do not include unnecessary explanation.

---

# Refactor Modes

User may specify a mode.

If not specified, default to `minimal`.

## Mode: minimal
- Extract small methods
- Rename unclear variables
- Remove dead code
- Introduce constants
- Add light type improvements

Smallest possible safe improvement.

## Mode: structural
- Break large functions
- Split god classes
- Improve module boundaries
- Introduce parameter objects

No architectural redesign.

## Mode: type-safety
- Add explicit types
- Replace `any`
- Introduce domain types
- Improve null safety
- Strengthen return types (without changing shape)

## Mode: design-pattern
- Replace conditionals with polymorphism
- Introduce strategy
- Apply single responsibility
- Improve dependency flow

Only when clearly beneficial.

---

# Safety Constraints

These are mandatory:

- Do NOT change function names unless rename is explicitly requested
- Do NOT change exported API surface
- Do NOT reorder side-effect execution
- Do NOT modify business rules
- Do NOT alter validation logic
- Do NOT change error semantics
- Do NOT silently fix bugs (that is not refactoring)

If a bug is detected:
- Mention it
- Do not fix unless explicitly requested

---

# Diff Format Standard

Default output should be unified diff style:

```
- old code
+ new code
```

Only show modified sections.

Do not rewrite entire files unless explicitly requested.

---

# Scope Control

If the file is large:

- Refactor only the provided snippet
- Do not speculate about unseen code
- Do not introduce cross-module changes
- Stay within visible scope

---

# Code Smells to Target

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

---

# Refactoring Checklist (Internal)

Before finalizing:

- [ ] Public API unchanged
- [ ] Behavior preserved
- [ ] Tests would still pass
- [ ] No new dependencies
- [ ] No logic changed
- [ ] Code more readable
- [ ] Complexity reduced or equal

If any box cannot be checked, stop and explain.

---

# Example Invocation Patterns

Minimal safe cleanup:

"Use refactor skill in minimal mode."

Structural improvement:

"Use refactor skill in structural mode."

Type hardening:

"Use refactor skill in type-safety mode."

Pattern application:

"Use refactor skill in design-pattern mode."

---

# When NOT to Use

Do not use this skill for:

- Rewrites
- Feature additions
- Architecture redesign
- Performance overhauls
- Business logic changes

Use repo-rebuilder or architecture skill for that.

---

# Design Philosophy

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

Small steps. Safe changes. No surprises.