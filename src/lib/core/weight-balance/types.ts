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
