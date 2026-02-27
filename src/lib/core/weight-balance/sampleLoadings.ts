import type { LoadingItem } from './types';

export function createSampleLoading(aircraftType: string = 'c172s'): LoadingItem[] {
  switch (aircraftType) {
    case 'c17': return createC17SampleLoading();
    case 'pa28': return createPiperSampleLoading();
    case 'be36': return createBonanzaSampleLoading();
    case 'sr22': return createSR22SampleLoading();
    case 'ka350': return createKingAir350SampleLoading();
    case 'c172s':
    default: return createCessna172SampleLoading();
  }
}

function createCessna172SampleLoading(): LoadingItem[] {
  return [
    { id: 'item-1', type: 'occupant', name: 'Pilot (Front Left)', weight: 180, arm: 37.0, editable: true },
    { id: 'item-2', type: 'occupant', name: 'Front Right Passenger', weight: 0, arm: 37.0, editable: true },
    { id: 'item-3', type: 'occupant', name: 'Rear Left Passenger', weight: 0, arm: 73.0, editable: true },
    { id: 'item-4', type: 'occupant', name: 'Rear Right Passenger', weight: 0, arm: 73.0, editable: true },
    { id: 'item-5', type: 'baggage_aft', name: 'Baggage', weight: 0, arm: 95.0, editable: true },
    { id: 'item-6', type: 'fuel_main', name: 'Main Fuel', weight: 318, arm: 48.0, editable: true, notes: 'Full fuel: 53 usable gallons' }
  ];
}

function createC17SampleLoading(): LoadingItem[] {
  return [
    { id: 'item-1', type: 'occupant', name: 'Flight Crew (3)', weight: 600, arm: 180, editable: true },
    { id: 'item-2', type: 'cargo', name: 'M1 Abrams Tank', weight: 68000, arm: 1050, editable: true },
    { id: 'item-3', type: 'cargo', name: 'Support Vehicles (2 HMMWVs)', weight: 12000, arm: 950, editable: true },
    { id: 'item-4', type: 'cargo', name: 'Cargo Pallets (463L × 6)', weight: 18000, arm: 1100, editable: true },
    { id: 'item-5', type: 'fuel_main', name: 'Fuel (22,000 gal)', weight: 147400, arm: 980, editable: true, notes: 'Jet-A fuel' }
  ];
}

function createPiperSampleLoading(): LoadingItem[] {
  return [
    { id: 'item-1', type: 'occupant', name: 'Pilot', weight: 180, arm: 37.0, editable: true },
    { id: 'item-2', type: 'occupant', name: 'Front Right Passenger', weight: 0, arm: 37.0, editable: true },
    { id: 'item-3', type: 'occupant', name: 'Rear Left Passenger', weight: 0, arm: 71.0, editable: true },
    { id: 'item-4', type: 'occupant', name: 'Rear Right Passenger', weight: 0, arm: 71.0, editable: true },
    { id: 'item-5', type: 'baggage_aft', name: 'Baggage', weight: 0, arm: 95.0, editable: true },
    { id: 'item-6', type: 'fuel_main', name: 'Main Fuel', weight: 288, arm: 46.0, editable: true }
  ];
}

function createBonanzaSampleLoading(): LoadingItem[] {
  return [
    { id: 'item-1', type: 'occupant', name: 'Pilot', weight: 180, arm: 80.5, editable: true },
    { id: 'item-2', type: 'occupant', name: 'Front Right Passenger', weight: 0, arm: 80.5, editable: true },
    { id: 'item-3', type: 'occupant', name: 'Rear Left Passenger', weight: 0, arm: 118.1, editable: true },
    { id: 'item-4', type: 'occupant', name: 'Rear Right Passenger', weight: 0, arm: 118.1, editable: true },
    { id: 'item-5', type: 'baggage_aft', name: 'Baggage', weight: 0, arm: 142.8, editable: true },
    { id: 'item-6', type: 'fuel_main', name: 'Main Fuel', weight: 444, arm: 94.0, editable: true }
  ];
}

function createSR22SampleLoading(): LoadingItem[] {
  return [
    { id: 'item-1', type: 'occupant', name: 'Pilot', weight: 180, arm: 42.0, editable: true },
    { id: 'item-2', type: 'occupant', name: 'Front Right Passenger', weight: 0, arm: 42.0, editable: true },
    { id: 'item-3', type: 'occupant', name: 'Rear Left Passenger', weight: 0, arm: 72.0, editable: true },
    { id: 'item-4', type: 'occupant', name: 'Rear Right Passenger', weight: 0, arm: 72.0, editable: true },
    { id: 'item-5', type: 'baggage_aft', name: 'Baggage', weight: 0, arm: 94.0, editable: true },
    { id: 'item-6', type: 'fuel_main', name: 'Main Fuel', weight: 552, arm: 43.0, editable: true, notes: 'Full fuel: 92 usable gallons' }
  ];
}

function createKingAir350SampleLoading(): LoadingItem[] {
  return [
    { id: 'item-1', type: 'occupant', name: 'Pilot', weight: 180, arm: 140.0, editable: true },
    { id: 'item-2', type: 'occupant', name: 'Co-Pilot', weight: 180, arm: 140.0, editable: true },
    { id: 'item-3', type: 'occupant', name: 'Passengers (6)', weight: 0, arm: 230.0, editable: true },
    { id: 'item-4', type: 'baggage_aft', name: 'Nose Baggage', weight: 0, arm: 65.0, editable: true },
    { id: 'item-5', type: 'baggage_aft', name: 'Aft Baggage', weight: 0, arm: 360.0, editable: true },
    { id: 'item-6', type: 'fuel_main', name: 'Main Fuel', weight: 2340, arm: 300.0, editable: true, notes: 'Full fuel: 384 usable gallons of Jet-A' }
  ];
}
