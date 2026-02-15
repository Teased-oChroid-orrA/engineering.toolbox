# Weight & Balance Implementation Roadmap

## Quick Start Guide

This roadmap provides the execution sequence for implementing the Aircraft Weight & Balance module in Structural Companion Desktop.

**Base Documents**:
- Master Plan: `WEIGHT_BALANCE_MASTER_PLAN_V1.md`
- Technical Specs: `docs/WEIGHT_BALANCE_SPECIFICATIONS.md`
- User Guide: `docs/WEIGHT_BALANCE_README.md`
- Enhancements: `WEIGHT_BALANCE_ENHANCEMENTS_V1.md`

## Pre-Implementation Checklist

- [ ] Review master plan with team
- [ ] Review enhancement recommendations
- [ ] Approve regulatory disclaimers
- [ ] Assign developers to batches
- [ ] Set up development branches
- [ ] Create initial tickets in issue tracker

## Batch 1: Foundation & Data Model (Weeks 1-4)

### Week 1: Documentation & Architecture

**Gates 1-3**:
- [ ] WB-001: Requirements & Architecture Documentation
  - Create architecture manifest
  - Document FAA requirements
  - Define data models
  - **Enhancement**: Add legal disclaimers and "NOT FAA certified" statement
  
- [ ] WB-002: Core Type Definitions
  - Define TypeScript interfaces
  - Create Zod schemas
  - **Enhancement**: Add schemaVersion, createdAt, updatedAt to all types
  
- [ ] WB-003: Input Validation Schema
  - Implement validation rules
  - **Enhancement**: Add explicit bounds (weight 0-999,999, arm -500 to +500)
  - **Enhancement**: Add NaN/Infinity checks
  - **Enhancement**: Add unit consistency validation

**Verification**:
```bash
npm run check
npm run verify:wb-schema
```

### Week 2: Calculation Engine

**Gates 4-5**:
- [ ] WB-004: Tabular Method Calculation Engine
  - Implement Weight × Arm = Moment
  - Calculate CG position
  - Support zero-fuel-weight scenarios
  - **Enhancement**: Add defensive checks for divide-by-zero
  
- [ ] WB-005: CG Envelope Data Structure
  - Implement point-in-polygon algorithm
  - Support complex envelope shapes
  - **Enhancement**: Add boundary tolerance checks

**Verification**:
```bash
npm run verify:wb-solver
npm run verify:wb-envelope
```

### Week 3: State Management & Validation

**Gates 6-8**:
- [ ] WB-006: Aircraft Data Management
  - Implement aircraft profile storage
  - Add localStorage persistence
  - **Enhancement**: Add auto-backup every 10 sessions
  
- [ ] WB-007: Loading Items State Management
  - Implement reactive state
  - Support add/remove/edit
  
- [ ] WB-008: Safety Validation Engine
  - Implement MTOW/MLW/MZFW checks
  - Implement CG envelope validation
  - **Enhancement**: Add fuel burn CG shift validation
  - **Enhancement**: Add envelope boundary warning (within 0.5")
  - **Enhancement**: Promote ZFW check to P0 priority

**Verification**:
```bash
npm run verify:wb-state-management
npm run verify:wb-validation
```

### Week 4: Testing Infrastructure

**Gates 9-10**:
- [ ] WB-009: Golden File Test Infrastructure
  - Create test cases from FAA handbook
  - **Enhancement**: Expand to 20+ test cases (was 10)
  - **Enhancement**: Include ALL FAA-H-8083-1B Chapter 5 examples
  - **Enhancement**: Add extreme edge cases
  - **Enhancement**: Add negative test cases
  
- [ ] WB-010: Batch 1 Validation
  - Run all unit tests
  - Verify architecture compliance
  - **Enhancement**: Run agentic-eval assessment

**Verification**:
```bash
npm run verify:wb-core
npm run verify:weight-balance-architecture
npm run golden:weight-balance
npm run check
```

**Batch 1 Milestone**: Core calculation engine complete and validated ✅

---

## Batch 2: User Interface & Interaction (Weeks 5-8)

### Week 5: Route & Core UI Components

**Gates 11-13**:
- [ ] WB-011: Route and Layout Setup
  - Create `/weight-balance` route
  - Add navigation menu entry
  
- [ ] WB-012: Aircraft Data Card Component
  - Create BEW input card
  - Add validation feedback
  
- [ ] WB-013: Loading Table Card Component
  - Create tabular interface
  - Auto-calculate moments
  - Support dynamic rows

**Verification**:
```bash
npm run dev
# Manual testing: Navigate to /#/weight-balance
npm run verify:wb-ui-aircraft-card
npm run verify:wb-ui-table-card
```

### Week 6: Results & Visualization

**Gates 14-15**:
- [ ] WB-014: Results Summary Card
  - Display calculations
  - Show safety status
  - Color-code results
  
- [ ] WB-015: CG Envelope Visualization (D3)
  - Render envelope polygon
  - Plot CG point
  - Add interaction (zoom/pan)
  - **Enhancement**: Create proof-of-concept first
  - **Enhancement**: Add D3 learning resources
  - **Enhancement**: Add fallback to table view

**Verification**:
```bash
npm run verify:wb-ui-results-card
npm run verify:wb-envelope-rendering
```

### Week 7: Advanced Input & Configuration

**Gates 16-18**:
- [ ] WB-016: Envelope Data Input/Import
  - Manual envelope entry UI
  - JSON import functionality
  - **Enhancement**: Add envelope geometry validation
  - **Enhancement**: Add envelope preview with test points
  - **Enhancement**: Validate no self-intersection
  
- [ ] WB-017: Equipment Adjustment Features
  - Add/subtract equipment
  - Equipment presets
  
- [ ] WB-018: Fuel Loading Calculator
  - Fuel type selection
  - Auto weight conversion
  - Multiple tank support

**Verification**:
```bash
npm run verify:wb-envelope-input
npm run verify:wb-equipment
npm run verify:wb-fuel-calculator
```

### Week 8: Export & Batch Validation

**Gates 19-20**:
- [ ] WB-019: Export and Reporting
  - PDF export
  - SVG export
  - Include envelope diagram
  
- [ ] WB-020: Batch 2 Validation
  - E2E smoke test
  - Visual regression tests
  - Performance benchmarks
  - **Enhancement**: Run agentic-eval assessment

**Verification**:
```bash
npm run verify:wb-export
npm run verify:wb-e2e-smoke
npm run verify:wb-visual-baseline
npm run verify:wb-ui-throughput
```

**Batch 2 Milestone**: Complete UI and user workflow functional ✅

---

## Batch 3: Advanced Features & Production (Weeks 9-11)

### Week 9: Advanced Features

**Gates 21-24**:
- [ ] WB-021: Category Compliance (Normal/Utility)
  - Multiple category envelopes
  - Category-specific validation
  
- [ ] WB-022: Performance Impact Calculations
  - Takeoff distance adjustment
  - Climb gradient changes
  
- [ ] WB-023: Multi-Phase Loading
  - Fuel burn CG trajectory
  - Phase-by-phase validation
  
- [ ] WB-024: Lateral CG (Optional)
  - 2D envelope support
  - Helicopter compatibility

**Verification**:
```bash
npm run verify:wb-categories
npm run verify:wb-performance
npm run verify:wb-phase-analysis
npm run verify:wb-lateral-cg
```

### Week 10: Templates, UX, & Accessibility

**Gates 25-27**:
- [ ] WB-025: Pre-filled Templates
  - Common aircraft templates (Cessna 172, Piper PA-28, Boeing C-17, etc.)
  - Range from light aircraft to heavy cargo
  - User can customize
  - Validate against POH data
  
- [ ] WB-026: Undo/Redo History
  - History stack
  - Keyboard shortcuts
  
- [ ] WB-027: Accessibility (A11y) Audit
  - Keyboard navigation
  - Screen reader support
  - WCAG AA compliance

**Verification**:
```bash
npm run verify:wb-templates
npm run verify:wb-history
npm run verify:wb-accessibility
```

### Week 11: Testing, Documentation, & Release

**Gates 28-31**:
- [ ] WB-028: Comprehensive Regression Suite
  - Full feature regression
  - Performance regression
  
- [ ] WB-029: Documentation and User Guide
  - User guide review
  - FAQ creation
  - Video tutorial (optional)
  
- [ ] WB-030: Production Readiness & Release
  - Final code review
  - Security audit
  - Performance profiling
  - **Enhancement**: Run final agentic-eval assessment
  
- [ ] **WB-031**: Audit & Provenance (NEW)
  - **Enhancement**: Calculation history logging
  - **Enhancement**: Software version tracking
  - **Enhancement**: Export includes audit trail

**Verification**:
```bash
npm run verify:wb-regression
npm run build
npm run verify:weight-balance-architecture
npm run golden:weight-balance
npm run check
```

**Batch 3 Milestone**: Production-ready release ✅

---

## Post-Implementation

### Expert Review
- [ ] CFI review of calculation accuracy
- [ ] A&P mechanic review of data sources
- [ ] Test pilot evaluation of UX
- [ ] Document review findings

### Beta Testing
- [ ] Recruit 5-10 pilot testers
- [ ] Provide test scenarios
- [ ] Collect feedback
- [ ] Address critical issues

### Documentation
- [ ] Finalize user guide
- [ ] Create video walkthrough
- [ ] Document known limitations
- [ ] Publish changelog

### Marketing & Launch
- [ ] Create feature demo
- [ ] Take screenshots
- [ ] Write blog post
- [ ] Announce in aviation communities

---

## Critical Success Factors

### Must-Have for Release
✅ All golden file tests passing (20+ cases)
✅ Zero known calculation errors
✅ All safety validations implemented
✅ Prominent disclaimers on every page
✅ Export functionality working
✅ Accessibility WCAG AA compliant

### Nice-to-Have for V1
⭐ Aircraft template library (5+ aircraft)
⭐ Video tutorial
⭐ Multi-phase fuel burn analysis
⭐ Lateral CG support

### Post-V1 Features
🔮 Cloud sync
🔮 Mobile app
🔮 ForeFlight integration
🔮 Community template marketplace

---

## Risk Mitigation

### Technical Risks

**Risk**: D3 rendering complexity
- **Mitigation**: Create proof-of-concept early (before Gate 15)
- **Fallback**: Table view if rendering fails

**Risk**: Point-in-polygon edge cases
- **Mitigation**: Extensive testing with golden files
- **Fallback**: Manual verification option

**Risk**: PDF export library issues
- **Mitigation**: Lock jsPDF version, test thoroughly
- **Fallback**: SVG export always available

### Regulatory Risks

**Risk**: Calculation error leads to accident
- **Mitigation**: Prominent disclaimers, CFI review, audit logging
- **Prevention**: Golden file tests, edge case coverage

**Risk**: Liability concerns
- **Mitigation**: "NOT FAA certified" statement, legal review
- **Prevention**: Clear "for reference only" messaging

### User Experience Risks

**Risk**: Too complex for casual users
- **Mitigation**: Getting started wizard, templates, guided tour
- **Prevention**: User testing with non-experts

**Risk**: Data loss from localStorage
- **Mitigation**: Auto-backup prompts, export reminders
- **Prevention**: Import/export always available

---

## Quality Gates

Each batch must pass these gates before proceeding:

### Batch 1 Quality Gate
- [ ] All unit tests passing
- [ ] Golden file tests 100% accurate
- [ ] Architecture manifest validated
- [ ] File size policy compliant
- [ ] No TypeScript errors
- [ ] Agentic-eval score ≥0.85

### Batch 2 Quality Gate
- [ ] All UI components render correctly
- [ ] E2E smoke test passing
- [ ] Visual regression baseline established
- [ ] Performance within budget (<50ms UI updates)
- [ ] No accessibility blockers
- [ ] Agentic-eval score ≥0.85

### Batch 3 Quality Gate
- [ ] Full regression suite passing
- [ ] All documentation complete
- [ ] Security audit clean
- [ ] Expert review complete
- [ ] Beta testing complete
- [ ] Agentic-eval score ≥0.90

---

## Communication Plan

### Weekly Status Updates
- Completed gates
- Blockers and risks
- Next week's goals
- Help needed

### Batch Boundaries
- Demo to stakeholders
- Collect feedback
- Adjust plan if needed
- Celebrate milestone

### Release
- Announcement post
- Demo video
- User guide published
- Support channels ready

---

## Tools & Resources

### Development Tools
- TypeScript
- Svelte 5
- D3.js (envelope visualization)
- Babylon.js (future 3D)
- Playwright (testing)
- jsPDF (PDF export)

### Reference Materials
- FAA-H-8083-1B Aircraft Weight and Balance Handbook
- 14 CFR Part 91
- Advisory Circular AC 120-27F
- Aircraft POH examples

### Learning Resources
- D3 Observable Gallery
- Svelte 5 documentation
- Playwright testing guides
- Accessibility guidelines (WCAG 2.1)

---

## Success Metrics

### Functional Metrics
- ✅ Calculation accuracy: 100% match with FAA examples
- ✅ Test coverage: ≥95% on calculation engine
- ✅ Edge case handling: 100% graceful degradation
- ✅ Validation rules: 100% tested

### Performance Metrics
- ✅ Calculation latency: <10ms
- ✅ UI update latency: <50ms
- ✅ Page load: <1s
- ✅ Export generation: <2s

### Quality Metrics
- ✅ Zero critical bugs
- ✅ Zero high-severity accessibility issues
- ✅ Architecture compliance: 100%
- ✅ File size policy: 100% compliant

### User Experience Metrics
- ✅ Workflow completion: <5 minutes (experienced)
- ✅ First-time setup: <10 minutes (with template)
- ✅ Template usage: >50% of users
- ✅ Export success rate: >95%

---

## Maintenance Plan

### Regular Reviews
- Monthly: Review calculation accuracy (golden files)
- Quarterly: Update FAA regulation references
- Annually: Re-weigh sample aircraft (if available)

### Updates
- Security patches: As needed
- Dependency updates: Quarterly review
- Feature additions: User-driven roadmap

### Support
- GitHub issues for bug reports
- Discussions for feature requests
- Email for critical safety issues
- CFI consultation as needed

---

## Conclusion

This roadmap provides a clear path from planning to production for the Aircraft Weight & Balance module. By following the gated approach, maintaining quality gates, and implementing the recommended enhancements, we will deliver a safe, accurate, and user-friendly tool for the aviation community.

**Timeline**: 8-11 weeks (accounting for enhancements)
**Team Size**: 2-3 developers
**Confidence**: High (87%)

**Next Step**: Begin Gate 1 (Requirements & Architecture Documentation)

---

**Document Version**: 1.0
**Last Updated**: 2026-02-15
**Author**: Structural Companion Desktop Team
**Review Status**: ✅ Ready for Implementation
