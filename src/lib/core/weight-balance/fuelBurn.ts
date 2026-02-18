/**
 * Fuel Burn Simulation for Weight & Balance
 * 
 * Simulates fuel consumption during flight and calculates CG travel.
 * Handles multiple tanks with different burn priorities.
 */

import type { 
  AircraftProfile, 
  LoadingItem, 
  FuelBurnConfig, 
  FuelBurnResults, 
  FuelBurnStep,
  FuelTank,
  FUEL_WEIGHTS
} from './types';
import { calculateWeightAndBalance } from './solve';
import { wbLogger } from '$lib/utils/loggers';

/**
 * Simulate fuel burn over time
 * Returns array of weight/CG states at regular intervals
 */
export function simulateFuelBurn(
  aircraft: AircraftProfile,
  baseItems: LoadingItem[],
  config: FuelBurnConfig
): FuelBurnResults {
  const steps: FuelBurnStep[] = [];
  const warnings: string[] = [];
  
  // Validate configuration
  if (config.tanks.length === 0) {
    warnings.push('No fuel tanks configured');
    return {
      steps: [],
      warnings,
      summary: {
        initialWeight: 0,
        finalWeight: 0,
        fuelBurned: 0,
        cgTravel: 0,
        maxCGForward: 0,
        maxCGAft: 0,
        allStepsValid: false
      }
    };
  }
  
  if (config.burnRate <= 0) {
    warnings.push('Fuel burn rate must be positive');
  }
  
  if (config.duration <= 0) {
    warnings.push('Flight duration must be positive');
  }
  
  // Sort tanks by burn priority (lower number = burns first)
  const sortedTanks = [...config.tanks].sort((a, b) => a.burnPriority - b.burnPriority);
  
  // Calculate total fuel available
  const totalFuelAvailable = sortedTanks.reduce((sum, tank) => sum + tank.currentFuel, 0);
  const totalFuelNeeded = (config.burnRate * config.duration) / 60; // convert minutes to hours
  
  if (totalFuelNeeded > totalFuelAvailable) {
    warnings.push(`Insufficient fuel: Need ${totalFuelNeeded.toFixed(1)} gal, have ${totalFuelAvailable.toFixed(1)} gal`);
  }
  
  // Time step in minutes (create ~20-30 steps for smooth visualization)
  const stepInterval = Math.max(1, Math.floor(config.duration / 25));
  const numSteps = Math.ceil(config.duration / stepInterval);
  
  // Track current fuel in each tank
  const tankFuels = new Map<string, number>();
  sortedTanks.forEach(tank => tankFuels.set(tank.id, tank.currentFuel));
  
  // Track min/max CG positions
  let minCG = Infinity;
  let maxCG = -Infinity;
  let allStepsValid = true;
  
  // Generate steps
  for (let i = 0; i <= numSteps; i++) {
    const time = Math.min(i * stepInterval, config.duration);
    const fuelBurnedSoFar = (config.burnRate * time) / 60; // gallons
    
    // Calculate fuel remaining in each tank
    let remainingToBurn = fuelBurnedSoFar;
    const stepTankFuels: Record<string, number> = {};
    
    for (const tank of sortedTanks) {
      const initialFuel = tank.currentFuel;
      const fuelInTank = Math.max(0, initialFuel - remainingToBurn);
      stepTankFuels[tank.id] = fuelInTank;
      tankFuels.set(tank.id, fuelInTank);
      
      const burnedFromThisTank = initialFuel - fuelInTank;
      remainingToBurn = Math.max(0, remainingToBurn - burnedFromThisTank);
      
      if (remainingToBurn <= 0) break;
    }
    
    // Create temporary loading items with current fuel weights
    const itemsWithFuel = baseItems.filter(item => !item.type.includes('fuel'));
    
    for (const tank of sortedTanks) {
      const fuelInTank = stepTankFuels[tank.id];
      if (fuelInTank > 0) {
        const fuelWeight = fuelInTank * getFuelWeight(tank.fuelType);
        itemsWithFuel.push({
          id: `fuel_${tank.id}_sim`,
          type: 'fuel_main',
          name: tank.name,
          weight: fuelWeight,
          arm: tank.arm,
          editable: false
        });
      }
    }
    
    // Calculate W&B for this step
    const results = calculateWeightAndBalance(aircraft, itemsWithFuel);
    
    // Track CG extremes
    minCG = Math.min(minCG, results.cgPosition);
    maxCG = Math.max(maxCG, results.cgPosition);
    
    if (!results.categoryValid) {
      allStepsValid = false;
      if (i === 0) {
        warnings.push(`Initial configuration out of envelope`);
      } else if (i === numSteps) {
        warnings.push(`Final configuration out of envelope`);
      } else {
        warnings.push(`CG out of envelope at ${time.toFixed(0)} minutes`);
      }
    }
    
    const totalFuelRemaining = Object.values(stepTankFuels).reduce((sum, f) => sum + f, 0);
    
    steps.push({
      time,
      fuelRemaining: totalFuelRemaining,
      tankFuels: stepTankFuels,
      totalWeight: results.totalWeight,
      cgPosition: results.cgPosition,
      totalMoment: results.totalMoment,
      category: results.category,
      inEnvelope: results.categoryValid
    });
  }
  
  const initialStep = steps[0];
  const finalStep = steps[steps.length - 1];
  
  return {
    steps,
    warnings,
    summary: {
      initialWeight: initialStep?.totalWeight ?? 0,
      finalWeight: finalStep?.totalWeight ?? 0,
      fuelBurned: (initialStep?.fuelRemaining ?? 0) - (finalStep?.fuelRemaining ?? 0),
      cgTravel: Math.abs(maxCG - minCG),
      maxCGForward: minCG,
      maxCGAft: maxCG,
      allStepsValid
    }
  };
}

/**
 * Get fuel weight per gallon for a given fuel type
 */
function getFuelWeight(fuelType: string): number {
  const weights: Record<string, number> = {
    avgas_100ll: 6.0,
    avgas_unleaded: 6.0,
    jet_a: 6.7,
    jet_a1: 6.7,
    mogas: 6.0
  };
  return weights[fuelType] ?? 6.0;
}

/**
 * Create fuel burn configuration from current loading items
 * Extracts fuel tanks from loading items and creates a burn config
 */
export function createFuelBurnConfigFromItems(
  items: LoadingItem[],
  burnRate: number = 10, // default 10 gal/hr
  duration: number = 180  // default 3 hours
): FuelBurnConfig {
  const tanks: FuelTank[] = [];
  let priority = 1;
  
  for (const item of items) {
    if (item.type === 'fuel_main') {
      tanks.push({
        id: item.id,
        name: item.name,
        capacity: item.weight / 6.0, // assume 6 lb/gal (can be refined)
        arm: item.arm,
        currentFuel: item.weight / 6.0,
        fuelType: 'avgas_100ll',
        burnPriority: priority++
      });
    } else if (item.type === 'fuel_auxiliary') {
      tanks.push({
        id: item.id,
        name: item.name,
        capacity: item.weight / 6.0,
        arm: item.arm,
        currentFuel: item.weight / 6.0,
        fuelType: 'avgas_100ll',
        burnPriority: priority++
      });
    }
  }
  
  return {
    burnRate,
    duration,
    tanks
  };
}

/**
 * Preset flight profiles
 */
export const FUEL_BURN_PROFILES = {
  'short-flight': {
    name: 'Short Flight (1 hour)',
    burnRate: 10,
    duration: 60
  },
  'medium-cruise': {
    name: 'Medium Cruise (2.5 hours)',
    burnRate: 9,
    duration: 150
  },
  'long-cruise': {
    name: 'Long Cruise (4 hours)',
    burnRate: 8,
    duration: 240
  },
  'max-endurance': {
    name: 'Max Endurance (6 hours)',
    burnRate: 7,
    duration: 360
  }
};
