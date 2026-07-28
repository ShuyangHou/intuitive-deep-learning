import { useEffect, useRef, useState } from 'react';
import { Callout, ContentBlock, FormulaBlock, NoticeStrip, Question, RangeControl, ValueTile } from '../../shared/react';
import { emitTelemetry, getTelemetryState } from '../../shared/react/telemetry';
import type { LessonBlockProps } from './NumberLineBlock';
import { LOSS_GUIDE_MODULE_ID, lossGuideStateKey } from '../lessonConfig';

const robustStateKey = lossGuideStateKey('control:huber-loss');

function huberLoss(error: number, delta: number) {
  const magnitude = Math.abs(error);
  return magnitude <= delta
    ? 0.5 * magnitude ** 2
    : delta * (magnitude - 0.5 * delta);
}

function huberGradient(error: number, delta: number) {
  if (Math.abs(error) <= delta) return error;
  return delta * Math.sign(error);
}

export function RobustLossBlock({ onComplete }: LessonBlockProps) {
  const [error, setError] = useState(4);
  const [delta, setDelta] = useState(2);
  const rootRef = useRef<HTMLDivElement>(null);
  const loss = huberLoss(error, delta);
  const gradient = huberGradient(error, delta);

  useEffect(() => {
    let active = true;
    void getTelemetryState<{ error?: number; delta?: number }>(robustStateKey, LOSS_GUIDE_MODULE_ID).then((entry) => {
      if (!active) return;
      const restoredError = Number(entry?.state?.error);
      const restoredDelta = Number(entry?.state?.delta);
      if (Number.isFinite(restoredError)) setError(Math.min(8, Math.max(0, restoredError)));
      if (Number.isFinite(restoredDelta)) setDelta(Math.min(4, Math.max(1, restoredDelta)));
    });
    return () => { active = false; };
  }, []);

  const update = (nextError: number, nextDelta: number) => {
    setError(nextError);
    setDelta(nextDelta);
    emitTelemetry('control_commit', rootRef.current, {
      state_key: robustStateKey,
      state: { error: nextError, delta: nextDelta },
      value: { error: nextError, delta: nextDelta },
    });
  };

  return (
    <ContentBlock
      className="lg-react-block"
      title="一定要在 MAE 和 MSE 之间二选一吗？"
      subtitle="Huber Loss 在小误差区域使用二次惩罚，在大误差区域切换为线性惩罚，把优化平滑性与离群点稳健性结合起来。"
    >
      <div ref={rootRef} className="lg-react-robust-loss">
        <Callout
          tone="orange"
          label="设计一个折中"
          text="阈值 δ 决定损失函数何时从二次区域切换到线性区域。拖动误差和 δ，观察损失值与梯度怎样连续变化。"
        />
        <div className="lg-react-control-grid">
          <RangeControl
            label="误差绝对值 |e|"
            min={0}
            max={8}
            step={0.5}
            digits={1}
            value={error}
            scale={['0', '4', '8']}
            onChange={(event) => update(Number(event.currentTarget.value), delta)}
          />
          <RangeControl
            label="切换阈值 δ"
            min={1}
            max={4}
            step={0.5}
            digits={1}
            value={delta}
            scale={['1：更稳健', '2.5', '4：更接近二次损失']}
            onChange={(event) => update(error, Number(event.currentTarget.value))}
          />
        </div>
        <FormulaBlock ariaLabel="Huber Loss 分段公式">
          ℓ<sub>δ</sub>(e) = ½e²（|e| ≤ δ）；δ(|e| − ½δ)（|e| &gt; δ）
        </FormulaBlock>
        <FormulaBlock ariaLabel="Huber Loss 梯度分段公式">
          ∂ℓ<sub>δ</sub>/∂e = e（|e| ≤ δ）；δ·sign(e)（|e| &gt; δ）
        </FormulaBlock>
        <div className="lg-react-value-grid lg-react-value-grid--four">
          <ValueTile tone="orange" label="MAE |e|" value={Math.abs(error).toFixed(2)} />
          <ValueTile tone="blue" label="二次损失 ½e²" value={(0.5 * error ** 2).toFixed(2)} />
          <ValueTile tone="success" label="Huber Loss" value={loss.toFixed(2)} />
          <ValueTile tone="success" label="Huber 梯度绝对值" value={Math.abs(gradient).toFixed(2)} />
        </div>
        <NoticeStrip tone={Math.abs(error) <= delta ? 'blue' : 'orange'} lead={Math.abs(error) <= delta ? '当前在二次区域：' : '当前在线性区域：'}>
          {Math.abs(error) <= delta
            ? 'Huber Loss 像平方误差一样平滑，梯度随误差变化。'
            : 'Huber Loss 对大误差线性增长，梯度被限制在 ±δ，避免异常样本无限放大更新。'}
        </NoticeStrip>
        <Question
          persistenceKey={lossGuideStateKey('huber-tradeoff')}
          type="judgement"
          title="当 |e| > δ 时，Huber Loss 的梯度绝对值不会继续随误差增大，而是被限制为 δ。"
          options={[
            { key: '对', value: 'true', label: '正确，这限制了极端样本的更新强度' },
            { key: '错', value: 'false', label: '错误，它仍像 MSE 一样无限增大' },
          ]}
          answer="true"
          feedback={{ correct: '正确。Huber Loss 说明损失函数可以根据任务需求设计，而不只是从 MAE 和 MSE 中二选一。' }}
          onCheck={(result) => {
            if (result.ok) onComplete();
          }}
        />
      </div>
    </ContentBlock>
  );
}
