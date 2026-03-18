import { writable, derived, type Readable } from 'svelte/store';
import type { BushingInputs } from '$lib/core/bushing';
import type { BushingRenderDiagnostic } from '$lib/drafting/bushing/BushingRenderTypes';
import type { BushingRenderMode } from '$lib/drafting/bushing/bushingSceneModel';
import { MATERIALS } from '$lib/core/bushing/materials';
import { evaluateBushingPipeline, getBushingPipelineCacheStats } from './BushingComputeController';
import { runBushingVisualDiagnostics } from './BushingVisualDiagnostics';
import { safeGetItem, safeSetItem, safeParseJSON } from './BushingStorageHelper';
import { bushingLogger } from '$lib/utils/loggers';

const KEY = 'scd.bushing.inputs.v15';
const LEGACY_RENDERER_KEY = 'scd.bushing.legacyRenderer';
const TRACE_MODE_KEY = 'scd.bushing.traceEnabled';

export type BushingState = {
  form: BushingInputs;
  useLegacyRenderer: boolean;
  renderMode: BushingRenderMode;
  traceEnabled: boolean;
  renderInitNotice: string | null;
  renderDiagnostics: BushingRenderDiagnostic[];
  showInformationView: boolean;
};

function getDefaultForm(): BushingInputs {
  return {
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
    interferencePolicy: {
      enabled: false,
      lockBore: true,
      preserveBoreNominal: true,
      allowBoreNominalShift: false
    },
    boreCapability: {
      mode: 'unspecified'
    },
    enforceInterferenceTolerance: false,
    lockBoreForInterference: true,
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
    matHousing: MATERIALS[0].id,
    matBushing: 'bronze',
    friction: 0.15,
    dT: 0,
    minWallStraight: 0.05,
    minWallNeck: 0.04,
    endConstraint: 'free'
  };
}

export function createBushingStateManager() {
  const state = writable<BushingState>({
    form: getDefaultForm(),
    useLegacyRenderer: false,
    renderMode: 'section',
    traceEnabled: false,
    renderInitNotice: null,
    renderDiagnostics: [],
    showInformationView: false
  });

  // Load initial state from localStorage
  if (typeof window !== 'undefined') {
    state.update((s) => {
      try {
        const savedForm = safeParseJSON(safeGetItem(KEY), {});
        s.form = { ...s.form, ...savedForm };
        s.useLegacyRenderer = safeGetItem(LEGACY_RENDERER_KEY) === '1';
        s.renderMode = s.useLegacyRenderer ? 'legacy' : 'section';
        s.traceEnabled = safeGetItem(TRACE_MODE_KEY) === '1';
      } catch (e) {
        bushingLogger.error('Failed to load state', e);
      }
      return s;
    });
  }

  const pipeline = derived(state, ($state) => evaluateBushingPipeline($state.form));
  const cacheStats = derived(state, () => getBushingPipelineCacheStats());
  const visualDiagnostics = derived([pipeline, state], ([$pipeline, $state]) => 
    runBushingVisualDiagnostics($pipeline.scene, $pipeline.results)
  );
  const isFailed = derived(pipeline, ($pipeline) => 
    $pipeline.results.governing.margin < 0 || 
    $pipeline.results.physics.marginHousing < 0 || 
    $pipeline.results.physics.marginBushing < 0
  );

  function updateForm(updates: Partial<BushingInputs> | ((form: BushingInputs) => void)) {
    state.update((s) => {
      if (typeof updates === 'function') {
        updates(s.form);
      } else {
        s.form = { ...s.form, ...updates };
      }
      normalizeFormState(s.form);
      if (typeof window !== 'undefined') {
        safeSetItem(KEY, JSON.stringify(s.form));
      }
      return s;
    });
  }

  function toggleRendererMode() {
    state.update((s) => {
      s.useLegacyRenderer = !s.useLegacyRenderer;
      s.renderMode = s.useLegacyRenderer ? 'legacy' : 'section';
      safeSetItem(LEGACY_RENDERER_KEY, s.useLegacyRenderer ? '1' : '0');
      return s;
    });
  }

  function toggleTraceMode() {
    state.update((s) => {
      s.traceEnabled = !s.traceEnabled;
      safeSetItem(TRACE_MODE_KEY, s.traceEnabled ? '1' : '0');
      return s;
    });
  }

  function handleRenderInitFailure(reason: string) {
    state.update((s) => {
      s.renderInitNotice = reason || 'Renderer initialization failed.';
      if (typeof window !== 'undefined') {
        const payload = { at: new Date().toISOString(), reason: s.renderInitNotice };
        try {
          const prior = Number(safeGetItem('scd.bushing.renderInitFailCount') ?? '0');
          safeSetItem('scd.bushing.renderInitFailCount', String(prior + 1));
          safeSetItem('scd.bushing.renderInitLast', JSON.stringify(payload));
        } catch {}
        bushingLogger.warn('Renderer init failed', payload);
      }
      return s;
    });
  }

  function setRenderDiagnostics(diag: BushingRenderDiagnostic[]) {
    state.update((s) => {
      s.renderDiagnostics = diag;
      return s;
    });
  }

  function setShowInformationView(show: boolean) {
    state.update((s) => {
      s.showInformationView = show;
      return s;
    });
  }

  return {
    subscribe: state.subscribe,
    pipeline,
    cacheStats,
    visualDiagnostics,
    isFailed,
    updateForm,
    toggleRendererMode,
    toggleTraceMode,
    handleRenderInitFailure,
    setRenderDiagnostics,
    setShowInformationView
  };
}

function normalizeFormState(form: BushingInputs) {
  if (!form.interferencePolicy) {
    form.interferencePolicy = {
      enabled: Boolean(form.enforceInterferenceTolerance),
      lockBore: Boolean(form.lockBoreForInterference),
      preserveBoreNominal: true,
      allowBoreNominalShift: false
    };
  }
  if (!form.boreCapability) {
    form.boreCapability = { mode: 'unspecified' };
  }
  if (form.boreCapability.mode === 'reamer_fixed') {
    form.interferencePolicy.lockBore = true;
  }
  if (form.interferencePolicy.lockBore && form.interferencePolicy.allowBoreNominalShift) {
    form.interferencePolicy.allowBoreNominalShift = false;
  }
  if (form.interferencePolicy.preserveBoreNominal && form.interferencePolicy.allowBoreNominalShift) {
    form.interferencePolicy.allowBoreNominalShift = false;
  }
  if (!form.interferencePolicy.allowBoreNominalShift) {
    form.interferencePolicy.maxBoreNominalShift = undefined;
  } else if (!Number.isFinite(form.interferencePolicy.maxBoreNominalShift as number)) {
    form.interferencePolicy.maxBoreNominalShift = 0.0002;
  }
  const policyEnabled = Boolean(form.interferencePolicy.enabled);
  const policyLock = Boolean(form.interferencePolicy.lockBore);
  if (form.enforceInterferenceTolerance !== policyEnabled) form.enforceInterferenceTolerance = policyEnabled;
  if (form.lockBoreForInterference !== policyLock) form.lockBoreForInterference = policyLock;
  if (form.interferencePolicy.enabled !== form.enforceInterferenceTolerance) form.interferencePolicy.enabled = Boolean(form.enforceInterferenceTolerance);
  if (form.interferencePolicy.lockBore !== form.lockBoreForInterference) form.interferencePolicy.lockBore = Boolean(form.lockBoreForInterference);
}
