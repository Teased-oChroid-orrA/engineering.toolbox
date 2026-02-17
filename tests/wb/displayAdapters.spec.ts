/**
 * Unit tests for display adapters
 */

import { test, expect } from '@playwright/test';
import {
  mapVertexToDisplay,
  mapCGToDisplay,
  mapInputDisplayToStation,
  getCGPositionLabel,
  getCGAxisLabel,
  formatCGDisplay
} from '../../src/lib/core/weight-balance/displayAdapters';

test.describe('Display Adapters', () => {
  
  test.describe('mapVertexToDisplay', () => {
    test('returns vertex unchanged in station mode', () => {
      const vertex = { weight: 2500, cgPosition: 125 };
      const result = mapVertexToDisplay(vertex, false, 100, 50);
      expect(result).toEqual(vertex);
    });
    
    test('converts cgPosition to %MAC in MAC mode', () => {
      const vertex = { weight: 2500, cgPosition: 125 };
      const result = mapVertexToDisplay(vertex, true, 100, 50);
      expect(result.weight).toBe(2500);
      expect(result.cgPosition).toBeCloseTo(50, 2); // 50% MAC
    });
    
    test('returns vertex unchanged when MAC data missing', () => {
      const vertex = { weight: 2500, cgPosition: 125 };
      const result = mapVertexToDisplay(vertex, true, undefined, undefined);
      expect(result).toEqual(vertex);
    });
    
    test('returns vertex unchanged when MAC is zero', () => {
      const vertex = { weight: 2500, cgPosition: 125 };
      const result = mapVertexToDisplay(vertex, true, 100, 0);
      expect(result).toEqual(vertex);
    });
  });
  
  test.describe('mapCGToDisplay', () => {
    test('returns station unchanged in station mode', () => {
      const result = mapCGToDisplay(125, false, 100, 50);
      expect(result).toBe(125);
    });
    
    test('converts to %MAC in MAC mode', () => {
      const result = mapCGToDisplay(125, true, 100, 50);
      expect(result).toBeCloseTo(50, 2);
    });
    
    test('returns station unchanged when MAC data missing', () => {
      const result = mapCGToDisplay(125, true, undefined, undefined);
      expect(result).toBe(125);
    });
  });
  
  test.describe('mapInputDisplayToStation', () => {
    test('returns value unchanged in station mode', () => {
      const result = mapInputDisplayToStation(125, false, 100, 50);
      expect(result).toBe(125);
    });
    
    test('converts %MAC to station in MAC mode', () => {
      const result = mapInputDisplayToStation(50, true, 100, 50);
      expect(result).toBe(125);
    });
    
    test('returns value unchanged when MAC data missing', () => {
      const result = mapInputDisplayToStation(50, true, undefined, undefined);
      expect(result).toBe(50);
    });
    
    test('round-trip conversion works correctly', () => {
      // Station -> Display -> Station
      const originalStation = 125;
      const display = mapCGToDisplay(originalStation, true, 100, 50);
      const backToStation = mapInputDisplayToStation(display, true, 100, 50);
      expect(backToStation).toBeCloseTo(originalStation, 6);
    });
  });
  
  test.describe('getCGPositionLabel', () => {
    test('returns MAC label in MAC mode', () => {
      expect(getCGPositionLabel(true)).toBe('% MAC');
    });
    
    test('returns station label in station mode', () => {
      expect(getCGPositionLabel(false)).toBe('inches aft of datum');
    });
  });
  
  test.describe('getCGAxisLabel', () => {
    test('returns MAC axis label in MAC mode', () => {
      expect(getCGAxisLabel(true)).toBe('CG Position (% MAC)');
    });
    
    test('returns station axis label in station mode', () => {
      expect(getCGAxisLabel(false)).toBe('CG Position (inches aft of datum)');
    });
  });
  
  test.describe('formatCGDisplay', () => {
    test('formats station with 2 decimals by default', () => {
      const result = formatCGDisplay(125.567, false);
      expect(result).toBe('125.57');
    });
    
    test('formats %MAC with 1 decimal in MAC mode', () => {
      const result = formatCGDisplay(125, true, 100, 50);
      expect(result).toBe('50.0');
    });
    
    test('respects custom decimals in station mode', () => {
      const result = formatCGDisplay(125.567, false, undefined, undefined, 1);
      expect(result).toBe('125.6');
    });
    
    test('formats station when MAC data missing', () => {
      const result = formatCGDisplay(125.567, true, undefined, undefined);
      expect(result).toBe('125.57');
    });
  });
});
