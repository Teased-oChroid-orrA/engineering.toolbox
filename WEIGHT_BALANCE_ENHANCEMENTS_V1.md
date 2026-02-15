# Weight & Balance Master Plan - Enhancement Recommendations

## Source
Generated from Agentic-Eval quality assessment of WEIGHT_BALANCE_MASTER_PLAN_V1.md

## Evaluation Summary

**Overall Score**: 0.93/1.0 (Excellent)
- Accuracy: 0.95
- Completeness: 0.92
- Clarity: 0.90
- Consistency: 0.98
- Implementability: 0.88

**Status**: Production-ready with recommended enhancements
**Confidence**: 87% (High)

---

## High-Priority Enhancements (Address Before Implementation)

### Enhancement 1: Strengthen Gate 3 (Schema Validation)

**Issue**: Edge cases like negative weights, zero arm, or extreme values could cause NaN propagation.

**Changes to Gate 3 Exit Criteria**:
- Add explicit validation bounds:
  - Weight: 0 < weight < 999,999 lbs
  - Arm: -500 < arm < +500 inches (supports nose-forward and aft datum)
  - Fuel capacity: 0 < fuel < 10,000 gallons
- Add NaN/Infinity checks in calculation pipeline
- Add unit consistency validation (lock imperial/metric per aircraft)

**New Test Cases**:
```typescript
// Add to tests/weight-balance/wb-schema.spec.ts
test('rejects negative weight', () => {
  expect(() => validateWeight(-100)).toThrow();
});

test('rejects zero total weight', () => {
  expect(() => calculateCG([], 0)).toThrow('Total weight must be positive');
});

test('detects NaN in calculation', () => {
  expect(() => validateCG(NaN)).toThrow('CG calculation resulted in invalid number');
});

test('prevents mixing units', () => {
  const aircraft = { units: 'imperial' };
  expect(() => addItem(aircraft, { weight: 100, units: 'metric' })).toThrow();
});
```

**Target Files**:
- `src/lib/core/weight-balance/schema.ts`
- `src/lib/core/weight-balance/validation.ts`
- `tests/weight-balance/wb-schema.spec.ts`

---

### Enhancement 2: Strengthen Gate 8 (Safety Validation)

**Issue**: Fuel burn CG shift is relegated to P2 (Gate 23), but it's critical for safety.

**Changes to Gate 8 Exit Criteria**:
- Promote Zero Fuel Weight CG check to first-class validation
- Add envelope boundary tolerance check (warn if within 0.5 inches)
- Add explicit "on boundary" handling (inside vs exactly on line)
- Add fuel burn trajectory preview in validation

**New Validation Rules**:
```typescript
// Add to src/lib/core/weight-balance/validation.ts

// Validation: Near Envelope Edge
if (distanceToEnvelopeEdge(cgPosition, envelope) < 0.5) {
  validations.push({
    code: 'CG_NEAR_ENVELOPE_EDGE',
    severity: 'warning',
    message: `CG is within 0.5 inches of envelope limit. Consider adjusting load for safety margin.`,
    value: cgPosition,
    margin: distanceToEnvelopeEdge(cgPosition, envelope)
  });
}

// Validation: Fuel Burn CG Shift
const cgShift = Math.abs(zeroFuelCG - loadedCG);
if (cgShift > 2.0) {
  validations.push({
    code: 'LARGE_CG_SHIFT',
    severity: 'warning',
    message: `CG will shift ${cgShift.toFixed(2)} inches during fuel burn. Verify landing CG.`,
    value: cgShift
  });
}

// Validation: Boundary Handling
if (isOnEnvelopeBoundary(cgPosition, weight, envelope)) {
  validations.push({
    code: 'CG_ON_ENVELOPE_BOUNDARY',
    severity: 'info',
    message: `CG is exactly on envelope boundary. Consider 0.5 inch safety margin.`,
    value: cgPosition
  });
}
```

**Target Files**:
- `src/lib/core/weight-balance/validation.ts`
- `tests/weight-balance/wb-validation.spec.ts`

---

### Enhancement 3: Add Gate 31 (Audit & Provenance)

**Issue**: No audit trail for calculations if error discovered later.

**New Gate**: WB-031 - Audit Logging and Calculation Provenance

**Priority**: P1

**Scope**:
- Store calculation history with timestamps
- Include software version in each calculation
- Add provenance data (who, when, which aircraft)
- Export calculations include full audit trail

**Data Model**:
```typescript
interface CalculationAudit {
  id: string;                          // UUID
  timestamp: Date;
  softwareVersion: string;             // e.g., "1.0.0"
  aircraftId: string;
  configurationId: string;
  
  // Input Snapshot
  inputs: {
    aircraft: AircraftProfile;
    loadingItems: LoadingItem[];
  };
  
  // Results Snapshot
  results: LoadingResults;
  
  // User Context
  userAgent: string;                   // Browser info
  sessionId: string;                   // Session identifier
}

interface AuditLog {
  calculations: CalculationAudit[];
  maxSize: 100;                        // Keep last 100 calculations
}
```

**Exit Criteria**:
- All calculations logged with full provenance
- Audit log persists across sessions
- Export includes calculation history
- Audit log can be cleared by user (privacy)

**Verification**:
```bash
npm run verify:wb-audit
```

**Target Files**:
- `src/lib/stores/weightBalanceAudit.ts`
- `tests/weight-balance/wb-audit.spec.ts`

**Batch Assignment**: Add to Batch 3 (after Gate 30, before release)

---

### Enhancement 4: Expand Gate 9 (Golden File Tests)

**Issue**: Only 10 test cases may not cover all FAA handbook examples.

**Changes to Gate 9 Exit Criteria**:
- Require **minimum 20 test cases** (was 10)
- Include **all examples** from FAA-H-8083-1B Chapter 5
- Add **extreme edge cases**:
  - Ultralight aircraft (<500 lbs)
  - Heavy aircraft (>50,000 lbs) - e.g., Boeing C-17 Globemaster III
  - Aft-loaded configuration (test aft CG limit)
  - Forward-loaded configuration (test forward CG limit)
  - Zero fuel scenarios
- Add **negative test cases** (should fail validation):
  - Weight exceeds MTOW
  - CG outside envelope
  - Invalid envelope geometry

**Test Case Sources**:
1. FAA-H-8083-1B Chapter 5, Example 1-5 (minimum)
2. FAA-H-8083-1B Chapter 5, Example 6-10
3. FAA-H-8083-1B Chapter 5, Example 11-15
4. Custom edge cases (4 cases)
5. Negative cases (3 cases)

**Golden File Structure**:
```json
{
  "version": "1.0.0",
  "source": "FAA-H-8083-1B Chapter 5 + Custom",
  "cases": [
    {
      "id": "faa-ch5-ex1",
      "name": "Cessna 172 - Normal Loading",
      "source": "FAA-H-8083-1B, Chapter 5, Example 1",
      "aircraft": { ... },
      "items": [ ... ],
      "expected": {
        "totalWeight": 2340,
        "cgPosition": 42.5,
        "status": "safe",
        "validations": []
      },
      "tolerance": 0.1
    },
    {
      "id": "edge-ultralight",
      "name": "Ultralight - Minimum Weight",
      "source": "Custom edge case",
      "aircraft": { ... },
      "expected": { ... }
    },
    {
      "id": "edge-c17-heavy",
      "name": "Boeing C-17 Globemaster III - Heavy Military Cargo",
      "source": "Custom edge case - large aircraft",
      "aircraft": {
        "name": "C-17 Tactical Airlift",
        "model": "Boeing C-17 Globemaster III",
        "basicEmptyWeight": 282000,
        "basicEmptyWeightArm": 1020,
        "maxTakeoffWeight": 585000,
        "maxLandingWeight": 446923
      },
      "items": [
        { "name": "Crew", "weight": 600, "arm": 180 },
        { "name": "M1 Abrams Tank", "weight": 68000, "arm": 1050 },
        { "name": "Support Vehicles", "weight": 12000, "arm": 950 },
        { "name": "Cargo Pallets", "weight": 18000, "arm": 1100 },
        { "name": "Fuel", "weight": 147400, "arm": 980 }
      ],
      "expected": {
        "totalWeight": 528000,
        "cgPosition": 1012.88,
        "status": "safe",
        "validations": []
      },
      "tolerance": 1.0
    },
    {
      "id": "negative-overweight",
      "name": "Should fail - MTOW exceeded",
      "source": "Negative test case",
      "aircraft": { ... },
      "expected": {
        "status": "error",
        "validations": [{
          "code": "MTOW_EXCEEDED",
          "severity": "error"
        }]
      }
    }
  ]
}
```

**Target Files**:
- `golden/weight_balance_cases.json` (expanded)
- `golden/weight_balance_expected.json` (expanded)
- `scripts/golden-weight-balance.mjs`

---

### Enhancement 5: Strengthen Gate 16 (Envelope Input/Import)

**Issue**: Malformed envelope data could allow dangerous configurations.

**Changes to Gate 16 Exit Criteria**:
- Add envelope geometry validation:
  - Polygon must be closed (first point = last point)
  - No self-intersecting edges
  - Minimum 4 vertices
  - Vertices must be in consistent order (clockwise or counterclockwise)
- Add envelope sanity checks:
  - Weight range reasonable (100 lbs to 1,000,000 lbs)
  - CG range reasonable (-100 in to +200 in)
  - Envelope area > 0
- Add envelope preview with test points before saving

**Validation Functions**:
```typescript
// Add to src/lib/core/weight-balance/envelope.ts

function validateEnvelopeGeometry(envelope: CGEnvelope): ValidationResult[] {
  const errors: ValidationResult[] = [];
  
  // Check closed polygon
  const first = envelope.vertices[0];
  const last = envelope.vertices[envelope.vertices.length - 1];
  if (first.weight !== last.weight || first.cgPosition !== last.cgPosition) {
    errors.push({
      code: 'ENVELOPE_NOT_CLOSED',
      severity: 'error',
      message: 'Envelope polygon must be closed (first vertex = last vertex)'
    });
  }
  
  // Check minimum vertices
  if (envelope.vertices.length < 4) {
    errors.push({
      code: 'ENVELOPE_TOO_FEW_VERTICES',
      severity: 'error',
      message: 'Envelope must have at least 4 vertices'
    });
  }
  
  // Check for self-intersection
  if (hasSelflntersection(envelope.vertices)) {
    errors.push({
      code: 'ENVELOPE_SELF_INTERSECTION',
      severity: 'error',
      message: 'Envelope polygon has self-intersecting edges'
    });
  }
  
  // Sanity check weight range
  const weights = envelope.vertices.map(v => v.weight);
  const maxWeight = Math.max(...weights);
  const minWeight = Math.min(...weights);
  
  if (maxWeight < 100 || maxWeight > 1000000) {
    errors.push({
      code: 'ENVELOPE_UNREALISTIC_WEIGHT',
      severity: 'warning',
      message: `Max weight (${maxWeight}) seems unrealistic. Verify units and data.`
    });
  }
  
  // Sanity check CG range
  const cgPositions = envelope.vertices.map(v => v.cgPosition);
  const maxCG = Math.max(...cgPositions);
  const minCG = Math.min(...cgPositions);
  
  if (maxCG < -100 || maxCG > 200) {
    errors.push({
      code: 'ENVELOPE_UNREALISTIC_CG',
      severity: 'warning',
      message: `CG range (${minCG} to ${maxCG}) seems unrealistic. Verify datum and data.`
    });
  }
  
  return errors;
}

function hasSelflntersection(vertices: EnvelopePoint[]): boolean {
  // Implement line segment intersection algorithm
  // Return true if any non-adjacent edges intersect
  // ... implementation details
}
```

**UI Enhancement**:
- Add envelope preview panel showing:
  - Geometry visualization
  - Test points (corners + center)
  - Validation status
- Require user confirmation if warnings present

**Target Files**:
- `src/lib/core/weight-balance/envelope.ts`
- `src/lib/components/weight-balance/cards/EnvelopeInputCard.svelte`
- `tests/weight-balance/wb-envelope.spec.ts`

---

## Medium-Priority Enhancements (Optional but Recommended)

### Enhancement 6: Strengthen Gate 1 (Legal Documentation)

**Addition to Gate 1 Exit Criteria**:
- Add explicit statement: "This software is NOT FAA certified"
- Add recommendation: "Have a CFI review your first W&B calculation"
- Consider legal review of disclaimers (if legal resources available)
- Add version number and build date to all exports

**Disclaimer Template**:
```
⚠️ CRITICAL SAFETY NOTICE

This Weight & Balance calculator is EDUCATIONAL SOFTWARE ONLY.

✗ NOT FAA certified or approved
✗ NOT a substitute for your POH
✗ NOT reviewed by aviation authorities
✗ NOT for commercial operations

✓ Always verify with official POH
✓ Have a CFI review first calculation
✓ Cross-check with manual calculation
✓ Manufacturer data takes precedence

BY USING THIS SOFTWARE, YOU ACCEPT FULL RESPONSIBILITY FOR
VERIFYING ALL CALCULATIONS AND ENSURING SAFE AIRCRAFT OPERATION.
```

---

### Enhancement 7: Add Auto-Backup to Gate 6

**Addition to Gate 6 Exit Criteria**:
- Auto-export backup every 10 sessions
- Prompt user to export backup after significant changes
- Add "Last Backup" indicator in UI
- Add backup import/restore function

**Implementation**:
```typescript
// Add to src/lib/stores/weightBalanceStore.ts

let sessionCount = 0;

function incrementSession() {
  sessionCount++;
  if (sessionCount % 10 === 0) {
    promptBackupExport();
  }
}

function promptBackupExport() {
  // Show non-intrusive notification
  showNotification({
    type: 'info',
    message: 'Consider backing up your aircraft data',
    action: 'Export Backup',
    onAction: exportAllData
  });
}
```

---

### Enhancement 8: Add Learning Resources to Gate 15

**Addition to Gate 15 Exit Criteria**:
- Document D3 resources for developers
- Add code examples from similar projects (Surface module)
- Create proof-of-concept envelope rendering before full implementation
- Add fallback to table view if D3 fails to load

**Documentation Addition**:
```markdown
## D3 Learning Resources for Gate 15

**Prerequisites**:
- Familiarity with D3 v7+ API
- Understanding of SVG coordinate systems
- Knowledge of scales and axes

**Recommended Tutorials**:
- Observable D3 Gallery: https://observablehq.com/@d3/gallery
- D3 Line Chart: https://observablehq.com/@d3/line-chart
- D3 Area Chart: https://observablehq.com/@d3/area-chart

**Similar Code in This Repo**:
- Surface envelope rendering: `src/lib/drafting/surface/...`
- Bushing section rendering: `src/lib/drafting/bushing/sectionProfile.ts`

**Proof-of-Concept**:
Before implementing Gate 15, create minimal PoC:
1. Render simple 4-vertex polygon
2. Add axes with proper scaling
3. Plot single point
4. Verify color coding (green/red)

**Fallback Strategy**:
If D3 fails to load or render:
- Show tabular envelope data
- Display text-based status (IN ENVELOPE / OUT OF ENVELOPE)
- Provide export anyway (envelope diagram optional)
```

---

## Low-Priority Enhancements (Future Consideration)

### Enhancement 9: Future-Proof Data Models (Gate 2)

**Addition to Gate 2**:
- Add `schemaVersion` field to all data types
- Add `createdAt` and `updatedAt` timestamps
- Add `syncedAt` field for future cloud sync
- Design migration strategy for schema updates

**Example**:
```typescript
interface AircraftProfile {
  schemaVersion: string;               // "1.0.0"
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;                     // For future sync feature
  
  // ... existing fields
}
```

---

### Enhancement 10: User Experience Improvements

**Addition to Batch 2**:
- Add "Getting Started" wizard for first-time users
- Add sample aircraft for immediate testing (Cessna 172, Piper PA-28)
- Add progress indicator for multi-step workflows
- Add "Guided Tour" of interface

**Sample Aircraft**:
- Include 3-5 common aircraft with pre-configured data
- Mark as "Sample" to prevent confusion with user aircraft
- Allow cloning sample to create new aircraft

---

## Critical Edge Cases to Test

Add these test cases throughout implementation:

### Calculation Edge Cases
1. ✅ Empty aircraft (BEW only) - should warn?
2. ✅ Single loading item - edge case for statistics
3. ✅ Very light aircraft (<500 lbs) - ultralights
4. ✅ Very heavy aircraft (>100,000 lbs) - jets, cargo aircraft (Boeing C-17: 528,000 lbs)
5. ✅ Negative arms - nose-forward datum
6. ✅ Zero fuel - all fuel burned
7. ✅ Touching envelope boundary - exactly on line
8. ✅ Non-convex envelope - complex shapes

### Data Integrity Edge Cases
9. ✅ Corrupted localStorage - handle gracefully
10. ✅ Invalid JSON import - reject with clear error
11. ✅ Mismatched units in import - detect and warn
12. ✅ Out-of-order envelope vertices - auto-correct or reject

### UI Edge Cases
13. ✅ Browser zoom affects rendering - test at 50%, 100%, 200%
14. ✅ Small viewport (mobile) - ensure usability
15. ✅ D3 fails to load - fallback functional
16. ✅ PDF export with special characters in aircraft name

---

## Implementation Priority Order

**Before Starting Implementation**:
1. Review and approve these enhancements
2. Create tickets for high-priority enhancements
3. Update Gate exit criteria as specified

**During Batch 1**:
4. Implement Enhancement 1 (Gate 3)
5. Implement Enhancement 2 (Gate 8)
6. Implement Enhancement 4 (Gate 9)

**During Batch 2**:
7. Implement Enhancement 5 (Gate 16)
8. Implement Enhancement 8 (Gate 15 resources)

**During Batch 3**:
9. Implement Enhancement 3 (Gate 31)
10. Implement Enhancement 6 (Gate 1 legal)
11. Perform comprehensive edge case testing

**Post-Implementation**:
12. Get CFI/A&P expert review
13. Beta test with real pilots
14. Create video tutorial
15. Monitor for calculation errors in production

---

## Success Metrics (Updated)

Add these metrics to the original plan:

### Safety Metrics
- ✅ Zero calculation errors in golden file tests (20+ cases)
- ✅ 100% of edge cases handled gracefully (no crashes)
- ✅ All NaN/Infinity cases caught and handled
- ✅ Audit log captures 100% of calculations

### Quality Metrics
- ✅ Test coverage ≥95% on calculation engine (was unspecified)
- ✅ Zero high-severity accessibility issues
- ✅ All validation rules have unit tests
- ✅ Envelope validation passes geometry checks

### User Experience Metrics
- ✅ <5 minute workflow for experienced users (unchanged)
- ✅ <10 minute workflow for first-time users (with wizard)
- ✅ >90% success rate on envelope import (valid POH data)
- ✅ <1% data corruption rate in localStorage

---

## Conclusion

The Weight & Balance Master Plan V1 is **excellent** and ready for implementation with these enhancements. The additions focus on:

1. **Safety**: Stronger validation, audit trails, edge case handling
2. **Reliability**: Data integrity checks, envelope validation, golden tests
3. **Usability**: Better error messages, learning resources, backups
4. **Maintainability**: Future-proof data models, versioning, provenance

**Estimated Additional Effort**: 1-2 weeks spread across the 8-11 week timeline.

**Confidence in Enhanced Plan**: 95% (Very High)

---

**Review Status**: ✅ APPROVED WITH ENHANCEMENTS
**Next Step**: Create tickets for high-priority enhancements and begin Gate 1 implementation.
