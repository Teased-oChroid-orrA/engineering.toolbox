import type { AircraftProfile, CalculationOptions, CalculationTraceEntry } from './types';

export function buildInputHash(
  aircraft: AircraftProfile,
  trace: CalculationTraceEntry[],
  options: Required<CalculationOptions>
): string {
  const envelopeFingerprint = aircraft.envelopes
    .map((envelope) => {
      const vertices = envelope.vertices
        .map((v) => `${v.weight.toFixed(3)}:${v.cgPosition.toFixed(3)}`)
        .join('|');
      return [
        envelope.category,
        envelope.maxWeight.toFixed(3),
        envelope.forwardLimit?.toFixed(3) ?? '',
        envelope.aftLimit?.toFixed(3) ?? '',
        vertices
      ].join('~');
    })
    .join('||');

  const traceFingerprint = trace
    .map((entry) =>
      [
        entry.id,
        entry.type,
        entry.weight.toFixed(3),
        entry.arm.toFixed(3),
        entry.moment.toFixed(3)
      ].join(':')
    )
    .join('|');

  const raw = [
    aircraft.id,
    aircraft.maxTakeoffWeight.toFixed(3),
    aircraft.maxLandingWeight.toFixed(3),
    aircraft.maxZeroFuelWeight?.toFixed(3) ?? '',
    options.uncertaintyWeightTolerance.toFixed(3),
    options.uncertaintyArmTolerance.toFixed(3),
    options.sensitivityDeltaWeight.toFixed(3),
    envelopeFingerprint,
    traceFingerprint
  ].join('::');

  return fnv1a32(raw);
}

function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
