/**
 * Mean Aerodynamic Chord (MAC) Conversion Utilities
 * 
 * %MAC = ((STATION - LEMAC) / MAC) * 100
 * 
 * Where:
 * - STATION: CG position in inches from datum
 * - LEMAC: Leading Edge MAC position in inches from datum
 * - MAC: Mean Aerodynamic Chord length in inches
 */

/**
 * Convert station (inches from datum) to %MAC
 */
export function stationToPercentMAC(
  station: number,
  lemac: number,
  mac: number
): number {
  if (mac === 0) {
    throw new Error('MAC length cannot be zero');
  }
  return ((station - lemac) / mac) * 100;
}

/**
 * Convert %MAC to station (inches from datum)
 */
export function percentMACToStation(
  percentMAC: number,
  lemac: number,
  mac: number
): number {
  return lemac + (percentMAC * mac) / 100;
}

/**
 * Format %MAC for display
 */
export function formatPercentMAC(percentMAC: number, decimals: number = 1): string {
  return `${percentMAC.toFixed(decimals)}% MAC`;
}

/**
 * Check if aircraft has MAC data defined
 */
export function hasMACData(lemac?: number, mac?: number): boolean {
  return lemac !== undefined && mac !== undefined && mac > 0;
}

/**
 * Validate MAC data
 */
export function validateMACData(lemac: number, mac: number): { valid: boolean; error?: string } {
  if (mac <= 0) {
    return { valid: false, error: 'MAC length must be greater than zero' };
  }
  if (lemac < 0) {
    return { valid: false, error: 'LEMAC must be non-negative' };
  }
  return { valid: true };
}
