/**
 * Display Adapters for Weight & Balance
 * 
 * Handles conversion between station (canonical model) and display units (%MAC or station).
 * All model data is stored in station units (inches from datum).
 * Conversion is only for presentation.
 */

import { stationToPercentMAC, percentMACToStation, hasMACData } from './mac';
import type { EnvelopePoint } from './types';

/**
 * Convert a vertex to display coordinates
 */
export function mapVertexToDisplay(
  vertex: EnvelopePoint,
  useMACDisplay: boolean,
  lemac?: number,
  mac?: number
): EnvelopePoint {
  if (!useMACDisplay || !hasMACData(lemac, mac)) {
    return vertex;
  }
  
  return {
    weight: vertex.weight,
    cgPosition: stationToPercentMAC(vertex.cgPosition, lemac!, mac!)
  };
}

/**
 * Convert CG station to display value
 */
export function mapCGToDisplay(
  cgStation: number,
  useMACDisplay: boolean,
  lemac?: number,
  mac?: number
): number {
  if (!useMACDisplay || !hasMACData(lemac, mac)) {
    return cgStation;
  }
  
  return stationToPercentMAC(cgStation, lemac!, mac!);
}

/**
 * Convert display input value back to station
 */
export function mapInputDisplayToStation(
  value: number,
  useMACDisplay: boolean,
  lemac?: number,
  mac?: number
): number {
  if (!useMACDisplay || !hasMACData(lemac, mac)) {
    return value;
  }
  
  return percentMACToStation(value, lemac!, mac!);
}

/**
 * Get the label for CG position based on display mode
 */
export function getCGPositionLabel(useMACDisplay: boolean): string {
  return useMACDisplay ? '% MAC' : 'inches aft of datum';
}

/**
 * Get the axis label for CG position based on display mode
 */
export function getCGAxisLabel(useMACDisplay: boolean): string {
  return useMACDisplay ? 'CG Position (% MAC)' : 'CG Position (inches aft of datum)';
}

/**
 * Format CG position value for display
 */
export function formatCGDisplay(
  cgStation: number,
  useMACDisplay: boolean,
  lemac?: number,
  mac?: number,
  decimals: number = 2
): string {
  if (!useMACDisplay || !hasMACData(lemac, mac)) {
    return cgStation.toFixed(decimals);
  }
  
  const percentMAC = stationToPercentMAC(cgStation, lemac!, mac!);
  return percentMAC.toFixed(1);
}
