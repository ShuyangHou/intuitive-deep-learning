import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Callout,
  ContentBlock,
  PlotlyChart,
  TextInput,
  Typography,
} from '../../shared/react';
import { emitTelemetry, getTelemetryState } from '../../shared/react/telemetry';
import { GradientNetworkDiagram } from '../components/GradientNetworkDiagram';
import {
  CLOSE_LOSS_THRESHOLD,
  INITIAL_FULL_WEIGHTS,
  forwardFullNetwork,
  searchLearningSchedule,
  stepFullNetwork,
  type FullWeights,
} from '../model/gradientMath';
import { BackpropagationSection, FullNetworkTransition, KnowledgePoint, NetworkObjectiveSection } from './rigor';

export interface FullNetworkTrainingBlockProps {
  onComplete: () => void;
}

interface FullNetworkSnapshot {
  target: number | null;
  targetInput: string;
  weights: FullWeights;
  rate: number;
  decay: number;
  lossHistory: number[];
  hasTrained: boolean;
  converged: boolean;
}

const stateKey = 'activity:gd-full-network';
const FULL_CHART_CONFIG = { scrollZoom: false };

function initialSnapshot(): FullNetworkSnapshot {
  return {
    target: null,
    targetInput: '',
    weights: { ...INITIAL_FULL_WEIGHTS },
    rate: 0.1,
    decay: 0.5,
    lossHistory: [],
    hasTrained: false,
    converged: false,
  };
}

function finite(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function rateText(value: number) {
  return value >= 0.01 ? value.toFixed(2) : value.toPrecision(2);
}

function restoreWeights(value: unknown): FullWeights {
  const record = typeof value === 'object' && value !== null
    ? value as Partial<Record<keyof FullWeights, unknown>>
    : {};
  return {
    w11: finite(record.w11, INITIAL_FULL_WEIGHTS.w11),
    w21: finite(record.w21, INITIAL_FULL_WEIGHTS.w21),
    w12: finite(record.w12, INITIAL_FULL_WEIGHTS.w12),
    w22: finite(record.w22, INITIAL_FULL_WEIGHTS.w22),
    v1: finite(record.v1, INITIAL_FULL_WEIGHTS.v1),
    v2: finite(record.v2, INITIAL_FULL_WEIGHTS.v2),
  };
}

function restoreSnapshot(value: unknown): FullNetworkSnapshot {
  if (typeof value !== 'object' || value === null) return initialSnapshot();
  const record = value as Partial<FullNetworkSnapshot>;
  const restoredTarget = record.target === null ? null : Number(record.target);
  const target = restoredTarget === null || Number.isFinite(restoredTarget) ? restoredTarget : null;
  const weights = restoreWeights(record.weights);
  const forward = forwardFullNetwork(weights, target);
  const lossHistory = Array.isArray(record.lossHistory)
    ? record.lossHistory.map(Number).filter(Number.isFinite)
    : [];
  const converged = target !== null
    && (record.converged === true || (forward.loss ?? Number.POSITIVE_INFINITY) < CLOSE_LOSS_THRESHOLD);
  return {
    target,
    targetInput: typeof record.targetInput === 'string'
      ? record.targetInput
      : target === null ? '' : String(target),
    weights,
    rate: Math.max(0, finite(record.rate, 0.1)),
    decay: Math.max(0, finite(record.decay, 0.5)),
    lossHistory: lossHistory.length || forward.loss === null ? lossHistory : [forward.loss],
    hasTrained: record.hasTrained === true,
    converged,
  };
}

export function FullNetworkTrainingBlock({ onComplete }: FullNetworkTrainingBlockProps) {
  const [snapshot, setSnapshot] = useState<FullNetworkSnapshot>(initialSnapshot);
  const [targetDraft, setTargetDraft] = useState('');
  const [targetError, setTargetError] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [training, setTraining] = useState(false);
  const [targetCommitted, setTargetCommitted] = useState(true);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const targetDirtyRef = useRef(false);
  const completionSentRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    let active = true;
    void getTelemetryState<FullNetworkSnapshot>(stateKey).then((entry) => {
      if (!active) return;
      const restored = restoreSnapshot(entry?.state);
      snapshotRef.current = restored;
      setSnapshot(restored);
      setTargetDraft(restored.targetInput);
      setTargetError(
        restored.target === null && restored.targetInput.trim()
          ? '请输入一个有效数字。'
          : '',
      );
      targetDirtyRef.current = false;
      setTargetCommitted(true);
      setHydrated(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const readyToComplete = snapshot.target !== null && (snapshot.hasTrained || snapshot.converged);
  useEffect(() => {
    if (
      !hydrated
      || !targetCommitted
      || !readyToComplete
      || completionSentRef.current
    ) {
      return;
    }
    completionSentRef.current = true;
    onComplete();
  }, [hydrated, onComplete, readyToComplete, targetCommitted]);

  const forward = forwardFullNetwork(snapshot.weights, snapshot.target);
  const completedTrainingSteps = Math.max(0, snapshot.lossHistory.length - 1);
  const latestTrainingLoss = snapshot.lossHistory[snapshot.lossHistory.length - 1] ?? forward.loss;
  const chartData = useMemo(() => [{
    type: 'scatter',
    mode: 'lines+markers',
    name: 'Loss',
    x: snapshot.lossHistory.map((_, index) => index),
    y: snapshot.lossHistory,
    line: { color: '#f07e47', width: 3 },
    marker: { color: '#f07e47', size: 7, line: { color: '#ffffff', width: 2 } },
    hovertemplate: '训练 %{x}<br>Loss %{y:.4f}<extra></extra>',
  }], [snapshot.lossHistory]);
  const chartLayout = useMemo(() => ({
    margin: { l: 42, r: 12, t: 10, b: 36 },
    xaxis: {
      title: '训练次数',
      range: [0, Math.max(4, snapshot.lossHistory.length)],
      gridcolor: '#dfe6f1',
      zerolinecolor: '#9fb0c8',
    },
    yaxis: {
      title: 'Loss',
      range: [
        0,
        Math.max(1, Math.max(...snapshot.lossHistory, 1) * 1.08),
      ],
      gridcolor: '#dfe6f1',
      zerolinecolor: '#9fb0c8',
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: '#fbfdff',
    showlegend: false,
  }), [snapshot.lossHistory]);

  const emitSnapshot = (
    eventName: string,
    next: FullNetworkSnapshot,
    properties: Record<string, unknown> = {},
  ) => {
    snapshotRef.current = next;
    setSnapshot(next);
    emitTelemetry(eventName, rootRef.current, {
      state_key: stateKey,
      state: next,
      ...properties,
    });
  };

  const applyTargetDraft = (rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      const next = initialSnapshot();
      setTargetError('');
      completionSentRef.current = false;
      snapshotRef.current = next;
      setSnapshot(next);
      return next;
    }

    const target = Number(trimmed);
    if (!Number.isFinite(target)) {
      const next = {
        ...initialSnapshot(),
        targetInput: rawValue,
      };
      setTargetError('请输入一个有效数字。');
      completionSentRef.current = false;
      snapshotRef.current = next;
      setSnapshot(next);
      return next;
    }

    const schedule = searchLearningSchedule(target);
    const weights = { ...INITIAL_FULL_WEIGHTS };
    const nextForward = forwardFullNetwork(weights, target);
    const converged = (nextForward.loss ?? Number.POSITIVE_INFINITY) < CLOSE_LOSS_THRESHOLD;
    const next: FullNetworkSnapshot = {
      target,
      targetInput: rawValue,
      weights,
      rate: schedule.rate,
      decay: schedule.decay,
      lossHistory: nextForward.loss === null ? [] : [nextForward.loss],
      hasTrained: false,
      converged,
    };
    setTargetError('');
    completionSentRef.current = false;
    snapshotRef.current = next;
    setSnapshot(next);
    return next;
  };

  const commitTarget = () => {
    if (!hydrated || !targetDirtyRef.current || training) return;
    targetDirtyRef.current = false;
    setTargetCommitted(true);
    const next = snapshotRef.current;
    const initialForward = forwardFullNetwork(next.weights, next.target);
    emitSnapshot('full_target_commit', next, {
      target: next.target,
      target_valid: next.target !== null,
      selected_rate: next.target === null ? undefined : next.rate,
      selected_decay: next.target === null ? undefined : next.decay,
      initial_loss: initialForward.loss,
      converged: next.converged,
    });
  };

  const trainOnce = () => {
    if (snapshot.target === null || snapshot.converged || training) return;
    setTraining(true);
    const delay = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 520;
    timerRef.current = window.setTimeout(() => {
      const update = stepFullNetwork(
        snapshot.weights,
        snapshot.target as number,
        snapshot.rate,
        snapshot.decay,
      );
      const afterLoss = update.after.loss ?? 0;
      const next: FullNetworkSnapshot = {
        ...snapshot,
        weights: update.weights,
        rate: update.nextRate,
        lossHistory: [...snapshot.lossHistory, afterLoss],
        hasTrained: snapshot.hasTrained || update.didUpdate,
        converged: afterLoss < CLOSE_LOSS_THRESHOLD,
      };
      emitSnapshot('full_train_step', next, {
        training_step: next.lossHistory.length - 1,
        before_loss: update.before.loss,
        after_loss: update.after.loss,
        rate: update.rate,
        next_rate: update.nextRate,
        converged: next.converged,
      });
      setTraining(false);
      timerRef.current = null;
    }, delay);
  };

  return (
    <div ref={rootRef} data-telemetry-manual aria-busy={!hydrated}>
      <ContentBlock
        className="gd-react-block gd-react-full-block"
        title="现在，让整个网络一起学习"
        subtitle="很多情况下，网络里的所有参数都可以用同样的方法更新。"
      >
      <FullNetworkTransition />
      <NetworkObjectiveSection />

      <div className="gd-react-final-grid">
        <div className="gd-react-control-card gd-target-entry">
          <span className="edu-kicker">设置真实值 GT</span>
          <TextInput
            label="输入你喜欢的数字"
            type="number"
            step="any"
            value={targetDraft}
            disabled={!hydrated || training}
            placeholder="例如 31"
            hint
            aria-invalid={Boolean(targetError)}
            onChange={(event) => {
              const value = event.currentTarget.value;
              targetDirtyRef.current = true;
              setTargetCommitted(false);
              setTargetDraft(value);
              applyTargetDraft(value);
            }}
            onBlur={commitTarget}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
          <small>{targetError || '输入后会自动选择稳定的训练参数。'}</small>
        </div>

        <section
          className="gd-react-control-card gd-react-full-loss-panel"
          aria-labelledby="gd-react-full-loss-title"
        >
          <h3 className="edu-panel-title" id="gd-react-full-loss-title">Loss</h3>
          <PlotlyChart
            data={chartData}
            layout={chartLayout}
            config={FULL_CHART_CONFIG}
            minHeight={142}
            aria-label="训练过程中 Loss 下降的训练指标曲线"
          />
        </section>

        <div className="gd-react-control-card gd-react-train-card">
          <span className="edu-kicker">训练操作</span>
          <div className="gd-react-rate-readout" aria-live="polite">
            <span>当前学习率</span>
            <strong>{rateText(snapshot.rate)}</strong>
            <small>每轮 × {snapshot.decay.toFixed(2)}</small>
          </div>
          <Button
            variant="primary"
            loading={training}
            disabled={!hydrated || snapshot.target === null || snapshot.converged}
            hint={snapshot.target !== null && !snapshot.converged}
            onClick={trainOnce}
          >
            {snapshot.converged ? '训练完成' : '训练一次'}
          </Button>
          <small>前馈 → Loss → 反向传播 → 全部参数更新</small>
        </div>
      </div>

      {targetCommitted && snapshot.target !== null && !snapshot.hasTrained && (
        <KnowledgePoint ariaLabel="训练目标知识点" title="知识点：GT 是监督信号，不是待学习参数">
          你设置的 GT = {snapshot.target} 决定了模型当前要接近的目标，因此也改变了 Loss 和梯度；训练过程中被更新的是网络权重，而不是这个由数据提供的真实值。
        </KnowledgePoint>
      )}

      <GradientNetworkDiagram
        mode="full"
        weights={snapshot.weights}
        target={snapshot.target}
        updating={training}
      />

      {snapshot.hasTrained && (
        <KnowledgePoint
          ariaLabel="完整训练知识点"
          title="知识点：一次训练包含三个职责不同的阶段"
          caption="本页仍是单样本演示；一次训练后 Loss 下降，只说明当前样本上的目标被降低，不能直接代表模型在其他数据上的表现。"
        >
          第 {completedTrainingSteps} 次训练先用旧参数完成前向传播并计算 Loss，再由反向传播求出全部参数梯度，最后由更新规则同时生成新参数。当前 Loss 为 {latestTrainingLoss === null ? '—' : latestTrainingLoss.toFixed(4)}。
        </KnowledgePoint>
      )}

      <BackpropagationSection />

      {targetCommitted && readyToComplete && (
        <Callout
          tone="green"
          label={snapshot.hasTrained ? '这就是一次完整训练' : '初始预测已经达标'}
          text={snapshot.hasTrained
            ? '前馈得到预测，Loss 衡量误差，反向传播把影响传回每个参数，梯度下降再按学习率更新它们。网络中的所有可学习参数都能这样更新。'
            : '当前初始预测已经足够接近目标，不需要伪造一次参数更新。可以更换目标值，继续观察完整训练过程。'}
        />
      )}
      </ContentBlock>
    </div>
  );
}
