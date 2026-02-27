import type { AxialContinuumElementInput, FastenerSolverInput, MaterialInput } from './types';

export type MaterialCatalogEntry = {
  id: string;
  label: string;
  family: 'fastener' | 'member' | 'washer' | 'nut';
  data: MaterialInput;
};

export type BoltSizeCatalogEntry = {
  id: string;
  label: string;
  diameter: number;
  pitchOrTpi: number;
  tensileStressArea: number;
  shankArea: number;
  recommendedBearingDiameter: number;
};

function imperialMaterials(): MaterialCatalogEntry[] {
  return [
    {
      id: 'a286',
      label: 'A286 (Fastener)',
      family: 'fastener',
      data: { name: 'A286', youngsModulus: 28_000_000, thermalExpansion: 8.8e-6, poissonsRatio: 0.3, yieldStrength: 95_000, ultimateStrength: 140_000, bearingStrength: 150_000 }
    },
    {
      id: '4340',
      label: '4340 Steel',
      family: 'fastener',
      data: { name: '4340 Steel', youngsModulus: 30_000_000, thermalExpansion: 6.7e-6, poissonsRatio: 0.29, yieldStrength: 140_000, ultimateStrength: 180_000, bearingStrength: 200_000 }
    },
    {
      id: 'ti64',
      label: 'Ti-6Al-4V',
      family: 'fastener',
      data: { name: 'Ti-6Al-4V', youngsModulus: 16_500_000, thermalExpansion: 4.8e-6, poissonsRatio: 0.34, yieldStrength: 130_000, ultimateStrength: 138_000, bearingStrength: 165_000 }
    },
    {
      id: 'al7075',
      label: '7075-T6 Aluminum',
      family: 'member',
      data: { name: '7075-T6', youngsModulus: 10_400_000, thermalExpansion: 12.8e-6, poissonsRatio: 0.33, yieldStrength: 73_000, ultimateStrength: 83_000, bearingStrength: 120_000 }
    },
    {
      id: 'al2024',
      label: '2024-T3 Aluminum',
      family: 'member',
      data: { name: '2024-T3', youngsModulus: 10_600_000, thermalExpansion: 12.5e-6, poissonsRatio: 0.33, yieldStrength: 50_000, ultimateStrength: 68_000, bearingStrength: 95_000 }
    },
    {
      id: 'ss304',
      label: '304 Stainless',
      family: 'washer',
      data: { name: '304 Stainless', youngsModulus: 28_000_000, thermalExpansion: 9.6e-6, poissonsRatio: 0.29, yieldStrength: 31_000, ultimateStrength: 73_000, bearingStrength: 60_000 }
    }
  ];
}

function metricMaterials(): MaterialCatalogEntry[] {
  return [
    {
      id: 'a286',
      label: 'A286 (Fastener)',
      family: 'fastener',
      data: { name: 'A286', youngsModulus: 193_000, thermalExpansion: 15.8e-6, poissonsRatio: 0.3, yieldStrength: 655, ultimateStrength: 965, bearingStrength: 1030 }
    },
    {
      id: '42crmo4',
      label: '42CrMo4',
      family: 'fastener',
      data: { name: '42CrMo4', youngsModulus: 210_000, thermalExpansion: 12e-6, poissonsRatio: 0.29, yieldStrength: 900, ultimateStrength: 1100, bearingStrength: 1300 }
    },
    {
      id: 'ti64',
      label: 'Ti-6Al-4V',
      family: 'fastener',
      data: { name: 'Ti-6Al-4V', youngsModulus: 114_000, thermalExpansion: 8.6e-6, poissonsRatio: 0.34, yieldStrength: 880, ultimateStrength: 950, bearingStrength: 1140 }
    },
    {
      id: 'al7075',
      label: '7075-T6 Aluminum',
      family: 'member',
      data: { name: '7075-T6', youngsModulus: 71_700, thermalExpansion: 23.6e-6, poissonsRatio: 0.33, yieldStrength: 503, ultimateStrength: 572, bearingStrength: 827 }
    },
    {
      id: 'al2024',
      label: '2024-T3 Aluminum',
      family: 'member',
      data: { name: '2024-T3', youngsModulus: 73_100, thermalExpansion: 23.2e-6, poissonsRatio: 0.33, yieldStrength: 345, ultimateStrength: 470, bearingStrength: 655 }
    },
    {
      id: 'ss304',
      label: '304 Stainless',
      family: 'washer',
      data: { name: '304 Stainless', youngsModulus: 193_000, thermalExpansion: 17.3e-6, poissonsRatio: 0.29, yieldStrength: 215, ultimateStrength: 505, bearingStrength: 415 }
    }
  ];
}

function imperialBoltSizes(): BoltSizeCatalogEntry[] {
  return [
    {
      id: '1/4-28',
      label: '1/4-28 UNF',
      diameter: 0.25,
      pitchOrTpi: 28,
      tensileStressArea: 0.0364,
      shankArea: 0.0491,
      recommendedBearingDiameter: 0.438
    },
    {
      id: '5/16-24',
      label: '5/16-24 UNF',
      diameter: 0.3125,
      pitchOrTpi: 24,
      tensileStressArea: 0.0580,
      shankArea: 0.0767,
      recommendedBearingDiameter: 0.531
    },
    {
      id: '3/8-24',
      label: '3/8-24 UNF',
      diameter: 0.375,
      pitchOrTpi: 24,
      tensileStressArea: 0.0878,
      shankArea: 0.1104,
      recommendedBearingDiameter: 0.625
    },
    {
      id: '7/16-20',
      label: '7/16-20 UNF',
      diameter: 0.4375,
      pitchOrTpi: 20,
      tensileStressArea: 0.1187,
      shankArea: 0.1503,
      recommendedBearingDiameter: 0.719
    },
    {
      id: '1/2-20',
      label: '1/2-20 UNF',
      diameter: 0.5,
      pitchOrTpi: 20,
      tensileStressArea: 0.1599,
      shankArea: 0.1963,
      recommendedBearingDiameter: 0.812
    }
  ];
}

function metricBoltSizes(): BoltSizeCatalogEntry[] {
  return [
    {
      id: 'M6x1',
      label: 'M6 x 1.0',
      diameter: 6,
      pitchOrTpi: 1,
      tensileStressArea: 20.1,
      shankArea: 28.27,
      recommendedBearingDiameter: 10
    },
    {
      id: 'M8x1.25',
      label: 'M8 x 1.25',
      diameter: 8,
      pitchOrTpi: 1.25,
      tensileStressArea: 36.6,
      shankArea: 50.27,
      recommendedBearingDiameter: 13
    },
    {
      id: 'M10x1.5',
      label: 'M10 x 1.5',
      diameter: 10,
      pitchOrTpi: 1.5,
      tensileStressArea: 58.0,
      shankArea: 78.54,
      recommendedBearingDiameter: 16
    },
    {
      id: 'M12x1.75',
      label: 'M12 x 1.75',
      diameter: 12,
      pitchOrTpi: 1.75,
      tensileStressArea: 84.3,
      shankArea: 113.10,
      recommendedBearingDiameter: 18
    },
    {
      id: 'M14x2',
      label: 'M14 x 2.0',
      diameter: 14,
      pitchOrTpi: 2,
      tensileStressArea: 115.0,
      shankArea: 153.94,
      recommendedBearingDiameter: 21
    }
  ];
}

export function getMaterialCatalog(units: FastenerSolverInput['units']): MaterialCatalogEntry[] {
  return units === 'metric' ? metricMaterials() : imperialMaterials();
}

export function getBoltSizeCatalog(units: FastenerSolverInput['units']): BoltSizeCatalogEntry[] {
  return units === 'metric' ? metricBoltSizes() : imperialBoltSizes();
}

export function applyBoltSizeToElements(
  elements: AxialContinuumElementInput[],
  size: BoltSizeCatalogEntry
): AxialContinuumElementInput[] {
  return elements.map((el) => {
    if (el.kind === 'bolt-thread') {
      return {
        ...el,
        area: size.tensileStressArea,
        tensileStressArea: size.tensileStressArea,
        label: el.label.includes('Thread') ? el.label : 'Bolt Threaded Segment'
      };
    }
    if (el.kind === 'bolt-shank' || el.kind === 'bolt-head') {
      return {
        ...el,
        area: size.shankArea
      };
    }
    if (el.kind === 'washer-head' || el.kind === 'washer-nut') {
      return {
        ...el,
        area: Math.max(el.area, Math.PI * (size.recommendedBearingDiameter * 0.5) ** 2)
      };
    }
    return el;
  });
}

export function resolveMaterialById(
  units: FastenerSolverInput['units'],
  id: string
): MaterialInput | null {
  const entry = getMaterialCatalog(units).find((row) => row.id === id);
  return entry ? { ...entry.data } : null;
}
