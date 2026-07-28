import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
} from 'react';
import {
  Button,
  Callout,
  RangeControl,
  Switch,
  type FeedbackTone,
} from '../../shared/react';
import { ActivityGate } from '../components/ActivityGate';
import { MlpNetworkCanvas } from '../components/MlpNetworkCanvas';
import { MlpSpaceCanvas } from '../components/MlpSpaceCanvas';
import { usePersistedActivity } from '../components/usePersistedActivity';
import {
  MLP_PRESETS_BY_DIMENSION,
  advanceTwoDimensionalStage,
  applyMlpConfiguration,
  createMlpLabState,
  createTrainingToken,
  hasTrainingTerminated,
  normalizeMlpLabState,
  predict,
  regenerateMlpLabState,
  restartMlpTraining,
  runTraining,
  type MlpDimension,
  type MlpLabState,
  type MlpPreset,
  type MlpViewState,
} from '../model/mlpEngine';

export interface MlpLabBlockProps {
  dimension: MlpDimension;
  onComplete: () => void;
}

const PRESET_LABELS: Record<MlpPreset, string> = {
  blobs: '两团高斯',
  linear: '线性可分',
  circle: '内外区域',
  xor: '交叉区域',
  spiral3d: '双螺旋',
  slabs3d: '分层薄片',
  shell3d: '破碎球壳',
};

const DIMENSION_COPY: Record<MlpDimension, string> = {
  1: '在数轴上寻找分类切点',
  2: '在平面上学习分类曲线',
  3: '在空间中学习分类曲面',
};

const VIEW_COPY: Record<MlpDimension, string> = {
  1: '拖动平移 · 滚轮缩放',
  2: '拖动平移 · 滚轮缩放',
  3: '拖动旋转 · 滚轮缩放',
};

function presetOptions(
  dimension: MlpDimension,
): Array<{ value: MlpPreset; label: string }> {
  return MLP_PRESETS_BY_DIMENSION[dimension].map((preset) => ({
    value: preset,
    label:
      dimension === 3 && preset === 'circle'
        ? '内外球壳'
        : dimension === 3 && preset === 'xor'
          ? '八区异或'
          : PRESET_LABELS[preset],
  }));
}

function stageHint(state: MlpLabState): {
  tone: FeedbackTone;
  label: string;
  text: string;
} | null {
  if (state.dimension !== 2 || state.stage === null) return null;
  if (
    state.stage === 1 &&
    state.trained &&
    (state.accuracy === null || state.accuracy < 0.9)
  ) {
    return {
      tone: 'red',
      label: '未达标提示',
      text: '还没有超过 90%。可以增加隐藏层，或调高隐藏层神经元数，再重新训练。',
    };
  }
  if (
    state.stage === 2 &&
    state.trained &&
    (state.accuracy === null || state.accuracy < 0.95)
  ) {
    return {
      tone: 'red',
      label: '未达标提示',
      text: 'XOR 还没有超过 95%。继续调整网络形状，再重新训练一次。',
    };
  }

  const messages = [
    '先看最简单的二维任务：线性可分。这里暂时固定网络，只需要点击开始训练。',
    '现在数据变成内外区域。只开放网络形状，请尝试调整层数或神经元，让准确率超过 90%。',
    '现在进入 XOR 区域。继续只调网络形状，让准确率超过 95%。达标后才开放完整数据设置。',
    '通过！二维里的线性、内外区域、XOR 都已经完成。完整控制栏已经开放。',
  ];
  const complete = state.stage === 3;
  return {
    tone: complete ? 'green' : 'orange',
    label: complete ? '达标提示' : '操作提示',
    text: messages[state.stage],
  };
}

function formatMetric(value: number | null, digits: number): string {
  return value === null ? '--' : value.toFixed(digits);
}

function coordinateName(index: number): string {
  return ['x', 'y', 'z'][index] ?? `x${index + 1}`;
}

function sampleReadout(state: MlpLabState): {
  sample: string;
  blue: string;
  red: string;
  prediction: string;
} {
  const index = state.selectedSampleIndex;
  const selected = index === null ? null : state.data[index] ?? null;
  if (!selected) {
    return {
      sample: '未选中',
      blue: '--',
      red: '--',
      prediction: '点击一个样本',
    };
  }
  const probability = predict(state, selected.x);
  return {
    sample: selected.x
      .map((value, coordinateIndex) =>
        `${coordinateName(coordinateIndex)}=${value.toFixed(2)}`,
      )
      .join(', '),
    blue: `${((1 - probability) * 100).toFixed(1)}%`,
    red: `${(probability * 100).toFixed(1)}%`,
    prediction: `预测类别 ${probability >= 0.5 ? 1 : 0}`,
  };
}

function stateWithView(
  state: MlpLabState,
  view: MlpViewState,
): MlpLabState {
  return {
    ...state,
    view: { ...view },
  };
}

function stateWithSelectedSample(
  state: MlpLabState,
  selectedSampleIndex: number,
): MlpLabState {
  return {
    ...state,
    selectedSampleIndex,
  };
}

export function MlpLabBlock({
  dimension,
  onComplete,
}: MlpLabBlockProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [draftSampleCount, setDraftSampleCount] = useState(140);
  const [draftNoise, setDraftNoise] = useState(
    dimension === 3 ? 0.12 : 0.1,
  );
  const [draftUnits, setDraftUnits] = useState(
    dimension === 3 ? 6 : 3,
  );
  const draftSampleCountRef = useRef(draftSampleCount);
  const draftNoiseRef = useRef(draftNoise);
  const draftUnitsRef = useRef(draftUnits);

  const activity = usePersistedActivity<MlpLabState>({
    stateKey: `activity:mlp-lab-${dimension}d`,
    createInitial: () => createMlpLabState(dimension),
    normalizeState: (stored) => {
      const normalized = normalizeMlpLabState(stored);
      return normalized?.dimension === dimension ? normalized : null;
    },
    initializationEvent: 'mlp_lab_initialized',
    getElement: () => rootRef.current,
  });

  useEffect(() => {
    const sampleCount = activity.state?.settings.sampleCount;
    if (sampleCount === undefined) return;
    draftSampleCountRef.current = sampleCount;
    setDraftSampleCount(sampleCount);
  }, [activity.state?.settings.sampleCount]);

  useEffect(() => {
    const noise = activity.state?.settings.noise;
    if (noise === undefined) return;
    draftNoiseRef.current = noise;
    setDraftNoise(noise);
  }, [activity.state?.settings.noise]);

  useEffect(() => {
    const state = activity.state;
    if (!state) return;
    const units = state.hidden[state.selectedHidden] ?? 2;
    draftUnitsRef.current = units;
    setDraftUnits(units);
  }, [
    activity.state?.hidden,
    activity.state?.selectedHidden,
  ]);

  useEffect(
    () => () => {
      runningRef.current = false;
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    },
    [],
  );

  const stopAnimation = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const startTraining = useCallback(() => {
    const current = activity.stateRef.current;
    if (!current || runningRef.current) return;

    const startingState =
      current.trained || hasTrainingTerminated(current)
        ? restartMlpTraining(current)
        : current;
    activity.setDraft(startingState);
    const token = createTrainingToken(startingState);
    runningRef.current = true;
    setRunning(true);

    const runFrame = () => {
      if (!runningRef.current) return;
      const frameState = activity.stateRef.current;
      if (!frameState) {
        stopAnimation();
        return;
      }

      const result = runTraining(frameState, {
        epochs: 6,
        expectedConfigRevision: token.configRevision,
        expectedRunId: token.runId,
      });
      if (result.stale) {
        stopAnimation();
        return;
      }
      if (!result.stopped) {
        activity.setDraft(result.state);
        frameRef.current = window.requestAnimationFrame(runFrame);
        return;
      }

      const stoppedState = result.state;
      const stageResult =
        dimension === 2
          ? advanceTwoDimensionalStage(stoppedState)
          : null;
      const finalState = stageResult?.state ?? stoppedState;
      const wasComplete = frameState.completed;
      stopAnimation();
      const committed = activity.commit(
        'mlp_training_finish',
        finalState,
        {
          dimension,
          epoch: stoppedState.epoch,
          loss: stoppedState.loss,
          accuracy: stoppedState.accuracy,
          stop_reason: result.reason,
          stage_status: stageResult?.status,
          stage: finalState.stage,
        },
      );
      if (committed?.completed && !wasComplete) onComplete();
    };

    frameRef.current = window.requestAnimationFrame(runFrame);
  }, [activity, dimension, onComplete, stopAnimation]);

  const commitDataSettings = useCallback(
    (settings: Partial<MlpLabState['settings']>) => {
      const current = activity.stateRef.current;
      if (!current || runningRef.current) return;
      const next = applyMlpConfiguration(current, { settings });
      if (next.configRevision === current.configRevision) return;
      activity.commit('mlp_lab_data_commit', next, {
        dimension,
        preset: next.settings.preset,
        sample_count: next.settings.sampleCount,
        noise: next.settings.noise,
        config_revision: next.configRevision,
        run_id: next.runId,
      });
    },
    [activity, dimension],
  );

  const commitPreset = useCallback(
    (preset: MlpPreset) => {
      const current = activity.stateRef.current;
      if (!current || runningRef.current) return;
      const next =
        preset === current.settings.preset
          ? regenerateMlpLabState(current)
          : applyMlpConfiguration(current, {
              settings: { preset },
            });
      activity.commit('mlp_lab_data_commit', next, {
        dimension,
        preset: next.settings.preset,
        sample_count: next.settings.sampleCount,
        noise: next.settings.noise,
        config_revision: next.configRevision,
        run_id: next.runId,
      });
    },
    [activity, dimension],
  );

  const commitArchitecture = useCallback(
    (hidden: number[], selectedHidden: number) => {
      const current = activity.stateRef.current;
      if (!current || runningRef.current) return;
      const next = applyMlpConfiguration(current, {
        hidden,
        selectedHidden,
      });
      if (next.configRevision === current.configRevision) return;
      activity.commit('mlp_lab_architecture_commit', next, {
        dimension,
        hidden: next.hidden,
        selected_hidden: next.selectedHidden,
        config_revision: next.configRevision,
        run_id: next.runId,
      });
    },
    [activity, dimension],
  );

  const commitOption = useCallback(
    (option: 'bias' | 'activation', checked: boolean) => {
      const current = activity.stateRef.current;
      if (!current || runningRef.current) return;
      const next = applyMlpConfiguration(
        current,
        option === 'bias'
          ? { useBias: checked }
          : { useActivation: checked },
      );
      if (next.configRevision === current.configRevision) return;
      activity.commit('mlp_lab_option_commit', next, {
        dimension,
        option,
        checked,
        config_revision: next.configRevision,
        run_id: next.runId,
      });
    },
    [activity, dimension],
  );

  const finishSampleCount = useCallback(
    (
      _event:
        | PointerEvent<HTMLInputElement>
        | FocusEvent<HTMLInputElement>,
    ) => {
      const current = activity.stateRef.current;
      if (
        !current ||
        current.settings.sampleCount === draftSampleCountRef.current
      ) {
        return;
      }
      commitDataSettings({
        sampleCount: draftSampleCountRef.current,
      });
    },
    [activity.stateRef, commitDataSettings],
  );

  const finishNoise = useCallback(
    (
      _event:
        | PointerEvent<HTMLInputElement>
        | FocusEvent<HTMLInputElement>,
    ) => {
      const current = activity.stateRef.current;
      if (!current || current.settings.noise === draftNoiseRef.current) {
        return;
      }
      commitDataSettings({ noise: draftNoiseRef.current });
    },
    [activity.stateRef, commitDataSettings],
  );

  const finishUnits = useCallback(
    (
      _event:
        | PointerEvent<HTMLInputElement>
        | FocusEvent<HTMLInputElement>,
    ) => {
      const current = activity.stateRef.current;
      if (!current || current.hidden.length === 0) return;
      if (
        current.hidden[current.selectedHidden] === draftUnitsRef.current
      ) {
        return;
      }
      const hidden = [...current.hidden];
      hidden[current.selectedHidden] = draftUnitsRef.current;
      commitArchitecture(hidden, current.selectedHidden);
    },
    [activity.stateRef, commitArchitecture],
  );

  const state = activity.state;
  const hint = state ? stageHint(state) : null;
  const readout = state ? sampleReadout(state) : null;
  const controlsLocked =
    state === null ||
    (dimension === 1
      ? !state.completed || running
      : dimension === 2 && state.stage !== 3);
  const modelLocked =
    state === null ||
    (dimension === 1
      ? !state.completed || running
      : dimension === 2 && state.stage === 0);
  const sampleLocked =
    state === null ||
    (dimension === 1
      ? !state.completed || running
      : dimension === 2 &&
        state.stage !== null &&
        state.stage < 2);
  const labClassName = [
    'z06-dimension',
    'mlp-react-lab',
    controlsLocked && 'is-controls-locked',
    modelLocked && 'is-model-locked',
    sampleLocked && 'is-sample-locked',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      ref={rootRef}
      className={labClassName}
      data-telemetry-manual
      aria-label={`${dimension}D MLP 实验`}
    >
      <ActivityGate
        hydrated={activity.hydrated}
      >
        {state && readout && (
          <>
            <header className="mlp-react-lab__head">
              <div className="mlp-react-lab__title">
                <h2>{dimension}D</h2>
                <span>{DIMENSION_COPY[dimension]}</span>
              </div>
              <div className="mlp-react-lab__metrics">
                <div className="mlp-react-metric">
                  <span>Epoch</span>
                  <strong>{state.epoch}</strong>
                </div>
                <div className="mlp-react-metric">
                  <span>Loss</span>
                  <strong>{formatMetric(state.loss, 3)}</strong>
                </div>
                <div className="mlp-react-metric">
                  <span>Accuracy</span>
                  <strong>
                    {state.accuracy === null
                      ? '--'
                      : `${(state.accuracy * 100).toFixed(1)}%`}
                  </strong>
                </div>
                <Button
                  variant="primary"
                  loading={running}
                  disabled={running}
                  onClick={startTraining}
                >
                  {running
                    ? '训练中'
                    : state.trained || hasTrainingTerminated(state)
                      ? '重新训练'
                      : '开始训练'}
                </Button>
              </div>
            </header>

            {hint && (
              <Callout
                className="mlp-react-stage-hint"
                tone={hint.tone}
                label={hint.label}
                text={hint.text}
                aria-live="polite"
              />
            )}

            <section
              className={[
                'mlp-react-lab__controls',
                dimension === 1 &&
                  'mlp-react-lab__controls--simple',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={`${dimension}D 数据设置`}
            >
              {dimension === 1 ? (
                <>
                  <div
                    className="mlp-react-preset-buttons"
                    role="group"
                    aria-label="1D 数据形状"
                  >
                    {(['linear', 'circle'] as const).map((preset) => (
                      <Button
                        key={preset}
                        active={state.settings.preset === preset}
                        disabled={running}
                        onClick={() => commitPreset(preset)}
                      >
                        {preset === 'linear' ? '线性可分' : '内外交叉'}
                      </Button>
                    ))}
                  </div>
                  <p className="mlp-react-control-note">
                    1D 先固定为 140 个样本、0.10 噪声，只观察边界和网络计算。
                  </p>
                </>
              ) : (
                <>
                  <label className="edu-control">
                    <span className="edu-label">数据形状</span>
                    <select
                      className="edu-select"
                      value={state.settings.preset}
                      disabled={running}
                      onChange={(event) =>
                        commitPreset(event.currentTarget.value as MlpPreset)}
                    >
                      {presetOptions(dimension).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <RangeControl
                    label="样本数"
                    min={40}
                    max={260}
                    step={20}
                    digits={2}
                    value={draftSampleCount}
                    disabled={running}
                    onChange={(event) => {
                      const value = Number.parseInt(
                        event.currentTarget.value,
                        10,
                      );
                      draftSampleCountRef.current = value;
                      setDraftSampleCount(value);
                    }}
                    onPointerUp={finishSampleCount}
                    onBlur={finishSampleCount}
                  />
                  <RangeControl
                    label="噪声"
                    min={0}
                    max={0.35}
                    step={0.01}
                    digits={2}
                    value={draftNoise}
                    disabled={running}
                    onChange={(event) => {
                      const value = Number.parseFloat(
                        event.currentTarget.value,
                      );
                      draftNoiseRef.current = value;
                      setDraftNoise(value);
                    }}
                    onPointerUp={finishNoise}
                    onBlur={finishNoise}
                  />
                  <p className="mlp-react-control-note">
                    本栏只影响当前 {dimension}D
                    实验。改变设置会重新生成当前维度的数据。
                  </p>
                </>
              )}
            </section>

            <div className="mlp-react-lab__panels">
              <section className="mlp-react-panel">
                <header className="mlp-react-panel__head">
                  <h3>空间与分类边界</h3>
                  <span>{VIEW_COPY[dimension]}</span>
                </header>
                <div className="mlp-react-canvas-box">
                  <MlpSpaceCanvas
                    state={state}
                    disabled={running}
                    onDraftView={(view) => {
                      activity.setDraft((current) =>
                        stateWithView(current, view),
                      );
                    }}
                    onCommitView={(view) => {
                      activity.commit(
                        'mlp_lab_view_commit',
                        (current) => stateWithView(current, view),
                        {
                          dimension,
                          view,
                        },
                      );
                    }}
                    onSelectSample={(sampleIndex) => {
                      activity.commit(
                        'mlp_lab_sample_select',
                        (current) =>
                          stateWithSelectedSample(
                            current,
                            sampleIndex,
                          ),
                        {
                          dimension,
                          sample_index: sampleIndex,
                        },
                      );
                    }}
                  />
                </div>
                <footer className="mlp-react-panel__foot">
                  <div className="mlp-react-legend">
                    <span>
                      <i className="z06-dot blue" />
                      类别 0
                    </span>
                    <span>
                      <i className="z06-dot red" />
                      类别 1
                    </span>
                    <span>
                      <i className="z06-dot wrong" />
                      分错样本
                    </span>
                  </div>
                  <span className="mlp-react-readout">
                    {readout.prediction}
                  </span>
                </footer>
              </section>

              <section className="mlp-react-panel">
                <header className="mlp-react-panel__head">
                  <h3>MLP 结构与计算</h3>
                  <span>{state.sizes.join(' → ')}</span>
                </header>
                {dimension === 1 ? (
                  <div className="mlp-react-model-tools mlp-react-model-tools--fixed">
                    <p>1 个隐藏层 · 3 个神经元</p>
                  </div>
                ) : (
                  <div className="mlp-react-model-tools">
                    <div className="mlp-react-layer-actions">
                      <Button
                        disabled={running || state.hidden.length >= 4}
                        onClick={() =>
                          commitArchitecture(
                            [...state.hidden, 6],
                            state.hidden.length,
                          )}
                      >
                        添加层
                      </Button>
                      <Button
                        disabled={running || state.hidden.length === 0}
                        onClick={() => {
                          if (state.hidden.length === 0) return;
                          const hidden = [...state.hidden];
                          hidden.splice(state.selectedHidden, 1);
                          commitArchitecture(
                            hidden,
                            Math.max(
                              0,
                              Math.min(
                                state.selectedHidden,
                                hidden.length - 1,
                              ),
                            ),
                          );
                        }}
                      >
                        删除层
                      </Button>
                    </div>
                    <RangeControl
                      label="选中隐藏层神经元"
                      min={2}
                      max={12}
                      step={1}
                      digits={2}
                      value={draftUnits}
                      disabled={running || state.hidden.length === 0}
                      onChange={(event) => {
                        const value = Number.parseInt(
                          event.currentTarget.value,
                          10,
                        );
                        draftUnitsRef.current = value;
                        setDraftUnits(value);
                      }}
                      onPointerUp={finishUnits}
                      onBlur={finishUnits}
                    />
                    {dimension === 3 && (
                      <div className="mlp-react-switches">
                        <Switch
                          label="偏置"
                          checked={state.useBias}
                          disabled={running}
                          onChange={(event) =>
                            commitOption(
                              'bias',
                              event.currentTarget.checked,
                            )}
                        />
                        <Switch
                          label="激活函数"
                          checked={state.useActivation}
                          disabled={running}
                          onChange={(event) =>
                            commitOption(
                              'activation',
                              event.currentTarget.checked,
                            )}
                        />
                      </div>
                    )}
                  </div>
                )}
                <MlpNetworkCanvas state={state} />
                <footer className="mlp-react-panel__foot">
                  <div className="mlp-react-sample-info">
                    <div>
                      <span>选中样本</span>
                      <strong>{readout.sample}</strong>
                    </div>
                    <div>
                      <span>蓝类置信度</span>
                      <strong>{readout.blue}</strong>
                    </div>
                    <div>
                      <span>红类置信度</span>
                      <strong>{readout.red}</strong>
                    </div>
                  </div>
                </footer>
              </section>
            </div>
          </>
        )}
      </ActivityGate>
    </article>
  );
}
