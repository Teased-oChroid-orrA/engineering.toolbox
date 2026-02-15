# Aircraft Weight & Balance Master Plan (V1)

## Executive Summary

This gated plan defines the engineering roadmap for implementing a professional-grade Aircraft Weight & Balance (W&B) assessment module in Structural Companion Desktop. The module ensures no variable is missed and final figures are verified against the aircraft's Pilot's Operating Handbook (POH) following FAA regulations.

## Objective

Implement a comprehensive W&B calculation system that:
- Follows FAA-H-8083-1B Weight and Balance Handbook requirements
- Supports the complete tabular method calculation workflow
- Validates against aircraft-specific CG envelope data (user-provided or library)
- Provides real-time validation and safety checks
- Integrates seamlessly with existing toolbox modules

## Regulatory Compliance

- **Primary Reference**: FAA-H-8083-1B Aircraft Weight and Balance Handbook
- **Regulations**: 14 CFR Parts 91, 121, 125, 135
- **Advisory Circular**: AC 120-27F (Aircraft Weight and Balance Control)
- **Principle**: Manufacturer data always takes precedence over generic calculations

## Architecture Alignment

Following the established patterns in Structural Companion Desktop:
- **Layered Architecture**: Domain → Controller → UI
- **File Size Policy**: Components ≤300 lines, orchestrators ≤800 lines, modules per manifest
- **Testing Strategy**: Unit tests, E2E tests, golden file validation, visual regression
- **Rendering**: D3 for drafting (CG envelope visualization), Babylon.js for 3D (future)
- **Portability**: Hash-based routing, single-file HTML build capability

## Module Structure

```
src/lib/core/weight-balance/
  ├── schema.ts              # Input validation schema
  ├── types.ts               # Type definitions
  ├── solve.ts               # CG calculation engine
  ├── envelope.ts            # CG envelope validation
  ├── materials.ts           # Aircraft material library (optional)
  └── validation.ts          # Safety checks and warnings

src/lib/components/weight-balance/
  ├── WeightBalanceOrchestrator.svelte
  ├── controllers/
  │   ├── computeController.ts
  │   ├── envelopeController.ts
  │   ├── exportController.ts
  │   └── layoutController.ts
  └── cards/
      ├── AircraftDataCard.svelte
      ├── LoadingTableCard.svelte
      ├── EnvelopeCard.svelte
      └── ResultsCard.svelte

src/lib/drafting/weight-balance/
  ├── envelopeRenderer.ts    # D3 CG envelope visualization
  └── loadingDiagram.ts      # Loading diagram graphics

src/routes/weight-balance/
  └── +page.svelte           # Route orchestrator

tests/weight-balance/
  ├── wb-solver.spec.ts
  ├── wb-envelope.spec.ts
  ├── wb-e2e-smoke.spec.ts
  └── wb-regression.spec.ts

golden/
  └── weight_balance_expected.json
```

## Execution Rule

- Execute in batches of 10 gates.
- Do not start the next batch until current batch exit criteria pass.
- Keep relevant test suites green at every batch boundary.
- Use agentic-eval skill for quality review at batch boundaries.
- Use refactor skill to maintain file size policy compliance.

---

# Batch 1 (Gates 1-10): Foundation & Data Model

## Gate 1 (WB-001): Requirements & Architecture Documentation
**Priority**: P0

**Scope**:
- Document W&B calculation requirements from FAA-H-8083-1B
- Define data model for aircraft, loading items, and envelope
- Create architecture manifest with LOC limits and dependencies
- Document integration points with existing modules

**Target Files**:
- `docs/WEIGHT_BALANCE_README.md`
- `src/lib/weight-balance/WeightBalanceArchitectureManifest.ts`
- `docs/WEIGHT_BALANCE_SPECIFICATIONS.md`

**Exit Criteria**:
- Requirements document approved
- Architecture manifest follows existing patterns
- Data model reviewed and validated
- Integration strategy documented

**Verification**:
```bash
# Manual review of documentation
cat docs/WEIGHT_BALANCE_README.md
cat docs/WEIGHT_BALANCE_SPECIFICATIONS.md
```

---

## Gate 2 (WB-002): Core Type Definitions
**Priority**: P0

**Scope**:
- Define TypeScript types for aircraft data
- Define types for loading items (occupants, fuel, baggage, equipment)
- Define types for moments and CG calculations
- Define envelope geometry types

**Target Files**:
- `src/lib/core/weight-balance/types.ts`
- `src/lib/core/weight-balance/schema.ts`

**Exit Criteria**:
- All core types defined with JSDoc
- Types support both imperial and metric units
- Validation schema using Zod or similar
- Types compile without errors

**Verification**:
```bash
npm run check
```

---

## Gate 3 (WB-003): Input Validation Schema
**Priority**: P0

**Scope**:
- Implement Zod validation schemas for all inputs
- Define realistic bounds (weight, arm, angle constraints)
- Implement unit conversion helpers
- Add validation error messages

**Target Files**:
- `src/lib/core/weight-balance/schema.ts`
- `src/lib/core/weight-balance/validation.ts`

**Exit Criteria**:
- Schema validates all input fields
- Bounds prevent physically impossible values
- Error messages are user-friendly
- Unit conversion bidirectional and tested

**Verification**:
```bash
npm run verify:wb-schema
```

---

## Gate 4 (WB-004): Tabular Method Calculation Engine
**Priority**: P0

**Scope**:
- Implement core tabular method: Weight × Arm = Moment
- Calculate total weight and total moment
- Calculate CG position: Total Moment / Total Weight
- Support both loaded and zero-fuel-weight scenarios

**Target Files**:
- `src/lib/core/weight-balance/solve.ts`
- `tests/weight-balance/wb-solver.spec.ts`

**Exit Criteria**:
- Calculation matches FAA handbook examples
- Handles edge cases (zero weight, negative moments)
- Unit tests cover all calculation paths
- Performance: <10ms for typical aircraft

**Verification**:
```bash
npm run verify:wb-solver
```

---

## Gate 5 (WB-005): CG Envelope Data Structure
**Priority**: P0

**Scope**:
- Define envelope polygon structure (vertices, constraints)
- Implement point-in-polygon algorithm for CG validation
- Support both simple (4-point) and complex (n-point) envelopes
- Handle forward/aft/weight limit validation

**Target Files**:
- `src/lib/core/weight-balance/envelope.ts`
- `tests/weight-balance/wb-envelope.spec.ts`

**Exit Criteria**:
- Envelope supports arbitrary polygon shapes
- Point-in-polygon algorithm is robust
- Handles boundary conditions correctly
- Unit tests verify edge cases

**Verification**:
```bash
npm run verify:wb-envelope
```

---

## Gate 6 (WB-006): Aircraft Data Management
**Priority**: P1

**Scope**:
- Implement aircraft profile storage (BEW, datum, limits)
- Support multiple aircraft profiles
- Persist aircraft data to localStorage
- Implement import/export for aircraft profiles

**Target Files**:
- `src/lib/core/weight-balance/aircraft.ts`
- `src/lib/stores/weightBalanceStore.ts`

**Exit Criteria**:
- Aircraft profiles persist across sessions
- Import/export works with JSON format
- Data validation on load
- Supports multiple aircraft switching

**Verification**:
```bash
npm run verify:wb-aircraft-storage
```

---

## Gate 7 (WB-007): Loading Items State Management
**Priority**: P1

**Scope**:
- Implement reactive state for loading items
- Support add/remove/edit loading items
- Categorize items: occupants, fuel, baggage, equipment
- Real-time recalculation on item changes

**Target Files**:
- `src/lib/stores/weightBalanceStore.ts`
- `src/lib/components/weight-balance/controllers/computeController.ts`

**Exit Criteria**:
- State updates trigger recalculation
- Items can be added/removed dynamically
- State persists to localStorage
- Performance: updates <50ms

**Verification**:
```bash
npm run verify:wb-state-management
```

---

## Gate 8 (WB-008): Safety Validation Engine
**Priority**: P0

**Scope**:
- Implement MTOW (Max Takeoff Weight) check
- Implement MLW (Max Landing Weight) check
- Implement CG envelope boundary check
- Implement zero-fuel-weight CG check
- Generate warning codes and messages

**Target Files**:
- `src/lib/core/weight-balance/validation.ts`
- `tests/weight-balance/wb-validation.spec.ts`

**Exit Criteria**:
- All safety checks implemented
- Warning codes follow existing patterns
- Severity levels: error, warning, info
- Unit tests cover all validation paths

**Verification**:
```bash
npm run verify:wb-validation
```

---

## Gate 9 (WB-009): Golden File Test Infrastructure
**Priority**: P1

**Scope**:
- Create golden file test cases with known-good outputs
- Implement golden file comparison script
- Document test case sources (FAA examples, POH data)
- Add to CI pipeline

**Target Files**:
- `golden/weight_balance_expected.json`
- `golden/weight_balance_cases.json`
- `scripts/golden-weight-balance.mjs`

**Exit Criteria**:
- At least 10 test cases from FAA handbook
- Calculation matches expected within tolerance
- Script supports --gen flag for regeneration
- Tests run in CI

**Verification**:
```bash
npm run golden:weight-balance
```

---

## Gate 10 (WB-010): Batch 1 Validation
**Priority**: P0

**Scope**:
- Run all unit tests for core module
- Verify architecture compliance
- Run golden file tests
- Document any blockers for Batch 2

**Exit Criteria**:
- All Gate 1-9 tests passing
- Architecture manifest validated
- File size policy compliant
- Ready to begin UI development

**Verification**:
```bash
npm run verify:wb-core
npm run verify:weight-balance-architecture
npm run golden:weight-balance
npm run check
```

---

# Batch 2 (Gates 11-20): User Interface & Interaction

## Gate 11 (WB-011): Route and Layout Setup
**Priority**: P0

**Scope**:
- Create `/weight-balance` route
- Implement page orchestrator following existing patterns
- Add navigation menu entry
- Set up hash routing compatibility

**Target Files**:
- `src/routes/weight-balance/+page.svelte`
- `src/routes/+layout.svelte` (navigation update)

**Exit Criteria**:
- Route accessible via navigation
- Page loads without errors
- Hash routing works: `#/weight-balance`
- Consistent with existing route patterns

**Verification**:
```bash
npm run dev
# Navigate to /#/weight-balance
```

---

## Gate 12 (WB-012): Aircraft Data Card Component
**Priority**: P0

**Scope**:
- Create card for Basic Empty Weight (BEW) input
- Add datum location selector
- Add MTOW and MLW inputs
- Add aircraft name/model fields
- Implement validation feedback

**Target Files**:
- `src/lib/components/weight-balance/cards/AircraftDataCard.svelte`

**Exit Criteria**:
- All aircraft data inputs functional
- Validation errors display inline
- Follows existing card design patterns
- Component ≤300 lines

**Verification**:
```bash
npm run verify:wb-ui-aircraft-card
```

---

## Gate 13 (WB-013): Loading Table Card Component
**Priority**: P0

**Scope**:
- Create tabular loading interface
- Support add/remove row functionality
- Implement inline editing
- Auto-calculate moments column
- Color-code row types (occupants, fuel, baggage)

**Target Files**:
- `src/lib/components/weight-balance/cards/LoadingTableCard.svelte`

**Exit Criteria**:
- Table supports dynamic rows
- Moments calculate in real-time
- Validation on weight/arm inputs
- Component ≤300 lines

**Verification**:
```bash
npm run verify:wb-ui-table-card
```

---

## Gate 14 (WB-014): Results Summary Card
**Priority**: P0

**Scope**:
- Display total weight and CG position
- Show zero-fuel-weight calculations
- Display all safety check results
- Color-code status: green (safe), yellow (warning), red (error)

**Target Files**:
- `src/lib/components/weight-balance/cards/ResultsCard.svelte`

**Exit Criteria**:
- All calculated values display correctly
- Safety status clearly visible
- Updates in real-time
- Component ≤300 lines

**Verification**:
```bash
npm run verify:wb-ui-results-card
```

---

## Gate 15 (WB-015): CG Envelope Visualization (D3)
**Priority**: P1

**Scope**:
- Render CG envelope polygon using D3
- Plot current CG point on envelope
- Highlight forward/aft/weight limits
- Support zoom/pan interaction
- Add hover tooltips

**Target Files**:
- `src/lib/drafting/weight-balance/envelopeRenderer.ts`
- `src/lib/components/weight-balance/cards/EnvelopeCard.svelte`

**Exit Criteria**:
- Envelope renders accurately
- CG point updates dynamically
- Visual clearly shows safe/unsafe status
- Performance: <100ms render time

**Verification**:
```bash
npm run verify:wb-envelope-rendering
```

---

## Gate 16 (WB-016): Envelope Data Input/Import
**Priority**: P1

**Scope**:
- Create UI for manual envelope data entry
- Support import from JSON file
- Provide library of common aircraft envelopes
- Validate envelope geometry (closed polygon)

**Target Files**:
- `src/lib/components/weight-balance/cards/EnvelopeInputCard.svelte`
- `src/lib/core/weight-balance/envelopeLibrary.ts`

**Exit Criteria**:
- Users can define custom envelopes
- JSON import works with validation
- Library includes 5+ common aircraft
- Invalid envelopes rejected with feedback

**Verification**:
```bash
npm run verify:wb-envelope-input
```

---

## Gate 17 (WB-017): Equipment Adjustment Features
**Priority**: P2

**Scope**:
- Add/subtract equipment (rear seat removal, survival kits, cameras)
- Toggle usable vs unusable fuel
- Support auxiliary/tip tanks
- Equipment presets for common configurations

**Target Files**:
- `src/lib/components/weight-balance/cards/EquipmentCard.svelte`
- `src/lib/core/weight-balance/equipmentLibrary.ts`

**Exit Criteria**:
- Equipment affects total weight and CG
- Presets speed up configuration
- Changes reflect immediately in results
- Component ≤300 lines

**Verification**:
```bash
npm run verify:wb-equipment
```

---

## Gate 18 (WB-018): Fuel Loading Calculator
**Priority**: P1

**Scope**:
- Input fuel in gallons with automatic weight conversion
- Support multiple fuel types (AvGas 6 lbs/gal, Jet-A 6.7 lbs/gal)
- Calculate main tank and auxiliary tank separately
- Show fuel weight vs usable fuel weight

**Target Files**:
- `src/lib/components/weight-balance/cards/FuelCard.svelte`

**Exit Criteria**:
- Fuel conversion accurate
- Supports multiple tank configurations
- Unit selection (gallons, liters, pounds)
- Component ≤300 lines

**Verification**:
```bash
npm run verify:wb-fuel-calculator
```

---

## Gate 19 (WB-019): Export and Reporting
**Priority**: P2

**Scope**:
- Export W&B report to PDF
- Export to SVG
- Include CG envelope diagram in export
- Add signature/date fields for official records

**Target Files**:
- `src/lib/components/weight-balance/controllers/exportController.ts`
- `src/lib/drafting/weight-balance/reportGenerator.ts`

**Exit Criteria**:
- PDF export includes all data and diagram
- Export format suitable for logbook
- Follows existing export patterns
- SVG export for external use

**Verification**:
```bash
npm run verify:wb-export
```

---

## Gate 20 (WB-020): Batch 2 Validation
**Priority**: P0

**Scope**:
- E2E smoke test covering full W&B workflow
- Visual regression tests for UI components
- Integration test with state management
- Performance benchmarks

**Exit Criteria**:
- All UI components render correctly
- Full workflow test passes
- Visual baselines established
- Performance within budget

**Verification**:
```bash
npm run verify:wb-e2e-smoke
npm run verify:wb-visual-baseline
npm run verify:wb-ui-throughput
```

---

# Batch 3 (Gates 21-30): Advanced Features & Production

## Gate 21 (WB-021): Category Compliance (Normal/Utility)
**Priority**: P1

**Scope**:
- Support multiple category envelopes (Normal, Utility, Acrobatic)
- Warn when loading forces aircraft out of requested category
- Display category-specific limitations
- Load factor calculations per category

**Target Files**:
- `src/lib/core/weight-balance/categories.ts`
- `src/lib/components/weight-balance/cards/CategoryCard.svelte`

**Exit Criteria**:
- Category selection affects envelope
- Warnings for category violations
- Load factor limits documented
- Tests verify category logic

**Verification**:
```bash
npm run verify:wb-categories
```

---

## Gate 22 (WB-022): Performance Impact Calculations
**Priority**: P2

**Scope**:
- Estimate takeoff distance adjustment based on weight
- Calculate climb gradient changes
- Estimate landing distance changes
- Display performance warnings

**Target Files**:
- `src/lib/core/weight-balance/performance.ts`
- `src/lib/components/weight-balance/cards/PerformanceCard.svelte`

**Exit Criteria**:
- Performance adjustments match POH methods
- Warnings for high-weight operations
- Calculations clearly documented
- Component ≤300 lines

**Verification**:
```bash
npm run verify:wb-performance
```

---

## Gate 23 (WB-023): Multi-Phase Loading (Taxi, Takeoff, Landing)
**Priority**: P2

**Scope**:
- Calculate W&B for different flight phases
- Fuel burn affects CG during flight
- Show CG shift from takeoff to landing
- Warn if CG leaves envelope during fuel burn

**Target Files**:
- `src/lib/core/weight-balance/phaseAnalysis.ts`
- `src/lib/components/weight-balance/cards/PhaseCard.svelte`

**Exit Criteria**:
- Multi-phase calculations accurate
- CG path visualization on envelope
- Fuel burn trajectory shown
- Phase validation passes

**Verification**:
```bash
npm run verify:wb-phase-analysis
```

---

## Gate 24 (WB-024): Lateral CG (Helicopter/Advanced)
**Priority**: P3

**Scope**:
- Optional lateral CG calculation
- 2D envelope for longitudinal + lateral
- Useful for helicopters and asymmetric loading
- Advanced feature, not required for initial release

**Target Files**:
- `src/lib/core/weight-balance/lateralCG.ts`
- `src/lib/drafting/weight-balance/envelope2D.ts`

**Exit Criteria**:
- Lateral CG calculation option available
- 2D envelope rendering works
- Feature can be disabled for fixed-wing only
- Tests cover lateral scenarios

**Verification**:
```bash
npm run verify:wb-lateral-cg
```

---

## Gate 25 (WB-025): Pre-filled Templates
**Priority**: P2

**Scope**:
- Create templates for common aircraft (Cessna 172, Piper PA-28, etc.)
- Include BEW, arms, envelope data
- User can start from template
- Templates sourced from public POH data

**Target Files**:
- `src/lib/core/weight-balance/templates.ts`
- `data/weight-balance-templates.json`

**Exit Criteria**:
- At least 5 aircraft templates
- Templates validated against POH data
- User can select and customize templates
- Data properly attributed/licensed

**Verification**:
```bash
npm run verify:wb-templates
```

---

## Gate 26 (WB-026): Undo/Redo History
**Priority**: P2

**Scope**:
- Implement undo/redo for loading changes
- History stack for state management
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- History visualization

**Target Files**:
- `src/lib/stores/weightBalanceHistory.ts`
- `src/lib/components/weight-balance/controllers/historyController.ts`

**Exit Criteria**:
- Undo/redo works for all actions
- History stack limited to 50 states
- Keyboard shortcuts functional
- Consistent with existing history patterns

**Verification**:
```bash
npm run verify:wb-history
```

---

## Gate 27 (WB-027): Accessibility (A11y) Audit
**Priority**: P1

**Scope**:
- Keyboard navigation for all inputs
- Screen reader support
- ARIA labels for diagrams
- Color contrast compliance (WCAG AA)

**Target Files**:
- All W&B components (accessibility improvements)

**Exit Criteria**:
- All inputs keyboard accessible
- Screen reader announces calculations
- Color contrast meets WCAG AA
- Axe accessibility tests pass

**Verification**:
```bash
npm run verify:wb-accessibility
```

---

## Gate 28 (WB-028): Comprehensive Regression Suite
**Priority**: P0

**Scope**:
- Full regression test covering all features
- Golden file tests for solver
- Visual regression for UI
- Performance regression tracking

**Target Files**:
- `tests/weight-balance/wb-regression.spec.ts`
- `package.json` (add verify script)

**Exit Criteria**:
- Regression test covers all gates
- Tests run in <5 minutes
- Integrated into CI pipeline
- Documented in README

**Verification**:
```bash
npm run verify:wb-regression
```

---

## Gate 29 (WB-029): Documentation and User Guide
**Priority**: P1

**Scope**:
- Comprehensive user guide
- FAA reference citations
- Example calculations walkthrough
- Video tutorial (optional)

**Target Files**:
- `docs/WEIGHT_BALANCE_USER_GUIDE.md`
- `docs/WEIGHT_BALANCE_FAQ.md`

**Exit Criteria**:
- User guide covers all features
- Examples demonstrate typical use cases
- FAA references properly cited
- Guide reviewed for accuracy

**Verification**:
```bash
# Manual review
cat docs/WEIGHT_BALANCE_USER_GUIDE.md
```

---

## Gate 30 (WB-030): Production Readiness & Release
**Priority**: P0

**Scope**:
- Final code review using agentic-eval skill
- Security audit (no PII leakage, safe file handling)
- Performance profiling
- Release notes
- Marketing materials (screenshots, features list)

**Exit Criteria**:
- All test suites passing
- No known critical bugs
- Performance meets targets
- Documentation complete
- Ready for production deployment

**Verification**:
```bash
npm run build
npm run verify:weight-balance-architecture
npm run verify:wb-regression
npm run golden:weight-balance
npm run check
```

---

# Verification Commands

Add to `package.json`:

```json
{
  "scripts": {
    "verify:wb-core": "playwright test --config=playwright.unit.config.ts tests/weight-balance/wb-solver.spec.ts tests/weight-balance/wb-envelope.spec.ts tests/weight-balance/wb-validation.spec.ts",
    "verify:wb-e2e-smoke": "playwright test tests/weight-balance/wb-e2e-smoke.spec.ts",
    "verify:wb-regression": "playwright test tests/weight-balance/wb-regression.spec.ts",
    "verify:wb-visual-baseline": "playwright test tests/weight-balance/wb-visual.spec.ts",
    "verify:wb-ui-throughput": "playwright test tests/weight-balance/wb-ui-throughput.spec.ts",
    "verify:weight-balance-architecture": "node scripts/verify-weight-balance-architecture.mjs",
    "golden:weight-balance": "node scripts/golden-weight-balance.mjs",
    "golden:weight-balance:gen": "node scripts/golden-weight-balance.mjs --gen"
  }
}
```

---

# Risk Assessment

## Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| CG calculation accuracy | High | Golden file tests from FAA handbook, multiple verification sources |
| Envelope validation edge cases | High | Comprehensive unit tests, boundary condition testing |
| Performance with large aircraft | Medium | Performance benchmarks, optimization if needed |
| Data persistence corruption | Medium | Validation on load, backup/restore functionality |
| Browser compatibility | Low | Modern browser targets, polyfills if needed |

## Regulatory Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Incorrect implementation of FAA standards | Critical | Expert review, cite all regulations, disclaimers |
| Liability for calculation errors | High | Clear disclaimers, "for reference only" language |
| POH data copyright | Medium | Use only public domain or user-provided data |

## UX Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Overwhelming for basic users | Medium | Templates, guided workflow, progressive disclosure |
| Difficult envelope data entry | Medium | Library of common aircraft, JSON import |
| Export format not accepted | Low | Standard PDF format, customizable fields |

---

# Quality Assurance Strategy

## Agentic-Eval Integration

Use the agentic-eval skill at the following checkpoints:
1. **End of Batch 1**: Evaluate core calculation engine accuracy
2. **End of Batch 2**: Evaluate UI/UX completeness and usability
3. **End of Batch 3**: Evaluate production readiness

### Evaluation Criteria

**Batch 1 (Calculation Engine)**:
- Accuracy: 0-1 (matches FAA examples within tolerance)
- Completeness: 0-1 (all required calculations implemented)
- Robustness: 0-1 (handles edge cases correctly)
- Performance: 0-1 (meets latency requirements)

**Batch 2 (User Interface)**:
- Usability: 0-1 (clear workflow, minimal learning curve)
- Responsiveness: 0-1 (real-time updates, performance)
- Visual design: 0-1 (consistent with existing modules)
- Accessibility: 0-1 (keyboard, screen reader support)

**Batch 3 (Production)**:
- Completeness: 0-1 (all features working)
- Reliability: 0-1 (no critical bugs)
- Documentation: 0-1 (comprehensive and accurate)
- Safety: 0-1 (appropriate disclaimers and validations)

## Refactor Skill Integration

Use the refactor skill to ensure:
- All components comply with file size policy
- Code follows existing patterns and conventions
- No duplicated logic across components
- Clear separation of concerns (domain/controller/UI)

Apply refactoring:
- After Gate 10 (core module cleanup)
- After Gate 20 (UI component cleanup)
- After Gate 30 (final production polish)

---

# Success Metrics

## Functional Metrics
- ✅ All FAA handbook examples calculate correctly
- ✅ 95%+ test coverage on core calculation engine
- ✅ All safety validations implemented
- ✅ Export functionality works

## Performance Metrics
- ✅ Calculation latency <10ms
- ✅ UI update latency <50ms
- ✅ Full page load <1s
- ✅ Export generation <2s

## Quality Metrics
- ✅ Zero critical bugs
- ✅ All tests passing
- ✅ Architecture compliance
- ✅ File size policy compliance

## User Experience Metrics
- ✅ Workflow completable in <5 minutes for experienced users
- ✅ Template usage reduces setup to <1 minute
- ✅ Clear visual feedback on safe/unsafe states
- ✅ Export suitable for official records

---

# Implementation Timeline Estimate

## Batch 1: 3-4 weeks
- Core calculation engine: 1 week
- Validation and envelope logic: 1 week
- Testing infrastructure: 1 week
- Documentation and review: 1 week

## Batch 2: 3-4 weeks
- UI components: 2 weeks
- D3 visualization: 1 week
- Export functionality: 1 week

## Batch 3: 2-3 weeks
- Advanced features: 1 week
- Documentation: 1 week
- QA and release prep: 1 week

**Total: 8-11 weeks**

---

# Legal Disclaimers (Required)

The Weight & Balance module must display prominent disclaimers:

```
⚠️ IMPORTANT NOTICE

This Weight & Balance calculator is provided for reference and educational 
purposes only. It is NOT a substitute for:
- The aircraft's official Pilot's Operating Handbook (POH)
- Official Weight and Balance documentation
- Professional aviation advice
- Pre-flight safety checks

Always verify calculations against your aircraft's POH and current W&B records.

Users are solely responsible for ensuring their aircraft is loaded safely 
and within legal limits. The developers assume no liability for the use or 
misuse of this tool.

In case of any conflict between this calculator and the manufacturer's 
documentation, the manufacturer's documentation takes precedence.
```

---

# Conclusion

This gated plan provides a comprehensive roadmap for implementing a professional-grade Aircraft Weight & Balance assessment module. By following established patterns, maintaining strict quality standards, and leveraging the agentic-eval and refactor skills, we will deliver a safe, accurate, and user-friendly tool that meets FAA requirements and serves the aviation community.

The phased approach ensures each layer is solid before building upon it, with continuous validation and quality checks throughout the development process.
