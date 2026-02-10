import { normalizeBushingInputs } from '$lib/core/bushing';
import type { BushingInputsRaw, BushingOutput } from '$lib/core/bushing';
import type { BushingScene } from '$lib/drafting/bushing/bushingSceneModel';

export type BushingTraceRecord = {
  timestampIso: string;
  source: string;
  rawInput: BushingInputsRaw;
  normalizedInput: ReturnType<typeof normalizeBushingInputs>;
  solved: {
    governing: BushingOutput['governing'];
    contactPressure: number;
    installForce: number;
    warnings: string[];
    warningCodes: BushingOutput['warningCodes'];
  };
  rendered: {
    sceneSize: { width: number; height: number };
    labelTitle: string;
    signature: string;
  };
};

declare global {
  var __SCD_BUSHING_TRACE_LOG__: BushingTraceRecord[] | undefined;
  var __SCD_BUSHING_TRACE_LAST_SIG__: string | undefined;
}

function sceneSignature(scene: BushingScene): string {
  return [
    scene.width.toFixed(6),
    scene.height.toFixed(6),
    scene.leftHousingPath.length,
    scene.rightHousingPath.length,
    scene.leftBushingPath.length,
    scene.rightBushingPath.length,
    scene.boreVoidPath.length
  ].join('|');
}

export function buildBushingTraceRecord(args: {
  rawInput: BushingInputsRaw;
  solved: BushingOutput;
  scene: BushingScene;
  source?: string;
}): BushingTraceRecord {
  const normalizedInput = normalizeBushingInputs(args.rawInput);
  const signature = sceneSignature(args.scene);
  return {
    timestampIso: new Date().toISOString(),
    source: args.source ?? 'unknown',
    rawInput: args.rawInput,
    normalizedInput,
    solved: {
      governing: args.solved.governing,
      contactPressure: args.solved.physics.contactPressure,
      installForce: args.solved.physics.installForce,
      warnings: [...args.solved.warnings],
      warningCodes: args.solved.warningCodes
    },
    rendered: {
      sceneSize: { width: args.scene.width, height: args.scene.height },
      labelTitle: args.scene.label.title,
      signature
    }
  };
}

export function emitBushingTrace(record: BushingTraceRecord): void {
  if (typeof globalThis === 'undefined') return;
  const sig = `${record.source}|${record.rendered.signature}|${record.solved.governing.name}|${record.solved.governing.margin.toFixed(8)}`;
  if (globalThis.__SCD_BUSHING_TRACE_LAST_SIG__ === sig) return;
  globalThis.__SCD_BUSHING_TRACE_LAST_SIG__ = sig;

  const log = globalThis.__SCD_BUSHING_TRACE_LOG__ ?? [];
  log.push(record);
  if (log.length > 50) log.shift();
  globalThis.__SCD_BUSHING_TRACE_LOG__ = log;

  console.groupCollapsed(
    `[SC][Bushing][trace] ${record.source} ${record.normalizedInput.bushingType}/${record.normalizedInput.idType}`
  );
  console.log('rawInput', record.rawInput);
  console.log('normalizedInput', record.normalizedInput);
  console.log('solved', record.solved);
  console.log('rendered', record.rendered);
  console.groupEnd();
}

