import { MATERIALS as BUSHING_MATERIALS } from '$lib/core/bushing/materials';

export type PreloadMaterialLibraryItem = {
  id: string;
  name: string;
  modulusPsi: number;
  proofStrengthPsi?: number;
  ultimateStrengthPsi?: number;
  enduranceLimitPsi?: number;
  bearingAllowablePsi?: number;
  thermalExpansionCoeff?: number;
  source: 'bushing' | 'preload';
};

export type PreloadFastenerLibraryItem = {
  id: string;
  label: string;
  family: 'hi_lok';
  materialId: string;
  nominalDiameterIn: number | null;
  gripRangeNote: string;
  threadDetail: string;
  collarCompatibility: string;
  headStyle: string;
  materialIsAssumed?: boolean;
  dashVariants: Array<{
    dash: string;
    nominalDiameterIn: number;
    threadCallout: string;
    gripVariation: string;
    collarPart: string;
  }>;
  gripTable: Array<{
    gripCode: string;
    nominalGripIn: number;
    incrementIn: number;
  }>;
  notes: string;
  sourceUrl?: string;
};

function buildDashVariant(
  dash: string,
  nominalDiameterIn: number,
  threadCallout: string,
  collarPart: string
) {
  return {
    dash,
    nominalDiameterIn,
    threadCallout,
    gripVariation: '1/16 in grip variation',
    collarPart
  };
}

const commonDashVariants = [
  buildDashVariant('5', 5 / 32, '.1640-32 UNJ', 'HL70'),
  buildDashVariant('6', 3 / 16, '.1900-32 UNJF', 'HL70'),
  buildDashVariant('8', 1 / 4, '.2500-28 UNJF', 'HL86'),
  buildDashVariant('10', 5 / 16, '.3125-24 UNJF', 'HL86'),
  buildDashVariant('12', 3 / 8, '.3750-24 UNJF', 'HL108'),
  buildDashVariant('16', 1 / 2, '.5000-20 UNJF', 'HL120')
];

const commonGripTable = Array.from({ length: 24 }, (_, index) => ({
  gripCode: String(index + 1),
  nominalGripIn: (index + 1) / 16,
  incrementIn: 1 / 16
}));

const fromBushing = BUSHING_MATERIALS.map<PreloadMaterialLibraryItem>((item) => ({
  id: item.id,
  name: item.name,
  modulusPsi: item.E_ksi * 1000,
  proofStrengthPsi: item.Sy_ksi ? item.Sy_ksi * 1000 : undefined,
  ultimateStrengthPsi: item.Ftu_ksi ? item.Ftu_ksi * 1000 : undefined,
  enduranceLimitPsi: item.Fsu_ksi ? item.Fsu_ksi * 600 : undefined,
  bearingAllowablePsi: item.Fbru_ksi ? item.Fbru_ksi * 1000 : undefined,
  thermalExpansionCoeff: item.alpha_uF * 1e-6,
  source: 'bushing'
}));

const preloadSpecific: PreloadMaterialLibraryItem[] = [
  {
    id: 'al6061t6',
    name: 'Al 6061-T6',
    modulusPsi: 10_000_000,
    proofStrengthPsi: 35_000,
    ultimateStrengthPsi: 45_000,
    enduranceLimitPsi: 18_000,
    bearingAllowablePsi: 70_000,
    thermalExpansionCoeff: 13.1e-6,
    source: 'preload'
  },
  {
    id: 'al2219t87',
    name: 'Al 2219-T87',
    modulusPsi: 10_500_000,
    proofStrengthPsi: 49_000,
    ultimateStrengthPsi: 68_000,
    enduranceLimitPsi: 22_000,
    bearingAllowablePsi: 100_000,
    thermalExpansionCoeff: 12.8e-6,
    source: 'preload'
  },
  {
    id: 'a286',
    name: 'A286 CRES',
    modulusPsi: 29_000_000,
    proofStrengthPsi: 100_000,
    ultimateStrengthPsi: 160_000,
    enduranceLimitPsi: 55_000,
    bearingAllowablePsi: 180_000,
    thermalExpansionCoeff: 8.8e-6,
    source: 'preload'
  },
  {
    id: 'cres303',
    name: 'CRES 303',
    modulusPsi: 28_000_000,
    proofStrengthPsi: 45_000,
    ultimateStrengthPsi: 90_000,
    enduranceLimitPsi: 30_000,
    bearingAllowablePsi: 120_000,
    thermalExpansionCoeff: 9.6e-6,
    source: 'preload'
  },
  {
    id: 'cres431',
    name: 'CRES 431',
    modulusPsi: 29_000_000,
    proofStrengthPsi: 85_000,
    ultimateStrengthPsi: 130_000,
    enduranceLimitPsi: 45_000,
    bearingAllowablePsi: 170_000,
    thermalExpansionCoeff: 6.0e-6,
    source: 'preload'
  },
  {
    id: 'mp35n',
    name: 'MP35N',
    modulusPsi: 34_000_000,
    proofStrengthPsi: 220_000,
    ultimateStrengthPsi: 260_000,
    enduranceLimitPsi: 95_000,
    bearingAllowablePsi: 260_000,
    thermalExpansionCoeff: 7.0e-6,
    source: 'preload'
  }
];

export const PRELOAD_MATERIAL_LIBRARY: PreloadMaterialLibraryItem[] = [...fromBushing, ...preloadSpecific];

export const PRELOAD_FASTENER_LIBRARY: PreloadFastenerLibraryItem[] = [
  ['HL10', 'ph157mo'],
  ['HL11', 'ph157mo'],
  ['HL18', 'steel4340'],
  ['HL19', 'steel4340'],
  ['HL20', 'steel4340'],
  ['HL21', 'steel4340'],
  ['HL30', 'a286'],
  ['HL31', 'a286'],
  ['HL40', 'ti6al4v'],
  ['HL41', 'ti6al4v'],
  ['HL48', 'ti6al4v'],
  ['HL50', 'inconel718'],
  ['HL51', 'inconel718'],
  ['HL86', 'mp35n']
].map(([id, materialId]) => ({
  id,
  label: `${id} Standard Configuration Hi-Lok Pin`,
  family: 'hi_lok' as const,
  materialId,
  nominalDiameterIn: null,
  gripRangeNote: 'Dash/grip dependent; Hi-Lok standard families commonly vary in 1/16 in grip increments.',
  threadDetail: 'UNJ family thread by series; verify exact dash and thread callout from manufacturer table.',
  collarCompatibility: 'Use matching Hi-Lok collar family for the selected dash and installation standard.',
  headStyle: 'Series-specific standard configuration head',
  materialIsAssumed: true,
  dashVariants: commonDashVariants,
  gripTable: commonGripTable,
  notes:
    'Library item supplies a series baseline plus dash/grip importer tables. Confirm the exact manufacturer dash/grip table before release use.',
  sourceUrl: 'https://jet-tek.com/product-specialties/hi-lok-fasteners-hi-lok/'
}));

const overrides: Partial<Record<string, Partial<PreloadFastenerLibraryItem>>> = {
  HL10: {
    materialId: 'ti6al4v',
    headStyle: 'Protruding shear head',
    threadDetail: 'UNJ shear-pin thread family',
    notes: 'Commonly published as a protruding shear-head Hi-Lok pin; verify dash-specific diameter and grip from the manufacturer table.',
    materialIsAssumed: false,
    sourceUrl: 'https://jet-tek.com/product-specialties/hi-lok-fasteners-hi-lok/'
  },
  HL11: {
    materialId: 'ti6al4v',
    headStyle: '100° reduced flush shear head',
    threadDetail: 'UNJ shear-pin thread family',
    notes: 'Commonly published as a 100° flush shear-head Hi-Lok pin; verify dash-specific diameter and grip from the manufacturer table.',
    materialIsAssumed: false,
    sourceUrl: 'https://jet-tek.com/product-specialties/hi-lok-fasteners-hi-lok/'
  },
  HL18: {
    materialId: 'steel4340',
    headStyle: 'Protruding shear head',
    threadDetail: 'UNJ shear-pin thread family',
    notes: 'Commonly published as an alloy-steel protruding shear-head Hi-Lok pin; verify dash-specific geometry from the manufacturer table.',
    materialIsAssumed: false,
    sourceUrl: 'https://jet-tek.com/hl18/'
  },
  HL19: {
    materialId: 'steel4340',
    headStyle: '100° reduced flush shear head',
    threadDetail: 'UNJ shear-pin thread family',
    notes: 'Manufacturer listing shows alloy steel, 100° reduced flush shear head; verify dash-specific geometry from the manufacturer table.',
    materialIsAssumed: false,
    sourceUrl: 'https://jet-tek.com/product-specialties/hi-lok-fasteners-hi-lok/'
  },
  HL20: {
    materialId: 'steel4340',
    headStyle: 'Protruding tension head',
    threadDetail: 'UNJ tension-pin thread family',
    notes: 'Manufacturer listing shows alloy steel, protruding tension head; verify dash-specific geometry from the manufacturer table.',
    materialIsAssumed: false,
    sourceUrl: 'https://jet-tek.com/hl20/'
  },
  HL21: {
    materialId: 'steel4340',
    headStyle: '100° flush tension head',
    threadDetail: 'UNJ tension-pin thread family',
    notes: 'Manufacturer listing shows alloy steel, 100° flush tension head; verify dash-specific geometry from the manufacturer table.',
    materialIsAssumed: false,
    sourceUrl: 'https://jet-tek.com/product-specialties/hi-lok-fasteners-hi-lok/'
  },
  HL40: {
    materialId: 'a286',
    headStyle: 'Protruding shear head',
    threadDetail: 'UNJ shear-pin thread family',
    notes: 'Manufacturer listing shows A-286 high-temperature alloy, protruding shear head; verify dash-specific geometry from the manufacturer table.',
    materialIsAssumed: false,
    sourceUrl: 'https://jet-tek.com/product-specialties/hi-lok-fasteners-hi-lok/'
  },
  HL41: {
    materialId: 'a286',
    headStyle: '100° reduced flush shear head',
    threadDetail: 'UNJ shear-pin thread family',
    notes: 'Manufacturer listing shows A-286 high-temperature alloy, 100° reduced flush shear head; verify dash-specific geometry from the manufacturer table.',
    materialIsAssumed: false,
    sourceUrl: 'https://jet-tek.com/product-specialties/hi-lok-fasteners-hi-lok/'
  },
  HL48: {
    materialId: 'a286',
    headStyle: 'Protruding tension head',
    threadDetail: 'UNJ tension-pin thread family',
    notes: 'Manufacturer listing shows A-286 high-temperature alloy, protruding tension head; verify dash-specific geometry from the manufacturer table.',
    materialIsAssumed: false,
    sourceUrl: 'https://jet-tek.com/hl48/'
  },
  HL49: {
    materialId: 'a286',
    headStyle: '100° flush tension head',
    threadDetail: 'UNJ tension-pin thread family',
    notes: 'Manufacturer listing shows A-286 high-temperature alloy, 100° flush tension head; verify dash-specific geometry from the manufacturer table.',
    materialIsAssumed: false,
    sourceUrl: 'https://jet-tek.com/product-specialties/hi-lok-fasteners-hi-lok/'
  }
};

export const PRELOAD_FASTENER_CATALOG: PreloadFastenerLibraryItem[] = PRELOAD_FASTENER_LIBRARY.map((item) => ({
  ...item,
  ...(overrides[item.id] ?? {})
}));

export function getPreloadMaterial(id: string | undefined): PreloadMaterialLibraryItem {
  return PRELOAD_MATERIAL_LIBRARY.find((item) => item.id === id) ?? PRELOAD_MATERIAL_LIBRARY[0];
}

export function getPreloadFastener(id: string | undefined): PreloadFastenerLibraryItem {
  return PRELOAD_FASTENER_CATALOG.find((item) => item.id === id) ?? PRELOAD_FASTENER_CATALOG[0];
}
