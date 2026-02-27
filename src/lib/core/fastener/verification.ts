import { invoke } from '@tauri-apps/api/core';
import type { AxialContinuumElementInput } from './types';

export type FastenerRustVerifyInput = {
  preload: number;
  elements: AxialContinuumElementInput[];
};

export type FastenerRustVerifyElement = {
  id: string;
  label: string;
  group: string;
  areaUsed: number;
  compliance: number;
  stiffness: number;
  preloadDeformation: number;
};

export type FastenerRustVerifyOutput = {
  preload: number;
  compliance: number;
  stiffness: number;
  preloadDeformation: number;
  boltElongation: number;
  clampedCompression: number;
  elementResults: FastenerRustVerifyElement[];
  assumptions: string[];
  warnings: string[];
};

export async function verifyFastenerStiffnessRust(input: FastenerRustVerifyInput): Promise<FastenerRustVerifyOutput | null> {
  try {
    return (await invoke('fastener_verify_stiffness', { input })) as FastenerRustVerifyOutput;
  } catch {
    return null;
  }
}

