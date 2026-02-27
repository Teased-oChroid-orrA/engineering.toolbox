import type { AircraftProfile } from './types';

export const SAMPLE_CESSNA_172S: AircraftProfile = {
  id: 'sample-c172s-001',
  name: 'N12345 - Cessna 172S',
  model: 'Cessna 172S Skyhawk',
  registration: 'N12345',
  basicEmptyWeight: 1663,
  basicEmptyWeightArm: 39.5,
  datumLocation: { type: 'firewall', customDescription: 'Forward face of firewall' },
  maxTakeoffWeight: 2550,
  maxLandingWeight: 2550,
  maxZeroFuelWeight: 2550,
  units: 'imperial',
  envelopes: [
    {
      category: 'normal',
      maxWeight: 2550,
      forwardLimit: 35.0,
      aftLimit: 47.3,
      vertices: [
        { weight: 1500, cgPosition: 35.0 },
        { weight: 1950, cgPosition: 35.0 },
        { weight: 2550, cgPosition: 41.0 },
        { weight: 2550, cgPosition: 47.3 },
        { weight: 1500, cgPosition: 47.3 },
        { weight: 1500, cgPosition: 35.0 }
      ]
    }
  ],
  lastWeighing: new Date('2024-01-15'),
  logbookReference: 'Logbook Entry: Jan 15, 2024, Page 234',
  notes: 'This is sample data only. Always verify with actual aircraft POH.'
};

export const SAMPLE_PIPER_CHEROKEE: AircraftProfile = {
  id: 'sample-pa28-001',
  name: 'N54321 - Piper Cherokee',
  model: 'Piper PA-28-180',
  registration: 'N54321',
  basicEmptyWeight: 1410,
  basicEmptyWeightArm: 39.0,
  datumLocation: { type: 'firewall', customDescription: 'Forward face of firewall' },
  maxTakeoffWeight: 2400,
  maxLandingWeight: 2400,
  maxZeroFuelWeight: 2400,
  units: 'imperial',
  envelopes: [
    {
      category: 'normal',
      maxWeight: 2400,
      forwardLimit: 36.5,
      aftLimit: 45.5,
      vertices: [
        { weight: 1410, cgPosition: 36.5 },
        { weight: 2400, cgPosition: 38.0 },
        { weight: 2400, cgPosition: 45.5 },
        { weight: 1410, cgPosition: 45.5 },
        { weight: 1410, cgPosition: 36.5 }
      ]
    }
  ],
  lastWeighing: new Date('2024-06-15'),
  logbookReference: 'Logbook Entry: Jun 15, 2024',
  notes: 'Sample data only. Always verify with actual aircraft POH.'
};

export const SAMPLE_BEECHCRAFT_BONANZA: AircraftProfile = {
  id: 'sample-be36-001',
  name: 'N98765 - Beechcraft Bonanza',
  model: 'Beechcraft A36 Bonanza',
  registration: 'N98765',
  basicEmptyWeight: 2289,
  basicEmptyWeightArm: 42.0,
  datumLocation: { type: 'firewall', customDescription: 'Forward face of firewall' },
  maxTakeoffWeight: 3650,
  maxLandingWeight: 3650,
  maxZeroFuelWeight: 3400,
  units: 'imperial',
  envelopes: [
    {
      category: 'normal',
      maxWeight: 3650,
      forwardLimit: 77.0,
      aftLimit: 95.0,
      vertices: [
        { weight: 2900, cgPosition: 77.0 },
        { weight: 3650, cgPosition: 83.0 },
        { weight: 3650, cgPosition: 95.0 },
        { weight: 2900, cgPosition: 95.0 },
        { weight: 2900, cgPosition: 77.0 }
      ]
    }
  ],
  lastWeighing: new Date('2024-08-20'),
  logbookReference: 'Logbook Entry: Aug 20, 2024',
  notes: 'Sample data only. Always verify with actual aircraft POH.'
};

export const SAMPLE_CIRRUS_SR22: AircraftProfile = {
  id: 'sample-sr22-001',
  name: 'N22SR - Cirrus SR22',
  model: 'Cirrus SR22 G6',
  registration: 'N22SR',
  basicEmptyWeight: 2348,
  basicEmptyWeightArm: 44.3,
  datumLocation: { type: 'firewall', customDescription: 'Forward face of firewall' },
  maxTakeoffWeight: 3600,
  maxLandingWeight: 3600,
  maxZeroFuelWeight: 3400,
  units: 'imperial',
  envelopes: [
    {
      category: 'normal',
      maxWeight: 3600,
      forwardLimit: 40.0,
      aftLimit: 47.3,
      vertices: [
        { weight: 2200, cgPosition: 40.0 },
        { weight: 2900, cgPosition: 40.0 },
        { weight: 3600, cgPosition: 42.8 },
        { weight: 3600, cgPosition: 47.3 },
        { weight: 2200, cgPosition: 47.3 },
        { weight: 2200, cgPosition: 40.0 }
      ]
    },
    {
      category: 'utility',
      maxWeight: 3400,
      forwardLimit: 41.0,
      aftLimit: 45.5,
      vertices: [
        { weight: 2200, cgPosition: 41.0 },
        { weight: 3400, cgPosition: 43.0 },
        { weight: 3400, cgPosition: 45.5 },
        { weight: 2200, cgPosition: 45.5 },
        { weight: 2200, cgPosition: 41.0 }
      ]
    }
  ],
  lastWeighing: new Date('2025-01-10'),
  logbookReference: 'Logbook Entry: Jan 10, 2025',
  notes: 'Sample data only. Features CAPS parachute system. Always verify with actual aircraft POH.'
};
