import type {
  CreateMlpLabOptions,
  ForwardResult,
  MlpConfigurationPatch,
  MlpDimension,
  MlpLabState,
  MlpPreset,
  MlpSample,
  MlpSettings,
  MlpTrainingRunResult,
  MlpTrainingStopReason,
  MlpTrainingToken,
  MlpTwoDimensionalStage,
  MlpViewState,
  RandomSource,
  RunTrainingOptions,
  TwoDimensionalStageResult,
} from './mlpTypes';

export type {
  CreateMlpLabOptions,
  ForwardResult,
  MlpConfigurationPatch,
  MlpDimension,
  MlpLabState,
  MlpPreset,
  MlpSample,
  MlpSettings,
  MlpTrainingRunResult,
  MlpTrainingStopReason,
  MlpTrainingToken,
  MlpTwoDimensionalStage,
  MlpViewState,
  RandomSource,
  RunTrainingOptions,
  TwoDimensionalStageResult,
} from './mlpTypes';

export const MLP_PRESETS_BY_DIMENSION: Readonly<
  Record<MlpDimension, readonly MlpPreset[]>
> = {
  1: ['linear', 'circle'],
  2: ['blobs', 'linear', 'circle', 'xor'],
  3: [
    'blobs',
    'linear',
    'circle',
    'xor',
    'spiral3d',
    'slabs3d',
    'shell3d',
  ],
};

export const MLP_DEFAULT_SETTINGS: Readonly<
  Record<MlpDimension, Readonly<MlpSettings>>
> = {
  1: { preset: 'linear', sampleCount: 140, noise: 0.1 },
  2: { preset: 'linear', sampleCount: 140, noise: 0.1 },
  3: { preset: 'spiral3d', sampleCount: 140, noise: 0.12 },
};

export const MLP_DEFAULT_HIDDEN: Readonly<
  Record<MlpDimension, readonly number[]>
> = {
  1: [3],
  2: [3],
  3: [6],
};

export const MLP_DEFAULT_VIEW: Readonly<MlpViewState> = {
  zoom: 1,
  panX: 0,
  panY: 0,
  rotX: -0.68,
  rotY: 0.72,
};

const MAX_EPOCHS = 1500;
const ACCURACY_STOP_TARGET = 0.985;
const MIN_ACCURACY_EPOCH = 60;
const DEFAULT_EPOCHS_PER_BATCH = 6;

export function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

export function sigmoid(value: number): number {
  if (value < -40) return 0;
  if (value > 40) return 1;
  return 1 / (1 + Math.exp(-value));
}

export function tanhActivation(value: number): number {
  return Math.tanh(value);
}

export function identityActivation(value: number): number {
  return value;
}

export function randomNormal(random: RandomSource = Math.random): number {
  let u = 0;
  let v = 0;
  let attempts = 0;

  while (u === 0 && attempts < 100) {
    u = random();
    attempts += 1;
  }
  attempts = 0;
  while (v === 0 && attempts < 100) {
    v = random();
    attempts += 1;
  }

  const safeU = clamp(Number.isFinite(u) ? u : 0, Number.EPSILON, 1);
  const safeV = clamp(Number.isFinite(v) ? v : 0, Number.EPSILON, 1);
  return Math.sqrt(-2 * Math.log(safeU)) * Math.cos(2 * Math.PI * safeV);
}

function isDimension(value: unknown): value is MlpDimension {
  return value === 1 || value === 2 || value === 3;
}

function isPreset(value: unknown): value is MlpPreset {
  return (
    value === 'blobs' ||
    value === 'linear' ||
    value === 'circle' ||
    value === 'xor' ||
    value === 'spiral3d' ||
    value === 'slabs3d' ||
    value === 'shell3d'
  );
}

function isPresetForDimension(
  dimension: MlpDimension,
  value: unknown,
): value is MlpPreset {
  return (
    isPreset(value) &&
    MLP_PRESETS_BY_DIMENSION[dimension].includes(value)
  );
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function nullableFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeSampleCount(
  dimension: MlpDimension,
  value: unknown,
  fallback: number,
): number {
  if (dimension === 1) return 140;
  const finite = finiteNumber(value, fallback);
  return clamp(Math.round(finite), 40, 260);
}

function normalizeNoise(
  dimension: MlpDimension,
  value: unknown,
  fallback: number,
): number {
  if (dimension === 1) return 0.1;
  return clamp(finiteNumber(value, fallback), 0, 0.35);
}

function normalizeSettings(
  dimension: MlpDimension,
  value: unknown,
  fallback: MlpSettings = MLP_DEFAULT_SETTINGS[dimension],
): MlpSettings {
  const candidate =
    typeof value === 'object' && value !== null
      ? (value as Partial<MlpSettings>)
      : {};
  return {
    preset: isPresetForDimension(dimension, candidate.preset)
      ? candidate.preset
      : fallback.preset,
    sampleCount: normalizeSampleCount(
      dimension,
      candidate.sampleCount,
      fallback.sampleCount,
    ),
    noise: normalizeNoise(dimension, candidate.noise, fallback.noise),
  };
}

function normalizeHidden(
  dimension: MlpDimension,
  value: unknown,
  fallback: readonly number[] = MLP_DEFAULT_HIDDEN[dimension],
): number[] {
  if (dimension === 1) return [3];
  if (!Array.isArray(value)) return [...fallback];
  return value
    .slice(0, 4)
    .map((units) => clamp(Math.round(finiteNumber(units, 6)), 2, 12));
}

function normalizeSelectedHidden(
  value: unknown,
  hidden: readonly number[],
): number {
  if (hidden.length === 0) return 0;
  return clamp(
    Math.round(finiteNumber(value, 0)),
    0,
    Math.max(0, hidden.length - 1),
  );
}

function nextRunId(
  previousRunId: string | null,
  dimension: MlpDimension,
  configRevision: number,
): string {
  const match = previousRunId?.match(/:run-(\d+)$/);
  const nextRun = match ? Number.parseInt(match[1], 10) + 1 : 0;
  return `mlp-${dimension}:config-${configRevision}:run-${nextRun}`;
}

function copyView(value: MlpViewState): MlpViewState {
  return {
    zoom: value.zoom,
    panX: value.panX,
    panY: value.panY,
    rotX: value.rotX,
    rotY: value.rotY,
  };
}

function copyData(data: readonly MlpSample[]): MlpSample[] {
  return data.map((sample) => ({ x: [...sample.x], y: sample.y }));
}

function copyWeights(W: readonly (readonly (readonly number[])[])[]): number[][][] {
  return W.map((layer) => layer.map((row) => [...row]));
}

function copyBiases(B: readonly (readonly number[])[]): number[][] {
  return B.map((layer) => [...layer]);
}

export function cloneMlpLabState(state: MlpLabState): MlpLabState {
  return {
    dimension: state.dimension,
    data: copyData(state.data),
    settings: { ...state.settings },
    hidden: [...state.hidden],
    selectedHidden: state.selectedHidden,
    useBias: state.useBias,
    useActivation: state.useActivation,
    W: copyWeights(state.W),
    B: copyBiases(state.B),
    sizes: [...state.sizes],
    epoch: state.epoch,
    loss: Number.isFinite(state.loss) ? state.loss : null,
    accuracy: Number.isFinite(state.accuracy) ? state.accuracy : null,
    stage: state.stage,
    trained: state.trained,
    completed: state.completed,
    configRevision: state.configRevision,
    runId: state.runId,
    view: copyView(state.view),
    selectedSampleIndex: state.selectedSampleIndex,
  };
}

function makePoint(
  dimension: MlpDimension,
  settings: MlpSettings,
  index: number,
  random: RandomSource,
): MlpSample {
  let label: 0 | 1 = index < settings.sampleCount / 2 ? 0 : 1;
  let x: number[] = [];

  if (settings.preset === 'linear') {
    for (let j = 0; j < dimension; j += 1) {
      x.push(-0.95 + random() * 1.9);
    }
    const score = x.reduce(
      (sum, value, coordinateIndex) =>
        sum + value * (1 - coordinateIndex * 0.18),
      0,
    );
    label = score + randomNormal(random) * settings.noise > 0 ? 1 : 0;
  } else if (settings.preset === 'xor') {
    for (let j = 0; j < dimension; j += 1) {
      x.push(-0.9 + random() * 1.8);
    }
    if (dimension === 1) label = Math.abs(x[0]) > 0.45 ? 1 : 0;
    if (dimension === 2) label = x[0] * x[1] > 0 ? 1 : 0;
    if (dimension === 3) label = x[0] * x[1] * x[2] > 0 ? 1 : 0;
  } else if (settings.preset === 'spiral3d' && dimension === 3) {
    const t = random() * Math.PI * 3.4 + label * Math.PI;
    const radius = 0.18 + (t / (Math.PI * 3.4)) * 0.72;
    x = [
      Math.cos(t) * radius +
        randomNormal(random) * (0.05 + settings.noise * 0.12),
      Math.sin(t) * radius +
        randomNormal(random) * (0.05 + settings.noise * 0.12),
      (t / (Math.PI * 3.4) - 0.5) * 1.45 +
        randomNormal(random) * (0.06 + settings.noise * 0.12),
    ];
  } else if (settings.preset === 'slabs3d' && dimension === 3) {
    x = [
      -0.95 + random() * 1.9,
      -0.95 + random() * 1.9,
      -0.95 + random() * 1.9,
    ];
    const slab = Math.sin(x[0] * 4.2) + Math.cos(x[1] * 3.6) + x[2] * 1.25;
    label =
      slab + randomNormal(random) * (0.35 + settings.noise * 0.8) > 0
        ? 1
        : 0;
  } else if (settings.preset === 'shell3d' && dimension === 3) {
    const azimuth = random() * Math.PI * 2;
    const polar = Math.acos(2 * random() - 1);
    let radius = label ? 0.74 : 0.38;
    if (random() < 0.32) radius = label ? 0.42 : 0.68;
    radius += randomNormal(random) * (0.045 + settings.noise * 0.16);
    x = [
      Math.sin(polar) * Math.cos(azimuth) * radius,
      Math.sin(polar) * Math.sin(azimuth) * radius,
      Math.cos(polar) * radius,
    ];
    if (x[0] + x[1] * 0.5 > 0.45 && random() < 0.45) {
      label = label === 1 ? 0 : 1;
    }
  } else if (settings.preset === 'circle') {
    if (dimension === 1) {
      x = [-0.95 + random() * 1.9];
      label = Math.abs(x[0]) > 0.48 ? 1 : 0;
    } else if (dimension === 2) {
      const angle = random() * Math.PI * 2;
      let radius = label ? 0.7 : 0.28;
      radius += randomNormal(random) * (0.07 + settings.noise * 0.25);
      x = [Math.cos(angle) * radius, Math.sin(angle) * radius];
    } else {
      const azimuth = random() * Math.PI * 2;
      const polar = Math.acos(2 * random() - 1);
      const radius =
        (label ? 0.72 : 0.28) +
        randomNormal(random) * (0.07 + settings.noise * 0.2);
      x = [
        Math.sin(polar) * Math.cos(azimuth) * radius,
        Math.sin(polar) * Math.sin(azimuth) * radius,
        Math.cos(polar) * radius,
      ];
    }
  } else {
    for (let j = 0; j < dimension; j += 1) {
      const center = label ? 0.36 + j * 0.04 : -0.36 + j * 0.04;
      x.push(center + randomNormal(random) * (0.18 + settings.noise));
    }
  }

  x = x.map((value) =>
    clamp(
      value + randomNormal(random) * settings.noise * 0.08,
      -1.15,
      1.15,
    ),
  );
  return { x, y: label };
}

export function generateMlpData(
  dimension: MlpDimension,
  settings: MlpSettings,
  random: RandomSource = Math.random,
): MlpSample[] {
  const normalizedSettings = normalizeSettings(dimension, settings);
  return Array.from({ length: normalizedSettings.sampleCount }, (_, index) =>
    makePoint(dimension, normalizedSettings, index, random),
  );
}

export function architecture(
  dimension: MlpDimension,
  hidden: readonly number[],
): number[] {
  return [dimension, ...hidden, 1];
}

export function initializeMlpModel(
  dimension: MlpDimension,
  hidden: readonly number[],
  random: RandomSource = Math.random,
): Pick<MlpLabState, 'W' | 'B' | 'sizes'> {
  const sizes = architecture(dimension, hidden);
  const W: number[][][] = [];
  const B: number[][] = [];

  for (let layerIndex = 0; layerIndex < sizes.length - 1; layerIndex += 1) {
    const layer: number[][] = [];
    const bias: number[] = [];
    const scale = Math.sqrt(
      2 / (sizes[layerIndex] + sizes[layerIndex + 1]),
    );
    for (let row = 0; row < sizes[layerIndex + 1]; row += 1) {
      const weights: number[] = [];
      for (let column = 0; column < sizes[layerIndex]; column += 1) {
        weights.push(randomNormal(random) * scale);
      }
      layer.push(weights);
      bias.push(0);
    }
    W.push(layer);
    B.push(bias);
  }

  return { W, B, sizes };
}

export function createMlpLabState(
  dimension: MlpDimension,
  options: CreateMlpLabOptions = {},
): MlpLabState {
  const random = options.random ?? Math.random;
  const defaults = MLP_DEFAULT_SETTINGS[dimension];
  const settings = normalizeSettings(dimension, {
    ...defaults,
    ...options.settings,
  });
  const hidden = normalizeHidden(
    dimension,
    options.hidden,
    MLP_DEFAULT_HIDDEN[dimension],
  );
  const selectedHidden = normalizeSelectedHidden(
    options.selectedHidden,
    hidden,
  );
  const model = initializeMlpModel(dimension, hidden, random);

  return {
    dimension,
    data: generateMlpData(dimension, settings, random),
    settings,
    hidden,
    selectedHidden,
    useBias: options.useBias ?? true,
    useActivation: options.useActivation ?? true,
    ...model,
    epoch: 0,
    loss: null,
    accuracy: null,
    stage: dimension === 2 ? 0 : null,
    trained: false,
    completed: false,
    configRevision: 0,
    runId: nextRunId(null, dimension, 0),
    view: copyView(MLP_DEFAULT_VIEW),
    selectedSampleIndex: null,
  };
}

function isFiniteVector(value: unknown, expectedLength: number): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === expectedLength &&
    value.every((item) => typeof item === 'number' && Number.isFinite(item))
  );
}

function normalizeModel(
  value: Record<string, unknown>,
  expectedSizes: readonly number[],
): Pick<MlpLabState, 'W' | 'B' | 'sizes'> | null {
  const rawSizes = value.sizes;
  const rawW = value.W;
  const rawB = value.B;

  if (
    !Array.isArray(rawSizes) ||
    rawSizes.length !== expectedSizes.length ||
    !rawSizes.every((size, index) => size === expectedSizes[index]) ||
    !Array.isArray(rawW) ||
    !Array.isArray(rawB) ||
    rawW.length !== expectedSizes.length - 1 ||
    rawB.length !== expectedSizes.length - 1
  ) {
    return null;
  }

  const W: number[][][] = [];
  const B: number[][] = [];
  for (let layerIndex = 0; layerIndex < expectedSizes.length - 1; layerIndex += 1) {
    const rawLayer = rawW[layerIndex];
    const rawBias = rawB[layerIndex];
    const outputSize = expectedSizes[layerIndex + 1];
    const inputSize = expectedSizes[layerIndex];
    if (
      !Array.isArray(rawLayer) ||
      rawLayer.length !== outputSize ||
      !isFiniteVector(rawBias, outputSize)
    ) {
      return null;
    }

    const layer: number[][] = [];
    for (const rawRow of rawLayer) {
      if (!isFiniteVector(rawRow, inputSize)) return null;
      layer.push([...rawRow]);
    }
    W.push(layer);
    B.push([...rawBias]);
  }

  return { W, B, sizes: [...expectedSizes] };
}

function normalizeData(
  value: unknown,
  dimension: MlpDimension,
  sampleCount: number,
): MlpSample[] | null {
  if (!Array.isArray(value) || value.length !== sampleCount) return null;
  const data: MlpSample[] = [];
  for (const rawSample of value) {
    if (
      typeof rawSample !== 'object' ||
      rawSample === null ||
      !isFiniteVector((rawSample as Partial<MlpSample>).x, dimension)
    ) {
      return null;
    }
    const rawLabel = (rawSample as Partial<MlpSample>).y;
    if (rawLabel !== 0 && rawLabel !== 1) return null;
    data.push({
      x: [...(rawSample as MlpSample).x],
      y: rawLabel,
    });
  }
  return data;
}

function normalizeView(value: unknown): MlpViewState {
  const raw =
    typeof value === 'object' && value !== null
      ? (value as Partial<MlpViewState>)
      : {};
  return {
    zoom: clamp(finiteNumber(raw.zoom, MLP_DEFAULT_VIEW.zoom), 0.5, 3.5),
    panX: finiteNumber(raw.panX, MLP_DEFAULT_VIEW.panX),
    panY: finiteNumber(raw.panY, MLP_DEFAULT_VIEW.panY),
    rotX: finiteNumber(raw.rotX, MLP_DEFAULT_VIEW.rotX),
    rotY: finiteNumber(raw.rotY, MLP_DEFAULT_VIEW.rotY),
  };
}

function normalizeStage(
  dimension: MlpDimension,
  value: unknown,
): MlpTwoDimensionalStage | null {
  if (dimension !== 2) return null;
  return value === 0 || value === 1 || value === 2 || value === 3
    ? value
    : 0;
}

export function normalizeMlpLabState(value: unknown): MlpLabState | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (!isDimension(raw.dimension)) return null;

  const dimension = raw.dimension;
  const settings = normalizeSettings(dimension, raw.settings);
  const hidden = normalizeHidden(dimension, raw.hidden);
  const sizes = architecture(dimension, hidden);
  const model = normalizeModel(raw, sizes);
  const data = normalizeData(raw.data, dimension, settings.sampleCount);
  if (!model || !data) return null;

  const stage = normalizeStage(dimension, raw.stage);
  const configRevision = Math.max(
    0,
    Math.floor(finiteNumber(raw.configRevision, 0)),
  );
  const runId =
    typeof raw.runId === 'string' && raw.runId.trim()
      ? raw.runId
      : nextRunId(null, dimension, configRevision);
  const selectedSampleIndex =
    typeof raw.selectedSampleIndex === 'number' &&
    Number.isInteger(raw.selectedSampleIndex) &&
    raw.selectedSampleIndex >= 0 &&
    raw.selectedSampleIndex < data.length
      ? raw.selectedSampleIndex
      : null;
  const accuracy = nullableFiniteNumber(raw.accuracy);

  return {
    dimension,
    data,
    settings,
    hidden,
    selectedHidden: normalizeSelectedHidden(raw.selectedHidden, hidden),
    useBias: raw.useBias !== false,
    useActivation: raw.useActivation !== false,
    ...model,
    epoch: Math.max(0, Math.floor(finiteNumber(raw.epoch, 0))),
    loss: nullableFiniteNumber(raw.loss),
    accuracy:
      accuracy === null ? null : clamp(accuracy, 0, 1),
    stage,
    trained: raw.trained === true,
    completed: raw.completed === true || stage === 3,
    configRevision,
    runId,
    view: normalizeView(raw.view),
    selectedSampleIndex,
  };
}

export function forward(
  state: Pick<MlpLabState, 'W' | 'B' | 'useBias' | 'useActivation'>,
  input: readonly number[],
): ForwardResult {
  const acts: number[][] = [[...input]];
  const zs: number[][] = [];
  let current = [...input];

  for (let layerIndex = 0; layerIndex < state.W.length; layerIndex += 1) {
    const z: number[] = [];
    for (let row = 0; row < state.W[layerIndex].length; row += 1) {
      let sum = state.useBias ? state.B[layerIndex][row] : 0;
      for (let column = 0; column < current.length; column += 1) {
        sum += state.W[layerIndex][row][column] * current[column];
      }
      z.push(sum);
    }
    zs.push(z);
    const isOutputLayer = layerIndex === state.W.length - 1;
    current = z.map((value) => {
      if (isOutputLayer) return sigmoid(value);
      return state.useActivation
        ? tanhActivation(value)
        : identityActivation(value);
    });
    acts.push(current);
  }

  return { p: current[0], acts, zs };
}

export function predict(
  state: Pick<MlpLabState, 'W' | 'B' | 'useBias' | 'useActivation'>,
  input: readonly number[],
): number {
  return forward(state, input).p;
}

export function trainEpoch(state: MlpLabState): MlpLabState {
  const next = cloneMlpLabState(state);
  if (next.data.length === 0) return next;

  const gradsW = next.W.map((layer) =>
    layer.map((row) => row.map(() => 0)),
  );
  const gradsB = next.B.map((bias) => bias.map(() => 0));
  let loss = 0;
  let correct = 0;

  next.data.forEach((sample) => {
    const out = forward(next, sample.x);
    const p = clamp(out.p, 1e-6, 1 - 1e-6);
    loss += -(sample.y * Math.log(p) + (1 - sample.y) * Math.log(1 - p));
    if ((p >= 0.5 ? 1 : 0) === sample.y) correct += 1;

    const deltas: number[][] = new Array(next.W.length);
    deltas[deltas.length - 1] = [p - sample.y];

    for (let layerIndex = next.W.length - 1; layerIndex >= 0; layerIndex -= 1) {
      const delta = deltas[layerIndex];
      const previousActs = out.acts[layerIndex];
      for (let neuron = 0; neuron < delta.length; neuron += 1) {
        if (next.useBias) gradsB[layerIndex][neuron] += delta[neuron];
        for (
          let inputIndex = 0;
          inputIndex < previousActs.length;
          inputIndex += 1
        ) {
          gradsW[layerIndex][neuron][inputIndex] +=
            delta[neuron] * previousActs[inputIndex];
        }
      }

      if (layerIndex > 0) {
        const previousDelta: number[] = [];
        for (
          let previous = 0;
          previous < next.sizes[layerIndex];
          previous += 1
        ) {
          let propagated = 0;
          for (let following = 0; following < delta.length; following += 1) {
            propagated +=
              next.W[layerIndex][following][previous] * delta[following];
          }
          const activation = out.acts[layerIndex][previous];
          previousDelta.push(
            propagated *
              (next.useActivation ? 1 - activation * activation : 1),
          );
        }
        deltas[layerIndex - 1] = previousDelta;
      }
    }
  });

  const rate = 0.07 / next.data.length;
  for (let layerIndex = 0; layerIndex < next.W.length; layerIndex += 1) {
    for (let row = 0; row < next.W[layerIndex].length; row += 1) {
      if (next.useBias) {
        next.B[layerIndex][row] -= rate * gradsB[layerIndex][row];
      }
      for (
        let column = 0;
        column < next.W[layerIndex][row].length;
        column += 1
      ) {
        next.W[layerIndex][row][column] -=
          rate * gradsW[layerIndex][row][column];
      }
    }
  }

  next.epoch += 1;
  next.loss = loss / next.data.length;
  next.accuracy = correct / next.data.length;
  return next;
}

export function trainingStopReason(
  state: Pick<MlpLabState, 'epoch' | 'accuracy'>,
): Exclude<MlpTrainingStopReason, 'already-finished' | 'no-data'> {
  if (state.epoch >= MAX_EPOCHS) return 'epoch-limit';
  if (
    state.accuracy !== null &&
    state.accuracy > ACCURACY_STOP_TARGET &&
    state.epoch > MIN_ACCURACY_EPOCH
  ) {
    return 'accuracy-target';
  }
  return null;
}

export function hasTrainingTerminated(
  state: Pick<MlpLabState, 'epoch' | 'accuracy'>,
): boolean {
  return trainingStopReason(state) !== null;
}

function finishStoppedTraining(state: MlpLabState): MlpLabState {
  const next = cloneMlpLabState(state);
  next.trained = true;
  if (next.dimension !== 2) next.completed = true;
  return next;
}

export function createTrainingToken(
  state: Pick<MlpLabState, 'configRevision' | 'runId'>,
): MlpTrainingToken {
  return {
    configRevision: state.configRevision,
    runId: state.runId,
  };
}

export function isTrainingTokenCurrent(
  state: Pick<MlpLabState, 'configRevision' | 'runId'>,
  token: MlpTrainingToken,
): boolean {
  return (
    state.configRevision === token.configRevision &&
    state.runId === token.runId
  );
}

export function runTraining(
  state: MlpLabState,
  options: RunTrainingOptions = {},
): MlpTrainingRunResult {
  const snapshot = cloneMlpLabState(state);
  if (
    (options.expectedRunId !== undefined &&
      options.expectedRunId !== snapshot.runId) ||
    (options.expectedConfigRevision !== undefined &&
      options.expectedConfigRevision !== snapshot.configRevision)
  ) {
    return {
      state: snapshot,
      epochsRun: 0,
      stopped: false,
      stale: true,
      reason: 'stale-run',
    };
  }

  if (snapshot.data.length === 0) {
    return {
      state: snapshot,
      epochsRun: 0,
      stopped: false,
      stale: false,
      reason: 'no-data',
    };
  }

  const existingReason = trainingStopReason(snapshot);
  if (snapshot.trained || existingReason !== null) {
    return {
      state: finishStoppedTraining(snapshot),
      epochsRun: 0,
      stopped: true,
      stale: false,
      reason: snapshot.trained ? 'already-finished' : existingReason,
    };
  }

  const epochsPerBatch = Math.max(
    1,
    Math.floor(finiteNumber(options.epochs, DEFAULT_EPOCHS_PER_BATCH)),
  );
  let next = snapshot;
  let epochsRun = 0;
  let reason: ReturnType<typeof trainingStopReason> = null;

  do {
    for (let index = 0; index < epochsPerBatch; index += 1) {
      next = trainEpoch(next);
      epochsRun += 1;
    }
    reason = trainingStopReason(next);
  } while (options.untilComplete === true && reason === null);

  if (reason !== null) next = finishStoppedTraining(next);
  return {
    state: next,
    epochsRun,
    stopped: reason !== null,
    stale: false,
    reason,
  };
}

function settingsEqual(left: MlpSettings, right: MlpSettings): boolean {
  return (
    left.preset === right.preset &&
    left.sampleCount === right.sampleCount &&
    left.noise === right.noise
  );
}

function arraysEqual(
  left: readonly number[],
  right: readonly number[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function rebuildMlpLab(
  state: MlpLabState,
  configuration: {
    settings: MlpSettings;
    hidden: number[];
    selectedHidden: number;
    useBias: boolean;
    useActivation: boolean;
  },
  regenerateData: boolean,
  random: RandomSource,
): MlpLabState {
  const configRevision = state.configRevision + 1;
  const model = initializeMlpModel(
    state.dimension,
    configuration.hidden,
    random,
  );
  return {
    ...cloneMlpLabState(state),
    settings: { ...configuration.settings },
    hidden: [...configuration.hidden],
    selectedHidden: configuration.selectedHidden,
    useBias: configuration.useBias,
    useActivation: configuration.useActivation,
    data: regenerateData
      ? generateMlpData(state.dimension, configuration.settings, random)
      : copyData(state.data),
    ...model,
    epoch: 0,
    loss: null,
    accuracy: null,
    trained: false,
    configRevision,
    runId: nextRunId(state.runId, state.dimension, configRevision),
    selectedSampleIndex: null,
  };
}

export function applyMlpConfiguration(
  state: MlpLabState,
  patch: MlpConfigurationPatch,
  random: RandomSource = Math.random,
): MlpLabState {
  const settings = normalizeSettings(
    state.dimension,
    { ...state.settings, ...patch.settings },
    state.settings,
  );
  const hidden = normalizeHidden(
    state.dimension,
    patch.hidden ?? state.hidden,
    state.hidden,
  );
  const selectedHidden = normalizeSelectedHidden(
    patch.selectedHidden ?? state.selectedHidden,
    hidden,
  );
  const useBias = patch.useBias ?? state.useBias;
  const useActivation = patch.useActivation ?? state.useActivation;
  const settingsChanged = !settingsEqual(settings, state.settings);
  const changed =
    settingsChanged ||
    !arraysEqual(hidden, state.hidden) ||
    selectedHidden !== state.selectedHidden ||
    useBias !== state.useBias ||
    useActivation !== state.useActivation;

  if (!changed) return cloneMlpLabState(state);
  return rebuildMlpLab(
    state,
    {
      settings,
      hidden,
      selectedHidden,
      useBias,
      useActivation,
    },
    settingsChanged,
    random,
  );
}

export function regenerateMlpLabState(
  state: MlpLabState,
  random: RandomSource = Math.random,
): MlpLabState {
  return rebuildMlpLab(
    state,
    {
      settings: state.settings,
      hidden: state.hidden,
      selectedHidden: state.selectedHidden,
      useBias: state.useBias,
      useActivation: state.useActivation,
    },
    true,
    random,
  );
}

export function restartMlpTraining(
  state: MlpLabState,
  random: RandomSource = Math.random,
): MlpLabState {
  const model = initializeMlpModel(state.dimension, state.hidden, random);
  return {
    ...cloneMlpLabState(state),
    ...model,
    epoch: 0,
    loss: null,
    accuracy: null,
    trained: false,
    runId: nextRunId(
      state.runId,
      state.dimension,
      state.configRevision,
    ),
  };
}

export function advanceTwoDimensionalStage(
  state: MlpLabState,
  random: RandomSource = Math.random,
): TwoDimensionalStageResult {
  if (state.dimension !== 2 || state.stage === null) {
    return {
      state: cloneMlpLabState(state),
      status: 'not-two-dimensional',
      requiredAccuracy: null,
    };
  }
  if (state.stage === 3) {
    return {
      state: cloneMlpLabState(state),
      status: 'already-complete',
      requiredAccuracy: null,
    };
  }
  if (!state.trained || !hasTrainingTerminated(state)) {
    return {
      state: cloneMlpLabState(state),
      status: 'training-incomplete',
      requiredAccuracy: null,
    };
  }

  if (state.stage === 0) {
    const next = rebuildMlpLab(
      state,
      {
        settings: { ...state.settings, preset: 'circle' },
        hidden: [3],
        selectedHidden: 0,
        useBias: state.useBias,
        useActivation: state.useActivation,
      },
      true,
      random,
    );
    next.stage = 1;
    return {
      state: next,
      status: 'advanced',
      requiredAccuracy: null,
    };
  }

  const requiredAccuracy = state.stage === 1 ? 0.9 : 0.95;
  if (state.accuracy === null || state.accuracy < requiredAccuracy) {
    return {
      state: cloneMlpLabState(state),
      status: 'threshold-not-met',
      requiredAccuracy,
    };
  }

  if (state.stage === 1) {
    const next = rebuildMlpLab(
      state,
      {
        settings: { ...state.settings, preset: 'xor' },
        hidden: state.hidden,
        selectedHidden: state.selectedHidden,
        useBias: state.useBias,
        useActivation: state.useActivation,
      },
      true,
      random,
    );
    next.stage = 2;
    return {
      state: next,
      status: 'advanced',
      requiredAccuracy,
    };
  }

  const next = cloneMlpLabState(state);
  next.stage = 3;
  next.completed = true;
  next.trained = true;
  return {
    state: next,
    status: 'completed',
    requiredAccuracy,
  };
}

export const createLabState = createMlpLabState;
export const normalizeLabState = normalizeMlpLabState;
export const cloneLabState = cloneMlpLabState;
