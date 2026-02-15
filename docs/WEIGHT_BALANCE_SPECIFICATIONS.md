# Weight & Balance Technical Specifications

## Overview

This document provides detailed technical specifications for the Aircraft Weight & Balance (W&B) module in Structural Companion Desktop.

## Regulatory Foundation

### Primary References
- **FAA-H-8083-1B**: Aircraft Weight and Balance Handbook
- **14 CFR Part 91**: General Operating and Flight Rules
- **AC 120-27F**: Aircraft Weight and Balance Control

### Key Regulatory Requirements
1. Aircraft must be operated within approved weight limits
2. CG must remain within approved limits at all times
3. Operator/pilot responsible for compliance verification
4. Manufacturer data takes precedence over generic calculations

## Data Models

### Aircraft Profile

```typescript
interface AircraftProfile {
  id: string;                          // UUID
  name: string;                        // e.g., "N12345 - Cessna 172S"
  model: string;                       // e.g., "Cessna 172S Skyhawk"
  registration: string;                // e.g., "N12345"
  
  // Basic Empty Weight (BEW)
  basicEmptyWeight: number;            // lbs or kg
  basicEmptyWeightArm: number;         // inches or cm from datum
  
  // Reference Points
  datumLocation: DatumLocation;        // firewall | nose | other
  datumDescription?: string;           // custom datum description
  
  // Operating Limits
  maxTakeoffWeight: number;            // MTOW
  maxLandingWeight: number;            // MLW
  maxZeroFuelWeight?: number;          // Optional
  
  // Unit System
  units: 'imperial' | 'metric';
  
  // CG Envelopes (one per category)
  envelopes: CGEnvelope[];
  
  // Metadata
  lastWeighing: Date;                  // Date of last official weighing
  logbookReference?: string;           // Reference to W&B record in logbook
  notes?: string;
}

interface DatumLocation {
  type: 'firewall' | 'nose' | 'wing_leading_edge' | 'custom';
  customDescription?: string;
}

interface CGEnvelope {
  category: 'normal' | 'utility' | 'acrobatic';
  maxWeight: number;                   // Category-specific max weight
  vertices: EnvelopePoint[];           // Polygon vertices (closed)
  
  // Simplified forward/aft limits (optional, for basic envelopes)
  forwardLimit?: number;               // inches/cm aft of datum
  aftLimit?: number;                   // inches/cm aft of datum
}

interface EnvelopePoint {
  weight: number;                      // lbs or kg
  cgPosition: number;                  // inches/cm aft of datum
}
```

### Loading Configuration

```typescript
interface LoadingConfiguration {
  id: string;                          // UUID
  aircraftId: string;                  // Reference to AircraftProfile
  name: string;                        // e.g., "XC Flight to KLAS"
  timestamp: Date;
  
  // Loading Items
  items: LoadingItem[];
  
  // Calculated Results (computed, not stored)
  results?: LoadingResults;
}

interface LoadingItem {
  id: string;                          // UUID for drag-and-drop
  type: LoadingItemType;
  name: string;                        // e.g., "Pilot", "Main Fuel"
  weight: number;                      // lbs or kg
  arm: number;                         // inches or cm from datum
  
  // Optional metadata
  notes?: string;
  editable: boolean;                   // Some items may be locked
}

type LoadingItemType = 
  | 'occupant'
  | 'fuel_main'
  | 'fuel_auxiliary'
  | 'baggage_nose'
  | 'baggage_aft'
  | 'baggage_external'
  | 'equipment_fixed'
  | 'equipment_removable'
  | 'cargo';

interface LoadingResults {
  // Total Calculations
  totalWeight: number;
  totalMoment: number;
  cgPosition: number;                  // Total moment / total weight
  
  // Zero Fuel Weight
  zeroFuelWeight: number;
  zeroFuelMoment: number;
  zeroFuelCG: number;
  
  // Validation Results
  validations: ValidationResult[];
  
  // Category Compliance
  category: 'normal' | 'utility' | 'acrobatic' | null;
  categoryValid: boolean;
  
  // Status
  overallStatus: 'safe' | 'warning' | 'error';
}

interface ValidationResult {
  code: string;                        // e.g., "MTOW_EXCEEDED"
  severity: 'error' | 'warning' | 'info';
  message: string;
  value?: number;                      // Actual value
  limit?: number;                      // Limit value
  category?: string;                   // Related category
}
```

### Fuel Configuration

```typescript
interface FuelConfiguration {
  fuelType: FuelType;
  mainTankCapacity: number;            // gallons or liters
  mainTankArm: number;                 // inches or cm
  auxiliaryTankCapacity?: number;
  auxiliaryTankArm?: number;
  
  // Calculated
  mainTankWeight: number;              // gallons × weight per gallon
  auxiliaryTankWeight?: number;
}

type FuelType = 
  | 'avgas_100ll'                      // 6.0 lbs/gal
  | 'avgas_unleaded'                   // 6.0 lbs/gal
  | 'jet_a'                            // 6.7 lbs/gal
  | 'jet_a1'                           // 6.7 lbs/gal
  | 'mogas';                           // 6.0 lbs/gal

const FUEL_WEIGHTS: Record<FuelType, number> = {
  avgas_100ll: 6.0,
  avgas_unleaded: 6.0,
  jet_a: 6.7,
  jet_a1: 6.7,
  mogas: 6.0
};
```

## Calculation Algorithms

### Tabular Method (Core Algorithm)

The fundamental W&B calculation uses the tabular method:

```typescript
function calculateWeightAndBalance(
  aircraft: AircraftProfile,
  items: LoadingItem[]
): LoadingResults {
  // Step 1: Calculate moments for each item
  const itemsWithMoments = items.map(item => ({
    ...item,
    moment: item.weight * item.arm
  }));
  
  // Step 2: Sum all weights and moments
  const totalWeight = itemsWithMoments.reduce((sum, item) => sum + item.weight, 0);
  const totalMoment = itemsWithMoments.reduce((sum, item) => sum + item.moment, 0);
  
  // Step 3: Calculate CG position
  const cgPosition = totalMoment / totalWeight;
  
  // Step 4: Calculate Zero Fuel Weight (exclude fuel items)
  const nonFuelItems = itemsWithMoments.filter(
    item => !item.type.startsWith('fuel_')
  );
  const zeroFuelWeight = nonFuelItems.reduce((sum, item) => sum + item.weight, 0);
  const zeroFuelMoment = nonFuelItems.reduce((sum, item) => sum + item.moment, 0);
  const zeroFuelCG = zeroFuelMoment / zeroFuelWeight;
  
  // Step 5: Run validations
  const validations = runValidations(aircraft, {
    totalWeight,
    cgPosition,
    zeroFuelWeight,
    zeroFuelCG
  });
  
  // Step 6: Determine overall status
  const overallStatus = determineStatus(validations);
  
  return {
    totalWeight,
    totalMoment,
    cgPosition,
    zeroFuelWeight,
    zeroFuelMoment,
    zeroFuelCG,
    validations,
    overallStatus,
    category: determineBestCategory(aircraft, cgPosition, totalWeight),
    categoryValid: validations.every(v => v.severity !== 'error')
  };
}
```

### CG Envelope Validation

Two methods for envelope validation:

#### Method 1: Point-in-Polygon (Complex Envelopes)

```typescript
function isPointInEnvelope(
  weight: number,
  cgPosition: number,
  envelope: CGEnvelope
): boolean {
  // Ray casting algorithm
  const point = { x: cgPosition, y: weight };
  const vertices = envelope.vertices;
  let inside = false;
  
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].cgPosition;
    const yi = vertices[i].weight;
    const xj = vertices[j].cgPosition;
    const yj = vertices[j].weight;
    
    const intersect = ((yi > point.y) !== (yj > point.y))
      && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}
```

#### Method 2: Simple Forward/Aft Limits (Basic Envelopes)

```typescript
function isWithinSimpleLimits(
  weight: number,
  cgPosition: number,
  envelope: CGEnvelope
): boolean {
  if (weight > envelope.maxWeight) return false;
  if (!envelope.forwardLimit || !envelope.aftLimit) return false;
  
  return cgPosition >= envelope.forwardLimit 
      && cgPosition <= envelope.aftLimit;
}
```

### Validation Rules

```typescript
function runValidations(
  aircraft: AircraftProfile,
  results: {
    totalWeight: number;
    cgPosition: number;
    zeroFuelWeight: number;
    zeroFuelCG: number;
  }
): ValidationResult[] {
  const validations: ValidationResult[] = [];
  
  // Validation 1: MTOW Check
  if (results.totalWeight > aircraft.maxTakeoffWeight) {
    validations.push({
      code: 'MTOW_EXCEEDED',
      severity: 'error',
      message: `Total weight (${results.totalWeight.toFixed(1)} lbs) exceeds Maximum Takeoff Weight (${aircraft.maxTakeoffWeight} lbs)`,
      value: results.totalWeight,
      limit: aircraft.maxTakeoffWeight
    });
  }
  
  // Validation 2: MLW Check
  if (results.totalWeight > aircraft.maxLandingWeight) {
    validations.push({
      code: 'MLW_EXCEEDED',
      severity: 'warning',
      message: `Total weight exceeds Maximum Landing Weight. Fuel must be burned before landing.`,
      value: results.totalWeight,
      limit: aircraft.maxLandingWeight
    });
  }
  
  // Validation 3: Zero Fuel Weight Check
  if (aircraft.maxZeroFuelWeight && results.zeroFuelWeight > aircraft.maxZeroFuelWeight) {
    validations.push({
      code: 'MZFW_EXCEEDED',
      severity: 'error',
      message: `Zero fuel weight exceeds maximum zero fuel weight`,
      value: results.zeroFuelWeight,
      limit: aircraft.maxZeroFuelWeight
    });
  }
  
  // Validation 4: CG Envelope Check (per category)
  for (const envelope of aircraft.envelopes) {
    const inEnvelope = isPointInEnvelope(
      results.totalWeight,
      results.cgPosition,
      envelope
    );
    
    if (!inEnvelope) {
      validations.push({
        code: 'CG_OUT_OF_ENVELOPE',
        severity: 'error',
        message: `CG position (${results.cgPosition.toFixed(2)} in) is outside the ${envelope.category} category envelope`,
        category: envelope.category,
        value: results.cgPosition
      });
    }
  }
  
  // Validation 5: Zero Fuel CG Check
  // Ensure aircraft remains within limits even after all fuel is burned
  for (const envelope of aircraft.envelopes) {
    const zfwInEnvelope = isPointInEnvelope(
      results.zeroFuelWeight,
      results.zeroFuelCG,
      envelope
    );
    
    if (!zfwInEnvelope) {
      validations.push({
        code: 'ZFW_CG_OUT_OF_ENVELOPE',
        severity: 'error',
        message: `Zero fuel CG will be out of envelope after fuel burn`,
        category: envelope.category,
        value: results.zeroFuelCG
      });
    }
  }
  
  // Validation 6: Category-Specific Warnings
  if (results.totalWeight < 1000) {
    validations.push({
      code: 'LOW_WEIGHT_WARNING',
      severity: 'info',
      message: `Low total weight. Verify all items are included.`,
      value: results.totalWeight
    });
  }
  
  return validations;
}
```

## Rendering Specifications

### CG Envelope Diagram (D3.js)

```typescript
interface EnvelopeRenderConfig {
  width: number;                       // SVG width in pixels
  height: number;                      // SVG height in pixels
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  
  // Axes
  xAxisLabel: string;                  // "CG Position (inches aft of datum)"
  yAxisLabel: string;                  // "Weight (lbs)"
  
  // Styling
  envelopeColor: string;               // #e0e0e0
  envelopeBorderColor: string;         // #666
  cgPointColor: string;                // Dynamic: green/yellow/red
  cgPointRadius: number;               // 6
  
  // Grid
  showGrid: boolean;
  gridColor: string;
  
  // Interactive
  enableZoom: boolean;
  enableTooltips: boolean;
}

function renderEnvelope(
  svg: d3.Selection,
  envelope: CGEnvelope,
  currentPoint: { weight: number; cg: number },
  config: EnvelopeRenderConfig
): void {
  // 1. Create scales
  const xExtent = d3.extent(envelope.vertices, d => d.cgPosition);
  const yExtent = d3.extent(envelope.vertices, d => d.weight);
  
  const xScale = d3.scaleLinear()
    .domain([xExtent[0] - 5, xExtent[1] + 5])
    .range([config.marginLeft, config.width - config.marginRight]);
  
  const yScale = d3.scaleLinear()
    .domain([0, yExtent[1] * 1.1])
    .range([config.height - config.marginBottom, config.marginTop]);
  
  // 2. Draw axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale);
  
  svg.append('g')
    .attr('transform', `translate(0, ${config.height - config.marginBottom})`)
    .call(xAxis);
  
  svg.append('g')
    .attr('transform', `translate(${config.marginLeft}, 0)`)
    .call(yAxis);
  
  // 3. Draw envelope polygon
  const lineGenerator = d3.line()
    .x(d => xScale(d.cgPosition))
    .y(d => yScale(d.weight));
  
  svg.append('path')
    .datum([...envelope.vertices, envelope.vertices[0]]) // Close polygon
    .attr('d', lineGenerator)
    .attr('fill', config.envelopeColor)
    .attr('stroke', config.envelopeBorderColor)
    .attr('stroke-width', 2);
  
  // 4. Draw current CG point
  const pointColor = isPointInEnvelope(currentPoint.weight, currentPoint.cg, envelope)
    ? '#4caf50'  // Green - safe
    : '#f44336'; // Red - unsafe
  
  svg.append('circle')
    .attr('cx', xScale(currentPoint.cg))
    .attr('cy', yScale(currentPoint.weight))
    .attr('r', config.cgPointRadius)
    .attr('fill', pointColor)
    .attr('stroke', '#fff')
    .attr('stroke-width', 2);
  
  // 5. Add labels
  svg.append('text')
    .attr('x', config.width / 2)
    .attr('y', config.height - 5)
    .attr('text-anchor', 'middle')
    .text(config.xAxisLabel);
  
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -config.height / 2)
    .attr('y', 15)
    .attr('text-anchor', 'middle')
    .text(config.yAxisLabel);
}
```

### Loading Table Rendering

Standard HTML table with real-time moment calculations:

```html
<table class="loading-table">
  <thead>
    <tr>
      <th>Item</th>
      <th>Weight (lbs)</th>
      <th>Arm (in)</th>
      <th>Moment (lb-in)</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {#each items as item (item.id)}
      <tr class="loading-row {item.type}">
        <td>
          <input 
            type="text" 
            bind:value={item.name} 
            class="item-name"
          />
        </td>
        <td>
          <input 
            type="number" 
            bind:value={item.weight}
            min="0"
            step="0.1"
            class="item-weight"
          />
        </td>
        <td>
          <input 
            type="number" 
            bind:value={item.arm}
            step="0.1"
            class="item-arm"
            disabled={!item.editable}
          />
        </td>
        <td class="moment-cell">
          {(item.weight * item.arm).toFixed(1)}
        </td>
        <td>
          <button on:click={() => removeItem(item.id)}>
            Remove
          </button>
        </td>
      </tr>
    {/each}
    <tr class="total-row">
      <td><strong>TOTAL</strong></td>
      <td><strong>{totalWeight.toFixed(1)}</strong></td>
      <td>—</td>
      <td><strong>{totalMoment.toFixed(1)}</strong></td>
      <td></td>
    </tr>
    <tr class="cg-row">
      <td><strong>CG Position</strong></td>
      <td colspan="2"><strong>{cgPosition.toFixed(2)} inches</strong></td>
      <td colspan="2"></td>
    </tr>
  </tbody>
</table>
```

## Export Specifications

### PDF Export Format

```typescript
interface WBReportPDF {
  // Header
  title: "Aircraft Weight and Balance Calculation";
  aircraftInfo: {
    registration: string;
    model: string;
    date: string;
  };
  
  // Aircraft Data Section
  basicEmptyWeight: string;
  basicEmptyWeightArm: string;
  maxTakeoffWeight: string;
  maxLandingWeight: string;
  
  // Loading Table
  loadingItems: {
    name: string;
    weight: string;
    arm: string;
    moment: string;
  }[];
  
  // Results
  totalWeight: string;
  totalMoment: string;
  cgPosition: string;
  zeroFuelWeight: string;
  zeroFuelCG: string;
  
  // CG Envelope Diagram (SVG embedded)
  envelopeSVG: string;
  
  // Validation Status
  status: 'SAFE' | 'WARNING' | 'ERROR';
  validationMessages: string[];
  
  // Signature Fields
  pilotSignature: string;
  date: string;
  
  // Footer/Disclaimer
  disclaimer: string;
}
```

## Performance Requirements

| Operation | Target | Maximum |
|-----------|--------|---------|
| Single W&B calculation | <10ms | 50ms |
| State update (add/remove item) | <50ms | 100ms |
| Envelope rendering | <100ms | 200ms |
| PDF export generation | <2s | 5s |
| Page load | <1s | 2s |

## Storage Requirements

### LocalStorage Schema

```typescript
interface WBStorage {
  version: '1.0.0';
  aircraft: AircraftProfile[];         // Max 50 aircraft
  configurations: LoadingConfiguration[]; // Max 100 configs
  settings: {
    defaultUnits: 'imperial' | 'metric';
    defaultFuelType: FuelType;
    autoSave: boolean;
    showGrid: boolean;
  };
}
```

### Size Limits
- Total localStorage: <5MB
- Single aircraft profile: <50KB
- Single loading config: <20KB

## Browser Compatibility

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 90+ | Full support |
| Firefox | 88+ | Full support |
| Safari | 14+ | Full support |
| Edge | 90+ | Full support |

## Accessibility Requirements (WCAG 2.1 Level AA)

1. **Keyboard Navigation**
   - All inputs accessible via Tab/Shift+Tab
   - Enter to submit, Escape to cancel
   - Arrow keys for table navigation

2. **Screen Reader Support**
   - ARIA labels on all form fields
   - ARIA live regions for calculation updates
   - Alt text for CG envelope diagram

3. **Visual**
   - Color contrast ratio ≥4.5:1 for normal text
   - Color contrast ratio ≥3:1 for large text
   - Safe/unsafe status not indicated by color alone (use icons)

4. **Error Handling**
   - Clear error messages
   - Focus on first error field
   - Inline validation feedback

## Security Considerations

1. **Input Validation**
   - All numeric inputs validated for reasonable ranges
   - String inputs sanitized to prevent XSS
   - File imports validated for structure and size

2. **Data Privacy**
   - All data stored locally only (no server transmission)
   - No PII collected or transmitted
   - Export PDFs contain only user-provided data

3. **Disclaimers**
   - Prominent disclaimers on every page
   - Clear statement: "For reference only"
   - Recommendation to verify with POH

## Testing Requirements

### Unit Tests
- Calculation engine: 100% coverage
- Validation logic: 100% coverage
- Envelope algorithms: 100% coverage
- Utility functions: 90%+ coverage

### Integration Tests
- State management: Complete workflow coverage
- Export functionality: PDF and SVG generation
- Import functionality: JSON parsing and validation

### E2E Tests
- Full workflow: Aircraft setup → Loading → Validation → Export
- Error scenarios: Invalid inputs, out-of-envelope conditions
- Multi-aircraft: Switching between profiles

### Performance Tests
- Calculation latency under load
- Rendering performance with complex envelopes
- Memory usage over extended sessions

## Maintenance and Support

### Versioning
- Semantic versioning: MAJOR.MINOR.PATCH
- Breaking changes increment MAJOR
- New features increment MINOR
- Bug fixes increment PATCH

### Changelog
- Maintain CHANGELOG.md
- Document all changes, especially calculation logic
- Reference FAA regulations for major changes

### Support Resources
- User guide with examples
- FAQ for common questions
- Video tutorials (optional)
- Community forum or support channel

## Future Enhancements (Post-V1)

1. **Advanced Features**
   - Lateral CG calculation (helicopter support)
   - Multi-phase fuel burn analysis
   - Performance calculation integration

2. **Integrations**
   - ForeFlight import/export
   - Garmin Pilot compatibility
   - FltPlan.com integration

3. **Collaboration**
   - Share aircraft profiles
   - Template marketplace
   - Community-validated envelopes

4. **Mobile**
   - Responsive design
   - Touch-optimized controls
   - Offline-first PWA

---

## Glossary

- **Arm**: Distance from the datum to the center of gravity of an item
- **BEW**: Basic Empty Weight - Weight of aircraft with unusable fuel and oil
- **CG**: Center of Gravity - Balance point of the aircraft
- **Datum**: Reference point for all arm measurements
- **Moment**: Weight × Arm - Tendency to rotate about the datum
- **MTOW**: Maximum Takeoff Weight
- **MLW**: Maximum Landing Weight
- **MZFW**: Maximum Zero Fuel Weight
- **POH**: Pilot's Operating Handbook
- **ZFW**: Zero Fuel Weight - Aircraft weight excluding usable fuel

---

*This specification is based on FAA-H-8083-1B and industry best practices. Always refer to the aircraft's official documentation for authoritative data.*
