export const ITEM_LIBRARY = {
  occupants: [
    { name: 'Pilot', defaultWeight: 180, defaultArm: 37.0 },
    { name: 'Co-Pilot', defaultWeight: 180, defaultArm: 37.0 },
    { name: 'Front Passenger', defaultWeight: 170, defaultArm: 37.0 },
    { name: 'Rear Left Passenger', defaultWeight: 170, defaultArm: 73.0 },
    { name: 'Rear Right Passenger', defaultWeight: 170, defaultArm: 73.0 },
    { name: 'Child Passenger', defaultWeight: 80, defaultArm: 73.0 }
  ],
  fuel: [
    { name: 'Main Fuel (Full)', defaultWeight: 318, defaultArm: 48.0 },
    { name: 'Main Fuel (3/4)', defaultWeight: 238, defaultArm: 48.0 },
    { name: 'Main Fuel (1/2)', defaultWeight: 159, defaultArm: 48.0 },
    { name: 'Main Fuel (1/4)', defaultWeight: 80, defaultArm: 48.0 },
    { name: 'Auxiliary Fuel', defaultWeight: 0, defaultArm: 48.0 }
  ],
  baggage: [
    { name: 'Front Baggage', defaultWeight: 0, defaultArm: 30.0 },
    { name: 'Aft Baggage', defaultWeight: 0, defaultArm: 95.0 },
    { name: 'External Baggage Pod', defaultWeight: 0, defaultArm: 50.0 },
    { name: 'Cargo Bay 1', defaultWeight: 0, defaultArm: 80.0 },
    { name: 'Cargo Bay 2', defaultWeight: 0, defaultArm: 120.0 }
  ],
  equipment: [
    { name: 'Survival Kit', defaultWeight: 15, defaultArm: 95.0 },
    { name: 'Life Raft', defaultWeight: 35, defaultArm: 95.0 },
    { name: 'Tool Kit', defaultWeight: 20, defaultArm: 95.0 },
    { name: 'Emergency Equipment', defaultWeight: 25, defaultArm: 95.0 },
    { name: 'Camera Equipment', defaultWeight: 30, defaultArm: 73.0 },
    { name: 'Avionics Package', defaultWeight: 50, defaultArm: 30.0 }
  ],
  cargo: [
    { name: 'General Cargo', defaultWeight: 0, defaultArm: 100.0 },
    { name: 'Cargo Pallet', defaultWeight: 0, defaultArm: 100.0 },
    { name: 'Military Equipment', defaultWeight: 0, defaultArm: 1050.0 },
    { name: 'Vehicle (Light)', defaultWeight: 3000, defaultArm: 1000.0 },
    { name: 'Vehicle (Heavy)', defaultWeight: 8000, defaultArm: 1050.0 }
  ]
} as const;
