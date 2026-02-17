/**
 * Weight & Balance Configuration Storage
 * Handles save/load to file and localStorage persistence
 */

import type { AircraftProfile, LoadingItem, LoadingConfiguration } from './types';
import { wbLogger } from '$lib/utils/loggers';

export interface SavedConfiguration {
  version: string;
  type: 'weight-balance-configuration';
  name: string;
  timestamp: string;
  aircraft: AircraftProfile;
  items: LoadingItem[];
}

/**
 * Save configuration to downloadable JSON file
 */
export function saveConfigurationToFile(
  aircraft: AircraftProfile,
  items: LoadingItem[],
  configName?: string
): void {
  const timestamp = new Date().toISOString();
  const name = configName || `${aircraft.registration || aircraft.name} - ${new Date().toLocaleDateString()}`;
  
  const config: SavedConfiguration = {
    version: '1.0',
    type: 'weight-balance-configuration',
    name,
    timestamp,
    aircraft,
    items: items.filter(item => item.id !== 'bew') // Don't save BEW as it's derived from aircraft
  };
  
  const json = JSON.stringify(config, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  // Generate filename
  const aircraftSlug = (aircraft.registration || aircraft.name)
    .replace(/[^a-zA-Z0-9]/g, '-')
    .toLowerCase();
  const dateSlug = new Date().toISOString().split('T')[0];
  const filename = `wb-${aircraftSlug}-${dateSlug}.json`;
  
  // Trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Load configuration from JSON file
 */
export async function loadConfigurationFromFile(file: File): Promise<SavedConfiguration> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const config = JSON.parse(json) as SavedConfiguration;
        
        // Validate structure
        if (config.type !== 'weight-balance-configuration') {
          throw new Error('Invalid file type. Expected weight-balance-configuration.');
        }
        
        if (!config.aircraft || !config.items) {
          throw new Error('Invalid configuration structure. Missing aircraft or items.');
        }
        
        // Convert date strings back to Date objects
        if (config.aircraft.lastWeighing) {
          config.aircraft.lastWeighing = new Date(config.aircraft.lastWeighing);
        }
        
        resolve(config);
      } catch (error) {
        reject(new Error(`Failed to parse configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Save configuration to localStorage (auto-save)
 */
export function saveToLocalStorage(
  aircraft: AircraftProfile,
  items: LoadingItem[]
): void {
  try {
    const config: SavedConfiguration = {
      version: '1.0',
      type: 'weight-balance-configuration',
      name: 'Auto-saved',
      timestamp: new Date().toISOString(),
      aircraft,
      items: items.filter(item => item.id !== 'bew')
    };
    
    localStorage.setItem('wb.current', JSON.stringify(config));
  } catch (error) {
    wbLogger.error('Failed to save to localStorage', error);
  }
}

/**
 * Load configuration from localStorage
 */
export function loadFromLocalStorage(): SavedConfiguration | null {
  try {
    const json = localStorage.getItem('wb.current');
    if (!json) return null;
    
    const config = JSON.parse(json) as SavedConfiguration;
    
    // Convert date strings back to Date objects
    if (config.aircraft.lastWeighing) {
      config.aircraft.lastWeighing = new Date(config.aircraft.lastWeighing);
    }
    
    return config;
  } catch (error) {
    wbLogger.error('Failed to load from localStorage', error);
    return null;
  }
}

/**
 * Clear localStorage saved configuration
 */
export function clearLocalStorage(): void {
  try {
    localStorage.removeItem('wb.current');
  } catch (error) {
    wbLogger.error('Failed to clear localStorage', error);
  }
}

/**
 * Add configuration to recent history
 */
export function addToRecentConfigurations(config: SavedConfiguration): void {
  try {
    const json = localStorage.getItem('wb.recent');
    const recent: SavedConfiguration[] = json ? JSON.parse(json) : [];
    
    // Add to front, remove duplicates, limit to 10
    const filtered = recent.filter(r => r.timestamp !== config.timestamp);
    filtered.unshift(config);
    const limited = filtered.slice(0, 10);
    
    localStorage.setItem('wb.recent', JSON.stringify(limited));
  } catch (error) {
    wbLogger.error('Failed to add to recent configurations', error);
  }
}

/**
 * Get recent configurations
 */
export function getRecentConfigurations(): SavedConfiguration[] {
  try {
    const json = localStorage.getItem('wb.recent');
    if (!json) return [];
    
    const recent = JSON.parse(json) as SavedConfiguration[];
    
    // Convert date strings
    return recent.map(config => ({
      ...config,
      aircraft: {
        ...config.aircraft,
        lastWeighing: config.aircraft.lastWeighing 
          ? new Date(config.aircraft.lastWeighing)
          : new Date()
      }
    }));
  } catch (error) {
    wbLogger.error('Failed to load recent configurations', error);
    return [];
  }
}

/**
 * Clear recent configurations history
 */
export function clearRecentConfigurations(): void {
  try {
    localStorage.removeItem('wb.recent');
  } catch (error) {
    wbLogger.error('Failed to clear recent configurations', error);
  }
}
