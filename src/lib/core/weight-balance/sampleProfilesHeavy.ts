import type { AircraftProfile } from './types';

export const SAMPLE_C17_GLOBEMASTER: AircraftProfile = {
  id: 'sample-c17-001',
  name: 'C-17 Globemaster III',
  model: 'Boeing C-17 Globemaster III',
  registration: '00-0000',
  basicEmptyWeight: 282000,
  basicEmptyWeightArm: 1020,
  datumLocation: { type: 'nose', customDescription: 'Nose of aircraft' },
  maxTakeoffWeight: 585000,
  maxLandingWeight: 446923,
  maxZeroFuelWeight: 437000,
  units: 'imperial',
  envelopes: [
    {
      category: 'normal',
      maxWeight: 585000,
      forwardLimit: 990,
      aftLimit: 1050,
      vertices: [
        { weight: 282000, cgPosition: 990 },
        { weight: 437000, cgPosition: 990 },
        { weight: 585000, cgPosition: 1015 },
        { weight: 585000, cgPosition: 1050 },
        { weight: 282000, cgPosition: 1050 },
        { weight: 282000, cgPosition: 990 }
      ]
    }
  ],
  lastWeighing: new Date('2025-01-01'),
  logbookReference: 'USAF Technical Order',
  notes: 'Military cargo aircraft. Data based on typical configuration. Always verify with actual aircraft TO.'
};

export const SAMPLE_KING_AIR_350: AircraftProfile = {
  id: 'sample-ka350-001',
  name: 'N350KA - King Air 350',
  model: 'Beechcraft King Air 350',
  registration: 'N350KA',
  basicEmptyWeight: 9150,
  basicEmptyWeightArm: 305.0,
  datumLocation: { type: 'nose', customDescription: 'Front of nose at fuselage station 0' },
  maxTakeoffWeight: 15000,
  maxLandingWeight: 14600,
  maxZeroFuelWeight: 11500,
  units: 'imperial',
  envelopes: [
    {
      category: 'normal',
      maxWeight: 15000,
      forwardLimit: 290.0,
      aftLimit: 309.0,
      vertices: [
        { weight: 9150, cgPosition: 290.0 },
        { weight: 11500, cgPosition: 290.0 },
        { weight: 15000, cgPosition: 299.0 },
        { weight: 15000, cgPosition: 309.0 },
        { weight: 9150, cgPosition: 309.0 },
        { weight: 9150, cgPosition: 290.0 }
      ]
    }
  ],
  lastWeighing: new Date('2025-02-01'),
  logbookReference: 'Logbook Entry: Feb 1, 2025',
  notes: 'Sample data only. Twin turboprop. Always verify with actual aircraft POH.'
};
