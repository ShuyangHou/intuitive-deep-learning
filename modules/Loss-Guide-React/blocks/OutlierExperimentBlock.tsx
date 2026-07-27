import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Callout, ContentBlock, EChartsChart, NoticeStrip, Question, ValueTile } from '../../shared/react';
import { emitTelemetry, getTelemetryState } from '../../shared/react/telemetry';
import type { LessonBlockProps } from './NumberLineBlock';
import { LOSS_GUIDE_MODULE_ID, lossGuideStateKey } from '../lessonConfig';
import { absoluteError, calculateLossMetrics, squaredError, type LossSample } from '../model/lossMath';

const regularSamples: LossSample[] = [
  { id: '1', target: 3, prediction: 2 },
  { id: '2', target: 5, prediction: 6 },
  { id: '3', target: 7, prediction: 8 },
  { id: '4', target: 9, prediction: 8 },
  { id: '5', target: 11, prediction: 10 },
];
const experimentStateKey = lossGuideStateKey('control:outlier-experiment');

function buildSamples(hasOutlier: boolean): LossSample[] {
  if (!hasOutlier) return regularSamples;
  return regularSamples.map((sample) => sample.id === '5' ? { ...sample, prediction: 21 } : sample);
}

export function OutlierExperimentBlock({ onComplete }: LessonBlockProps) {
  const [hasOutlier, setHasOutlier] = useState(false);
  const experimentRef = useRef<HTMLDivElement>(null);
  const samples = useMemo(() => buildSamples(hasOutlier), [hasOutlier]);
  const metrics = calculateLossMetrics(samples);
  const option = useMemo(() => ({
    animationDuration: 220,
    color: ['#f07e47', '#27446e'],
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, data: ['绝对误差 |e|', '平方误差 e²'] },
    grid: { left: 54, right: 20, top: 24, bottom: 54 },
    xAxis: { type: 'category', data: samples.map((sample) => `S${sample.id}`), name: '样本' },
    yAxis: { type: 'value', name: '单样本损失', min: 0 },
    series: [
      {
        name: '绝对误差 |e|',
        type: 'bar',
        data: samples.map((sample) => absoluteError(sample.target, sample.prediction)),
      },
      {
        name: '平方误差 e²',
        type: 'bar',
        data: samples.map((sample) => squaredError(sample.target, sample.prediction)),
      },
    ],
  }), [samples]);

  useEffect(() => {
    let active = true;
    void getTelemetryState<{ hasOutlier?: boolean }>(experimentStateKey, LOSS_GUIDE_MODULE_ID).then((entry) => {
      if (active && typeof entry?.state?.hasOutlier === 'boolean') {
        setHasOutlier(entry.state.hasOutlier);
      }
    });
    return () => { active = false; };
  }, []);

  const updateExperiment = (next: boolean) => {
    setHasOutlier(next);
    emitTelemetry('control_commit', experimentRef.current, {
      state_key: experimentStateKey,
      state: { hasOutlier: next },
      value: next,
    });
  };

  return (
    <ContentBlock
      className="lg-react-block"
      title="一个异常样本，能改变多少？"
      subtitle="损失函数不仅衡量误差，也决定每个样本在训练中拥有多大的影响力。"
    >
      <div ref={experimentRef} className="lg-react-experiment">
        <Callout
          tone="orange"
          label="反事实实验"
          text="保持前四个样本不变，把第 5 个预测改成明显异常的数值。比较 MAE 与 MSE 对同一个离群点的反应。"
        />
        <div className="lg-react-actions" role="group" aria-label="离群点实验控制">
          <Button
            variant="primary"
            hint={!hasOutlier}
            active={hasOutlier}
            aria-pressed={hasOutlier}
            onClick={() => updateExperiment(true)}
          >
            引入离群点：S5 的 ŷ = 21
          </Button>
          <Button disabled={!hasOutlier} onClick={() => updateExperiment(false)}>恢复普通样本</Button>
        </div>

        <EChartsChart
          className="lg-react-outlier-chart"
          option={option}
          minHeight={330}
          role="img"
          aria-label={hasOutlier ? '包含离群点时五个样本的绝对误差与平方误差柱状图' : '普通数据下五个样本的绝对误差与平方误差柱状图'}
        />

        <div className="lg-react-value-grid">
          <ValueTile tone="orange" label="当前 MAE" value={metrics.mae.toFixed(1)} />
          <ValueTile tone="blue" label="当前 MSE" value={metrics.mse.toFixed(1)} />
        </div>

        {hasOutlier ? (
          <>
            <NoticeStrip tone="orange" lead="观察结果：">
              离群点让 MAE 从 1.0 增至 2.8，而 MSE 从 1.0 增至 20.8。平方让大误差获得了更高权重。
            </NoticeStrip>
            <Question
              persistenceKey={lossGuideStateKey('outlier-sensitivity')}
              type="judgement"
              title="当数据可能含有标注错误或极端离群点时，MSE 通常比 MAE 更容易被单个异常样本支配。"
              options={[
                { key: '对', value: 'true', label: '正确，平方会放大大误差' },
                { key: '错', value: 'false', label: '错误，两者受影响完全相同' },
              ]}
              answer="true"
              feedback={{ correct: '正确。但这不代表 MAE 永远更好；选择仍取决于噪声假设和任务代价。' }}
              onCheck={(result) => {
                if (result.ok) onComplete();
              }}
            />
          </>
        ) : (
          <NoticeStrip tone="blue" lead="基线状态：">
            五个样本的误差绝对值都为 1，因此 MAE 与 MSE 都等于 1。
          </NoticeStrip>
        )}
      </div>
    </ContentBlock>
  );
}
