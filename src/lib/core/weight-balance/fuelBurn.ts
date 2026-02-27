import type { AircraftProfile, FuelBurnConfig, FuelBurnResults, FuelBurnStep, FuelTank, LoadingItem } from './types';
import { calculateWeightAndBalance } from './solve';

export function simulateFuelBurn(
  aircraft: AircraftProfile,
  baseItems: LoadingItem[],
  config: FuelBurnConfig
): FuelBurnResults {
  const warnings = validateFuelBurnConfig(config);
  if (config.tanks.length === 0) return emptyFuelBurnResults(warnings);

  const sortedTanks = [...config.tanks].sort((a, b) => a.burnPriority - b.burnPriority);
  appendFuelSufficiencyWarning(sortedTanks, config, warnings);
  const { stepInterval, numSteps } = computeStepGeometry(config.duration);
  const steps = buildSimulationSteps(aircraft, baseItems, sortedTanks, config, numSteps, stepInterval, warnings);

  return buildFuelBurnResults(steps, warnings);
}

function validateFuelBurnConfig(config: FuelBurnConfig): string[] {
  const warnings: string[] = [];
  if (config.tanks.length === 0) warnings.push('No fuel tanks configured');
  if (config.burnRate <= 0) warnings.push('Fuel burn rate must be positive');
  if (config.duration <= 0) warnings.push('Flight duration must be positive');
  return warnings;
}

function appendFuelSufficiencyWarning(tanks: FuelTank[], config: FuelBurnConfig, warnings: string[]): void {
  const totalFuelAvailable = tanks.reduce((sum, tank) => sum + tank.currentFuel, 0);
  const totalFuelNeeded = (config.burnRate * config.duration) / 60;
  if (totalFuelNeeded > totalFuelAvailable) {
    warnings.push(`Insufficient fuel: Need ${totalFuelNeeded.toFixed(1)} gal, have ${totalFuelAvailable.toFixed(1)} gal`);
  }
}

function computeStepGeometry(duration: number): { stepInterval: number; numSteps: number } {
  const stepInterval = Math.max(1, Math.floor(duration / 25));
  return { stepInterval, numSteps: Math.ceil(duration / stepInterval) };
}

function buildSimulationSteps(
  aircraft: AircraftProfile,
  baseItems: LoadingItem[],
  tanks: FuelTank[],
  config: FuelBurnConfig,
  numSteps: number,
  stepInterval: number,
  warnings: string[]
): FuelBurnStep[] {
  const steps: FuelBurnStep[] = [];

  for (let i = 0; i <= numSteps; i += 1) {
    const time = Math.min(i * stepInterval, config.duration);
    const tankFuels = computeTankFuelByTime(tanks, (config.burnRate * time) / 60);
    const itemsWithFuel = buildItemsWithCurrentFuel(baseItems, tanks, tankFuels);
    const results = calculateWeightAndBalance(aircraft, itemsWithFuel);
    appendEnvelopeStepWarning(i, numSteps, time, results.categoryValid, warnings);

    steps.push({
      time,
      fuelRemaining: Object.values(tankFuels).reduce((sum, fuel) => sum + fuel, 0),
      tankFuels,
      totalWeight: results.totalWeight,
      cgPosition: results.cgPosition,
      totalMoment: results.totalMoment,
      category: results.category,
      inEnvelope: results.categoryValid
    });
  }

  return steps;
}

function computeTankFuelByTime(tanks: FuelTank[], fuelBurnedSoFar: number): Record<string, number> {
  let remainingToBurn = fuelBurnedSoFar;
  const tankFuels: Record<string, number> = {};

  for (const tank of tanks) {
    const fuelInTank = Math.max(0, tank.currentFuel - remainingToBurn);
    tankFuels[tank.id] = fuelInTank;
    const burnedFromTank = tank.currentFuel - fuelInTank;
    remainingToBurn = Math.max(0, remainingToBurn - burnedFromTank);
    if (remainingToBurn <= 0) break;
  }
  return tankFuels;
}

function buildItemsWithCurrentFuel(
  baseItems: LoadingItem[],
  tanks: FuelTank[],
  tankFuels: Record<string, number>
): LoadingItem[] {
  const items = baseItems.filter((item) => !item.type.includes('fuel'));

  for (const tank of tanks) {
    const fuelInTank = tankFuels[tank.id] ?? 0;
    if (fuelInTank <= 0) continue;
    items.push({
      id: `fuel_${tank.id}_sim`,
      type: 'fuel_main',
      name: tank.name,
      weight: fuelInTank * getFuelWeight(tank.fuelType),
      arm: tank.arm,
      editable: false
    });
  }

  return items;
}

function appendEnvelopeStepWarning(
  stepIndex: number,
  numSteps: number,
  time: number,
  inEnvelope: boolean,
  warnings: string[]
): void {
  if (inEnvelope) return;
  if (stepIndex === 0) warnings.push('Initial configuration out of envelope');
  else if (stepIndex === numSteps) warnings.push('Final configuration out of envelope');
  else warnings.push(`CG out of envelope at ${time.toFixed(0)} minutes`);
}

function buildFuelBurnResults(steps: FuelBurnStep[], warnings: string[]): FuelBurnResults {
  if (steps.length === 0) return emptyFuelBurnResults(warnings);
  const initialStep = steps[0];
  const finalStep = steps[steps.length - 1];
  const cgValues = steps.map((step) => step.cgPosition);
  const minCG = Math.min(...cgValues);
  const maxCG = Math.max(...cgValues);

  return {
    steps,
    warnings,
    summary: {
      initialWeight: initialStep.totalWeight,
      finalWeight: finalStep.totalWeight,
      fuelBurned: initialStep.fuelRemaining - finalStep.fuelRemaining,
      cgTravel: Math.abs(maxCG - minCG),
      maxCGForward: minCG,
      maxCGAft: maxCG,
      allStepsValid: steps.every((step) => step.inEnvelope)
    }
  };
}

function emptyFuelBurnResults(warnings: string[]): FuelBurnResults {
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

export function createFuelBurnConfigFromItems(
  items: LoadingItem[],
  burnRate: number = 10,
  duration: number = 180
): FuelBurnConfig {
  const tanks: FuelTank[] = [];
  let priority = 1;

  for (const item of items) {
    if (item.type === 'fuel_main' || item.type === 'fuel_auxiliary') {
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
  return { burnRate, duration, tanks };
}

export const FUEL_BURN_PROFILES = {
  'short-flight': { name: 'Short Flight (1 hour)', burnRate: 10, duration: 60 },
  'medium-cruise': { name: 'Medium Cruise (2.5 hours)', burnRate: 9, duration: 150 },
  'long-cruise': { name: 'Long Cruise (4 hours)', burnRate: 8, duration: 240 },
  'max-endurance': { name: 'Max Endurance (6 hours)', burnRate: 7, duration: 360 }
};
