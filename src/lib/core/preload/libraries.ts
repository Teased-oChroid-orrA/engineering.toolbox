import { MATERIALS as BUSHING_MATERIALS } from '$lib/core/bushing/materials';
import hiLokStandardConfig from './catalogs/hilok-standard-config.json' with { type: 'json' };
import trsMonogramBlindConfig from './catalogs/trs-monogram-blind-config.json' with { type: 'json' };

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
  family: 'hi_lok' | 'blind_fastener_reference';
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

const importedHiLokCatalog = hiLokStandardConfig as {
  source: {
    manufacturer: string;
    family: string;
    sourceUrl: string;
    importedAt?: string;
    sourcePath?: string;
    liveDiscovery?: string;
  };
  dashVariants: PreloadFastenerLibraryItem['dashVariants'];
  gripTable: PreloadFastenerLibraryItem['gripTable'];
  entries: Array<{
    id: string;
    materialId: string;
    headStyle: string;
    threadDetail: string;
    sourceUrl: string;
    notes: string;
    materialIsAssumed: boolean;
  }>;
};

const importedTrsBlindCatalog = trsMonogramBlindConfig as {
  source: {
    manufacturer: string;
    family: string;
    sourceUrl: string;
    importedAt?: string;
    sourcePath?: string;
    liveDiscovery?: string;
    referenceOnly?: boolean;
  };
  entries: Array<{
    id: string;
    materialId: string;
    headStyle: string;
    threadDetail: string;
    sourceUrl: string;
    notes: string;
    materialIsAssumed: boolean;
  }>;
};

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

export const PRELOAD_FASTENER_LIBRARY: PreloadFastenerLibraryItem[] = importedHiLokCatalog.entries.map((entry) => ({
  id: entry.id,
  label: `${entry.id} Standard Configuration Hi-Lok Pin`,
  family: 'hi_lok',
  materialId: entry.materialId,
  nominalDiameterIn: null,
  gripRangeNote: 'Imported from the standard-configuration Hi-Lok series/dash grip table in 1/16 in increments. Verify exact manufacturer dash before release use.',
  threadDetail: entry.threadDetail,
  collarCompatibility:
    'Imported collar mapping by dash family. Verify oversize, material, and locking-collar compatibility against the manufacturer release table.',
  headStyle: entry.headStyle,
  materialIsAssumed: entry.materialIsAssumed,
  dashVariants: importedHiLokCatalog.dashVariants,
  gripTable: importedHiLokCatalog.gripTable,
  notes: entry.notes,
  sourceUrl: entry.sourceUrl
}));

export const PRELOAD_FASTENER_CATALOG: PreloadFastenerLibraryItem[] = PRELOAD_FASTENER_LIBRARY;

export const PRELOAD_REFERENCE_FASTENER_CATALOGS = [
  {
    manufacturer: importedHiLokCatalog.source.manufacturer,
    family: importedHiLokCatalog.source.family,
    sourceUrl: importedHiLokCatalog.source.sourceUrl,
    entryCount: importedHiLokCatalog.entries.length,
    importedAt: importedHiLokCatalog.source.importedAt ?? null,
    sourcePath: importedHiLokCatalog.source.sourcePath ?? null,
    liveDiscovery: importedHiLokCatalog.source.liveDiscovery ?? 'unknown',
    referenceOnly: false
  },
  {
    manufacturer: importedTrsBlindCatalog.source.manufacturer,
    family: importedTrsBlindCatalog.source.family,
    sourceUrl: importedTrsBlindCatalog.source.sourceUrl,
    entryCount: importedTrsBlindCatalog.entries.length,
    importedAt: importedTrsBlindCatalog.source.importedAt ?? null,
    sourcePath: importedTrsBlindCatalog.source.sourcePath ?? null,
    liveDiscovery: importedTrsBlindCatalog.source.liveDiscovery ?? 'unknown',
    referenceOnly: Boolean(importedTrsBlindCatalog.source.referenceOnly)
  }
] as const;

export const PRELOAD_IMPORT_PROVENANCE = PRELOAD_REFERENCE_FASTENER_CATALOGS;

export function getPreloadMaterial(id: string | undefined): PreloadMaterialLibraryItem {
  return PRELOAD_MATERIAL_LIBRARY.find((item) => item.id === id) ?? PRELOAD_MATERIAL_LIBRARY[0];
}

export function getPreloadFastener(id: string | undefined): PreloadFastenerLibraryItem {
  return PRELOAD_FASTENER_CATALOG.find((item) => item.id === id) ?? PRELOAD_FASTENER_CATALOG[0];
}
