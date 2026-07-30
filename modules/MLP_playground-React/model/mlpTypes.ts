export type MlpDimension = 1 | 2 | 3;

export type MlpLabel = 0 | 1;

export type MlpPreset =
  | 'blobs'
  | 'linear'
  | 'circle'
  | 'xor'
  | 'spiral3d'
  | 'slabs3d'
  | 'shell3d';

export type MlpTwoDimensionalStage = 0 | 1 | 2 | 3;

export type RandomSource = () => number;

export interface MlpSample {
  x: number[];
  y: MlpLabel;
}

export interface MlpSettings {
  preset: MlpPreset;
  sampleCount: number;
  noise: number;
}

export interface MlpViewState {
  zoom: number;
  panX: number;
  panY: number;
  rotX: number;
  rotY: number;
}

/**
 * A complete, JSON-safe lab snapshot.
 *
 * The legacy implementation used NaN for metrics before training. Persisted
 * snapshots use null instead so the full state can be written to SQLite as
 * ordinary JSON without losing information.
 */
export interface MlpLabState {
  dimension: MlpDimension;
  data: MlpSample[];
  settings: MlpSettings;
  hidden: number[];
  selectedHidden: number;
  useBias: boolean;
  useActivation: boolean;
  W: number[][][];
  B: number[][];
  sizes: number[];
  epoch: number;
  loss: number | null;
  accuracy: number | null;
  stage: MlpTwoDimensionalStage | null;
  trained: boolean;
  completed: boolean;
  configRevision: number;
  runId: string;
  view: MlpViewState;
  selectedSampleIndex: number | null;
}

export interface ForwardResult {
  p: number;
  acts: number[][];
  zs: number[][];
}

export interface CreateMlpLabOptions {
  settings?: Partial<MlpSettings>;
  hidden?: number[];
  selectedHidden?: number;
  useBias?: boolean;
  useActivation?: boolean;
  random?: RandomSource;
}

export interface MlpConfigurationPatch {
  settings?: Partial<MlpSettings>;
  hidden?: number[];
  selectedHidden?: number;
  useBias?: boolean;
  useActivation?: boolean;
}

export interface MlpTrainingToken {
  configRevision: number;
  runId: string;
}

export type MlpTrainingStopReason =
  | 'accuracy-target'
  | 'epoch-limit'
  | 'already-finished'
  | 'no-data'
  | null;

export interface RunTrainingOptions {
  /**
   * The old RAF loop performs six full-batch epochs before checking whether it
   * should stop. Six is therefore the default batch size.
   */
  epochs?: number;
  /**
   * Continue in batches until the legacy stop rule is met.
   */
  untilComplete?: boolean;
  expectedRunId?: string;
  expectedConfigRevision?: number;
}

export interface MlpTrainingRunResult {
  state: MlpLabState;
  epochsRun: number;
  stopped: boolean;
  stale: boolean;
  reason: MlpTrainingStopReason | 'stale-run';
}

export type TwoDimensionalStageStatus =
  | 'advanced'
  | 'completed'
  | 'threshold-not-met'
  | 'training-incomplete'
  | 'already-complete'
  | 'not-two-dimensional';

export interface TwoDimensionalStageResult {
  state: MlpLabState;
  status: TwoDimensionalStageStatus;
  requiredAccuracy: number | null;
}
