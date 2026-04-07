<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui';
  import { BUSHING_FORMULA_INVENTORY, getBushingProcessRoute, getMaterial, type BushingInputs, type BushingOutput } from '$lib/core/bushing';
  import { calculateUniversalBearing, type BearingSegment } from '$lib/core/shared/bearing';
  import BushingDerivationBlock from './BushingDerivationBlock.svelte';
  import BushingLatex from './BushingLatex.svelte';
  import BushingLameStressPlot from './BushingLameStressPlot.svelte';

  let {
    form,
    results,
    onBack = () => {}
  }: {
    form: BushingInputs;
    results: BushingOutput;
    onBack?: () => void;
  } = $props();

  type DerivationBlock = {
    title: string;
    objective: string;
    equations: EquationEntry[];
    steps: string[];
    note?: string;
  };

  type EquationEntry = {
    latex: string;
    definitions?: Array<{ latex: string; meaning: string }>;
  };

  type VariableDefinition = {
    latex: string;
    meaning: string;
  };
  type InfoSectionId = 'overview' | 'fit' | 'service' | 'appendix';

  const MPS_TO_FPS = 3.280839895013123;
  const UM_TO_UIN = 39.37007874015748;
  const clamp = (value: number, lower: number, upper: number) => Math.min(upper, Math.max(lower, value));
  const isFiniteNumber = (value: unknown): value is number => Number.isFinite(Number(value));
  const fmt = (value: number | null | undefined, digits = 6) => (!isFiniteNumber(value) ? '---' : Number(value).toFixed(digits));
  const fmtShort = (value: number | null | undefined, digits = 4) => (!isFiniteNumber(value) ? '---' : Number(value).toFixed(digits));
  const fmtInt = (value: number | null | undefined) => (!isFiniteNumber(value) ? '---' : Math.round(Number(value)).toString());
  const fmtPct = (value: number | null | undefined, digits = 1) => (!isFiniteNumber(value) ? '---' : `${(Number(value) * 100).toFixed(digits)}%`);
  const latexNumber = (value: number | null | undefined, digits = 4) =>
    isFiniteNumber(value) ? Number(value).toFixed(digits) : String.raw`\text{not evaluated}`;
  const latexUnitLabel = (unit: string) => {
    switch (unit) {
      case 'in':
        return String.raw`\mathrm{in}`;
      case 'psi':
        return String.raw`\mathrm{psi}`;
      case 'lbf':
        return String.raw`\mathrm{lbf}`;
      case 'm/s':
        return String.raw`\mathrm{m/s}`;
      case 'ft/s':
        return String.raw`\mathrm{ft/s}`;
      case 'h':
        return String.raw`\mathrm{h}`;
      case 'uin':
        return String.raw`\mu\mathrm{in}`;
      case 'um':
      case 'μm':
        return String.raw`\mu\mathrm{m}`;
      case 'deg':
        return String.raw`{}^\circ`;
      case 'degF':
        return String.raw`{}^\circ\mathrm{F}`;
      case 'degC':
        return String.raw`{}^\circ\mathrm{C}`;
      case 'psi*ft/s':
        return String.raw`\mathrm{psi\cdot ft/s}`;
      case 'psi*m/s':
        return String.raw`\mathrm{psi\cdot m/s}`;
      default:
        return String.raw`\mathrm{${unit}}`;
    }
  };
  const latexUnit = (value: number | null | undefined, unit: string, digits = 4) =>
    isFiniteNumber(value) ? `${Number(value).toFixed(digits)}\\,${latexUnitLabel(unit)}` : String.raw`\text{not evaluated}`;
  const mathValue = (value: number | null | undefined, digits = 4) =>
    isFiniteNumber(value) ? `<span class="math-value">${Number(value).toFixed(digits)}</span>` : '<span class="math-label">not evaluated</span>';
  const mathUnit = (value: number | null | undefined, unit: string, digits = 4) =>
    `${mathValue(value, digits)} <span class="math-soft">${unit}</span>`;
  const refTemp = (units: BushingInputs['units']) => (units === 'metric' ? 20 : 70);
  const absoluteTempToDeltaF = (value: number | undefined) => {
    if (!isFiniteNumber(value)) return null;
    const delta = Number(value) - refTemp(form.units);
    return form.units === 'metric' ? delta * 1.8 : delta;
  };
  const pvBaseFor = (lubrication: BushingInputs['lubricationMode']) => {
    switch (lubrication) {
      case 'dry':
        return 0.45;
      case 'oiled':
        return 1.15;
      case 'solid_film':
        return 0.95;
      case 'greased':
      default:
        return 0.8;
    }
  };
  const contaminationFactor = (level: BushingInputs['contaminationLevel']) => {
    switch (level) {
      case 'shop':
        return 0.86;
      case 'dirty':
        return 0.68;
      case 'abrasive':
        return 0.5;
      case 'clean':
      default:
        return 1;
    }
  };
  const roughnessFactor = (raUm: number | undefined) => {
    const ra = isFiniteNumber(raUm) ? Number(raUm) : 1.6;
    return clamp(1.15 - Math.max(0, ra - 1.6) * 0.09 - Math.max(0, 1.6 - ra) * 0.01, 0.55, 1.2);
  };
  const hardnessFactor = (hrc: number | undefined) => {
    const hardness = isFiniteNumber(hrc) ? Number(hrc) : 32;
    return clamp(1.1 - Math.max(0, 36 - hardness) * 0.03, 0.6, 1.1);
  };
  const misalignmentFactor = (misalignmentDeg: number | undefined) => {
    const value = Math.abs(Number(misalignmentDeg ?? 0));
    return clamp(1 - value * 0.08, 0.6, 1);
  };
  const temperatureFactor = () => {
    const hotDeltaF = absoluteTempToDeltaF(form.serviceTemperatureHot);
    if (hotDeltaF == null) return 1;
    return clamp(1 - Math.max(0, hotDeltaF - 80) * 0.0015, 0.75, 1);
  };
  const fitClassRule = '&Delta; &lt; -5&times;10<sup>-5</sup> in &rarr; clearance,&nbsp; |&Delta;| &le; 5&times;10<sup>-5</sup> in &rarr; transition,&nbsp; otherwise interference.';
  const fitClassRuleLatex = String.raw`\Delta < -5\times10^{-5}\,\mathrm{in}\Rightarrow \text{clearance},\quad |\Delta| \le 5\times10^{-5}\,\mathrm{in}\Rightarrow \text{transition},\quad \text{otherwise interference}`;
  const VARIABLE_GLOSSARY: Record<string, VariableDefinition> = {
    B: { latex: 'B', meaning: 'Resolved bore interval.' },
    B_L: { latex: 'B_L', meaning: 'Lower limit of the resolved bore interval.' },
    B_U: { latex: 'B_U', meaning: 'Upper limit of the resolved bore interval.' },
    I_t: { latex: 'I_t', meaning: 'Requested target interference interval.' },
    I_L: { latex: 'I_L', meaning: 'Lower limit of the target interference interval.' },
    I_U: { latex: 'I_U', meaning: 'Upper limit of the target interference interval.' },
    OD: { latex: '\\mathrm{OD}', meaning: 'Solved outer-diameter interval for the bushing.' },
    OD_L: { latex: 'OD_L', meaning: 'Lower limit of the solved outer diameter.' },
    OD_U: { latex: 'OD_U', meaning: 'Upper limit of the solved outer diameter.' },
    I_ach: { latex: 'I_{ach}', meaning: 'Achieved interference interval after solving the OD band.' },
    w_target: { latex: 'w_{target}', meaning: 'Width of the requested target interference interval.' },
    w_bore: { latex: 'w_{bore}', meaning: 'Width of the resolved bore tolerance interval.' },
    Delta_user: { latex: '\\Delta_{user}', meaning: 'User-achieved nominal diametral interference before thermal correction.' },
    Delta_thermal: { latex: '\\Delta_{thermal}', meaning: 'Current-state thermal interference correction.' },
    Delta_retained: { latex: '\\Delta_{retained}', meaning: 'Retained equilibrium interference after thermal correction.' },
    Delta_install: { latex: '\\Delta_{install}', meaning: 'Temporary installation interference used for install force.' },
    Delta_assy: { latex: '\\Delta_{assy}', meaning: 'Assembly-temperature contribution to temporary install interference.' },
    Delta: { latex: '\\Delta', meaning: 'Generic diametral interference term in the active relation.' },
    DeltaT_h_assy: { latex: '\\Delta T_{h,assy}', meaning: 'Housing temperature change at assembly relative to the reference temperature.' },
    DeltaT_b_assy: { latex: '\\Delta T_{b,assy}', meaning: 'Bushing temperature change at assembly relative to the reference temperature.' },
    alpha_b: { latex: '\\alpha_b', meaning: 'Bushing coefficient of thermal expansion.' },
    alpha_h: { latex: '\\alpha_h', meaning: 'Housing coefficient of thermal expansion.' },
    D: { latex: 'D', meaning: 'Nominal bore / interface diameter used by the active relation.' },
    e: { latex: 'e', meaning: 'Edge distance measured from hole center to free edge.' },
    W: { latex: 'W', meaning: 'Available surrounding width in the housing.' },
    D_eq: { latex: 'D_{eq}', meaning: 'Equivalent finite-plate housing diameter.' },
    w_eff: { latex: 'w_{eff}', meaning: 'Effective surrounding width after saturation logic.' },
    e_eff: { latex: 'e_{eff}', meaning: 'Effective edge distance after saturation logic.' },
    R_sat: { latex: 'R_{sat}', meaning: 'Saturation radius used by the housing reduction.' },
    A_housing: { latex: 'A_{housing}', meaning: 'Effective housing area used in the equivalent-diameter reduction.' },
    lambda: { latex: '\\lambda', meaning: 'Normalized edge-distance ratio used in the finite-plate adjustment.' },
    psi_factor: { latex: '\\psi', meaning: 'Finite-plate correction factor in the housing compliance term.' },
    T_b: { latex: 'T_b', meaning: 'Bushing Lamé compliance term.' },
    T_h: { latex: 'T_h', meaning: 'Housing Lamé compliance term.' },
    p: { latex: 'p', meaning: 'Generic contact pressure term in the active relation.' },
    p_retained: { latex: 'p_{retained}', meaning: 'Retained equilibrium contact pressure.' },
    p_install: { latex: 'p_{install}', meaning: 'Install-state contact pressure.' },
    sigma_r: { latex: '\\sigma_r', meaning: 'Radial stress component.' },
    sigma_theta: { latex: '\\sigma_\\theta', meaning: 'Hoop stress component.' },
    sigma_z: { latex: '\\sigma_z', meaning: 'Axial stress component.' },
    sigma_h: { latex: '\\sigma_h', meaning: 'Housing hoop-stress shorthand used in the provenance formulas.' },
    sigma_b: { latex: '\\sigma_b', meaning: 'Bushing hoop-stress shorthand used in the provenance formulas.' },
    C_1: { latex: 'C_1', meaning: 'First Lamé integration constant for the thick-wall solution.' },
    C_2: { latex: 'C_2', meaning: 'Second Lamé integration constant for the thick-wall solution.' },
    a: { latex: 'a', meaning: 'Inner radius of the active ring section.' },
    b: { latex: 'b', meaning: 'Outer radius of the active ring section.' },
    d: { latex: 'd', meaning: 'Inner housing diameter used by the closed-form hoop-stress relation.' },
    d_i: { latex: 'd_i', meaning: 'Bushing inner diameter used by the hoop-stress relation.' },
    d_o: { latex: 'd_o', meaning: 'Bushing outer diameter used by the hoop-stress relation.' },
    p_i: { latex: 'p_i', meaning: 'Internal boundary pressure on the ring section.' },
    p_o: { latex: 'p_o', meaning: 'External boundary pressure on the ring section.' },
    r: { latex: 'r', meaning: 'Radial evaluation location.' },
    k_constraint: { latex: 'k_{constraint}', meaning: 'Axial constraint factor used in the axial stress estimate.' },
    k_length: { latex: 'k_{length}', meaning: 'Length correction factor used in the axial stress estimate.' },
    nu: { latex: '\\nu', meaning: 'Poisson ratio of the active material.' },
    F_install: { latex: 'F_{install}', meaning: 'Estimated installation force based on install-state pressure.' },
    F_retained: { latex: 'F_{retained}', meaning: 'Retained-fit friction force based on equilibrium pressure.' },
    F_band: { latex: 'F_{band}', meaning: 'Expected installation-force band after process-route scaling.' },
    F_remove: { latex: 'F_{remove}', meaning: 'Estimated removal force based on retained fit.' },
    mu: { latex: '\\mu', meaning: 'Friction coefficient used by the press-force model.' },
    L: { latex: 'L', meaning: 'Housing engagement length.' },
    k_low: { latex: 'k_{low}', meaning: 'Low-side process multiplier on install force.' },
    k_high: { latex: 'k_{high}', meaning: 'High-side process multiplier on install force.' },
    k_remove: { latex: 'k_{remove}', meaning: 'Removal-force multiplier applied to retained friction force.' },
    MS: { latex: '\\mathrm{MS}', meaning: 'Margin-of-safety convention, allowable divided by demand minus one.' },
    D_base: { latex: 'D_{base}', meaning: 'Base diameter for the active countersink relation.' },
    h: { latex: 'h', meaning: 'Countersink depth.' },
    theta: { latex: '\\theta', meaning: 'Included angle or load angle, depending on the active relation.' },
    e_over_D_actual: { latex: '\\left(\\frac{e}{D}\\right)_{actual}', meaning: 'Actual normalized edge distance.' },
    F_bru_eff: { latex: 'F_{bru,eff}', meaning: 'Effective bearing allowable including pressure contribution.' },
    e_req_seq: { latex: 'e_{req,seq}', meaning: 'Required edge distance from sequencing / ligament logic.' },
    e_over_D_min_seq: { latex: '\\left(\\frac{e}{D}\\right)_{min,seq}', meaning: 'Minimum normalized edge distance from sequencing logic.' },
    e_req_str: { latex: 'e_{req,str}', meaning: 'Required edge distance from strength logic.' },
    e_over_D_min_str: { latex: '\\left(\\frac{e}{D}\\right)_{min,str}', meaning: 'Minimum normalized edge distance from strength logic.' },
    tau: { latex: '\\tau', meaning: 'Effective shear allowable used by the edge-distance check.' },
    t_eff_seq: { latex: 't_{eff,seq}', meaning: 'Effective sequence thickness from the active profile.' },
    t_wall_straight: { latex: 't_{wall,straight}', meaning: 'Straight-wall thickness of the bushing section.' },
    P: { latex: 'P', meaning: 'Applied service load used by the strength-based edge-distance check.' },
    Delta_installed: { latex: '\\Delta_{installed}', meaning: 'Installed-state interference in the service envelope.' },
    Delta_hot: { latex: '\\Delta_{hot}', meaning: 'Hot-service interference in the service envelope.' },
    Delta_cold: { latex: '\\Delta_{cold}', meaning: 'Cold-service interference in the service envelope.' },
    Delta_finish: { latex: '\\Delta_{finish}', meaning: 'Finish-reamed interference in the service envelope.' },
    Delta_wear: { latex: '\\Delta_{wear}', meaning: 'Worn-state interference in the service envelope.' },
    a_finish: { latex: 'a_{finish}', meaning: 'Finish-ream allowance removed from the retained interference.' },
    a_wear: { latex: 'a_{wear}', meaning: 'Wear allowance removed from the retained interference.' },
    DeltaT_hot: { latex: '\\Delta T_{hot}', meaning: 'Hot-service temperature change relative to reference.' },
    DeltaT_cold: { latex: '\\Delta T_{cold}', meaning: 'Cold-service temperature change relative to reference.' },
    ID_shift: { latex: '\\mathrm{ID\\ shift}', meaning: 'Projected installed or service-state inside-diameter shift.' },
    ID_free: { latex: 'ID_{free}', meaning: 'Free-state inside diameter before installation.' },
    P_service: { latex: 'P_{service}', meaning: 'Projected service bearing pressure.' },
    F_service: { latex: 'F_{service}', meaning: 'Applied or inferred service load used by the duty screen.' },
    V: { latex: 'V', meaning: 'Sliding velocity used by the PV screen.' },
    f: { latex: 'f', meaning: 'Cycle or rotational frequency.' },
    eta: { latex: '\\eta', meaning: 'Sliding-fraction factor in the duty velocity model.' },
    PV: { latex: 'PV', meaning: 'Pressure-velocity screening product.' },
    PV_limit: { latex: 'PV_{limit}', meaning: 'Derated PV capacity for the current duty state.' },
    PV_base: { latex: 'PV_{base}', meaning: 'Base PV capacity before duty derating factors.' },
    f_contam: { latex: 'f_{contam}', meaning: 'Contamination derating factor.' },
    f_rough: { latex: 'f_{rough}', meaning: 'Surface roughness derating factor.' },
    f_hard: { latex: 'f_{hard}', meaning: 'Counterface hardness derating factor.' },
    f_misalign: { latex: 'f_{misalign}', meaning: 'Misalignment derating factor.' },
    f_temp: { latex: 'f_{temp}', meaning: 'Temperature derating factor.' },
    utilization: { latex: '\\mathrm{utilization}', meaning: 'Ratio of PV demand to PV screening limit.' }
  };
  const eq = (latex: string, keys: string[] = []): EquationEntry => ({
    latex,
    definitions: keys.map((key) => VARIABLE_GLOSSARY[key]).filter(Boolean)
  });

  const housingMat = $derived(getMaterial(form.matHousing));
  const bushingMat = $derived(getMaterial(form.matBushing));
  const route = $derived(getBushingProcessRoute(form.processRouteId));
  const bore = $derived(results.tolerance.bore.nominal);
  const areaProjected = $derived(Math.max(form.boreDia * form.housingLen, 1e-9));
  const serviceLoad = $derived(results.dutyScreen.specificLoadPsi * areaProjected);
  const currentDeltaF = $derived(form.units === 'metric' ? Number(form.dT ?? 0) * 1.8 : Number(form.dT ?? 0));
  const housingAssemblyDeltaF = $derived(absoluteTempToDeltaF(form.assemblyHousingTemperature));
  const bushingAssemblyDeltaF = $derived(absoluteTempToDeltaF(form.assemblyBushingTemperature));
  const assemblyTempsActive = $derived(housingAssemblyDeltaF != null || bushingAssemblyDeltaF != null);
  const edgeAngle = $derived(
    isFiniteNumber(form.edgeLoadAngleDeg) && Number(form.edgeLoadAngleDeg) > 0 ? Number(form.edgeLoadAngleDeg) : 40
  );
  const sinTheta = $derived(Math.sin((Math.abs(edgeAngle) * Math.PI) / 180));
  const tau = $derived((housingMat.Fsu_ksi || housingMat.Sy_ksi || 0) * 1000);
  const fbruEff = $derived((housingMat.Fbru_ksi || housingMat.Sy_ksi || 0) * 1000 + 0.8 * results.physics.contactPressure);
  const strengthLoad = $derived(isFiniteNumber(form.load) && Number(form.load) > 0 ? Number(form.load) : 1000);
  const profile = $derived((
    form.bushingType === 'countersink'
      ? [
          {
            d_top: results.csSolved.od?.dia ?? results.odInstalled,
            d_bottom: results.odInstalled,
            height: Math.min(results.csSolved.od?.depth ?? 0, form.housingLen),
            role: 'parent'
          },
          ...((results.csSolved.od?.depth ?? 0) < form.housingLen
            ? [{ d_top: results.odInstalled, d_bottom: results.odInstalled, height: Math.max(0, form.housingLen - (results.csSolved.od?.depth ?? 0)), role: 'parent' }]
            : [])
        ]
      : [{ d_top: results.odInstalled, d_bottom: results.odInstalled, height: form.housingLen, role: 'parent' }]
  ) as BearingSegment[]);
  const bearingProfile = $derived(calculateUniversalBearing(profile));
  const installBandLowFactor = $derived(
    results.process.installForceBand.nominal > 0 ? results.process.installForceBand.low / results.process.installForceBand.nominal : 0
  );
  const installBandHighFactor = $derived(
    results.process.installForceBand.nominal > 0 ? results.process.installForceBand.high / results.process.installForceBand.nominal : 0
  );
  const removalFactor = $derived(results.physics.retainedInstallForce > 0 ? results.process.removalForce / results.physics.retainedInstallForce : 0);
  const pvBase = $derived(pvBaseFor(form.lubricationMode));
  const pvContam = $derived(contaminationFactor(form.contaminationLevel));
  const pvRoughness = $derived(roughnessFactor(form.surfaceRoughnessRaUm));
  const pvHardness = $derived(hardnessFactor(form.shaftHardnessHrc));
  const pvMisalignment = $derived(misalignmentFactor(form.misalignmentDeg));
  const pvTemp = $derived(temperatureFactor());
  const approvalTriggers = $derived([
    form.criticality !== 'general' ? `criticality = <span class="math-accent">${form.criticality}</span>` : null,
    form.standardsBasis && form.standardsBasis !== 'shop_default'
      ? `basis = <span class="math-accent">${form.standardsBasis}</span>`
      : null,
    results.process.finishMachiningRequired ? 'finish machining required' : null,
    results.dutyScreen.wearRisk !== 'low' ? `wear risk = <span class="math-accent">${results.dutyScreen.wearRisk}</span>` : null,
    results.serviceEnvelope.states.some((state) => state.id !== 'free' && state.fitClass === 'clearance') ? 'service state reaches clearance' : null,
    results.dutyScreen.pvUtilization > 0.75 ? `PV utilization = ${fmtPct(results.dutyScreen.pvUtilization, 0)}` : null
  ].filter(Boolean) as string[]);
  const holdTriggers = $derived([
    results.serviceEnvelope.states.some((state) => state.id !== 'free' && state.fitClass === 'clearance') ? 'service clearance state' : null,
    results.dutyScreen.wearRisk === 'severe' ? 'severe duty risk' : null,
    results.dutyScreen.pvUtilization > 1.25 ? `PV utilization > 125% (${fmtPct(results.dutyScreen.pvUtilization, 0)})` : null
  ].filter(Boolean) as string[]);
  const derivationBlocks = $derived([
    {
      title: '1. Interval Resolution',
      objective:
        'Every fit solve begins by resolving the entered bore and target-interference intervals into explicit lower, upper, and nominal values. The OD band is then back-solved so the achieved interference remains inside the requested window.',
      equations: [
        eq(String.raw`B = [B_L, B_U] = [${latexNumber(results.tolerance.bore.lower, 4)}, ${latexNumber(results.tolerance.bore.upper, 4)}]\,\mathrm{in}`, ['B', 'B_L', 'B_U']),
        eq(String.raw`I_t = [I_L, I_U] = [${latexNumber(results.tolerance.interferenceTarget.lower, 4)}, ${latexNumber(results.tolerance.interferenceTarget.upper, 4)}]\,\mathrm{in}`, ['I_t', 'I_L', 'I_U']),
        eq(String.raw`\mathrm{OD} = [B_U + I_L,\; B_L + I_U] = [${latexNumber(results.tolerance.odBushing.lower, 4)}, ${latexNumber(results.tolerance.odBushing.upper, 4)}]\,\mathrm{in}`, ['OD', 'B_L', 'B_U', 'I_L', 'I_U']),
        eq(String.raw`I_{ach} = [OD_L - B_U,\; OD_U - B_L] = [${latexNumber(results.tolerance.achievedInterference.lower, 4)}, ${latexNumber(results.tolerance.achievedInterference.upper, 4)}]\,\mathrm{in}`, ['I_ach', 'OD_L', 'OD_U', 'B_L', 'B_U'])
      ],
      steps: [
        `Resolved bore mode = <span class="math-accent">${results.tolerance.bore.mode}</span>; resolved OD nominal = ${mathUnit(results.tolerance.odBushing.nominal, 'in', 4)}.`,
        `Achieved interference nominal = ${mathUnit(results.tolerance.achievedInterference.nominal, 'in', 4)}; status = <span class="math-accent">${results.tolerance.status}</span>.`,
        `If the requested window is wider than the bore capability allows, the containment status becomes clamped or infeasible and the note stack records the exact reason code(s).`
      ],
      note:
        results.tolerance.notes.length > 0
          ? `Tolerance notes: ${results.tolerance.notes.map((note) => `<span class="math-label">${note}</span>`).join(' &middot; ')}`
          : 'No tolerance clamp or infeasibility notes are active for the current inputs.'
    },
    {
      title: '2. Strict Containment Logic',
      objective:
        'When interference containment is enabled, the bore band may be tightened so the full achieved interference interval stays inside the requested target interval. The current implementation preserves the entered minimum bore and tightens from the upper side first.',
      equations: [
        eq(String.raw`w_{target} = I_U - I_L = ${latexUnit(results.tolerance.enforcement.targetInterferenceWidth, 'in', 4)}`, ['w_target', 'I_U', 'I_L']),
        eq(String.raw`w_{bore} = B_U - B_L = ${latexUnit(results.tolerance.enforcement.availableBoreTolWidth, 'in', 4)}`, ['w_bore', 'B_U', 'B_L']),
        eq(String.raw`\text{containment} \iff I_{ach,L} \ge I_L \;\text{and}\; I_{ach,U} \le I_U`, ['I_ach', 'I_L', 'I_U'])
      ],
      steps: [
        `Containment enabled = <span class="math-accent">${results.tolerance.enforcement.enabled ? 'true' : 'false'}</span>; satisfied = <span class="math-accent">${results.tolerance.enforcement.satisfied ? 'true' : 'false'}</span>; blocked = <span class="math-accent">${results.tolerance.enforcement.blocked ? 'true' : 'false'}</span>.`,
        `Required bore width for full containment = ${mathUnit(results.tolerance.enforcement.requiredBoreTolWidth, 'in', 4)}; available bore width after any adjustment = ${mathUnit(results.tolerance.enforcement.availableBoreTolWidth, 'in', 4)}.`,
        `Lower / upper violations = ${mathUnit(results.tolerance.enforcement.lowerViolation, 'in', 4)} / ${mathUnit(results.tolerance.enforcement.upperViolation, 'in', 4)}.`
      ],
      note:
        results.tolerance.enforcement.reasonCodes.length > 0
          ? `Reason codes: ${results.tolerance.enforcement.reasonCodes.map((code) => `<span class="math-accent">${code}</span>`).join(' &middot; ')}`
          : 'Containment reason codes are not active for the current state.'
    },
    {
      title: '3. Retained-Fit Thermal Correction',
      objective:
        'The retained fit is the equilibrium fit after the assembly has settled to the current thermal state. The solver adds the user-achieved interference and the current-fit thermal mismatch contribution.',
      equations: [
        eq(String.raw`\Delta_{user} = I_{ach,nom} = ${latexUnit(results.tolerance.achievedInterference.nominal, 'in', 5)}`, ['Delta_user', 'I_ach']),
        eq(String.raw`\Delta_{thermal} = (\alpha_b - \alpha_h) D \Delta T_F = ${latexUnit(results.lame.deltaThermal, 'in', 6)}`, ['Delta_thermal', 'alpha_b', 'alpha_h', 'D']),
        eq(String.raw`\Delta_{retained} = \Delta_{user} + \Delta_{thermal} = ${latexUnit(results.physics.deltaEffective, 'in', 5)}`, ['Delta_retained', 'Delta_user', 'Delta_thermal'])
      ],
      steps: [
        `Current-fit thermal input = ${mathValue(currentDeltaF, 2)} <span class="math-soft">&deg;F solver delta</span>.`,
        `Housing thermal expansion coefficient = ${mathValue(housingMat.alpha_uF, 2)} <span class="math-soft">&micro;strain/&deg;F</span>; bushing coefficient = ${mathValue(bushingMat.alpha_uF, 2)} <span class="math-soft">&micro;strain/&deg;F</span>.`,
        `A positive retained-fit delta produces contact pressure; a zero or negative value collapses the retained pressure branch to zero.`
      ]
    },
    {
      title: '4. Assembly Thermal Assist',
      objective:
        'Assembly thermal assist is now a separate install-state calculation. Heating the housing and cooling the bushing reduce temporary installation interference before the parts return to the retained state after equilibrium.',
      equations: [
        eq(String.raw`\Delta T_{h,assy} = T_{housing,assy} - T_{ref} = ${housingAssemblyDeltaF == null ? String.raw`\text{not entered}` : latexUnit(housingAssemblyDeltaF, 'degF', 2)}`, ['DeltaT_h_assy']),
        eq(String.raw`\Delta T_{b,assy} = T_{bushing,assy} - T_{ref} = ${bushingAssemblyDeltaF == null ? String.raw`\text{not entered}` : latexUnit(bushingAssemblyDeltaF, 'degF', 2)}`, ['DeltaT_b_assy']),
        eq(String.raw`\Delta_{assy} = (\alpha_b D \Delta T_{b,assy}) - (\alpha_h D \Delta T_{h,assy}) = ${latexUnit(results.physics.assemblyThermalDelta, 'in', 6)}`, ['Delta_assy', 'alpha_b', 'alpha_h', 'D', 'DeltaT_b_assy', 'DeltaT_h_assy']),
        eq(String.raw`\Delta_{install} = \Delta_{user} + ${assemblyTempsActive ? String.raw`\Delta_{assy}` : String.raw`\Delta_{thermal}`} = ${latexUnit(results.physics.installDeltaEffective, 'in', 5)}`, ['Delta_install', 'Delta_user', assemblyTempsActive ? 'Delta_assy' : 'Delta_thermal'])
      ],
      steps: [
        `Reference temperature = <span class="math-accent">${refTemp(form.units)}</span> <span class="math-soft">${form.units === 'metric' ? '&deg;C input basis' : '&deg;F input basis'}</span>.`,
        `Assembly temperatures active = <span class="math-accent">${assemblyTempsActive ? 'true' : 'false'}</span>. If false, the install state falls back to the retained thermal delta.`,
        `The install-state pressure and install-state press force are always computed from <span class="math-accent">&Delta;<sub>install</sub></span>, not from the retained equilibrium delta.`
      ],
      note: assemblyTempsActive
        ? 'Entered assembly temperatures are reducing installation interference physically. Removal force still keys off the retained fit after temperatures equalize.'
        : 'No explicit assembly temperatures are entered. The thermal-assist route falls back to route factors only.'
    },
    {
      title: '5. Equivalent Housing + Lamé Compliance',
      objective:
        'The housing side is reduced to an equivalent finite plate ring so the press-fit compatibility can be solved with Lam&eacute;-style compliance terms for the bushing and housing together.',
      equations: [
        eq(String.raw`w_{eff} = \min(W, 2R_{sat}) = ${latexUnit(results.lame.w_eff, 'in', 4)}`, ['w_eff', 'R_sat']),
        eq(String.raw`e_{eff} = \min(e, R_{sat}) = ${latexUnit(results.lame.e_eff, 'in', 4)}`, ['e_eff', 'R_sat']),
        eq(String.raw`D_{eq} = \sqrt{4A_{housing}/\pi + D^2} = ${latexUnit(results.lame.D_equivalent, 'in', 4)}`, ['D_eq', 'A_housing', 'D']),
        eq(String.raw`\lambda = e_{eff}/(D_{eq}/2) = ${latexNumber(results.lame.lambda, 4)},\qquad \psi = 1 + 0.2(1-\lambda) = ${latexNumber(results.lame.psi, 4)}`, ['lambda', 'e_eff', 'D_eq', 'psi_factor']),
        eq(String.raw`T_b = ${latexNumber(results.lame.termB, 9)},\qquad T_h = ${latexNumber(results.lame.termH, 9)}`, ['T_b', 'T_h']),
        eq(String.raw`p_{retained} = \Delta_{retained}/(T_b + T_h) = ${latexUnit(results.physics.contactPressure, 'psi', 2)}`, ['p_retained', 'Delta_retained', 'T_b', 'T_h']),
        eq(String.raw`p_{install} = \Delta_{install}/(T_b + T_h) = ${latexUnit(results.physics.installContactPressure, 'psi', 2)}`, ['p_install', 'Delta_install', 'T_b', 'T_h'])
      ],
      steps: [
        `The solver uses internal base units of <span class="math-accent">in, psi, lbf</span> even when the front-end displays metric conversions elsewhere.`,
        `Housing effective width / edge distance saturation active = <span class="math-accent">${results.geometry.isSaturationActive ? 'true' : 'false'}</span>.`,
        `If either retained or install delta is non-positive, the corresponding contact-pressure branch is forced to zero.`
      ],
      note: 'The same compliance kernel is reused for both retained equilibrium pressure and temporary install-state pressure; only the active interference term changes.'
    },
    {
      title: '6. Lamé Thick-Wall Stress Derivation',
      objective:
        'Once contact pressure is known, the solver evaluates the classic Lamé thick-wall cylinder field through each ring. This section now follows that result the way it would be derived by hand: radial equilibrium, assumed functional form, boundary conditions, constant solve, then substitution into radial, hoop, and axial stress.',
      equations: [
        eq(String.raw`\frac{d\sigma_r}{dr} + \frac{\sigma_r - \sigma_\theta}{r} = 0`, ['sigma_r', 'sigma_theta', 'r']),
        eq(String.raw`\sigma_r(r) = C_1 - \frac{C_2}{r^2},\qquad \sigma_\theta(r) = C_1 + \frac{C_2}{r^2}`, ['sigma_r', 'sigma_theta', 'C_1', 'C_2', 'r']),
        eq(String.raw`\sigma_r(a) = -p_i,\qquad \sigma_r(b) = -p_o`, ['sigma_r', 'a', 'b', 'p_i', 'p_o']),
        eq(String.raw`C_1 = \frac{a^2 p_i - b^2 p_o}{b^2 - a^2},\qquad C_2 = \frac{a^2 b^2 (p_i - p_o)}{b^2 - a^2}`, ['C_1', 'C_2', 'a', 'b', 'p_i', 'p_o']),
        eq(String.raw`\sigma_r(r) = \left(\frac{a^2 p_i - b^2 p_o}{b^2 - a^2}\right) - \left(\frac{a^2 b^2 (p_i - p_o)}{(b^2-a^2)r^2}\right)`, ['sigma_r', 'a', 'b', 'p_i', 'p_o', 'r', 'C_1', 'C_2']),
        eq(String.raw`\sigma_\theta(r) = \left(\frac{a^2 p_i - b^2 p_o}{b^2 - a^2}\right) + \left(\frac{a^2 b^2 (p_i - p_o)}{(b^2-a^2)r^2}\right)`, ['sigma_theta', 'a', 'b', 'p_i', 'p_o', 'r', 'C_1', 'C_2']),
        eq(String.raw`\sigma_z(r) = k_{constraint}\,k_{length}\,\nu\left(\sigma_r(r) + \sigma_\theta(r)\right) = 2\,k_{constraint}\,k_{length}\,\nu\,C_1`, ['sigma_z', 'k_constraint', 'k_length', 'nu', 'sigma_r', 'sigma_theta', 'C_1'])
      ],
      steps: [
        `Start with axisymmetric radial equilibrium for a thick ring with no body force. That gives the differential relation in Eq. <span class="math-accent">(6.1)</span>.`,
        `Assume the Lamé trial form of Eq. <span class="math-accent">(6.2)</span>. Differentiating <span class="math-accent">&sigma;<sub>r</sub>(r)</span> and substituting into Eq. <span class="math-accent">(6.1)</span> recovers <span class="math-accent">&sigma;<sub>&theta;</sub>(r)</span> with the equal-and-opposite <span class="math-accent">C<sub>2</sub>/r<sup>2</sup></span> term.`,
        `Apply the physical boundary conditions in Eq. <span class="math-accent">(6.3)</span>: radial stress at the inner surface equals the negative applied inner pressure, and radial stress at the outer surface equals the negative applied outer pressure.`,
        `Solve the two simultaneous boundary equations for <span class="math-accent">C<sub>1</sub></span> and <span class="math-accent">C<sub>2</sub></span>. That yields Eq. <span class="math-accent">(6.4)</span>, which is the constant pair used by the code path in <span class="math-accent">buildLameRegionField(...)</span>.`,
        `Substitute <span class="math-accent">C<sub>1</sub></span> and <span class="math-accent">C<sub>2</sub></span> back into the trial form to get the explicit radial and hoop fields in Eqs. <span class="math-accent">(6.5)</span> and <span class="math-accent">(6.6)</span>.`,
        `The app then adds the axial model of Eq. <span class="math-accent">(6.7)</span> using the current constraint scales: k<sub>constraint</sub> = ${mathValue(results.physics.axialConstraintFactor, 3)}, k<sub>length</sub> = ${mathValue(results.physics.axialLengthFactor, 3)}.`,
        `Current housing hoop / axial stress = ${mathUnit(results.physics.stressHoopHousing, 'psi', 2)} / ${mathUnit(results.physics.stressAxialHousing, 'psi', 2)}. Current bushing hoop / axial stress = ${mathUnit(results.physics.stressHoopBushing, 'psi', 2)} / ${mathUnit(results.physics.stressAxialBushing, 'psi', 2)}.`
      ],
      note: 'This section is more precisely a Lamé thick-wall cylinder derivation than a generic “stress field.” For the bushing ring the boundary set is p_i = 0 and p_o = p; for the housing ring it is p_i = p and p_o = 0. Radial pressure is compressive, so the boundary radial stress is negative under a positive contact pressure input.'
    },
    {
      title: '7. Forces + Margins',
      objective:
        'Installation force uses the install-state contact pressure. Removal force uses the retained fit after equilibrium. Yield margins stay tied to retained stresses, not the temporary install assist state.',
      equations: [
        eq(String.raw`F_{install} = \mu\,p_{install}\,\pi D L = ${latexUnit(results.physics.installForce, 'lbf', 1)}`, ['F_install', 'mu', 'p_install', 'D', 'L']),
        eq(String.raw`F_{retained} = \mu\,p_{retained}\,\pi D L = ${latexUnit(results.physics.retainedInstallForce, 'lbf', 1)}`, ['F_retained', 'mu', 'p_retained', 'D', 'L']),
        eq(String.raw`F_{band} = [k_{low}, k_{high}]\,F_{install} = [${latexUnit(results.process.installForceBand.low, 'lbf', 0)}, ${latexUnit(results.process.installForceBand.high, 'lbf', 0)}]`, ['F_band', 'k_low', 'k_high', 'F_install']),
        eq(String.raw`F_{remove} = k_{remove}\,F_{retained} = ${latexUnit(results.process.removalForce, 'lbf', 0)}`, ['F_remove', 'k_remove', 'F_retained']),
        eq(String.raw`\mathrm{MS} = \frac{\mathrm{allowable}}{\mathrm{demand}} - 1,\qquad \mathrm{MS}_{housing} = ${latexNumber(results.physics.marginHousing, 3)},\quad \mathrm{MS}_{bushing} = ${latexNumber(results.physics.marginBushing, 3)}`, ['MS'])
      ],
      steps: [
        `Friction coefficient = ${mathValue(form.friction, 3)}.`,
        `Install band factors actually applied = [${mathValue(installBandLowFactor, 3)}, ${mathValue(installBandHighFactor, 3)}].`,
        `Removal factor actually applied = ${mathValue(removalFactor, 3)}.`
      ],
      note: 'The thermal-assist route no longer reduces removal force directly. It only reduces installation force if explicit assembly temperatures are entered or if the route band is being used as a planning proxy.'
    },
    {
      title: '8. Countersink Parameter Conversions',
      objective:
        'When internal or external countersinks are active, the solver converts between diameter, depth, and included angle using the active parameterization. These relations are always solved from the current base diameter.',
      equations: [
        eq(String.raw`D = D_{base} + 2h\tan(\theta/2)\qquad \text{(depth-angle mode)}`, ['D', 'D_base', 'h', 'theta']),
        eq(String.raw`h = \frac{D - D_{base}}{2\tan(\theta/2)}\qquad \text{(dia-angle mode)}`, ['h', 'D', 'D_base', 'theta']),
        eq(String.raw`\theta = 2\arctan\!\left(\frac{D - D_{base}}{2h}\right)\qquad \text{(dia-depth mode)}`, ['theta', 'D', 'D_base', 'h'])
      ],
      steps: [
        `Current internal countersink solution = dia ${mathUnit(results.geometry.csInternal.dia, 'in', 4)}, depth ${mathUnit(results.geometry.csInternal.depth, 'in', 4)}, angle ${mathUnit(results.geometry.csInternal.angleDeg, '&deg;', 2)}.`,
        `Current external countersink solution = dia ${mathUnit(results.geometry.csExternal.dia, 'in', 4)}, depth ${mathUnit(results.geometry.csExternal.depth, 'in', 4)}, angle ${mathUnit(results.geometry.csExternal.angleDeg, '&deg;', 2)}.`,
        `Active profile modes: internal = <span class="math-accent">${form.idType}</span>, external = <span class="math-accent">${form.bushingType}</span>.`
      ],
      note: 'If a countersink geometry becomes invalid under the selected mode, the solver emits an explicit geometry warning instead of silently forcing a feasible shape.'
    },
    {
      title: '9. Edge Distance + Wall Checks',
      objective:
        'Geometry acceptance is evaluated independently of stress margins. The governing geometry result is the lowest margin from sequence edge distance, strength edge distance, straight wall, and neck wall.',
      equations: [
        eq(String.raw`\left(\frac{e}{D}\right)_{actual} = \frac{e}{D} = ${latexNumber(results.edgeDistance.edActual, 4)}`, ['e_over_D_actual', 'D']),
        eq(String.raw`F_{bru,eff} = F_{bru} + 0.8\,p_{retained} = ${latexUnit(fbruEff, 'psi', 1)}`, ['F_bru_eff', 'p_retained']),
        eq(String.raw`e_{req,seq} = \frac{D\,F_{bru,eff}}{2\tau\sin(\theta)} = ${latexUnit(results.hoop.edRequiredLigament, 'in', 4)}`, ['e_req_seq', 'D', 'F_bru_eff', 'tau', 'theta']),
        eq(String.raw`\left(\frac{e}{D}\right)_{min,seq} = \frac{e_{req,seq}}{D} = ${latexNumber(results.edgeDistance.edMinSequence, 4)}`, ['e_over_D_min_seq', 'e_req_seq', 'D']),
        eq(String.raw`e_{req,str} = \frac{P}{2\,t_{eff,seq}\,\tau\sin(\theta)} = ${isFiniteNumber(results.edgeDistance.edMinStrength) ? latexUnit(results.edgeDistance.edMinStrength * bore, 'in', 4) : String.raw`\text{not evaluated}`}`, ['e_req_str', 'P', 't_eff_seq', 'tau', 'theta']),
        eq(String.raw`\left(\frac{e}{D}\right)_{min,str} = \frac{e_{req,str}}{D} = ${isFiniteNumber(results.edgeDistance.edMinStrength) ? latexNumber(results.edgeDistance.edMinStrength, 4) : String.raw`\text{not evaluated}`}`, ['e_over_D_min_str', 'e_req_str', 'D']),
        eq(String.raw`t_{wall,straight} = \frac{OD - ID}{2} = ${latexUnit(results.geometry.wallStraight, 'in', 4)}`, ['t_wall_straight', 'OD'])
      ],
      steps: [
        `Effective sequence thickness from the current profile = ${mathUnit(bearingProfile.t_eff_sequence, 'in', 4)}.`,
        `Shear allowable \u03c4 = ${mathUnit(tau, 'psi', 1)}; edge angle = ${mathUnit(edgeAngle, '&deg;', 2)}; sin(\u03b8) = ${mathValue(sinTheta, 5)}.`,
        `Wall straight / neck = ${mathUnit(results.geometry.wallStraight, 'in', 4)} / ${mathUnit(results.geometry.wallNeck, 'in', 4)}; governing geometry mode = <span class="math-accent">${results.edgeDistance.governing}</span>.`
      ],
      note: 'A geometry margin can govern even when housing and bushing yield margins are positive. That is intentional; geometry checks are independent acceptance criteria.'
    },
    {
      title: '10. Service Envelope',
      objective:
        'The service envelope walks the fit through installed, hot, cold, finish-reamed, and worn states. Each state starts from the retained equilibrium fit and then applies the corresponding state correction.',
      equations: [
        eq(String.raw`\Delta_{installed} = \Delta_{retained}`, ['Delta_installed', 'Delta_retained']),
        eq(String.raw`\Delta_{hot} = \Delta_{retained} + (\alpha_b - \alpha_h)\,D\,\Delta T_{hot}`, ['Delta_hot', 'Delta_retained', 'alpha_b', 'alpha_h', 'D', 'DeltaT_hot']),
        eq(String.raw`\Delta_{cold} = \Delta_{retained} + (\alpha_b - \alpha_h)\,D\,\Delta T_{cold}`, ['Delta_cold', 'Delta_retained', 'alpha_b', 'alpha_h', 'D', 'DeltaT_cold']),
        eq(String.raw`\Delta_{finish} = \Delta_{retained} - a_{finish},\qquad \Delta_{wear} = \Delta_{retained} - a_{wear}`, ['Delta_finish', 'Delta_wear', 'Delta_retained', 'a_finish', 'a_wear']),
        eq(String.raw`\mathrm{ID\ shift} = \operatorname{clamp}\!\left(0.3\max(\Delta,0) + \frac{p}{20{,}000{,}000},\,0,\,0.08\,ID_{free}\right) - \mathrm{allowance}`, ['ID_shift', 'Delta', 'p', 'ID_free']),
        eq(fitClassRuleLatex, ['Delta'])
      ],
      steps: results.serviceEnvelope.states.map(
        (state) =>
          `<span class="math-accent">${state.label}</span>: effective interference ${mathUnit(state.effectiveInterference, 'in', 5)}, projected ID ${mathUnit(state.projectedId, 'in', 5)}, fit class <span class="math-accent">${state.fitClass}</span>.`
      ),
      note: `The governing service state is <span class="math-accent">${results.serviceEnvelope.governingStateLabel}</span>. This is the state the approval logic treats as controlling for fit acceptability.`
    },
    {
      title: '11. Duty Screen',
      objective:
        'The duty screen is a deterministic wear-risk screen. It projects service bearing load, sliding speed, PV, and derated PV capacity using lubrication, contamination, surface finish, hardness, misalignment, and temperature factors.',
      equations: [
        eq(String.raw`P_{service} = \frac{F_{service}}{D\,L} = ${latexUnit(results.dutyScreen.specificLoadPsi, 'psi', 1)}`, ['P_service', 'F_service', 'D', 'L']),
        eq(String.raw`F_{service} = ${isFiniteNumber(form.load) && Number(form.load) > 0 ? `${latexUnit(form.load, 'lbf', 1)}\quad \\text{(user input)}` : `${latexUnit(serviceLoad, 'lbf', 1)}\quad \\text{(0.25 pDL fallback)}`}`, ['F_service']),
        eq(String.raw`${form.loadSpectrum === 'static' ? 'V = 0' : form.loadSpectrum === 'rotating' ? 'V = \\pi D f \\eta' : 'V = D\\,\\theta_{rad}\\,f\\,\\eta'} = ${latexUnit(results.dutyScreen.slidingVelocityMps, 'm/s', 5)} = ${latexUnit(results.dutyScreen.slidingVelocityMps * MPS_TO_FPS, 'ft/s', 5)}`, ['V', 'D', 'theta']),
        eq(String.raw`PV = P_{service}V = ${latexUnit(results.dutyScreen.pv, 'psi*m/s', 4)} = ${latexUnit(results.dutyScreen.pv * MPS_TO_FPS, 'psi*ft/s', 2)}`, ['PV', 'P_service', 'V']),
        eq(String.raw`PV_{limit} = PV_{base}\,f_{contam}\,f_{rough}\,f_{hard}\,f_{misalign}\,f_{temp} = ${latexUnit(results.dutyScreen.pvLimit, 'psi*m/s', 4)}`, ['PV_limit', 'PV_base', 'f_contam', 'f_rough', 'f_hard', 'f_misalign', 'f_temp']),
        eq(String.raw`\mathrm{utilization} = \frac{PV}{PV_{limit}} = ${latexNumber(results.dutyScreen.pvUtilization, 3)} = ${latexNumber(results.dutyScreen.pvUtilization * 100, 0)}\%`, ['utilization', 'PV', 'PV_limit'])
      ],
      steps: [
        `PV base = ${mathValue(pvBase, 3)}, contamination factor = ${mathValue(pvContam, 3)}, roughness factor = ${mathValue(pvRoughness, 3)}.`,
        `Hardness factor = ${mathValue(pvHardness, 3)}, misalignment factor = ${mathValue(pvMisalignment, 3)}, temperature factor = ${mathValue(pvTemp, 3)}.`,
        `Risk score = ${mathValue(results.dutyScreen.riskScore, 1)}; wear risk = <span class="math-accent">${results.dutyScreen.wearRisk}</span>; life estimate = ${
          results.dutyScreen.lifeEstimateHours == null ? '<span class="math-label">n/a</span>' : mathUnit(results.dutyScreen.lifeEstimateHours, 'h', 0)
        }.`
      ],
      note:
        'The solver kernel computes velocity in m/s internally and converts it for display in the review panel. This duty screen is a screening model, not a certification life method.'
    },
    {
      title: '12. Process + Approval Decision',
      objective:
        'The process review converts route selection into finish targets, install / removal scaling, and traceability requirements. Approval then evaluates whether the case is pass, review, or hold.',
      equations: [
        eq(String.raw`F_{band} = [k_{low}, k_{high}]\,F_{install},\qquad [k_{low}, k_{high}] = [${latexNumber(installBandLowFactor, 3)}, ${latexNumber(installBandHighFactor, 3)}]`, ['F_band', 'k_low', 'k_high', 'F_install']),
        eq(String.raw`F_{remove} = k_{remove}\,F_{retained},\qquad k_{remove} = ${latexNumber(removalFactor, 3)}`, ['F_remove', 'k_remove', 'F_retained']),
        eq(String.raw`\text{approval required} \iff \text{criticality} \ne \text{general} \lor \text{basis} \ne \text{shop} \lor \text{finish machining} \lor \text{wear risk} \ne \text{low} \lor \text{service clearance} \lor PV_{util} > 0.75`),
        eq(String.raw`\text{decision} = \text{hold if service clearance} \lor \text{severe duty risk} \lor PV_{util} > 1.25;\ \text{otherwise review if approval required;\ otherwise pass}`)
      ],
      steps: [
        `Selected route = <span class="math-accent">${route.label}</span>; tolerance class = <span class="math-accent">${results.process.toleranceClass}</span>.`,
        `Finish target = Ra ${mathUnit(results.process.recommendedRaUm, '&micro;m', 2)} (${mathUnit(results.process.recommendedRaUm * UM_TO_UIN, 'uin', 0)}), roundness = ${mathUnit(results.process.roundnessTargetUm, '&micro;m', 1)}.`,
        `Approval triggers active: ${
          approvalTriggers.length ? approvalTriggers.join(' &middot; ') : '<span class="math-label">none</span>'
        }.`
      ],
      note:
        holdTriggers.length > 0
          ? `Hold triggers currently active: ${holdTriggers.join(' &middot; ')}`
          : `Current review decision = <span class="math-accent">${results.review.decision}</span>. No hold trigger is active; the case is being escalated by review requirements rather than outright invalidity.`
    }
  ] satisfies DerivationBlock[]);

  const symbolRows = $derived([
    ['B', 'Resolved bore interval'],
    ['I_t', 'Target interference interval'],
    ['I_{ach}', 'Achieved interference interval after OD solve'],
    ['\\Delta', 'Effective diametral interference used by the pressure solve'],
    ['D_{eq}', 'Equivalent finite-plate housing diameter'],
    ['T_b,\\,T_h', 'Bushing and housing Lamé compliance terms'],
    ['p', 'Contact pressure'],
    ['e/D', 'Normalized edge distance'],
    ['t_{eff,seq}', 'Effective sequence thickness from the active profile'],
    ['P_{service}', 'Projected bearing load per unit area'],
    ['PV', 'Pressure-velocity screening product'],
    ['MS', 'Margin of safety = allowable / demand - 1']
  ]);

  const assumptionRows = $derived([
    'Press-fit contact pressure is solved with Lamé-style compatibility using the equivalent finite-plate housing reduction.',
    'Install-state force uses the temporary assembly interference; retained-state margins and removal basis use the settled equilibrium fit.',
    'The duty screen is a deterministic engineering screen for wear risk, not a certification life prediction.',
    'Geometry acceptance, stress margins, service-envelope fit state, and approval routing are independent gates.'
  ]);
  const liveLameEquations = $derived([
    { tag: '6.1', ...eq(String.raw`\sigma_r(r) = \left(\frac{a^2 p_i - b^2 p_o}{b^2 - a^2}\right) - \left(\frac{a^2 b^2 (p_i - p_o)}{(b^2-a^2)r^2}\right)`, ['sigma_r', 'a', 'b', 'p_i', 'p_o', 'r']) },
    { tag: '6.2', ...eq(String.raw`\sigma_\theta(r) = \left(\frac{a^2 p_i - b^2 p_o}{b^2 - a^2}\right) + \left(\frac{a^2 b^2 (p_i - p_o)}{(b^2-a^2)r^2}\right)`, ['sigma_theta', 'a', 'b', 'p_i', 'p_o', 'r']) },
    { tag: '6.3', ...eq(String.raw`\sigma_z(r) = k_{constraint}\,k_{length}\,\nu\left(\sigma_r(r) + \sigma_\theta(r)\right)`, ['sigma_z', 'k_constraint', 'k_length', 'nu', 'sigma_r', 'sigma_theta']) },
    { tag: '6.4', ...eq(String.raw`k_{constraint} = ${latexNumber(results.physics.axialConstraintFactor, 3)},\qquad k_{length} = ${latexNumber(results.physics.axialLengthFactor, 3)}`, ['k_constraint', 'k_length']) }
  ]);
  const formulaLatexById: Record<string, { latex: string; keys?: string[] }> = {
    thermal_delta_interference: {
      latex: String.raw`\Delta_{thermal} = (\alpha_b - \alpha_h)\,D\,\Delta T_F`,
      keys: ['Delta_thermal', 'alpha_b', 'alpha_h', 'D']
    },
    installed_outer_diameter: {
      latex: String.raw`OD_{installed} = D + \Delta`,
      keys: ['OD', 'D', 'Delta']
    },
    contact_pressure: {
      latex: String.raw`p = \frac{\Delta}{T_b + T_h},\qquad \Delta > 0`,
      keys: ['p', 'Delta', 'T_b', 'T_h']
    },
    hoop_stress_housing: {
      latex: String.raw`\sigma_h = p\left(\frac{D^2 + d^2}{D^2 - d^2}\right)`,
      keys: ['sigma_h', 'p', 'D', 'd']
    },
    hoop_stress_bushing: {
      latex: String.raw`\sigma_b = -p\left(\frac{d_o^2 + d_i^2}{d_o^2 - d_i^2}\right)`,
      keys: ['sigma_b', 'p', 'd_o', 'd_i']
    },
    install_force: {
      latex: String.raw`F_{install} = \mu\,p\,\pi D L`,
      keys: ['F_install', 'mu', 'p', 'D', 'L']
    },
    margin_of_safety: {
      latex: String.raw`\mathrm{MS} = \frac{\mathrm{allowable}}{\mathrm{demand}} - 1`,
      keys: ['MS']
    }
  };
  const formulaProvenanceEntries = $derived(
    BUSHING_FORMULA_INVENTORY.map((formula) => ({
      ...formula,
      latex: formulaLatexById[formula.id]?.latex ?? String.raw`\text{${formula.expression.replace(/\\/g, '\\\\').replace(/_/g, '\\_')}}`,
      definitions: (formulaLatexById[formula.id]?.keys ?? []).map((key) => VARIABLE_GLOSSARY[key]).filter(Boolean),
      unitLatex:
        formula.units === 'dimensionless'
          ? String.raw`\text{dimensionless}`
          : latexUnitLabel(formula.units === 'μm' ? 'um' : formula.units)
    }))
  );
  let activeSection = $state<InfoSectionId>('overview');
  const sectionTabs: Array<{ id: InfoSectionId; label: string; detail: string }> = [
    { id: 'overview', label: 'Overview', detail: 'Legend, live field, and report assumptions.' },
    { id: 'fit', label: 'Fit + Stress', detail: 'Fit, thermal, compliance, stress, and force derivations.' },
    { id: 'service', label: 'Geometry + Review', detail: 'Geometry, service, duty, and approval derivations.' },
    { id: 'appendix', label: 'Appendix', detail: 'Formula provenance and solver source formulas.' }
  ];
  const fitDerivationBlocks = $derived(derivationBlocks.slice(0, 7));
  const serviceDerivationBlocks = $derived(derivationBlocks.slice(7));
  let activeFitBlockTitle = $state('1. Interval Resolution');
  let activeServiceBlockTitle = $state('8. Countersink Parameter Conversions');
  const activeFitBlock = $derived(
    fitDerivationBlocks.find((block) => block.title === activeFitBlockTitle) ?? fitDerivationBlocks[0]
  );
  const activeServiceBlock = $derived(
    serviceDerivationBlocks.find((block) => block.title === activeServiceBlockTitle) ?? serviceDerivationBlocks[0]
  );

  $effect(() => {
    if (!fitDerivationBlocks.some((block) => block.title === activeFitBlockTitle) && fitDerivationBlocks[0]) {
      activeFitBlockTitle = fitDerivationBlocks[0].title;
    }
  });

  $effect(() => {
    if (!serviceDerivationBlocks.some((block) => block.title === activeServiceBlockTitle) && serviceDerivationBlocks[0]) {
      activeServiceBlockTitle = serviceDerivationBlocks[0].title;
    }
  });
</script>

<div class="min-h-screen space-y-5 p-4 bushing-info-sheet">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 class="text-xl font-semibold text-white">Bushing Engineering Derivation Atlas</h2>
      <div class="mt-1 text-sm text-white/65">
        Live derivations for the current case, rendered in solver base units of <span class="text-cyan-100">in, psi, lbf</span>.
      </div>
    </div>
    <button class="rounded-md border border-cyan-300/40 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-500/20" onclick={onBack}>
      Back To Main View
    </button>
  </div>

  <div class="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
    <Card class="glass-card border-cyan-400/25">
      <CardHeader class="pb-2">
        <CardTitle class="text-sm text-cyan-100">Scope + Legend</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3 text-sm text-white/85">
        <p>
          This page expands the bushing solve into the same intermediate quantities used by the solver: tolerance resolution,
          retained-fit and install-fit interference, Lam&eacute; compliance, stresses, geometry checks, service-state screening,
          duty screening, and approval routing.
        </p>
        <div class="rounded-xl border border-white/10 bg-black/25 p-3">
          <div class="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-100/78">Symbol Legend</div>
          <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {#each symbolRows as [symbol, meaning] (`${symbol}-${meaning}`)}
              <div class="rounded-lg border border-white/8 bg-slate-950/35 px-3 py-2 text-[12px] text-white/74">
                <span class="text-cyan-100"><BushingLatex latex={symbol} displayMode={false} /></span>
                <span class="ml-2">{meaning}</span>
              </div>
            {/each}
          </div>
        </div>
        <div class="rounded-xl border border-amber-300/18 bg-amber-500/8 p-3 text-[12px] leading-relaxed text-amber-100/82">
          The review panels elsewhere in the toolbox may convert outputs for readability, but the derivations shown here stay in solver-base units so each substitution line remains traceable back to the implementation.
        </div>
      </CardContent>
    </Card>

    <Card class="glass-card border-cyan-300/20">
      <CardHeader class="pb-2">
        <CardTitle class="text-sm text-cyan-100">Live Lamé Thick-Wall Field</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3 text-sm text-white/85">
        <div class="rounded-xl border border-white/10 bg-black/25 p-3">
          <div class="space-y-2 rounded-lg border border-white/8 bg-white/[0.02] p-3">
            {#each liveLameEquations as equation (`live-${equation.tag}`)}
              <BushingLatex latex={equation.latex} definitions={equation.definitions ?? []} tag={equation.tag} />
            {/each}
          </div>
        </div>
        <BushingLameStressPlot field={results.lame.field} />
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 text-[12px]">
          <div class="rounded-xl border border-white/10 bg-black/25 p-3">
            <div class="font-semibold text-emerald-200">Bushing boundary values</div>
            <div class="mt-2 space-y-2">
              <BushingLatex latex={String.raw`\max |\sigma_\theta| = ${latexUnit(results.lame.field.bushing.boundary.maxAbsHoop, 'psi', 2)}\ \text{at}\ r = ${latexUnit(results.lame.field.bushing.boundary.maxAbsHoopAt, 'in', 4)}`} definitions={[VARIABLE_GLOSSARY.sigma_theta, VARIABLE_GLOSSARY.r]} />
              <BushingLatex latex={String.raw`\max |\sigma_z| = ${latexUnit(results.lame.field.bushing.boundary.maxAbsAxial, 'psi', 2)}\ \text{at}\ r = ${latexUnit(results.lame.field.bushing.boundary.maxAbsAxialAt, 'in', 4)}`} definitions={[VARIABLE_GLOSSARY.sigma_z, VARIABLE_GLOSSARY.r]} />
              <BushingLatex latex={String.raw`\sigma_r(\text{inner}/\text{outer}) = ${latexUnit(results.lame.field.bushing.boundary.sigmaRInner, 'psi', 2)}\ /\ ${latexUnit(results.lame.field.bushing.boundary.sigmaROuter, 'psi', 2)}`} definitions={[VARIABLE_GLOSSARY.sigma_r]} />
            </div>
          </div>
          <div class="rounded-xl border border-white/10 bg-black/25 p-3">
            <div class="font-semibold text-blue-200">Housing boundary values</div>
            <div class="mt-2 space-y-2">
              <BushingLatex latex={String.raw`\max |\sigma_\theta| = ${latexUnit(results.lame.field.housing.boundary.maxAbsHoop, 'psi', 2)}\ \text{at}\ r = ${latexUnit(results.lame.field.housing.boundary.maxAbsHoopAt, 'in', 4)}`} definitions={[VARIABLE_GLOSSARY.sigma_theta, VARIABLE_GLOSSARY.r]} />
              <BushingLatex latex={String.raw`\max |\sigma_z| = ${latexUnit(results.lame.field.housing.boundary.maxAbsAxial, 'psi', 2)}\ \text{at}\ r = ${latexUnit(results.lame.field.housing.boundary.maxAbsAxialAt, 'in', 4)}`} definitions={[VARIABLE_GLOSSARY.sigma_z, VARIABLE_GLOSSARY.r]} />
              <BushingLatex latex={String.raw`\sigma_r(\text{inner}/\text{outer}) = ${latexUnit(results.lame.field.housing.boundary.sigmaRInner, 'psi', 2)}\ /\ ${latexUnit(results.lame.field.housing.boundary.sigmaROuter, 'psi', 2)}`} definitions={[VARIABLE_GLOSSARY.sigma_r]} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>

  <Card class="glass-card border-indigo-300/20">
    <CardHeader class="pb-2">
      <CardTitle class="text-sm text-indigo-100">Derivation Navigator</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="grid grid-cols-1 gap-2 lg:grid-cols-4">
        {#each sectionTabs as tab (tab.id)}
          <button
            type="button"
            class={`rounded-2xl border px-3 py-3 text-left transition-colors ${
              activeSection === tab.id
                ? 'border-cyan-300/30 bg-cyan-500/10 text-cyan-100'
                : 'border-white/10 bg-black/20 text-white/72 hover:bg-white/[0.05]'
            }`}
            onclick={() => (activeSection = tab.id)}
          >
            <div class="text-[10px] font-semibold uppercase tracking-[0.18em]">{tab.label}</div>
            <div class="mt-1 text-[10px] leading-relaxed opacity-78">{tab.detail}</div>
          </button>
        {/each}
      </div>

      {#if activeSection === 'overview'}
        <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card class="glass-card border-sky-300/18">
            <CardHeader class="pb-2">
              <CardTitle class="text-sm text-sky-100">Assumption Register</CardTitle>
            </CardHeader>
            <CardContent class="space-y-2 text-sm text-white/82">
              {#each assumptionRows as assumption, index (`assumption-${index}`)}
                <div class="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
                  <span class="mr-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-sky-300/20 bg-sky-500/10 px-1 text-[10px] font-semibold text-sky-100/82">
                    A{index + 1}
                  </span>
                  <span>{assumption}</span>
                </div>
              {/each}
            </CardContent>
          </Card>

          <Card class="glass-card border-violet-300/18">
            <CardHeader class="pb-2">
              <CardTitle class="text-sm text-violet-100">Report Conventions</CardTitle>
            </CardHeader>
            <CardContent class="space-y-3 text-sm text-white/82">
              <div class="rounded-xl border border-white/8 bg-black/20 p-3">
                Equations are numbered by section, for example <span class="text-cyan-100">(5.3)</span>, so the derivation text can refer to them like a formal engineering calculation package.
              </div>
              <div class="rounded-xl border border-white/8 bg-black/20 p-3">
                The atlas now mounts one major section at a time to keep the Information view responsive instead of rendering every derivation and provenance card in one pass.
              </div>
              <div class="rounded-xl border border-white/8 bg-black/20 p-3">
                Print output is tuned for monochrome report readability: dark UI chrome drops away and the derivation sheets flatten into a paper-style record.
              </div>
            </CardContent>
          </Card>
        </div>
      {:else if activeSection === 'fit'}
        <Card class="glass-card border-indigo-300/20">
          <CardHeader class="pb-2">
            <CardTitle class="text-sm text-indigo-100">Fit + Stress Derivations</CardTitle>
          </CardHeader>
          <CardContent class="grid grid-cols-1 gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
            <div class="space-y-3">
              <div class="rounded-xl border border-white/10 bg-black/22 p-3 text-[12px] leading-relaxed text-white/74">
                Load one derivation at a time. This keeps the Information view responsive while preserving the full hand-calculation trail.
              </div>
              <div class="space-y-2">
                {#each fitDerivationBlocks as block, index (block.title)}
                  <button
                    type="button"
                    class={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                      activeFitBlockTitle === block.title
                        ? 'border-cyan-300/28 bg-cyan-500/10 text-cyan-100'
                        : 'border-white/10 bg-black/18 text-white/72 hover:bg-white/[0.05]'
                    }`}
                    onclick={() => (activeFitBlockTitle = block.title)}
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <div class="text-[10px] font-semibold uppercase tracking-[0.18em]">
                          {block.title}
                        </div>
                        <div class="mt-1 text-[11px] leading-relaxed opacity-80">{block.objective}</div>
                      </div>
                      <div class="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[10px] font-semibold">
                        {index + 1}
                      </div>
                    </div>
                  </button>
                {/each}
              </div>
            </div>
            {#if activeFitBlock}
              <BushingDerivationBlock
                title={activeFitBlock.title}
                objective={activeFitBlock.objective}
                equations={activeFitBlock.equations}
                steps={activeFitBlock.steps}
                note={activeFitBlock.note ?? ''}
              />
            {/if}
          </CardContent>
        </Card>
      {:else if activeSection === 'service'}
        <Card class="glass-card border-indigo-300/20">
          <CardHeader class="pb-2">
            <CardTitle class="text-sm text-indigo-100">Geometry + Review Derivations</CardTitle>
          </CardHeader>
          <CardContent class="grid grid-cols-1 gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
            <div class="space-y-3">
              <div class="rounded-xl border border-white/10 bg-black/22 p-3 text-[12px] leading-relaxed text-white/74">
                Geometry, service, duty, and approval sections are split into focused sheets so the review content stays fast to navigate instead of rendering every section at once.
              </div>
              <div class="space-y-2">
                {#each serviceDerivationBlocks as block, index (block.title)}
                  <button
                    type="button"
                    class={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                      activeServiceBlockTitle === block.title
                        ? 'border-cyan-300/28 bg-cyan-500/10 text-cyan-100'
                        : 'border-white/10 bg-black/18 text-white/72 hover:bg-white/[0.05]'
                    }`}
                    onclick={() => (activeServiceBlockTitle = block.title)}
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <div class="text-[10px] font-semibold uppercase tracking-[0.18em]">
                          {block.title}
                        </div>
                        <div class="mt-1 text-[11px] leading-relaxed opacity-80">{block.objective}</div>
                      </div>
                      <div class="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[10px] font-semibold">
                        {index + 8}
                      </div>
                    </div>
                  </button>
                {/each}
              </div>
            </div>
            {#if activeServiceBlock}
              <BushingDerivationBlock
                title={activeServiceBlock.title}
                objective={activeServiceBlock.objective}
                equations={activeServiceBlock.equations}
                steps={activeServiceBlock.steps}
                note={activeServiceBlock.note ?? ''}
              />
            {/if}
          </CardContent>
        </Card>
      {:else if activeSection === 'appendix'}
        <Card class="glass-card border-amber-300/25">
          <CardHeader class="pb-2">
            <CardTitle class="text-sm text-amber-100">Formula Provenance</CardTitle>
          </CardHeader>
          <CardContent class="grid grid-cols-1 gap-3 xl:grid-cols-2 text-sm">
            {#each formulaProvenanceEntries as formula (formula.id)}
              <div class="rounded-xl border border-white/10 bg-black/25 p-3">
                <div class="provenance-formula rounded-xl border border-cyan-200/14 px-4 py-3 text-slate-50">
                  <BushingLatex latex={formula.latex} definitions={formula.definitions} tag={formula.id} />
                </div>
                <div class="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px] text-white/64">
                  <div class="text-white/46">Units</div>
                  <div><BushingLatex latex={formula.unitLatex} displayMode={false} /></div>
                  <div class="text-white/46">Note</div>
                  <div>{formula.note}</div>
                  <div class="text-white/46">Location</div>
                  <div class="font-mono text-[10px] text-white/58">{formula.location}</div>
                </div>
              </div>
            {/each}
          </CardContent>
        </Card>
      {/if}
    </CardContent>
  </Card>
</div>

<style>
  .bushing-info-sheet {
    background:
      radial-gradient(circle at top, rgba(56, 189, 248, 0.05), transparent 28%),
      linear-gradient(180deg, rgba(15, 23, 42, 0.22), rgba(15, 23, 42, 0));
  }

  .provenance-formula {
    background:
      linear-gradient(180deg, rgba(22, 32, 49, 0.98), rgba(13, 20, 34, 0.98)),
      radial-gradient(circle at top left, rgba(56, 189, 248, 0.08), transparent 34%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.03),
      0 10px 18px rgba(2, 8, 23, 0.14);
  }

  .provenance-formula :global(.math-render math) {
    font-size: 1.14em;
    font-weight: 500;
    color: rgba(248, 250, 252, 0.98);
  }

  .provenance-formula :global(.math-tag) {
    color: rgba(191, 219, 254, 0.72);
  }

  @media print {
    :global(body) {
      background: #fff;
    }

    .bushing-info-sheet {
      min-height: auto;
      background: #fff;
      color: #0f172a;
      padding: 0;
    }

    .bushing-info-sheet :global(.glass-card) {
      background: #fff;
      border-color: rgba(15, 23, 42, 0.14);
      box-shadow: none;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .bushing-info-sheet :global(.glass-card *),
    .bushing-info-sheet :global(.derivation-card *),
    .bushing-info-sheet :global(.latex-display *) {
      color: #0f172a !important;
    }

    .bushing-info-sheet :global(.derivation-card) {
      background: #fff !important;
      border-color: rgba(15, 23, 42, 0.14) !important;
      box-shadow: none !important;
    }

    .bushing-info-sheet :global(.latex-display) {
      background: rgba(248, 250, 252, 1) !important;
      border-color: rgba(15, 23, 42, 0.14) !important;
      box-shadow: none !important;
    }

    .provenance-formula {
      background: rgba(248, 250, 252, 1) !important;
      border-color: rgba(15, 23, 42, 0.14) !important;
      box-shadow: none !important;
    }
  }
</style>
