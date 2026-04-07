import type { BushingInputs, BushingOutput } from '$lib/core/bushing';
import { getQuickFix, makeFriendlyMessage } from '$lib/core/bushing/errorMessageUtils';

export type BushingGuidanceAction = {
  label: string;
  target?: string;
  run: () => void;
};

export type BushingWarningEntry = {
  warning: BushingOutput['warningCodes'][number];
  friendly: ReturnType<typeof makeFriendlyMessage>;
  actions: BushingGuidanceAction[];
  quickFix: string | null;
};

type GuidanceMutators = {
  updateForm: (patch: Partial<BushingInputs>) => void;
  updateInterferencePolicy: (patch: Partial<NonNullable<BushingInputs['interferencePolicy']>>) => void;
  updateBoreCapability: (patch: Partial<NonNullable<BushingInputs['boreCapability']>>) => void;
};

const unitStep = (form: BushingInputs) => (form.units === 'metric' ? 0.025 : 0.001);
const toleranceStep = (form: BushingInputs) => (form.units === 'metric' ? 0.005 : 0.0001);
const roundStep = (value: number, step: number) => Math.max(0, Math.ceil(value / step) * step);
const snap = (value: number, digits = 4) => Number(value.toFixed(digits));
const finitePositive = (value: number | null | undefined) => Number.isFinite(Number(value)) && Number(value) > 0;

export function buildBushingWarningEntries(
  form: BushingInputs,
  results: BushingOutput,
  { updateForm, updateInterferencePolicy, updateBoreCapability }: GuidanceMutators
): BushingWarningEntry[] {
  const boreRef = Number(form.boreNominal ?? form.boreDia ?? 0);
  const edgeRequiredCandidates = [
    finitePositive(results.edgeDistance.edMinSequence) ? Number(results.edgeDistance.edMinSequence) * Math.max(boreRef, 0) : null,
    finitePositive(results.edgeDistance.edMinStrength) ? Number(results.edgeDistance.edMinStrength) * Math.max(boreRef, 0) : null
  ].filter((value): value is number => value != null && Number.isFinite(value) && value > 0);
  const edgeRequiredAbs = edgeRequiredCandidates.length ? Math.max(...edgeRequiredCandidates) : null;
  const odRef = Number(results.geometry.odBushing ?? boreRef + (form.interferenceNominal ?? form.interference ?? 0));
  const idTarget = snap(Math.max(0, boreRef - unitStep(form)), 4);
  const csInternalDiaTarget = snap(Math.max(form.idBushing, (form.csDia || 0), form.idBushing + unitStep(form)), 4);
  const csExternalDiaTarget = snap(Math.max(odRef, (form.extCsDia || 0), odRef + unitStep(form)), 4);

  const buildActions = (code: string): BushingGuidanceAction[] => {
    switch (code) {
      case 'EDGE_DISTANCE_SEQUENCE_FAIL':
      case 'EDGE_DISTANCE_STRENGTH_FAIL':
        return [
          ...(finitePositive(edgeRequiredAbs)
            ? [{
                label: `Set edge distance to ${snap(roundStep(Number(edgeRequiredAbs), unitStep(form)), 4)}`,
                target: 'bushing-geometry-card',
                run: () => {
                  updateForm({ edgeDist: snap(roundStep(Number(edgeRequiredAbs), unitStep(form)), 4) });
                }
              } satisfies BushingGuidanceAction]
            : []),
          {
            label: 'Focus Geometry',
            target: 'bushing-geometry-card',
            run: () => {}
          }
        ];
      case 'STRAIGHT_WALL_BELOW_MIN':
        return [
          {
            label: `Reduce bushing ID to ${snap(Math.max(0, odRef - 2 * Math.max(form.minWallStraight, 0)), 4)}`,
            target: 'bushing-profile-card',
            run: () => {
              updateForm({ idBushing: snap(Math.max(0, odRef - 2 * Math.max(form.minWallStraight, 0)), 4) });
            }
          },
          {
            label: `Increase interference by ${snap(Math.max(form.minWallStraight - results.geometry.wallStraight, 0) * 2, 4)}`,
            target: 'bushing-geometry-card',
            run: () => {
              const increment = Math.max(form.minWallStraight - results.geometry.wallStraight, 0) * 2;
              if (form.interferenceTolMode === 'limits') {
                updateForm({ interferenceUpper: snap(Number(form.interferenceUpper ?? form.interference ?? 0) + increment, 4) });
              } else {
                updateForm({ interferenceNominal: snap(Number(form.interferenceNominal ?? form.interference ?? 0) + increment, 4) });
              }
            }
          }
        ];
      case 'NECK_WALL_BELOW_MIN':
        return [
          ...(form.idType === 'countersink'
            ? [{
                label: 'Switch internal profile to straight',
                target: 'bushing-profile-card',
                run: () => {
                  updateForm({ idType: 'straight' });
                }
              } satisfies BushingGuidanceAction]
            : []),
          ...(form.bushingType === 'countersink'
            ? [{
                label: 'Switch external profile to straight',
                target: 'bushing-profile-card',
                run: () => {
                  updateForm({ bushingType: 'straight' });
                }
              } satisfies BushingGuidanceAction]
            : []),
          {
            label: 'Reduce countersink depths by 10%',
            target: 'bushing-profile-card',
            run: () => {
              updateForm({
                csDepth: snap(Math.max(0, form.csDepth * 0.9), 4),
                extCsDepth: snap(Math.max(0, form.extCsDepth * 0.9), 4)
              });
            }
          }
        ];
      case 'NET_CLEARANCE_FIT':
        return [
          {
            label: 'Increase nominal interference',
            target: 'bushing-geometry-card',
            run: () => {
              const needed = Math.max(Math.abs(results.physics.deltaEffective) + toleranceStep(form), toleranceStep(form));
              updateForm({ interferenceNominal: snap(Number(form.interferenceNominal ?? form.interference ?? 0) + needed, 4) });
            }
          },
          {
            label: 'Focus Geometry',
            target: 'bushing-geometry-card',
            run: () => {}
          }
        ];
      case 'BUSHING_ID_GE_BORE':
        return [
          {
            label: `Reduce bushing ID to ${idTarget}`,
            target: 'bushing-profile-card',
            run: () => {
              updateForm({ idBushing: idTarget });
            }
          },
          {
            label: `Increase bore to ${snap(Number(form.idBushing ?? 0) + unitStep(form), 4)}`,
            target: 'bushing-geometry-card',
            run: () => {
              const next = snap(Number(form.idBushing ?? 0) + unitStep(form), 4);
              updateForm({ boreDia: next, boreNominal: next });
            }
          }
        ];
      case 'INTERNAL_CS_DIA_LT_ID':
        return [
          {
            label: `Set internal CS dia to ${csInternalDiaTarget}`,
            target: 'bushing-profile-card',
            run: () => {
              updateForm({ csDia: csInternalDiaTarget });
            }
          },
          {
            label: `Reduce bushing ID to ${idTarget}`,
            target: 'bushing-profile-card',
            run: () => {
              updateForm({ idBushing: idTarget });
            }
          }
        ];
      case 'EXTERNAL_CS_DIA_LT_OD':
        return [
          {
            label: `Set external CS dia to ${csExternalDiaTarget}`,
            target: 'bushing-profile-card',
            run: () => {
              updateForm({ extCsDia: csExternalDiaTarget });
            }
          },
          {
            label: 'Focus Profile',
            target: 'bushing-profile-card',
            run: () => {}
          }
        ];
      case 'INTERNAL_CS_ANGLE_INVALID':
        return [
          {
            label: 'Set internal angle to 100°',
            target: 'bushing-profile-card',
            run: () => {
              updateForm({ csAngle: 100 });
            }
          },
          {
            label: 'Set internal angle to 82°',
            target: 'bushing-profile-card',
            run: () => {
              updateForm({ csAngle: 82 });
            }
          }
        ];
      case 'EXTERNAL_CS_ANGLE_INVALID':
        return [
          {
            label: 'Set external angle to 100°',
            target: 'bushing-profile-card',
            run: () => {
              updateForm({ extCsAngle: 100 });
            }
          },
          {
            label: 'Set external angle to 82°',
            target: 'bushing-profile-card',
            run: () => {
              updateForm({ extCsAngle: 82 });
            }
          }
        ];
      case 'BORE_LIMITS_REVERSED':
        return [
          {
            label: 'Swap bore limits',
            target: 'bushing-geometry-card',
            run: () => {
              const lower = Number(form.boreLower ?? 0);
              const upper = Number(form.boreUpper ?? 0);
              updateForm({ boreLower: Math.min(lower, upper), boreUpper: Math.max(lower, upper) });
            }
          }
        ];
      case 'INTERFERENCE_LIMITS_REVERSED':
        return [
          {
            label: 'Swap interference limits',
            target: 'bushing-geometry-card',
            run: () => {
              const lower = Number(form.interferenceLower ?? 0);
              const upper = Number(form.interferenceUpper ?? 0);
              updateForm({ interferenceLower: Math.min(lower, upper), interferenceUpper: Math.max(lower, upper) });
            }
          }
        ];
      case 'REAMER_LOCK_CONFLICT':
        return [
          {
            label: 'Turn bore lock back on',
            target: 'bushing-process-card',
            run: () => {
              updateInterferencePolicy({ lockBore: true });
            }
          },
          {
            label: 'Switch bore capability to adjustable',
            target: 'bushing-process-card',
            run: () => {
              updateBoreCapability({ mode: 'adjustable' });
            }
          }
        ];
      case 'BORE_CAPABILITY_RANGE_INVALID':
        return [
          {
            label: 'Clear capability limits',
            target: 'bushing-process-card',
            run: () => {
              updateBoreCapability({ minAchievableTolWidth: undefined, maxRecommendedTolWidth: undefined });
            }
          }
        ];
      default:
        return [];
    }
  };

  return (results.warningCodes ?? []).map((warning) => {
    const friendly = makeFriendlyMessage(warning.code, {
      units: form.units === 'imperial' ? 'in' : 'mm',
      actualValue:
        warning.code === 'EDGE_DISTANCE_SEQUENCE_FAIL' || warning.code === 'EDGE_DISTANCE_STRENGTH_FAIL'
          ? Number(form.edgeDist ?? 0)
          : undefined,
      requiredValue:
        warning.code === 'EDGE_DISTANCE_SEQUENCE_FAIL'
          ? results.edgeDistance.edMinSequence * Number(form.boreNominal ?? form.boreDia ?? 0)
          : warning.code === 'EDGE_DISTANCE_STRENGTH_FAIL'
            ? results.edgeDistance.edMinStrength * Number(form.boreNominal ?? form.boreDia ?? 0)
            : undefined
    });
    return {
      warning,
      friendly,
      actions: buildActions(warning.code),
      quickFix: getQuickFix(warning.code)
    };
  });
}
