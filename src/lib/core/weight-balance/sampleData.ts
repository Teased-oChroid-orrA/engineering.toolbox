/**
 * Sample Aircraft Data
 * Multiple aircraft profiles for Weight & Balance calculations
 * Data based on typical POH values - ALWAYS verify with actual aircraft POH
 */

import type { AircraftProfile, LoadingItem } from './types';

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

export const SAMPLE_C17_GLOBEMASTER: AircraftProfile = {
  id: 'sample-c17-001',
  name: 'C-17 Globemaster III',
  model: 'Boeing C-17 Globemaster III',
  registration: '00-0000',
  
  basicEmptyWeight: 282000,  // lbs (military cargo aircraft)
  basicEmptyWeightArm: 1020,  // inches aft of datum
  
  datumLocation: {
    type: 'nose',
    customDescription: 'Nose of aircraft'
  },
  
  maxTakeoffWeight: 585000,
  maxLandingWeight: 446923,
  maxZeroFuelWeight: 437000,
  
  units: 'imperial',
  
  envelopes: [
    {
      category: 'normal',
      maxWeight: 585000,
      forwardLimit: 990,  // inches aft of datum
      aftLimit: 1050,      // inches aft of datum
      vertices: [
        { weight: 282000, cgPosition: 990 },
        { weight: 437000, cgPosition: 990 },
        { weight: 585000, cgPosition: 1015 },
        { weight: 585000, cgPosition: 1050 },
        { weight: 282000, cgPosition: 1050 },
        { weight: 282000, cgPosition: 990 }  // Close the polygon
      ]
    }
  ],
  
  lastWeighing: new Date('2025-01-01'),
  logbookReference: 'USAF Technical Order',
  notes: 'Military cargo aircraft. Data based on typical configuration. Always verify with actual aircraft TO.'
};

export const SAMPLE_PIPER_CHEROKEE: AircraftProfile = {
  id: 'sample-pa28-001',
  name: 'N54321 - Piper Cherokee',
  model: 'Piper PA-28-180',
  registration: 'N54321',
  
  basicEmptyWeight: 1410,
  basicEmptyWeightArm: 39.0,
  
  datumLocation: {
    type: 'firewall',
    customDescription: 'Forward face of firewall'
  },
  
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
  
  datumLocation: {
    type: 'firewall',
    customDescription: 'Forward face of firewall'
  },
  
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
  
  datumLocation: {
    type: 'firewall',
    customDescription: 'Forward face of firewall'
  },
  
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

export const SAMPLE_KING_AIR_350: AircraftProfile = {
  id: 'sample-ka350-001',
  name: 'N350KA - King Air 350',
  model: 'Beechcraft King Air 350',
  registration: 'N350KA',
  
  basicEmptyWeight: 9150,
  basicEmptyWeightArm: 305.0,
  
  datumLocation: {
    type: 'nose',
    customDescription: 'Front of nose at fuselage station 0'
  },
  
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

// All available aircraft profiles
export const AIRCRAFT_PROFILES: Record<string, AircraftProfile> = {
  'c172s': SAMPLE_CESSNA_172S,
  'c17': SAMPLE_C17_GLOBEMASTER,
  'pa28': SAMPLE_PIPER_CHEROKEE,
  'be36': SAMPLE_BEECHCRAFT_BONANZA,
  'sr22': SAMPLE_CIRRUS_SR22,
  'ka350': SAMPLE_KING_AIR_350
};

/**
 * Sample loading items for Cessna 172S
 */
export function createSampleLoading(aircraftType: string = 'c172s'): LoadingItem[] {
  switch (aircraftType) {
    case 'c17':
      return createC17SampleLoading();
    case 'pa28':
      return createPiperSampleLoading();
    case 'be36':
      return createBonanzaSampleLoading();
    case 'sr22':
      return createSR22SampleLoading();
    case 'ka350':
      return createKingAir350SampleLoading();
    case 'c172s':
    default:
      return createCessna172SampleLoading();
  }
}

function createCessna172SampleLoading(): LoadingItem[] {
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

function createC17SampleLoading(): LoadingItem[] {
  return [
    {
      id: 'item-1',
      type: 'occupant' as const,
      name: 'Flight Crew (3)',
      weight: 600,
      arm: 180,
      editable: true
    },
    {
      id: 'item-2',
      type: 'cargo' as const,
      name: 'M1 Abrams Tank',
      weight: 68000,
      arm: 1050,
      editable: true
    },
    {
      id: 'item-3',
      type: 'cargo' as const,
      name: 'Support Vehicles (2 HMMWVs)',
      weight: 12000,
      arm: 950,
      editable: true
    },
    {
      id: 'item-4',
      type: 'cargo' as const,
      name: 'Cargo Pallets (463L × 6)',
      weight: 18000,
      arm: 1100,
      editable: true
    },
    {
      id: 'item-5',
      type: 'fuel_main' as const,
      name: 'Fuel (22,000 gal)',
      weight: 147400,  // 22,000 gal × 6.7 lbs/gal
      arm: 980,
      editable: true,
      notes: 'Jet-A fuel'
    }
  ];
}

function createPiperSampleLoading(): LoadingItem[] {
  return [
    {
      id: 'item-1',
      type: 'occupant' as const,
      name: 'Pilot',
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
      arm: 71.0,
      editable: true
    },
    {
      id: 'item-4',
      type: 'occupant' as const,
      name: 'Rear Right Passenger',
      weight: 0,
      arm: 71.0,
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
      weight: 288,  // 48 gallons × 6.0 lbs/gal
      arm: 46.0,
      editable: true
    }
  ];
}

function createBonanzaSampleLoading(): LoadingItem[] {
  return [
    {
      id: 'item-1',
      type: 'occupant' as const,
      name: 'Pilot',
      weight: 180,
      arm: 80.5,
      editable: true
    },
    {
      id: 'item-2',
      type: 'occupant' as const,
      name: 'Front Right Passenger',
      weight: 0,
      arm: 80.5,
      editable: true
    },
    {
      id: 'item-3',
      type: 'occupant' as const,
      name: 'Rear Left Passenger',
      weight: 0,
      arm: 118.1,
      editable: true
    },
    {
      id: 'item-4',
      type: 'occupant' as const,
      name: 'Rear Right Passenger',
      weight: 0,
      arm: 118.1,
      editable: true
    },
    {
      id: 'item-5',
      type: 'baggage_aft' as const,
      name: 'Baggage',
      weight: 0,
      arm: 142.8,
      editable: true
    },
    {
      id: 'item-6',
      type: 'fuel_main' as const,
      name: 'Main Fuel',
      weight: 444,  // 74 gallons × 6.0 lbs/gal
      arm: 94.0,
      editable: true
    }
  ];
}

function createSR22SampleLoading(): LoadingItem[] {
  return [
    {
      id: 'item-1',
      type: 'occupant' as const,
      name: 'Pilot',
      weight: 180,
      arm: 42.0,
      editable: true
    },
    {
      id: 'item-2',
      type: 'occupant' as const,
      name: 'Front Right Passenger',
      weight: 0,
      arm: 42.0,
      editable: true
    },
    {
      id: 'item-3',
      type: 'occupant' as const,
      name: 'Rear Left Passenger',
      weight: 0,
      arm: 72.0,
      editable: true
    },
    {
      id: 'item-4',
      type: 'occupant' as const,
      name: 'Rear Right Passenger',
      weight: 0,
      arm: 72.0,
      editable: true
    },
    {
      id: 'item-5',
      type: 'baggage_aft' as const,
      name: 'Baggage',
      weight: 0,
      arm: 94.0,
      editable: true
    },
    {
      id: 'item-6',
      type: 'fuel_main' as const,
      name: 'Main Fuel',
      weight: 552,  // 92 gallons × 6.0 lbs/gal
      arm: 43.0,
      editable: true,
      notes: 'Full fuel: 92 usable gallons'
    }
  ];
}

function createKingAir350SampleLoading(): LoadingItem[] {
  return [
    {
      id: 'item-1',
      type: 'occupant' as const,
      name: 'Pilot',
      weight: 180,
      arm: 140.0,
      editable: true
    },
    {
      id: 'item-2',
      type: 'occupant' as const,
      name: 'Co-Pilot',
      weight: 180,
      arm: 140.0,
      editable: true
    },
    {
      id: 'item-3',
      type: 'occupant' as const,
      name: 'Passengers (6)',
      weight: 0,
      arm: 230.0,
      editable: true
    },
    {
      id: 'item-4',
      type: 'baggage_aft' as const,
      name: 'Nose Baggage',
      weight: 0,
      arm: 65.0,
      editable: true
    },
    {
      id: 'item-5',
      type: 'baggage_aft' as const,
      name: 'Aft Baggage',
      weight: 0,
      arm: 360.0,
      editable: true
    },
    {
      id: 'item-6',
      type: 'fuel_main' as const,
      name: 'Main Fuel',
      weight: 2340,  // 384 gallons × 6.1 lbs/gal (Jet-A)
      arm: 300.0,
      editable: true,
      notes: 'Full fuel: 384 usable gallons of Jet-A'
    }
  ];
}

/**
 * Comprehensive item library for user customization
 */
export const ITEM_LIBRARY = {
  occupants: [
    { name: 'Pilot', defaultWeight: 180, defaultArm: 37.0 },
    { name: 'Co-Pilot', defaultWeight: 180, defaultArm: 37.0 },
    { name: 'Front Passenger', defaultWeight: 170, defaultArm: 37.0 },
    { name: 'Rear Left Passenger', defaultWeight: 170, defaultArm: 73.0 },
    { name: 'Rear Right Passenger', defaultWeight: 170, defaultArm: 73.0 },
    { name: 'Child Passenger', defaultWeight: 80, defaultArm: 73.0 },
  ],
  fuel: [
    { name: 'Main Fuel (Full)', defaultWeight: 318, defaultArm: 48.0 },
    { name: 'Main Fuel (3/4)', defaultWeight: 238, defaultArm: 48.0 },
    { name: 'Main Fuel (1/2)', defaultWeight: 159, defaultArm: 48.0 },
    { name: 'Main Fuel (1/4)', defaultWeight: 80, defaultArm: 48.0 },
    { name: 'Auxiliary Fuel', defaultWeight: 0, defaultArm: 48.0 },
  ],
  baggage: [
    { name: 'Front Baggage', defaultWeight: 0, defaultArm: 30.0 },
    { name: 'Aft Baggage', defaultWeight: 0, defaultArm: 95.0 },
    { name: 'External Baggage Pod', defaultWeight: 0, defaultArm: 50.0 },
    { name: 'Cargo Bay 1', defaultWeight: 0, defaultArm: 80.0 },
    { name: 'Cargo Bay 2', defaultWeight: 0, defaultArm: 120.0 },
  ],
  equipment: [
    { name: 'Survival Kit', defaultWeight: 15, defaultArm: 95.0 },
    { name: 'Life Raft', defaultWeight: 35, defaultArm: 95.0 },
    { name: 'Tool Kit', defaultWeight: 20, defaultArm: 95.0 },
    { name: 'Emergency Equipment', defaultWeight: 25, defaultArm: 95.0 },
    { name: 'Camera Equipment', defaultWeight: 30, defaultArm: 73.0 },
    { name: 'Avionics Package', defaultWeight: 50, defaultArm: 30.0 },
  ],
  cargo: [
    { name: 'General Cargo', defaultWeight: 0, defaultArm: 100.0 },
    { name: 'Cargo Pallet', defaultWeight: 0, defaultArm: 100.0 },
    { name: 'Military Equipment', defaultWeight: 0, defaultArm: 1050.0 },
    { name: 'Vehicle (Light)', defaultWeight: 3000, defaultArm: 1000.0 },
    { name: 'Vehicle (Heavy)', defaultWeight: 8000, defaultArm: 1050.0 },
  ]
};
