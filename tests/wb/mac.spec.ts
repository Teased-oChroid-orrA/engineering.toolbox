/**
 * Unit tests for MAC conversion utilities
 */

import { test, expect } from '@playwright/test';
import { 
  stationToPercentMAC, 
  percentMACToStation, 
  formatPercentMAC, 
  hasMACData,
  validateMACData 
} from '../../src/lib/core/weight-balance/mac';

test.describe('MAC Conversion Utilities', () => {
  
  test.describe('stationToPercentMAC', () => {
    test('converts station to %MAC correctly', () => {
      // LEMAC = 100", MAC = 50"
      // Station 125" should be 50% MAC
      const result = stationToPercentMAC(125, 100, 50);
      expect(result).toBeCloseTo(50, 2);
    });
    
    test('handles station at LEMAC (0% MAC)', () => {
      const result = stationToPercentMAC(100, 100, 50);
      expect(result).toBe(0);
    });
    
    test('handles station at trailing edge (100% MAC)', () => {
      const result = stationToPercentMAC(150, 100, 50);
      expect(result).toBe(100);
    });
    
    test('handles negative %MAC (station forward of LEMAC)', () => {
      const result = stationToPercentMAC(90, 100, 50);
      expect(result).toBe(-20);
    });
    
    test('handles %MAC > 100 (station aft of trailing edge)', () => {
      const result = stationToPercentMAC(160, 100, 50);
      expect(result).toBe(120);
    });
    
    test('throws error when MAC is zero', () => {
      expect(() => stationToPercentMAC(100, 100, 0)).toThrow('MAC length cannot be zero');
    });
    
    test('handles very small MAC values', () => {
      const result = stationToPercentMAC(100.1, 100, 0.1);
      expect(result).toBeCloseTo(100, 2);
    });
    
    test('handles negative LEMAC', () => {
      // LEMAC can be negative if datum is aft of leading edge
      const result = stationToPercentMAC(50, -50, 100);
      expect(result).toBe(100);
    });
  });
  
  test.describe('percentMACToStation', () => {
    test('converts %MAC to station correctly', () => {
      const result = percentMACToStation(50, 100, 50);
      expect(result).toBe(125);
    });
    
    test('handles 0% MAC', () => {
      const result = percentMACToStation(0, 100, 50);
      expect(result).toBe(100);
    });
    
    test('handles 100% MAC', () => {
      const result = percentMACToStation(100, 100, 50);
      expect(result).toBe(150);
    });
    
    test('handles negative %MAC', () => {
      const result = percentMACToStation(-20, 100, 50);
      expect(result).toBe(90);
    });
    
    test('handles %MAC > 100', () => {
      const result = percentMACToStation(120, 100, 50);
      expect(result).toBe(160);
    });
    
    test('round-trip conversion maintains value', () => {
      const original = 125.5;
      const percentMAC = stationToPercentMAC(original, 100, 50);
      const backToStation = percentMACToStation(percentMAC, 100, 50);
      expect(backToStation).toBeCloseTo(original, 6);
    });
  });
  
  test.describe('formatPercentMAC', () => {
    test('formats with default 1 decimal', () => {
      expect(formatPercentMAC(50.5)).toBe('50.5% MAC');
    });
    
    test('formats with custom decimals', () => {
      expect(formatPercentMAC(50.567, 2)).toBe('50.57% MAC');
    });
    
    test('formats zero', () => {
      expect(formatPercentMAC(0)).toBe('0.0% MAC');
    });
    
    test('formats negative', () => {
      expect(formatPercentMAC(-20.5)).toBe('-20.5% MAC');
    });
    
    test('formats > 100', () => {
      expect(formatPercentMAC(120.3)).toBe('120.3% MAC');
    });
  });
  
  test.describe('hasMACData', () => {
    test('returns true when both values defined and MAC > 0', () => {
      expect(hasMACData(100, 50)).toBe(true);
    });
    
    test('returns false when lemac is undefined', () => {
      expect(hasMACData(undefined, 50)).toBe(false);
    });
    
    test('returns false when mac is undefined', () => {
      expect(hasMACData(100, undefined)).toBe(false);
    });
    
    test('returns false when both undefined', () => {
      expect(hasMACData(undefined, undefined)).toBe(false);
    });
    
    test('returns false when MAC is zero', () => {
      expect(hasMACData(100, 0)).toBe(false);
    });
    
    test('returns false when MAC is negative', () => {
      expect(hasMACData(100, -50)).toBe(false);
    });
    
    test('returns true with negative LEMAC but positive MAC', () => {
      expect(hasMACData(-50, 100)).toBe(true);
    });
  });
  
  test.describe('validateMACData', () => {
    test('validates correct MAC data', () => {
      const result = validateMACData(100, 50);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
    
    test('rejects zero MAC', () => {
      const result = validateMACData(100, 0);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('MAC length must be greater than zero');
    });
    
    test('rejects negative MAC', () => {
      const result = validateMACData(100, -50);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('MAC length must be greater than zero');
    });
    
    test('rejects negative LEMAC', () => {
      const result = validateMACData(-10, 50);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('LEMAC must be non-negative');
    });
    
    test('accepts zero LEMAC', () => {
      const result = validateMACData(0, 50);
      expect(result.valid).toBe(true);
    });
  });
});
