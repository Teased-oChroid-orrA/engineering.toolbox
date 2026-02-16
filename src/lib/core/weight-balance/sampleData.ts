/**
 * Sample Aircraft Data
 * Example: Cessna 172S Skyhawk (typical configuration)
 * Data based on typical POH values - ALWAYS verify with actual aircraft POH
 */

import type { AircraftProfile } from './types';

export const SAMPLE_CESSNA_172S: AircraftProfile = {
  id: 'sample-c172s-001',
  name: 'N12345 - Cessna 172S',
  model: 'Cessna 172S Skyhawk',
  registration: 'N12345',
  
  basicEmptyWeight: 1663,  // lbs (typical)
  basicEmptyWeightArm: 39.5,  // inches aft of datum
  
  datumLocation: {
    type: 'firewall',
    customDescription: 'Forward face of firewall'
  },
  
  maxTakeoffWeight: 2550,
  maxLandingWeight: 2550,
  maxZeroFuelWeight: 2550,
  
  units: 'imperial',
  
  envelopes: [
    {
      category: 'normal',
      maxWeight: 2550,
      forwardLimit: 35.0,  // inches aft of datum
      aftLimit: 47.3,      // inches aft of datum
      vertices: [
        { weight: 1500, cgPosition: 35.0 },
        { weight: 1950, cgPosition: 35.0 },
        { weight: 2550, cgPosition: 41.0 },
        { weight: 2550, cgPosition: 47.3 },
        { weight: 1500, cgPosition: 47.3 },
        { weight: 1500, cgPosition: 35.0 }  // Close the polygon
      ]
    }
  ],
  
  lastWeighing: new Date('2024-01-15'),
  logbookReference: 'Logbook Entry: Jan 15, 2024, Page 234',
  notes: 'This is sample data only. Always verify with actual aircraft POH.'
};

/**
 * Sample loading items for Cessna 172S
 */
export function createSampleLoading() {
  return [
    {
      id: 'item-1',
      type: 'occupant' as const,
      name: 'Pilot (Front Left)',
      weight: 180,
      arm: 37.0,
      editable: true
    },
    {
      id: 'item-2',
      type: 'occupant' as const,
      name: 'Front Right Passenger',
      weight: 0,
      arm: 37.0,
      editable: true
    },
    {
      id: 'item-3',
      type: 'occupant' as const,
      name: 'Rear Left Passenger',
      weight: 0,
      arm: 73.0,
      editable: true
    },
    {
      id: 'item-4',
      type: 'occupant' as const,
      name: 'Rear Right Passenger',
      weight: 0,
      arm: 73.0,
      editable: true
    },
    {
      id: 'item-5',
      type: 'baggage_aft' as const,
      name: 'Baggage',
      weight: 0,
      arm: 95.0,
      editable: true
    },
    {
      id: 'item-6',
      type: 'fuel_main' as const,
      name: 'Main Fuel',
      weight: 318,  // 53 gallons × 6.0 lbs/gal
      arm: 48.0,
      editable: true,
      notes: 'Full fuel: 53 usable gallons'
    }
  ];
}
