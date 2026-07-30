import { useMemo, useRef } from 'react';
import { Button, LessonStage, NoticeStrip } from '../../shared/react';
import { ShallowOutputPlot } from '../components/ActivationCharts';
import {
  NetworkCanvas,
  type NetworkConnection,
  type NetworkLayer,
} from '../components/NetworkCanvas';
import { usePersistedActivity } from '../components/usePersistedActivity';
import {
  formatNumber,
  formatSigned,
  makeShallowModel,
  makeShallowNeuron,
  shallowEquivalent,
  type ShallowModel,
} from '../model/activationMath';

const STATE_KEY = 'activity:activation-linear-shallow';

interface ShallowSnapshot {
  model: ShallowModel;
  completed: boolean;
}

function createInitialSnapshot(): ShallowSnapshot {
  return { model: makeShallowModel(1), completed: false };
}

function isFiniteNeuron(value: unknown): value is ShallowModel['neurons'][number] {
  if (!value || typeof value !== 'object') return false;
  const neuron = value as Record<string, unknown>;
  return ['w', 'b', 'v'].every(
    (key) => typeof neuron[key] === 'number' && Number.isFinite(neuron[key]),
  );
}

function normalizeSnapshot(value: unknown): ShallowSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Partial<ShallowSnapshot>;
  if (
    candidate.completed !== undefined
    && typeof candidate.completed !== 'boolean'
  ) {
    return null;
  }
  const model = candidate.model;
  if (
    !model
    || !Array.isArray(model.neurons)
    || model.neurons.length < 1
    || model.neurons.length > 3
    || !model.neurons.every(isFiniteNeuron)
    || !Number.isFinite(model.outputBias)
  ) {
    return null;
  }
  return {
    model: {
      neurons: model.neurons.map((neuron) => ({ ...neuron })),
      outputBias: model.outputBias,
    },
    completed: Boolean(candidate.completed || model.neurons.length >= 3),
  };
}

function buildCanvas(
  model: ShallowModel,
): { layers: NetworkLayer[]; connections: NetworkConnection[] } {
  const equivalent = shallowEquivalent(model);
  const layers: NetworkLayer[] = [
    {
      title: '输入 (1)',
      nodes: [{
        label: 'x',
        tone: 'input',
        details: {
          title: '输入节点 x',
          body: '这里直接接收横轴上的输入值。',
          code: 'a0 = x',
        },
      }],
    },
    {
      title: `线性层 (${model.neurons.length})`,
      nodes: model.neurons.map((neuron, index) => ({
        label: `h${index + 1}`,
        tone: 'hidden' as const,
        activation: 'linear',
        details: {
          title: `线性神经元 ${index + 1}`,
          body: '它只做加权和加偏置，然后直接送往输出层。',
          code: `h${index + 1} = ${formatNumber(neuron.w)}x ${formatSigned(neuron.b)}\ny += ${formatNumber(neuron.v)}h${index + 1}`,
        },
      })),
    },
    {
      title: '输出 (1)',
      nodes: [{
        label: 'y',
        tone: 'output',
        details: {
          title: '输出节点 y',
          body: '所有线性神经元的输出再次线性相加，所以可以合并成一条直线。',
          code: `y = Σ(vh) ${formatSigned(model.outputBias)}\ny = ${formatNumber(equivalent.slope)}x ${formatSigned(equivalent.intercept)}`,
        },
      }],
    },
  ];
  const connections: NetworkConnection[] = [];
  model.neurons.forEach((neuron, index) => {
    connections.push({
      fromLayer: 0,
      fromIndex: 0,
      toLayer: 1,
      toIndex: index,
      weight: neuron.w,
    });
    connections.push({
      fromLayer: 1,
      fromIndex: index,
      toLayer: 2,
      toIndex: 0,
      weight: neuron.v,
    });
  });
  return { layers, connections };
}

export interface ShallowLinearBlockProps {
  onComplete: () => void;
}

export function ShallowLinearBlock({ onComplete }: ShallowLinearBlockProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const {
    state,
    hydrated,
    commit,
  } = usePersistedActivity<ShallowSnapshot>({
    stateKey: STATE_KEY,
    createInitial: createInitialSnapshot,
    normalizeState: normalizeSnapshot,
    initEvent: 'activation_linear_state_initialized',
    initProperties: { experiment: 'shallow' },
    getElement: () => rootRef.current,
  });
  const model = state?.model;
  const equivalent = useMemo(
    () => model ? shallowEquivalent(model) : null,
    [model],
  );
  const canvas = useMemo(
    () => model ? buildCanvas(model) : { layers: [], connections: [] },
    [model],
  );

  const addNeuron = () => {
    if (!state || state.model.neurons.length >= 3) return;
    const neurons = [...state.model.neurons, makeShallowNeuron()];
    const next: ShallowSnapshot = {
      model: { ...state.model, neurons },
      completed: state.completed || neurons.length >= 3,
    };
    commit('activation_linear_neuron_add', next, {
      experiment: 'shallow',
      neuron_count: neurons.length,
    });
    if (!state.completed && next.completed) onComplete();
  };

  const count = model?.neurons.length ?? 0;
  return (
    <LessonStage
      ref={rootRef}
      className="af-react-network-lab"
      kicker="无激活函数网络"
      title="只堆线性神经元，会发生什么？"
      description="先从一个最简单的网络开始：x 进入一个线性神经元，再输出 y。左侧会画出它对应的函数图像。"
      actions={(
        <div className="af-react-actions">
          <Button
            variant="primary"
            disabled={!hydrated || !model || count >= 3}
            onClick={addNeuron}
          >
            添加神经元
          </Button>
        </div>
      )}
      data-telemetry-manual
      aria-busy={!hydrated}
    >
      {!model || !equivalent ? (
        <NoticeStrip tone="blue">
          正在恢复已保存的随机参数…
        </NoticeStrip>
      ) : (
        <div className="af-react-network-stage">
          <section className="af-react-network-panel">
            <header className="af-react-panel-head">
              <h3>二维函数图像</h3>
              <span>一维输入 x，一维输出 y</span>
            </header>
            <div className="af-react-visual-box">
              <ShallowOutputPlot model={model} />
            </div>
            <NoticeStrip className="af-react-readout">
              当前等价函数：y = {formatNumber(equivalent.slope)}x {formatSigned(equivalent.intercept)}。
              隐藏神经元数量：{count} / 3。
            </NoticeStrip>
          </section>

          <section className="af-react-network-panel">
            <header className="af-react-panel-head">
              <h3>线性神经元结构</h3>
              <span>悬浮节点查看 w、b、v</span>
            </header>
            <div className="af-react-visual-box af-react-visual-box--model">
              <NetworkCanvas
                layers={canvas.layers}
                connections={canvas.connections}
                ariaLabel="无激活函数网络结构"
                caption="没有激活函数：h = wx + b，y = Σvh + c"
                height={430}
              />
            </div>
            <NoticeStrip className="af-react-readout">
              {count < 3
                ? '点击“添加神经元”会加入一组随机 w、b、v。线可能旋转或平移，但仍然是一条直线。'
                : '已经有 3 个线性神经元了。它们叠加后仍然只是一条直线。继续往下观察二维输入时会发生什么。'}
            </NoticeStrip>
          </section>
        </div>
      )}
    </LessonStage>
  );
}
