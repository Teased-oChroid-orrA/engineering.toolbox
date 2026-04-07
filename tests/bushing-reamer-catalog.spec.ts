import { expect, test } from '@playwright/test';
import {
  AIRCRAFT_REAMER_CATALOG,
  applyReamerEntryToBushingId,
  applyReamerEntryToBushingInputs,
  createCustomReamerCatalogEntry,
  parseReamerCatalogCsv,
  removeCustomReamerEntryFromCsv,
  upsertCustomReamerCatalogCsv
} from '../src/lib/core/bushing/reamerCatalog';

test.describe('bushing reamer catalog', () => {
  test('loads the curated aerospace catalog with preferred entries flagged', () => {
    expect(AIRCRAFT_REAMER_CATALOG.length).toBeGreaterThan(10);
    const preferred = AIRCRAFT_REAMER_CATALOG.filter((entry) => entry.availabilityTier === 'preferred');
    expect(preferred.some((entry) => entry.sizeLabel === '1/4')).toBeTruthy();
  });

  test('applies a selected reamer entry as a reamer-fixed bore band', () => {
    const entry = AIRCRAFT_REAMER_CATALOG.find((candidate) => candidate.sizeLabel === '3/16');
    expect(entry).toBeTruthy();
    const next = applyReamerEntryToBushingInputs(
      {
        units: 'imperial',
        boreDia: 0.5,
        interference: 0.0015,
        boreTolMode: 'nominal_tol',
        boreNominal: 0.5,
        boreTolPlus: 0,
        boreTolMinus: 0,
        boreLower: 0.5,
        boreUpper: 0.5,
        interferenceTolMode: 'nominal_tol',
        interferenceNominal: 0.0015,
        interferenceTolPlus: 0,
        interferenceTolMinus: 0,
        interferenceLower: 0.0015,
        interferenceUpper: 0.0015,
        interferencePolicy: { enabled: true, lockBore: false, preserveBoreNominal: false, allowBoreNominalShift: true },
        boreCapability: { mode: 'adjustable' },
        enforceInterferenceTolerance: true,
        lockBoreForInterference: false,
        housingLen: 0.5,
        housingWidth: 1.5,
        edgeDist: 0.75,
        bushingType: 'straight',
        flangeOd: 0.75,
        flangeThk: 0.063,
        idType: 'straight',
        idBushing: 0.375,
        csMode: 'depth_angle',
        csDia: 0.5,
        csDepth: 0.125,
        csDepthTolPlus: 0,
        csDepthTolMinus: 0,
        csAngle: 100,
        extCsMode: 'depth_angle',
        extCsDia: 0.625,
        extCsDepth: 0.125,
        extCsDepthTolPlus: 0,
        extCsDepthTolMinus: 0,
        extCsAngle: 100,
        matHousing: 'aluminum_6061_t6',
        matBushing: 'bronze',
        friction: 0.15,
        dT: 0,
        minWallStraight: 0.05,
        minWallNeck: 0.04,
        endConstraint: 'free'
      },
      entry!
    );

    expect(next.boreCapability?.mode).toBe('reamer_fixed');
    expect(next.lockBoreForInterference).toBeTruthy();
    expect(next.boreLower).toBeCloseTo(0.1875, 4);
    expect(next.boreUpper).toBeCloseTo(0.1877, 4);
  });

  test('parses custom CSV rows using the same schema as the built-in catalog', () => {
    const custom = parseReamerCatalogCsv(
      'size_label,nominal_in,tool_tolerance_plus_in,tool_tolerance_minus_in,availability_tier,preferred_rank,source_family,source_urls,notes\nAERO-250,0.2500,0.0002,0.0000,preferred,1,custom_shop,https://example.com,shop preferred\n'
    );
    expect(custom).toHaveLength(1);
    expect(custom[0].source).toBe('custom');
    expect(custom[0].sizeLabel).toBe('AERO-250');
    expect(custom[0].preferredRank).toBe(1);
  });

  test('appends custom entries into the custom CSV in size order and can remove them again', () => {
    const first = createCustomReamerCatalogEntry(
      { sizeLabel: 'Test A', nominal: 0.4234, tolerancePlus: 0.0002, toleranceMinus: 0, notes: 'added' },
      'imperial',
      'bore'
    );
    const second = createCustomReamerCatalogEntry(
      { sizeLabel: 'Test B', nominal: 0.2111, tolerancePlus: 0.0002, toleranceMinus: 0, notes: 'added' },
      'imperial',
      'id'
    );

    const firstUpsert = upsertCustomReamerCatalogCsv(null, first);
    const secondUpsert = upsertCustomReamerCatalogCsv(firstUpsert.csvText, second);

    expect(secondUpsert.entries.map((entry) => entry.sizeLabel)).toEqual(['Test B', 'Test A']);
    expect(secondUpsert.csvText.split('\n')).toHaveLength(3);

    const removed = removeCustomReamerEntryFromCsv(secondUpsert.csvText, second.id);
    expect(removed.entries.map((entry) => entry.sizeLabel)).toEqual(['Test A']);
  });

  test('applies a selected reamer entry to the internal diameter without changing bore capability', () => {
    const entry = AIRCRAFT_REAMER_CATALOG.find((candidate) => candidate.sizeLabel === '1/4');
    expect(entry).toBeTruthy();
    const next = applyReamerEntryToBushingId(
      {
        units: 'imperial',
        boreDia: 0.5,
        interference: 0.0015,
        boreCapability: { mode: 'adjustable' },
        boreTolMode: 'limits',
        boreLower: 0.4998,
        boreUpper: 0.5002,
        interferenceTolMode: 'limits',
        interferenceLower: 0.0012,
        interferenceUpper: 0.0018,
        housingLen: 0.5,
        housingWidth: 1.5,
        edgeDist: 0.75,
        bushingType: 'straight',
        idType: 'straight',
        idBushing: 0.1875,
        csMode: 'depth_angle',
        csDia: 0.5,
        csDepth: 0.125,
        csAngle: 100,
        extCsMode: 'depth_angle',
        extCsDia: 0.625,
        extCsDepth: 0.125,
        extCsAngle: 100,
        matHousing: 'aluminum_6061_t6',
        matBushing: 'bronze',
        friction: 0.15,
        dT: 0,
        minWallStraight: 0.05,
        minWallNeck: 0.04
      } as any,
      entry!
    );
    expect(next.idBushing).toBeCloseTo(0.25, 4);
    expect(next.boreCapability?.mode).toBe('adjustable');
  });
});
