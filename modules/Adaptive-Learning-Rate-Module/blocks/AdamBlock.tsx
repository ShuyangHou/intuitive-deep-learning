import { useMemo, useState } from 'react';
import {
  Button,
  ContentBlock,
  FormulaBlock,
  NoticeStrip,
  Question,
  emitTelemetry,
} from '../../shared/react';

interface AdamBlockProps {
  onComplete?: () => void;
}

const GRADIENTS = [4, -2, 3, -1, 2, -.5];
const BETA_ONE = .8;
const BETA_TWO = .9;
const LEARNING_RATE = .3;

type AdamRecord = {
  gradient: number;
  momentum: number;
  secondMoment: number;
  correctedMomentum: number;
  correctedSecondMoment: number;
  update: number;
};

function buildAdamRecords(): AdamRecord[] {
  let momentum = 0;
  let secondMoment = 0;
  return GRADIENTS.map((gradient, index) => {
    const step = index + 1;
    momentum = BETA_ONE * momentum + (1 - BETA_ONE) * gradient;
    secondMoment = BETA_TWO * secondMoment + (1 - BETA_TWO) * gradient ** 2;
    const correctedMomentum = momentum / (1 - BETA_ONE ** step);
    const correctedSecondMoment = secondMoment / (1 - BETA_TWO ** step);
    return {
      gradient,
      momentum,
      secondMoment,
      correctedMomentum,
      correctedSecondMoment,
      update: LEARNING_RATE * correctedMomentum / (Math.sqrt(correctedSecondMoment) + 1e-8),
    };
  });
}

function signed(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
}

export function AdamBlock({ onComplete }: AdamBlockProps) {
  const records = useMemo(buildAdamRecords, []);
  const [round, setRound] = useState(0);
  const finished = round === records.length;
  const current = round ? records[round - 1] : null;

  function advance(button: HTMLButtonElement) {
    if (finished) return;
    const nextRound = round + 1;
    const record = records[nextRound - 1];
    setRound(nextRound);
    emitTelemetry('optimizer_moment_step', button, {
      state_key: 'experiment:adaptive-lr-adam-v1',
      optimizer: 'adam',
      round: nextRound,
      gradient: record.gradient,
      first_moment: record.correctedMomentum,
      second_moment: record.correctedSecondMoment,
      update: record.update,
      state: { round: nextRound },
    });
  }

  return (
    <ContentBlock
      className="alr-block"
      title="Adam：既记方向，也记尺度"
      subtitle="AdaGrad 的平方梯度会一直累加、学习率只会越来越小；Adam 改用指数移动平均，让较新的梯度影响更大。"
    >
      <div className="alr-concept-pair">
        <section><span>一阶矩 m</span><strong>最近梯度的方向趋势</strong><p>像带惯性的方向记忆，减少单次噪声造成的左右摇摆。</p></section>
        <section><span>二阶矩 v</span><strong>最近梯度的尺度</strong><p>像会逐渐淡忘的 AdaGrad 账本，用来缩放每个参数的步幅。</p></section>
      </div>

      <div className="alr-formula-grid alr-formula-grid--adam">
        <FormulaBlock ariaLabel="Adam 一阶矩公式">m<sub>t</sub> = β<sub>1</sub>m<sub>t−1</sub> + (1−β<sub>1</sub>)g<sub>t</sub></FormulaBlock>
        <FormulaBlock ariaLabel="Adam 二阶矩公式">v<sub>t</sub> = β<sub>2</sub>v<sub>t−1</sub> + (1−β<sub>2</sub>)g<sub>t</sub><sup>2</sup></FormulaBlock>
        <FormulaBlock ariaLabel="Adam 参数更新公式" fraction={{
          prefix: <>θ<sub>t+1</sub> = θ<sub>t</sub> − η</>,
          numerator: <>m̂<sub>t</sub></>,
          denominator: <>√v̂<sub>t</sub> + ε</>,
        }} />
      </div>
      <NoticeStrip tone="blue" lead="公式里的帽子：">
        m̂ 和 v̂ 是对训练刚开始时“历史还太短”的修正；直觉仍是“方向趋势 ÷ 梯度尺度”。
      </NoticeStrip>

      <section className="alr-lab" aria-labelledby="alr-adam-lab-title">
        <header>
          <div><span>噪声梯度实验 · {round}/{records.length}</span><h3 id="alr-adam-lab-title">原始梯度变号时，观察方向记忆</h3></div>
          <div className="alr-lab-actions">
            <Button onClick={() => setRound(0)} disabled={round === 0}>重新开始</Button>
            <Button variant="primary" hint={round === 0} disabled={finished} onClick={(event) => advance(event.currentTarget)}>
              {finished ? '噪声序列已处理' : '处理下一个梯度'}
            </Button>
          </div>
        </header>

        <div className="alr-adam-chart" role="img" aria-label="逐步比较原始梯度、一阶矩方向与 Adam 更新量">
          <header><span>步数</span><span>原始梯度 g</span><span>方向记忆 m̂</span><span>实际更新量</span></header>
          {records.map((record, index) => (
            <article className={index < round ? 'is-visible' : undefined} key={index}>
              <b>{index + 1}</b>
              <div className={record.gradient < 0 ? 'is-negative' : undefined}>
                <i style={{ width: `${Math.abs(record.gradient) / 4 * 100}%` }} />
                <strong>{signed(record.gradient)}</strong>
              </div>
              <div className={record.correctedMomentum < 0 ? 'is-negative' : undefined}>
                <i style={{ width: `${Math.min(100, Math.abs(record.correctedMomentum) / 4 * 100)}%` }} />
                <strong>{signed(record.correctedMomentum)}</strong>
              </div>
              <code>{signed(record.update)}</code>
            </article>
          ))}
        </div>

        <NoticeStrip tone={finished ? 'green' : 'orange'} lead={finished ? '观察结果：' : '留意第 2 步：'}>
          {finished
            ? '原始梯度多次短暂变为负数，但 m̂ 综合近期历史后仍保持主要方向；v̂ 同时把大梯度带来的步幅压回稳定范围。'
            : current
              ? `当前 g=${signed(current.gradient)}，方向记忆 m̂=${signed(current.correctedMomentum)}，缩放后的更新量为 ${signed(current.update)}。`
              : '第 2 个原始梯度会突然反向。处理它，看看 Adam 是否立刻跟着掉头。'}
        </NoticeStrip>
      </section>

      {finished && (
        <Question
          persistenceKey="adaptive-lr-adam-moments-v1"
          type="multiple"
          title="Adam 的两个“记忆”分别解决什么问题？（多选）"
          options={[
            { key: 'A', value: 'direction', label: 'm 汇总近期方向，让更新不被单次噪声轻易带偏', missedFeedback: '一阶矩 m 正是对近期梯度方向的平滑。' },
            { key: 'B', value: 'scale', label: 'v 汇总近期平方梯度，为不同参数自适应缩放步幅', missedFeedback: '二阶矩 v 记录梯度尺度，并出现在更新公式的分母。' },
            { key: 'C', value: 'perfect', label: '二者结合后可以保证每个任务都找到全局最优解', wrongFeedback: 'Adam 仍受目标函数、初始点与超参数影响，不保证找到全局最优。' },
          ]}
          answer={['direction', 'scale']}
          feedback={{ correct: '正确。可以把 Adam 记成：m 管方向趋势，v 管步幅尺度。' }}
          onCheck={(result) => { if (result.ok) onComplete?.(); }}
        />
      )}
    </ContentBlock>
  );
}
