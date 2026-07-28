import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Callout, ContentBlock, EChartsChart, NoticeStrip, Question, RangeControl, ValueTile } from '../../shared/react';
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

function buildSamples(outlierPrediction: number): LossSample[] {
  return regularSamples.map((sample) => sample.id === '5' ? { ...sample, prediction: outlierPrediction } : sample);
}

export function OutlierExperimentBlock({ onComplete }: LessonBlockProps) {
  const [outlierPrediction, setOutlierPrediction] = useState(10);
  const [conclusionComplete, setConclusionComplete] = useState(false);
  const experimentRef = useRef<HTMLDivElement>(null);
  const samples = useMemo(() => buildSamples(outlierPrediction), [outlierPrediction]);
  const metrics = calculateLossMetrics(samples);
  const outlierError = Math.abs(outlierPrediction - 11);
  const outlierMaeGradient = outlierError === 0 ? 0 : 1 / samples.length;
  const outlierMseGradient = 2 * outlierError / samples.length;
  const experimentReady = outlierError >= 8;
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
    void getTelemetryState<{ prediction?: number; hasOutlier?: boolean }>(experimentStateKey, LOSS_GUIDE_MODULE_ID).then((entry) => {
      const restored = Number(entry?.state?.prediction);
      if (active && Number.isFinite(restored)) {
        setOutlierPrediction(Math.min(21, Math.max(10, restored)));
      } else if (active && entry?.state?.hasOutlier === true) {
        setOutlierPrediction(21);
      }
    });
    return () => { active = false; };
  }, []);

  const updateExperiment = (prediction: number) => {
    const next = Math.min(21, Math.max(10, prediction));
    setOutlierPrediction(next);
    emitTelemetry('control_commit', experimentRef.current, {
      state_key: experimentStateKey,
      state: { prediction: next },
      value: next,
    });
  };

  return (
    <ContentBlock
      className="lg-react-block"
      title="一个异常样本，能改变多少？"
      subtitle="完成 reduction 后，损失函数的形状会决定大误差在整体目标和梯度中占据多大权重。"
    >
      <div ref={experimentRef} className="lg-react-experiment">
        <NoticeStrip tone="blue" lead="承接上一步：">
          MAE 和 MSE 都能避免正负误差抵消，但它们对大误差的放大程度不同。下面保持样本数和 reduction 方式不变，只改变一个预测值。
        </NoticeStrip>
        <Callout
          tone="orange"
          label="控制变量实验"
          text="基线中五个样本的误差绝对值都为 1。保持前四个样本不变，逐步增大 S5 的预测值，观察整体损失和该样本梯度怎样变化。"
        />
        <RangeControl
          label="S5 的预测值 ŷ₅"
          min={10}
          max={21}
          step={1}
          value={outlierPrediction}
          hint
          discrete
          scale={['10：基线', '15', '21：强离群点']}
          onChange={(event) => updateExperiment(Number(event.currentTarget.value))}
        />
        <div className="lg-react-actions" role="group" aria-label="离群点实验控制">
          <Button
            variant="primary"
            hint={!experimentReady}
            active={outlierPrediction === 21}
            aria-pressed={outlierPrediction === 21}
            onClick={() => updateExperiment(21)}
          >
            设置强离群点：ŷ₅ = 21
          </Button>
          <Button disabled={outlierPrediction === 10} onClick={() => updateExperiment(10)}>恢复基线</Button>
        </div>

        <EChartsChart
          className="lg-react-outlier-chart"
          option={option}
          minHeight={330}
          role="img"
          aria-label={`S5 预测值为 ${outlierPrediction} 时，五个样本的绝对误差与平方误差柱状图`}
        />

        <div className="lg-react-value-grid lg-react-value-grid--four">
          <ValueTile tone="danger" label="S5 的 |e|" value={outlierError.toFixed(1)} />
          <ValueTile tone="orange" label="当前 MAE" value={metrics.mae.toFixed(1)} />
          <ValueTile tone="blue" label="当前 MSE" value={metrics.mse.toFixed(1)} />
          <ValueTile tone="blue" label="S5 的 |∂MSE/∂ŷ₅|" value={outlierMseGradient.toFixed(1)} />
        </div>

        {experimentReady ? (
          <>
            <NoticeStrip tone="orange" lead="观察结果：">
              当 S5 的 |e| = {outlierError.toFixed(0)} 时，MAE 为 {metrics.mae.toFixed(1)}，MSE 为 {metrics.mse.toFixed(1)}。
              该样本的 MAE 梯度绝对值为 {outlierMaeGradient.toFixed(1)}，MSE 梯度绝对值为 {outlierMseGradient.toFixed(1)}。
            </NoticeStrip>
            <Question
              persistenceKey={lossGuideStateKey('outlier-sensitivity')}
              type="judgement"
              title="误差继续增大时，MSE 不仅比 MAE 增长更快，它对该样本预测值的梯度绝对值也会继续增大。"
              options={[
                { key: '对', value: 'true', label: '正确，MSE 损失和梯度都保留误差大小' },
                { key: '错', value: 'false', label: '错误，两种梯度的绝对值始终相同' },
              ]}
              answer="true"
              feedback={{
                correct: '正确。但这不代表 MAE 永远更好；选择仍取决于噪声假设、优化性质和任务代价。',
              }}
              onCheck={(result) => {
                setConclusionComplete(result.ok);
                if (result.ok) onComplete();
              }}
            />
            {conclusionComplete && (
              <NoticeStrip tone="blue" lead="从现象进入机制：">
                MSE 不仅让整体损失增长更快，也让大误差样本产生更强的梯度。下一步将用求导解释这个更新信号，并继续追踪到模型参数。
              </NoticeStrip>
            )}
          </>
        ) : (
          <NoticeStrip tone="blue" lead="继续拖动：">
            当前 S5 的 |e| = {outlierError.toFixed(0)}。比较 MAE、MSE 和 MSE 梯度的变化速度；达到 |e| ≥ 8 后再作判断。
          </NoticeStrip>
        )}
      </div>
    </ContentBlock>
  );
}
