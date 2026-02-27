/**
 * Weight & Balance Type Definitions
 * Based on FAA-H-8083-1B Aircraft Weight and Balance Handbook
 */

export interface AircraftProfile {
  id: string;
  name: string;
  model: string;
  registration: string;
  
  // Basic Empty Weight (BEW)
  basicEmptyWeight: number;
  basicEmptyWeightArm: number;
  
  // Reference Points
  datumLocation: DatumLocation;
  datumDescription?: string;
  
  // Mean Aerodynamic Chord (MAC) reference (optional)
  lemac?: number; // Leading Edge MAC position (inches from datum)
  mac?: number;   // MAC length (inches)
  
  // Operating Limits
  maxTakeoffWeight: number;
  maxLandingWeight: number;
  maxZeroFuelWeight?: number;
  
  // Unit System
  units: 'imperial' | 'metric';
  
  // CG Envelopes
  envelopes: CGEnvelope[];
  
  // Metadata
  lastWeighing: Date;
  logbookReference?: string;
  notes?: string;
}

export interface DatumLocation {
  type: 'firewall' | 'nose' | 'wing_leading_edge' | 'custom';
  customDescription?: string;
}

export interface CGEnvelope {
  category: 'normal' | 'utility' | 'acrobatic';
  maxWeight: number;
  vertices: EnvelopePoint[];
  
  // Simplified forward/aft limits (optional)
  forwardLimit?: number;
  aftLimit?: number;
}

export interface EnvelopePoint {
  weight: number;
  cgPosition: number;
}

export interface LoadingConfiguration {
  id: string;
  aircraftId: string;
  name: string;
  timestamp: Date;
  items: LoadingItem[];
  results?: LoadingResults;
}

export interface LoadingItem {
  id: string;
  type: LoadingItemType;
  name: string;
  weight: number;
  arm: number;
  notes?: string;
  editable: boolean;
}

export type LoadingItemType = 
  | 'occupant'
  | 'fuel_main'
  | 'fuel_auxiliary'
  | 'baggage_nose'
  | 'baggage_aft'
  | 'baggage_external'
  | 'equipment_fixed'
  | 'equipment_removable'
  | 'cargo';

export interface LoadingResults {
  totalWeight: number;
  totalMoment: number;
  cgPosition: number;
  
  zeroFuelWeight: number;
  zeroFuelMoment: number;
  zeroFuelCG: number;
  
  validations: ValidationResult[];
  category: 'normal' | 'utility' | 'acrobatic' | null;
  categoryValid: boolean;
  overallStatus: 'safe' | 'warning' | 'error';
  calculationTrace: CalculationTraceEntry[];
  audit: LoadingAudit;
  analysis: LoadingAnalysis;
}

export interface CalculationTraceEntry {
  id: string;
  name: string;
  type: LoadingItemType;
  weight: number;
  arm: number;
  moment: number;
  isFuel: boolean;
}

export interface LoadingAudit {
  generatedAt: string;
  inputHash: string;
  checks: {
    errors: number;
    warnings: number;
    info: number;
  };
}

export interface LoadingAnalysis {
  uncertaintyBand: UncertaintyBand;
  sensitivity: SensitivityEntry[];
  sensitivityDeltaWeight: number;
}

export interface UncertaintyBand {
  weightTolerance: number;
  armTolerance: number;
  totalWeightMin: number;
  totalWeightMax: number;
  totalMomentMin: number;
  totalMomentMax: number;
  cgMin: number;
  cgMax: number;
  cgSpan: number;
}

export interface SensitivityEntry {
  itemId: string;
  itemName: string;
  arm: number;
  baselineWeight: number;
  deltaWeight: number;
  cgPerUnitWeight: number;
  deltaCGForStep: number;
}

export interface CalculationOptions {
  uncertaintyWeightTolerance?: number;
  uncertaintyArmTolerance?: number;
  sensitivityDeltaWeight?: number;
}

export interface ValidationResult {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  value?: number;
  limit?: number;
  category?: string;
}

export type FuelType = 
  | 'avgas_100ll'
  | 'avgas_unleaded'
  | 'jet_a'
  | 'jet_a1'
  | 'mogas';

export const FUEL_WEIGHTS: Record<FuelType, number> = {
  avgas_100ll: 6.0,
  avgas_unleaded: 6.0,
  jet_a: 6.7,
  jet_a1: 6.7,
  mogas: 6.0
};

/**
 * Envelope input mode for CG position editing
 * - 'station': Input values are in station coordinates (inches from datum)
 * - 'mac': Input values are in %MAC coordinates
 */
export type EnvelopeInputMode = 'station' | 'mac';

/**
 * Fuel tank configuration for fuel burn simulation
 */
export interface FuelTank {
  id: string;
  name: string;
  capacity: number;        // gallons
  arm: number;             // inches from datum
  currentFuel: number;     // gallons
  fuelType: FuelType;
  burnPriority: number;    // 1 = burns first, 2 = second, etc.
}

/**
 * Fuel burn simulation step
 */
export interface FuelBurnStep {
  time: number;            // minutes from start
  fuelRemaining: number;   // total fuel remaining (gallons)
  tankFuels: Record<string, number>;  // fuel in each tank (gallons)
  totalWeight: number;     // aircraft gross weight (lbs)
  cgPosition: number;      // CG position (inches from datum)
  totalMoment: number;     // total moment (lb-in)
  category: 'normal' | 'utility' | 'acrobatic' | null;
  inEnvelope: boolean;
}

/**
 * Fuel burn simulation configuration
 */
export interface FuelBurnConfig {
  burnRate: number;        // gallons per hour
  duration: number;        // total flight time (minutes)
  tanks: FuelTank[];
  profileName?: string;    // optional profile template name
}

/**
 * Fuel burn simulation results
 */
export interface FuelBurnResults {
  steps: FuelBurnStep[];
  warnings: string[];
  summary: {
    initialWeight: number;
    finalWeight: number;
    fuelBurned: number;     // gallons
    cgTravel: number;       // inches
    maxCGForward: number;
    maxCGAft: number;
    allStepsValid: boolean;
  };
}
