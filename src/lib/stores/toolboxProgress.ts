import { writable } from 'svelte/store';

export type ToolboxProgressStep = {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'failed';
};

export type ToolboxProgressState = {
  visible: boolean;
  scope: string;
  progress: number;
  message: string;
  steps: ToolboxProgressStep[];
};

const INITIAL: ToolboxProgressState = {
  visible: false,
  scope: '',
  progress: 0,
  message: '',
  steps: []
};

const store = writable<ToolboxProgressState>(INITIAL);

let hideTimer: ReturnType<typeof setTimeout> | null = null;

function clearHideTimer() {
  if (!hideTimer) return;
  clearTimeout(hideTimer);
  hideTimer = null;
}

function recomputeProgress(steps: ToolboxProgressStep[]): number {
  if (!steps.length) return 0;
  let done = 0;
  for (const step of steps) {
    if (step.status === 'done' || step.status === 'failed') done += 1;
  }
  return Math.round((done / steps.length) * 100);
}

function begin(scope: string, labels: string[], message = 'Initializing...') {
  clearHideTimer();
  const steps: ToolboxProgressStep[] = labels.map((label, idx) => ({
    id: `step-${idx + 1}`,
    label,
    status: idx === 0 ? 'running' : 'pending'
  }));
  store.set({
    visible: true,
    scope,
    progress: steps.length ? Math.round(100 / steps.length) : 0,
    message,
    steps
  });
}

function markStep(stepId: string, status: ToolboxProgressStep['status'], message?: string) {
  clearHideTimer();
  store.update((state) => {
    if (!state.steps.length) return state;
    const nextSteps = state.steps.map((step) => (step.id === stepId ? { ...step, status } : step));
    const currentRunningIdx = nextSteps.findIndex((step) => step.status === 'running');
    if (currentRunningIdx === -1) {
      const nextPendingIdx = nextSteps.findIndex((step) => step.status === 'pending');
      if (nextPendingIdx !== -1) {
        nextSteps[nextPendingIdx] = { ...nextSteps[nextPendingIdx], status: 'running' };
      }
    }
    return {
      ...state,
      progress: recomputeProgress(nextSteps),
      message: message ?? state.message,
      steps: nextSteps
    };
  });
}

function complete(stepId: string, message?: string) {
  markStep(stepId, 'done', message);
}

function fail(stepId: string, message?: string) {
  markStep(stepId, 'failed', message);
}

function completeAll(message = 'Ready', hideAfterMs = 700) {
  clearHideTimer();
  store.update((state) => ({
    ...state,
    visible: true,
    progress: 100,
    message,
    steps: state.steps.map((step) => ({ ...step, status: step.status === 'failed' ? 'failed' : 'done' }))
  }));
  hideTimer = setTimeout(() => {
    store.set(INITIAL);
  }, hideAfterMs);
}

type RouteProgressProfile = {
  steps: string[];
  messages: [string, string, string];
  completeAllMessage: string;
  delaysMs: [number, number, number];
};

const ROUTE_PROFILES: Record<string, RouteProgressProfile> = {
  '/': {
    steps: ['Resolve dashboard route', 'Restore workspace state', 'Render dashboard cards'],
    messages: ['Resolving dashboard route...', 'Restoring recent workspace state...', 'Rendering dashboard cards...'],
    completeAllMessage: 'Dashboard ready.',
    delaysMs: [40, 360, 780]
  },
  '/bushing': {
    steps: ['Resolve bushing toolbox', 'Hydrate bushing inputs', 'Load solver/visual contracts'],
    messages: ['Resolving bushing toolbox...', 'Hydrating bushing input state...', 'Loading bushing solver and visual contracts...'],
    completeAllMessage: 'Bushing toolbox ready.',
    delaysMs: [60, 480, 980]
  },
  '/shear': {
    steps: ['Resolve shear toolbox', 'Hydrate shear model', 'Render shear workspace'],
    messages: ['Resolving shear toolbox...', 'Hydrating shear model state...', 'Rendering shear workspace...'],
    completeAllMessage: 'Shear toolbox ready.',
    delaysMs: [60, 420, 860]
  },
  '/fastener': {
    steps: ['Resolve fastener toolbox', 'Initialize fastener loads', 'Render fastener workspace'],
    messages: ['Resolving fastener toolbox...', 'Initializing fastener loads and presets...', 'Rendering fastener workspace...'],
    completeAllMessage: 'Fastener toolbox ready.',
    delaysMs: [60, 520, 1020]
  },
  '/profile': {
    steps: ['Resolve profile toolbox', 'Hydrate section properties', 'Render profile outputs'],
    messages: ['Resolving profile toolbox...', 'Hydrating section properties...', 'Rendering profile outputs...'],
    completeAllMessage: 'Profile toolbox ready.',
    delaysMs: [60, 420, 860]
  },
  '/properties': {
    steps: ['Resolve properties toolbox', 'Hydrate material data', 'Render properties panel'],
    messages: ['Resolving properties toolbox...', 'Hydrating material data...', 'Rendering properties panel...'],
    completeAllMessage: 'Properties toolbox ready.',
    delaysMs: [60, 420, 860]
  },
  '/buckling': {
    steps: ['Resolve buckling toolbox', 'Initialize buckling model', 'Render buckling outputs'],
    messages: ['Resolving buckling toolbox...', 'Initializing buckling model...', 'Rendering buckling outputs...'],
    completeAllMessage: 'Buckling toolbox ready.',
    delaysMs: [60, 460, 920]
  },
  '/weight-balance': {
    steps: ['Resolve weight & balance toolbox', 'Hydrate loading and fuel state', 'Render envelope and moments'],
    messages: ['Resolving weight and balance toolbox...', 'Hydrating loading and fuel state...', 'Rendering envelope and moments...'],
    completeAllMessage: 'Weight and balance ready.',
    delaysMs: [60, 500, 980]
  },
  '/inspector': {
    steps: ['Resolve inspector route', 'Initialize datasets and filters', 'Render inspector grid'],
    messages: ['Resolving inspector route...', 'Initializing datasets and filter state...', 'Rendering inspector grid...'],
    completeAllMessage: 'Inspector ready.',
    delaysMs: [70, 620, 1200]
  },
  '/surface': {
    steps: ['Resolve surface toolbox', 'Hydrate surface inputs', 'Render surface outputs'],
    messages: ['Resolving surface toolbox...', 'Hydrating surface inputs...', 'Rendering surface outputs...'],
    completeAllMessage: 'Surface toolbox ready.',
    delaysMs: [70, 600, 1160]
  }
};

function quickRouteProgress(scope: string, routePath = '') {
  const profile =
    ROUTE_PROFILES[routePath] ?? {
      steps: ['Resolve route', 'Mount toolbox UI', 'Finalize toolbox startup'],
      messages: ['Resolving route...', 'Mounting toolbox UI...', 'Finalizing toolbox startup...'],
      completeAllMessage: 'Toolbox ready.',
      delaysMs: [40, 360, 760]
    };

  begin(scope, profile.steps, profile.messages[0]);
  setTimeout(() => complete('step-1', profile.messages[0]), profile.delaysMs[0]);
  setTimeout(() => complete('step-2', profile.messages[1]), profile.delaysMs[1]);
  setTimeout(() => {
    complete('step-3', profile.messages[2]);
    completeAll(profile.completeAllMessage);
  }, profile.delaysMs[2]);
}

export const toolboxProgress = {
  subscribe: store.subscribe,
  begin,
  complete,
  fail,
  completeAll,
  quickRouteProgress
};
