/**
 * Sample Aircraft Data facade
 */

import type { AircraftProfile } from './types';
import { ITEM_LIBRARY } from './itemLibrary';
import { createSampleLoading } from './sampleLoadings';
import {
  SAMPLE_BEECHCRAFT_BONANZA,
  SAMPLE_CESSNA_172S,
  SAMPLE_CIRRUS_SR22,
  SAMPLE_PIPER_CHEROKEE
} from './sampleProfilesLight';
import { SAMPLE_C17_GLOBEMASTER, SAMPLE_KING_AIR_350 } from './sampleProfilesHeavy';

export {
  ITEM_LIBRARY,
  createSampleLoading,
  SAMPLE_BEECHCRAFT_BONANZA,
  SAMPLE_C17_GLOBEMASTER,
  SAMPLE_CESSNA_172S,
  SAMPLE_CIRRUS_SR22,
  SAMPLE_KING_AIR_350,
  SAMPLE_PIPER_CHEROKEE
};

export const AIRCRAFT_PROFILES: Record<string, AircraftProfile> = {
  c172s: SAMPLE_CESSNA_172S,
  c17: SAMPLE_C17_GLOBEMASTER,
  pa28: SAMPLE_PIPER_CHEROKEE,
  be36: SAMPLE_BEECHCRAFT_BONANZA,
  sr22: SAMPLE_CIRRUS_SR22,
  ka350: SAMPLE_KING_AIR_350
};
