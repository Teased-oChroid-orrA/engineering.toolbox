import type {
  AssemblyRowInput,
  BearingGeometryMetadata,
  CompressionModel,
  FastenedJointPreloadInput,
  JointAssemblyInput,
  JointTypePreset,
  MemberSegmentInput,
  PlateBehaviorMode
} from './types';

function inferPlateRowKind(id: string): 'plate' | 'shim' | 'interlayer' {
  const normalized = id.trim().toLowerCase();
  if (normalized.includes('shim')) return 'shim';
  if (normalized.includes('seal') || normalized.includes('interlayer') || normalized.includes('interleave')) {
    return 'interlayer';
  }
  return 'plate';
}

function inferPlateLabel(kind: 'plate' | 'shim' | 'interlayer', index: number): string {
  if (kind === 'plate') return `Plate ${String.fromCharCode(65 + index)}`;
  if (kind === 'shim') return `Shim ${index + 1}`;
  return `Interlayer ${index + 1}`;
}

export function inferAssemblyMemberOuterDiameter(
  segment: MemberSegmentInput,
  fallbackDiameter: number
): number {
  if (segment.compressionModel === 'cylindrical_annulus') return Number(segment.outerDiameter);
  if (segment.compressionModel === 'conical_frustum_annulus') {
    return Math.max(Number(segment.outerDiameterStart), Number(segment.outerDiameterEnd));
  }
  if (segment.compressionModel === 'explicit_area') {
    return Number.isFinite(Number(fallbackDiameter)) && Number(fallbackDiameter) > 0 ? Number(fallbackDiameter) : 0;
  }
  return Number.isFinite(Number(fallbackDiameter)) && Number(fallbackDiameter) > 0
    ? Number(fallbackDiameter)
    : Math.max(Number(segment.innerDiameter ?? 0), 0);
}

export function buildJointAssemblyInput(
  input: Pick<
    FastenedJointPreloadInput,
    'assembly' | 'bearingGeometry' | 'boltModulus' | 'memberSegments' | 'nominalDiameter' | 'washerStack'
  > & {
    jointTypePreset?: JointTypePreset;
    plateBehaviorMode?: PlateBehaviorMode;
    fastenerLabel?: string;
    headStyle?: string;
    collarCompatibility?: string;
    activeCompressionModel?: CompressionModel;
  }
): JointAssemblyInput {
  if (input.assembly?.rows?.length) {
    return input.assembly;
  }

  const preset = input.jointTypePreset ?? 'bolted_nut';
  const plateBehavior = input.plateBehaviorMode ?? 'isotropic_metallic';
  const bearingGeometry: BearingGeometryMetadata | undefined = input.bearingGeometry;
  const nominalDiameter = Math.max(0, Number(input.nominalDiameter ?? 0));
  const headBearingDiameter = Number(bearingGeometry?.headBearingDiameter ?? nominalDiameter * 1.75);
  const nutBearingDiameter = Number(
    bearingGeometry?.nutOrCollarBearingDiameter ?? bearingGeometry?.headBearingDiameter ?? nominalDiameter * 1.75
  );
  const hardwareLength = Math.max(0.05, nominalDiameter * 0.65);
  const rows: AssemblyRowInput[] = [];

  rows.push({
    id: 'head',
    label:
      preset === 'countersunk_fastener'
        ? 'Countersunk head'
        : input.headStyle
          ? `${input.headStyle} head`
          : 'Head',
    kind: 'head',
    axialLength: hardwareLength,
    outerDiameter: headBearingDiameter,
    innerDiameter: nominalDiameter,
    modulus: input.boltModulus,
    participatesInClamp: false,
    source: 'derived',
    note: bearingGeometry?.fastenerLabel ?? input.fastenerLabel
  });

  const washer = input.washerStack;
  const headWasherCount = Math.max(0, Math.round(Number(washer?.underHeadCount ?? 0)));
  const nutWasherCount = Math.max(0, Math.round(Number(washer?.underNutCount ?? 0)));
  if (washer?.enabled) {
    for (let index = 0; index < headWasherCount; index += 1) {
      rows.push({
        id: `head-washer-${index + 1}`,
        label: `Head washer ${index + 1}`,
        kind: 'head_washer',
        axialLength: Number(washer.thicknessPerWasher),
        outerDiameter: Number(washer.underHeadOuterDiameter ?? washer.outerDiameter),
        innerDiameter: Number(washer.underHeadInnerDiameter ?? washer.innerDiameter),
        modulus: Number(washer.modulus),
        thermalExpansionCoeff: washer.thermalExpansionCoeff,
        participatesInClamp: true,
        source: 'derived',
        compressionModel: 'cylindrical_annulus'
      });
    }
  }

  let plateIndex = 0;
  for (const segment of input.memberSegments) {
    const kind = inferPlateRowKind(segment.id);
    const label = inferPlateLabel(kind, plateIndex);
    if (kind === 'plate') plateIndex += 1;
    rows.push({
      id: segment.id,
      label,
      kind,
      axialLength: Number(segment.length),
      outerDiameter: inferAssemblyMemberOuterDiameter(segment, Math.max(headBearingDiameter, nutBearingDiameter)),
      innerDiameter:
        segment.compressionModel === 'explicit_area'
          ? nominalDiameter
          : Number('innerDiameter' in segment ? segment.innerDiameter : nominalDiameter),
      modulus: Number(segment.modulus),
      thermalExpansionCoeff: segment.thermalExpansionCoeff,
      plateWidth: Number(segment.plateWidth),
      plateLength: Number(segment.plateLength),
      compressionModel: segment.compressionModel,
      participatesInClamp: true,
      source: 'custom',
      note:
        kind === 'plate'
          ? `${plateBehavior.replaceAll('_', ' ')} • ${segment.compressionModel.replaceAll('_', ' ')}`
          : `${kind} row`
    });
  }

  if (washer?.enabled) {
    for (let index = 0; index < nutWasherCount; index += 1) {
      rows.push({
        id: `nut-washer-${index + 1}`,
        label: `Nut washer ${index + 1}`,
        kind: 'nut_washer',
        axialLength: Number(washer.thicknessPerWasher),
        outerDiameter: Number(washer.underNutOuterDiameter ?? washer.outerDiameter),
        innerDiameter: Number(washer.underNutInnerDiameter ?? washer.innerDiameter),
        modulus: Number(washer.modulus),
        thermalExpansionCoeff: washer.thermalExpansionCoeff,
        participatesInClamp: true,
        source: 'derived',
        compressionModel: 'cylindrical_annulus'
      });
    }
  }

  const tailKind =
    preset === 'hi_lok_collar' || preset === 'blind_fastener'
      ? 'collar'
      : preset === 'tapped_joint'
        ? 'tapped_thread'
        : 'nut';
  rows.push({
    id: tailKind,
    label:
      tailKind === 'collar'
        ? input.collarCompatibility
          ? `Collar (${input.collarCompatibility})`
          : 'Collar'
        : tailKind === 'tapped_thread'
          ? 'Tapped thread'
          : 'Nut',
    kind: tailKind,
    axialLength: hardwareLength,
    outerDiameter: nutBearingDiameter,
    innerDiameter: nominalDiameter,
    modulus: input.boltModulus,
    participatesInClamp: false,
    source: 'derived',
    note: bearingGeometry?.washerCompatibilityNote
  });

  return {
    preset,
    plateBehavior,
    rows,
    notes: [
      `Joint preset: ${preset.replaceAll('_', ' ')}.`,
      `Plate behavior basis: ${plateBehavior.replaceAll('_', ' ')}.`,
      bearingGeometry?.source
        ? `Bearing geometry source: ${bearingGeometry.source}.`
        : 'Bearing geometry source: derived from explicit route inputs.'
    ]
  };
}
