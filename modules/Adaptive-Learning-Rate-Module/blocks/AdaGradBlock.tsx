import { useMemo, useState } from 'react';
import {
  Button,
  ContentBlock,
  FormulaBlock,
  FormulaTerm,
  NoticeStrip,
  Question,
  emitTelemetry,
} from '../../shared/react';

interface AdaGradBlockProps {
  onComplete?: () => void;
}

const GRADIENTS = [
  { x: 4, y: 1 },
  { x: 3, y: 1 },
  { x: 4, y: .5 },
  { x: 3, y: 1 },
];

function accumulatedSquaredGradient(round: number, key: 'x' | 'y') {
  return GRADIENTS.slice(0, round).reduce((sum, gradient) => sum + gradient[key] ** 2, 0);
}

export function AdaGradBlock({ onComplete }: AdaGradBlockProps) {
  const [round, setRound] = useState(0);
  const values = useMemo(() => {
    const gx = accumulatedSquaredGradient(round, 'x');
    const gy = accumulatedSquaredGradient(round, 'y');
    return {
      gx,
      gy,
      lrX: round ? 1 / Math.sqrt(gx) : 1,
      lrY: round ? 1 / Math.sqrt(gy) : 1,
    };
  }, [round]);
  const finished = round === GRADIENTS.length;

  function advance(button: HTMLButtonElement) {
    if (finished) return;
    const nextRound = round + 1;
    const gx = accumulatedSquaredGradient(nextRound, 'x');
    const gy = accumulatedSquaredGradient(nextRound, 'y');
    setRound(nextRound);
    emitTelemetry('optimizer_history_step', button, {
      state_key: 'experiment:adaptive-lr-adagrad-v1',
      optimizer: 'adagrad',
      round: nextRound,
      accumulated_squared_gradient: { x: gx, y: gy },
      effective_learning_rate: { x: 1 / Math.sqrt(gx), y: 1 / Math.sqrt(gy) },
      state: { round: nextRound },
    });
  }

  return (
    <ContentBlock
      className="alr-block"
      title="AdaGrad：走得越多，之后越谨慎"
      subtitle="SGD 只有一个固定的全局步幅；AdaGrad 为每个参数分别记录过去梯度的平方和。"
    >
      <NoticeStrip tone="orange" lead="SGD 的难题：">
        同一个学习率可能让陡峭方向反复震荡，却让平缓方向前进太慢。
      </NoticeStrip>
      <div className="alr-formula-grid">
        <FormulaBlock ariaLabel="AdaGrad 梯度历史累积公式">
          <FormulaTerm tooltip="截至当前步的梯度平方和">G<sub>t</sub></FormulaTerm>
          {' = '}
          <FormulaTerm tooltip="把从第一步到当前步的每个梯度平方后累加">Σ g<sub>i</sub><sup>2</sup></FormulaTerm>
        </FormulaBlock>
        <FormulaBlock ariaLabel="AdaGrad 参数更新公式" fraction={{
          prefix: <>θ<sub>t+1</sub> = θ<sub>t</sub> −</>,
          numerator: <>η · g<sub>t</sub></>,
          denominator: <>√G<sub>t</sub> + ε</>,
        }} />
      </div>

      <section className="alr-lab" aria-labelledby="alr-adagrad-lab-title">
        <header>
          <div><span>历史账本实验 · {round}/{GRADIENTS.length}</span><h3 id="alr-adagrad-lab-title">比较两个参数自己的有效学习率</h3></div>
          <div className="alr-lab-actions">
            <Button onClick={() => setRound(0)} disabled={round === 0}>清空历史</Button>
            <Button variant="primary" hint={round === 0} disabled={finished} onClick={(event) => advance(event.currentTarget)}>
              {finished ? '四批梯度已记完' : '记入下一批梯度'}
            </Button>
          </div>
        </header>

        <div className="alr-gradient-stream" aria-label="四批待处理梯度">
          {GRADIENTS.map((gradient, index) => (
            <article className={index < round ? 'is-recorded' : index === round ? 'is-next' : undefined} key={index}>
              <span>第 {index + 1} 批</span>
              <strong>g<sub>x</sub> = {gradient.x}</strong>
              <strong>g<sub>y</sub> = {gradient.y}</strong>
            </article>
          ))}
        </div>

        <div className="alr-adagrad-compare">
          {(['x', 'y'] as const).map((key) => {
            const history = key === 'x' ? values.gx : values.gy;
            const effectiveRate = key === 'x' ? values.lrX : values.lrY;
            return (
              <article key={key}>
                <header><span>参数 {key}</span><strong>η<sub>{key}</sub> = {effectiveRate.toFixed(3)}</strong></header>
                <div className="alr-rate-track" aria-label={`参数 ${key} 的有效学习率 ${effectiveRate.toFixed(3)}`}>
                  <i style={{ width: `${effectiveRate * 100}%` }} />
                </div>
                <p>历史平方和 G<sub>{key}</sub> = {history.toFixed(2)}</p>
              </article>
            );
          })}
        </div>

        <NoticeStrip tone={finished ? 'green' : 'blue'} lead={finished ? '观察结果：' : '继续记账：'}>
          {finished
            ? `x 方向的梯度长期更大，Gₓ 累积到 ${values.gx.toFixed(0)}，所以它的有效学习率被压得比 y 更小。`
            : '每记入一批梯度，比较 G 变大的速度与蓝色有效学习率条的长度。'}
        </NoticeStrip>
      </section>

      {finished && (
        <Question
          persistenceKey="adaptive-lr-adagrad-history-v1"
          type="choice"
          title="某个参数过去经常出现较大的梯度，AdaGrad 接下来会怎样对待它？"
          options={[
            { key: 'A', value: 'smaller', label: '让它的有效学习率变小，更新更谨慎' },
            { key: 'B', value: 'larger', label: '让它的有效学习率变大，继续加速', wrongFeedback: '梯度平方和在分母中；历史越大，得到的有效学习率越小。' },
            { key: 'C', value: 'same', label: '仍与所有其他参数使用完全相同的步长', wrongFeedback: 'AdaGrad 的关键正是为每个参数维护各自的梯度历史。' },
          ]}
          answer="smaller"
          feedback={{ correct: '正确。AdaGrad 用历史平方梯度缩小常走方向的步幅，这就是“自适应”。' }}
          onCheck={(result) => { if (result.ok) onComplete?.(); }}
        />
      )}
    </ContentBlock>
  );
}
